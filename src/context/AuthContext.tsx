import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../core/types/';
import { BillingService } from '../services/SecureBillingService';
import { InventoryService } from '../services/inventoryService';
import { auth, db, handleFirestoreError, OperationType } from '../services/firebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, query, collection, where } from 'firebase/firestore';
import { safeLocalStorage, safeSessionStorage } from '../core/utils/storage';

interface AuthContextType {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  switchRole: (role: 'admin' | 'staff') => void;
  joinStoreByCode: (code: string, username?: string, password?: string) => Promise<{ success: boolean; message: string; ownerUid?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_USER: User = {
  id: 'current_user',
  name: 'Admin User',
  role: 'admin',
  businessId: 'default_business_id',
  updatedAt: Date.now()
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      // 1. Check if businessId is locked
      const isLocked = safeLocalStorage.getItem('businessId_locked') === 'true';
      const lockedBusinessId = safeLocalStorage.getItem('locked_businessId');
      const savedStoreCode = safeLocalStorage.getItem('storeCode');
      const saved = safeLocalStorage.getItem('eazy_billing_current_user');
      const savedRole = safeLocalStorage.getItem('locked_role') as 'admin' | 'staff' | null;
      
      let userObj = saved ? JSON.parse(saved) : { ...DEFAULT_USER };
      
      if (savedRole) {
        userObj.role = savedRole;
        if (savedRole === 'staff') {
          const savedPerms = safeLocalStorage.getItem('staff_permissions');
          if (savedPerms) {
            userObj.permissions = JSON.parse(savedPerms);
          }
        }
      }
      
      if (isLocked && lockedBusinessId) {
        userObj.businessId = lockedBusinessId;
        userObj.storeCode = savedStoreCode || undefined;
      } else {
        // Merge with active company profile mobile if available
        const fallback = safeLocalStorage.getItem('companyProfile_fallback');
        if (fallback) {
          const parsed = JSON.parse(fallback);
          if (parsed.mobile) {
            userObj.businessId = parsed.mobile.replace(/\D/g, '');
          }
        }
      }
      return userObj;
    } catch (e) {
      return DEFAULT_USER;
    }
  });

  // Handle Firebase Auth changes and Admin Store Registration
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log("SYNC_DEBUG: Firebase Auth State Changed - User logged in:", firebaseUser.uid);
        const currentRole = currentUser?.role || safeLocalStorage.getItem('locked_role') as 'admin' | 'staff' || 'admin';

        if (currentRole === 'admin') {
          // Rule 1: Admin's businessId is locked directly to their Firebase UID
          const lockedId = firebaseUser.uid;
          safeLocalStorage.setItem('businessId_locked', 'true');
          safeLocalStorage.setItem('locked_businessId', lockedId);
          safeLocalStorage.setItem('locked_role', 'admin');

          // Safe offline validation: Skip database queries that will inevitably fail when offline
          if (!navigator.onLine) {
            const cachedCode = safeLocalStorage.getItem('storeCode');
            console.log("SYNC_DEBUG: Client is offline. Using local cached storeCode for admin:", cachedCode);
            setCurrentUser(prev => ({
              ...(prev || DEFAULT_USER),
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || prev?.name || 'Admin User',
              email: firebaseUser.email || undefined,
              role: 'admin' as const,
              businessId: lockedId,
              storeCode: cachedCode || undefined,
              updatedAt: Date.now()
            }));
            return;
          }

          try {
            // Find or Register store registry entry for Admin
            const registryQuery = query(
              collection(db, 'store_registry'),
              where('ownerUid', '==', lockedId)
            );
            const querySnapshot = await getDocs(registryQuery);
            let sCode = '';

            if (!querySnapshot.empty) {
              sCode = querySnapshot.docs[0].id;
              console.log("SYNC_DEBUG: Existing storeCode resolved for admin:", sCode);
            } else {
              // Generate standard random 6 digit numeric code
              let unique = false;
              let code = '';
              let attempts = 0;
              while (!unique && attempts < 10) {
                code = Math.floor(100000 + Math.random() * 900000).toString();
                const checkDoc = await getDoc(doc(db, 'store_registry', code));
                if (!checkDoc.exists()) {
                  unique = true;
                }
                attempts++;
              }
              sCode = code;
              await setDoc(doc(db, 'store_registry', sCode), {
                storeCode: sCode,
                ownerUid: lockedId,
                createdAt: Date.now()
              });
              console.log("SYNC_DEBUG: Generated new store registry mapping with storeCode:", sCode);
            }

            safeLocalStorage.setItem('storeCode', sCode);

            setCurrentUser(prev => ({
              ...(prev || DEFAULT_USER),
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || prev?.name || 'Admin User',
              email: firebaseUser.email || undefined,
              role: 'admin' as const,
              businessId: lockedId,
              storeCode: sCode,
              updatedAt: Date.now()
            }));

          } catch (e: any) {
            const isOfflineError = !navigator.onLine || 
              (e && e.message && (
                e.message.indexOf('offline') >= 0 || 
                e.message.indexOf('network') >= 0 || 
                e.message.indexOf('Failed to get document') >= 0 ||
                e.message.indexOf('Failed to get') >= 0
              ));

            if (isOfflineError) {
              console.warn("SYNC_DEBUG: Safe warning - Failed to resolve/generate storeCode of Admin because the client is offline:", e.message || e);
            } else {
              console.error("SYNC_DEBUG: Error resolving/generating storeCode of Admin:", e);
              if (e && e.message && (e.message.includes('permission') || e.message.includes('Permission'))) {
                try {
                  handleFirestoreError(e, OperationType.GET, 'store_registry');
                } catch (err) {
                  // Catch to avoid crashing auth flow, but let handleFirestoreError write to console.error
                }
              }
            }
            
            // Non-blocking update so offline works fine matching UID
            setCurrentUser(prev => ({
              ...(prev || DEFAULT_USER),
              id: firebaseUser.uid,
              name: firebaseUser.displayName || prev?.name || 'Admin User',
              email: firebaseUser.email || undefined,
              role: 'admin' as const,
              businessId: lockedId,
              storeCode: safeLocalStorage.getItem('storeCode') || undefined,
              updatedAt: Date.now()
            }));
          }

        } else {
          // Logged in via Staff role
          const lockedId = safeLocalStorage.getItem('locked_businessId') || 'default_business_id';
          const sCode = safeLocalStorage.getItem('storeCode') || '';
          safeLocalStorage.setItem('locked_role', 'staff');

          setCurrentUser(prev => ({
            ...(prev || DEFAULT_USER),
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || prev?.name || 'Staff Member',
            email: firebaseUser.email || undefined,
            role: 'staff' as const,
            businessId: lockedId,
            storeCode: sCode || undefined,
            updatedAt: Date.now()
          }));
        }

      } else {
        console.log("SYNC_DEBUG: Firebase Auth State Changed - User logged out (or anonymous)");
        // Fallback to offline locked parameters if present
        const lockedId = safeLocalStorage.getItem('locked_businessId');
        const sCode = safeLocalStorage.getItem('storeCode');
        const lockedRole = (safeLocalStorage.getItem('locked_role') as 'admin' | 'staff') || 'admin';

        if (lockedId) {
          setCurrentUser(prev => ({
            id: prev?.id || 'current_user',
            name: prev?.name || (lockedRole === 'admin' ? 'Admin User' : 'Staff Member'),
            role: lockedRole,
            businessId: lockedId,
            storeCode: sCode || undefined,
            updatedAt: Date.now()
          }));
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser?.role]);

  // Listen to profile updates to keep businessId in sync ONLY IF it is not locked!
  useEffect(() => {
    const handleProfileUpdate = () => {
      // If business id is locked, we strictly do NOT allow profile edits to modify business id
      const isLocked = safeLocalStorage.getItem('businessId_locked') === 'true';
      if (isLocked) {
        const lockedId = safeLocalStorage.getItem('locked_businessId');
        const sCode = safeLocalStorage.getItem('storeCode');
        if (lockedId) {
          setCurrentUser(prev => {
            if (!prev) return null;
            if (prev.businessId === lockedId && prev.storeCode === sCode) return prev;
            return {
              ...prev,
              businessId: lockedId,
              storeCode: sCode || undefined
            };
          });
        }
        return;
      }

      setCurrentUser(prev => {
        if (!prev) return null;
        let activeBusinessId = 'default_business_id';
        try {
          const fallback = safeLocalStorage.getItem('companyProfile_fallback');
          if (fallback) {
            const parsed = JSON.parse(fallback);
            if (parsed.mobile) {
              activeBusinessId = parsed.mobile.replace(/\D/g, '');
            }
          }
        } catch (e) {}
        
        if (prev.businessId !== activeBusinessId) {
          console.log(`SYNC_DEBUG: Syncing AuthContext businessId from "${prev.businessId}" to "${activeBusinessId}"`);
          return { ...prev, businessId: activeBusinessId };
        }
        return prev;
      });
    };

    window.addEventListener('companyProfileUpdated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    
    // Run once immediately to avoid desync
    handleProfileUpdate();

    return () => {
      window.removeEventListener('companyProfileUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  // Automatically update modern services when current user changes
  useEffect(() => {
    BillingService.setCurrentUser(currentUser);
    InventoryService.setCurrentUser(currentUser);
    if (currentUser) {
      safeLocalStorage.setItem('eazy_billing_current_user', JSON.stringify(currentUser));
    } else {
      safeLocalStorage.removeItem('eazy_billing_current_user');
    }
  }, [currentUser]);

  const login = (user: User) => {
    setCurrentUser(user);
  };

  const logout = () => {
    // Clear lock on logout to allow logging in to another business / store
    safeLocalStorage.removeItem('businessId_locked');
    safeLocalStorage.removeItem('locked_businessId');
    safeLocalStorage.removeItem('storeCode');
    safeLocalStorage.removeItem('locked_role');
    setCurrentUser(null);
  };

  const switchRole = (role: 'admin' | 'staff') => {
    safeLocalStorage.setItem('locked_role', role);
    setCurrentUser(prev => {
      const isLocked = safeLocalStorage.getItem('businessId_locked') === 'true';
      const lockedId = safeLocalStorage.getItem('locked_businessId');
      const sCode = safeLocalStorage.getItem('storeCode');

      let activeBusinessId = 'default_business_id';
      if (isLocked && lockedId) {
        activeBusinessId = lockedId;
      } else {
        try {
          const fallback = safeLocalStorage.getItem('companyProfile_fallback');
          if (fallback) {
            const parsed = JSON.parse(fallback);
            if (parsed.mobile) {
              activeBusinessId = parsed.mobile.replace(/\D/g, '');
            }
          }
        } catch (e) {}
      }

      if (!prev) {
        return {
          id: 'current_user',
          name: role === 'admin' ? 'Admin User' : 'Staff Member',
          role,
          businessId: activeBusinessId,
          storeCode: sCode || undefined,
          updatedAt: Date.now()
        };
      }
      return {
        ...prev,
        role,
        businessId: activeBusinessId,
        storeCode: sCode || undefined,
        updatedAt: Date.now()
      };
    });
  };

  // Join a store using a 6-digit store code + Staff member login
  const joinStoreByCode = async (
    code: string, 
    username?: string, 
    password?: string
  ): Promise<{ success: boolean; message: string; ownerUid?: string }> => {
    const cleanCode = code.trim();
    if (cleanCode.length !== 6 || isNaN(Number(cleanCode))) {
      return { success: false, message: 'कृपया 6-अंकों का वैध कोड दर्ज करें।' };
    }

    // Intercept development/testing sample credentials
    if (cleanCode === '123456' && username?.trim() === 'sample_staff') {
      const cleanPass = (password || '').trim();
      if (cleanPass !== 'password123') {
        const isHi = safeLocalStorage.getItem('appLanguage') === 'hi';
        return { 
          success: false, 
          message: isHi ? 'पासवर्ड अमान्य है। कृपया सही पासवर्ड दर्ज करें।' : 'Invalid password. Please enter correct password.' 
        };
      }

      const mockStaffData = {
        id: 'sample_staff_id',
        name: 'Arjun Sharma (Sample Staff)',
        password: 'password123',
        businessId: 'sample_business_id',
        permissions: {
          can_delete_invoice: false,
          can_edit_stock: true,
          view_reports: true,
          manage_settings: false
        }
      };

      safeLocalStorage.setItem('businessId_locked', 'true');
      safeLocalStorage.setItem('locked_businessId', 'sample_business_id');
      safeLocalStorage.setItem('storeCode', '123456');
      safeLocalStorage.setItem('locked_role', 'staff');
      safeLocalStorage.setItem('staff_permissions', JSON.stringify(mockStaffData.permissions));
      safeLocalStorage.setItem('cached_staff_123456_sample_staff', JSON.stringify(mockStaffData));
      safeLocalStorage.setItem('companyProfile_fallback', JSON.stringify({ mobile: 'sample_business_id', name: 'Sample Business' }));

      setCurrentUser({
        id: 'sample_staff_id',
        name: 'Arjun Sharma (Sample Staff)',
        role: 'staff',
        businessId: 'sample_business_id',
        storeCode: '123456',
        updatedAt: Date.now(),
        permissions: mockStaffData.permissions
      });

      return { 
        success: true, 
        message: safeLocalStorage.getItem('appLanguage') === 'hi' 
          ? 'स्टाफ सदस्य सफलतापूर्वक सत्यापित होकर लॉग-इन हो गया है!' 
          : 'Staff member successfully verified and logged in!', 
        ownerUid: 'sample_business_id' 
      };
    }

    try {
      console.log("SYNC_DEBUG: Onboarding Staff member via storeCode:", cleanCode, "Username:", username);
      
      // Offline fallback handling
      if (!navigator.onLine && username && password) {
        console.log("SYNC_DEBUG: Device is offline. Checking cached staff credentials...");
        const cachedStaffKey = `cached_staff_${cleanCode}_${username.trim()}`;
        const cachedDataStr = safeLocalStorage.getItem(cachedStaffKey);
        
        if (cachedDataStr) {
          const cachedData = JSON.parse(cachedDataStr);
          if (cachedData.password === password.trim()) {
            const ownerUid = cachedData.businessId;
            
            safeLocalStorage.setItem('businessId_locked', 'true');
            safeLocalStorage.setItem('locked_businessId', ownerUid);
            safeLocalStorage.setItem('storeCode', cleanCode);
            safeLocalStorage.setItem('locked_role', 'staff');
            safeLocalStorage.setItem('staff_permissions', JSON.stringify(cachedData.permissions));
            
            setCurrentUser({
              id: cachedData.id || username.trim(),
              name: cachedData.name || 'Staff Member',
              role: 'staff',
              businessId: ownerUid,
              storeCode: cleanCode,
              updatedAt: Date.now(),
              permissions: cachedData.permissions
            });

            return { success: true, message: 'सफलतापूर्वक ऑफलाइन लॉग-इन किया गया (Cached)!', ownerUid };
          } else {
            return { success: false, message: 'गलत पासवर्ड! कृपया सही पासवर्ड दर्ज करें।' };
          }
        } else {
          return { success: false, message: 'यह डिवाइस ऑफलाइन है और इस यूजर का कोई लोकल क्रेडेंशियल मौजूद नहीं है।' };
        }
      }

      const docRef = doc(db, 'store_registry', cleanCode);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return { success: false, message: 'स्टोर कोड अमान्य है। कृपया सही कोड दर्ज करें या एडमिन से संपर्क करें।' };
      }

      const { ownerUid } = docSnap.data();
      if (!ownerUid) {
        return { success: false, message: 'स्टोर के लिए कोई मान्य मालिक नहीं मिला।' };
      }

      // If username and password are provided, perform subcollection verification
      if (username && password) {
        const cleanUser = username.trim();
        const cleanPass = password.trim();

        // Check documents matches by cleaned mobile or match by raw username
        let staffSnap = await getDoc(doc(db, 'businesses', ownerUid, 'staff_members', cleanUser.replace(/\D/g, '')));
        if (!staffSnap.exists()) {
          staffSnap = await getDoc(doc(db, 'businesses', ownerUid, 'staff_members', cleanUser));
        }

        if (!staffSnap.exists()) {
          return { success: false, message: 'स्टाफ सदस्य का रिकॉर्ड अमान्य है या एडमिन ने इसे अभी तक रजिस्टर नहीं किया है।' };
        }

        const staffData = staffSnap.data();
        if (staffData.password !== cleanPass) {
          return { success: false, message: 'पासवर्ड अमान्य है। कृपया सही पासवर्ड दर्ज करें।' };
        }

        // Setup local storage parameter keys for RBAC consistency
        safeLocalStorage.setItem('businessId_locked', 'true');
        safeLocalStorage.setItem('locked_businessId', ownerUid);
        safeLocalStorage.setItem('storeCode', cleanCode);
        safeLocalStorage.setItem('locked_role', 'staff');
        safeLocalStorage.setItem('staff_permissions', JSON.stringify(staffData.permissions));
        
        // Cache staff data for offline access later
        safeLocalStorage.setItem(`cached_staff_${cleanCode}_${cleanUser}`, JSON.stringify(staffData));

        setCurrentUser({
          id: staffData.id || cleanUser,
          name: staffData.name || 'Staff Member',
          role: 'staff',
          businessId: ownerUid,
          storeCode: cleanCode,
          updatedAt: Date.now(),
          permissions: staffData.permissions
        });

        safeLocalStorage.setItem('companyProfile_fallback', JSON.stringify({ mobile: ownerUid }));

        return { success: true, message: 'स्टाफ सदस्य सफलतापूर्वक सत्यापित होकर लॉग-इन हो गया है!', ownerUid };
      }

      // Fallback to standard join logic (if username/password aren't supplied)
      safeLocalStorage.setItem('businessId_locked', 'true');
      safeLocalStorage.setItem('locked_businessId', ownerUid);
      safeLocalStorage.setItem('storeCode', cleanCode);
      safeLocalStorage.setItem('locked_role', 'staff');

      setCurrentUser(prev => ({
        ...(prev || DEFAULT_USER),
        role: 'staff' as const,
        businessId: ownerUid,
        storeCode: cleanCode,
        updatedAt: Date.now()
      }));

      // Set fallback to make sure all older mechanisms align securely
      safeLocalStorage.setItem('companyProfile_fallback', JSON.stringify({ mobile: ownerUid }));

      return { success: true, message: 'स्टोर सफलतापूर्वक लिंक हो गया है!', ownerUid };

    } catch (e: any) {
      const isOfflineError = !navigator.onLine || 
        (e && e.message && (
          e.message.indexOf('offline') >= 0 || 
          e.message.indexOf('network') >= 0 || 
          e.message.indexOf('Failed to get document') >= 0
        ));
      
      if (isOfflineError) {
        console.warn("SYNC_DEBUG: Safe warning - Failed to link store mapping registry because the client is offline:", e.message || e);
      } else {
        console.error("SYNC_DEBUG: Failed to link store mapping registry:", e);
      }
      return { success: false, message: `स्टोर जोड़ने में त्रुटि: ${e.message || String(e)}` };
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, switchRole, joinStoreByCode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
