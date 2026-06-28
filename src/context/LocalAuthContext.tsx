import React, { createContext, useContext, useState, useEffect } from 'react';
import { db as dexieDb } from '../services/billingService';
import { OnboardingManager } from '../services/OnboardingManager';

export interface LocalAuthContextType {
  isLoaded: boolean;
  isOnboardingCompleted: boolean;
  isLocalAccessVerified: boolean;
  isCloudSyncEnabled: boolean;
  hasPinConfigured: boolean;
  // Immutable read-only session states during pos checkout to avoid null-pointers
  readonly currentBusinessId: string;
  readonly currentStaffId: string;
  readonly currentUserRole: 'admin' | 'staff';
  verifyLocalAccessPin: (inputPin: string) => Promise<boolean>;
  setLocalSession: (businessId: string, staffId: string, role: 'admin' | 'staff') => Promise<void>;
  lockSession: () => void;
  refreshStatus: () => Promise<void>;
}

const LocalAuthContext = createContext<LocalAuthContextType | undefined>(undefined);

export const LocalAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);
  const [isLocalAccessVerified, setIsLocalAccessVerified] = useState(false);
  const [isCloudSyncEnabled, setIsCloudSyncEnabled] = useState(false);
  const [hasPinConfigured, setHasPinConfigured] = useState(false);

  // Exposing guaranteed, rock-solid non-nullable read-only states for the invoice sequence prefixer
  const [businessId, setBusinessId] = useState<string>('EZB-OFFLINE-TEMP-001');
  const [staffId, setStaffId] = useState<string>('STAFF-000');
  const [userRole, setUserRole] = useState<'admin' | 'staff'>('admin');

  const refreshStatus = async () => {
    try {
      // 1. Verify if onboarding has been fully done
      const onboardingInfo = await OnboardingManager.checkOnboardingStatus();
      setIsOnboardingCompleted(onboardingInfo.completed);

      // 2. Check if cloud synchronization is enabled in system_meta
      const syncMetaRecord = await dexieDb.system_meta.get('isCloudSyncEnabled');
      const syncEnabled = syncMetaRecord ? !!syncMetaRecord.value : false;
      setIsCloudSyncEnabled(syncEnabled);

      // 3. See if a primary local salted authentication PIN has been written to Dexie local_auth
      const savedHash = await OnboardingManager.getHashedPin();
      setHasPinConfigured(!!savedHash);

      // 4. Retrieve primary business identity references
      const cachedBizId = await dexieDb.system_meta.get('businessId');
      const cachedRole = await dexieDb.system_meta.get('role');
      const cachedStaffUid = await dexieDb.system_meta.get('staffUid');
      const cachedOwnerUid = await dexieDb.system_meta.get('ownerUid');

      if (cachedBizId && cachedBizId.value) {
        setBusinessId(cachedBizId.value);
      } else {
        // Safe fallback in case registration is being initialized
        const fallbackBizId = localStorage.getItem('businessId');
        if (fallbackBizId) {
          setBusinessId(fallbackBizId);
        }
      }

      if (cachedRole && cachedRole.value) {
        setUserRole(cachedRole.value as 'admin' | 'staff');
      } else {
        const fallbackRole = localStorage.getItem('locked_role');
        if (fallbackRole === 'admin' || fallbackRole === 'staff') {
          setUserRole(fallbackRole);
        }
      }

      // Assign stable staff ID
      if (cachedRole?.value === 'staff' && cachedStaffUid?.value) {
        setStaffId(cachedStaffUid.value);
      } else if (cachedOwnerUid?.value) {
        setStaffId(cachedOwnerUid.value);
      } else {
        const fallbackStaff = localStorage.getItem('staffUid') || localStorage.getItem('ownerUid');
        if (fallbackStaff) {
          setStaffId(fallbackStaff);
        }
      }

      // 5. Check if we have verified this session already in sessionStorage (transient memory)
      const sessionVerified = sessionStorage.getItem('local_auth_unlocked') === 'true';
      if (sessionVerified) {
        setIsLocalAccessVerified(true);
      } else {
        // If there has been no pin set up in system yet, allow immediate bypass for seamless onboarding
        if (!savedHash) {
          const fallbackPin = localStorage.getItem('appPin');
          if (!fallbackPin) {
            setIsLocalAccessVerified(true);
          }
        }
      }
    } catch (err) {
      console.error('Local Auth initialization state compilation fail:', err);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  /**
   * Reads local salted pin hash from Dexie local_auth and compares input
   */
  const verifyLocalAccessPin = async (inputPin: string): Promise<boolean> => {
    try {
      if (!inputPin || inputPin.length < 4) {
        return false;
      }

      // Generate identical browser SHA hash
      const enteredHash = await OnboardingManager.generatePinHash(inputPin);
      const savedHash = await OnboardingManager.getHashedPin();

      // Check against fallback standard config if local_auth table is empty
      if (!savedHash) {
        const legacyPin = localStorage.getItem('appPin');
        if (legacyPin) {
          const legacyMatch = inputPin === legacyPin;
          if (legacyMatch) {
            setIsLocalAccessVerified(true);
            sessionStorage.setItem('local_auth_unlocked', 'true');
            // Write legacy back elegantly into Dexie for future boot reliability
            await OnboardingManager.setupLocalAccess(enteredHash);
            setHasPinConfigured(true);
          }
          return legacyMatch;
        }
        
        // No security enabled yet
        setIsLocalAccessVerified(true);
        sessionStorage.setItem('local_auth_unlocked', 'true');
        return true;
      }

      const match = enteredHash === savedHash;
      if (match) {
        setIsLocalAccessVerified(true);
        sessionStorage.setItem('local_auth_unlocked', 'true');
      }
      return match;
    } catch (err) {
      console.error('verifyLocalAccessPin transactional exception: ', err);
      // Fail safely
      return false;
    }
  };

  /**
   * Force logs out or locks active screen POS context
   */
  const lockSession = () => {
    setIsLocalAccessVerified(false);
    sessionStorage.removeItem('local_auth_unlocked');
  };

  /**
   * Synchronizes manual verification overrides
   */
  const setLocalSession = async (bId: string, sId: string, role: 'admin' | 'staff') => {
    setBusinessId(bId);
    setStaffId(sId);
    setUserRole(role);
    setIsLocalAccessVerified(true);
    sessionStorage.setItem('local_auth_unlocked', 'true');

    // Writes atomic records into Dexie local metadata
    await dexieDb.system_meta.bulkPut([
      { key: 'businessId', value: bId },
      { key: 'staffUid', value: sId },
      { key: 'role', value: role },
      { key: 'onboardingCompleted', value: true }
    ]);
    setIsOnboardingCompleted(true);
  };

  return (
    <LocalAuthContext.Provider
      value={{
        isLoaded,
        isOnboardingCompleted,
        isLocalAccessVerified,
        isCloudSyncEnabled,
        hasPinConfigured,
        currentBusinessId: businessId,
        currentStaffId: staffId,
        currentUserRole: userRole,
        verifyLocalAccessPin,
        setLocalSession,
        lockSession,
        refreshStatus
      }}
    >
      {children}
    </LocalAuthContext.Provider>
  );
};

export const useLocalSession = (): LocalAuthContextType => {
  const context = useContext(LocalAuthContext);
  if (!context) {
    throw new Error('useLocalSession must be used within a LocalAuthProvider');
  }
  return context;
};
