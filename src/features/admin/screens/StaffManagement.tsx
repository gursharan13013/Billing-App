import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../services/firebaseService';
import { collection, onSnapshot } from 'firebase/firestore';
import { BillingService } from '../../../services/SecureBillingService';
import { StaffManagementScreen } from './StaffManagementScreen';
import { StaffProfileDashboard } from './StaffProfileDashboard';
import { Lock, ShieldAlert, RefreshCw, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StaffMember {
  id: string;
  name: string;
  mobile: string;
  password?: string;
  permissions: {
    can_delete_invoice: boolean;
    can_edit_stock: boolean;
    view_reports: boolean;
    manage_settings: boolean;
  };
  businessId: string;
  createdAt: number;
  lastLogin?: number | null;
}

interface StaffManagementProps {
  onBack: () => void;
  onViewAuditLogs?: (userId: string) => void;
  currentLanguage?: 'en' | 'hi';
}

export const StaffManagement: React.FC<StaffManagementProps> = ({
  onBack,
  onViewAuditLogs,
  currentLanguage = 'en'
}) => {
  const { currentUser } = useAuth();
  const businessId = currentUser?.businessId || 'default_business_id';
  const isHi = currentLanguage === 'hi';

  // Admin Guard PIN security states
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('staff_admin_unlocked') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Roster States
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Transitions & views: 'list' | 'profile'
  const [activeView, setActiveView] = useState<'list' | 'profile'>('list');

  // Load and subscribe payload registry
  const fetchLocalStaff = async (isManual = false) => {
    if (!businessId || !isAdminUnlocked) return;
    setLoading(true);
    try {
      if (isManual) {
        // Enforce a tiny, elegant animation pause so the user receives rich visual feedback of the active syncing pipeline
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      const list = await BillingService.getStaffMembers(businessId);
      setStaffList(list);
    } catch (err) {
      console.error('Failed to load local staff roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdminUnlocked) return;
    fetchLocalStaff();

    // Setup Firestore onSnapshot realtime hook
    const staffRef = collection(db, 'businesses', businessId, 'staff_members');
    const unsubscribe = onSnapshot(staffRef, {
      next: async (snapshot) => {
        const remoteList: any[] = [];
        snapshot.forEach((docSnap) => {
          remoteList.push({
            id: docSnap.id,
            ...docSnap.data()
          });
        });

        const { getDb } = await import('../../../services/billingService');
        const localDb = getDb();

        try {
          for (const item of remoteList) {
            await localDb.staff_members.put({ ...item, isSyncedToCloud: true });
          }
        } catch (e) {
          console.error('failed snapshot dexie placement:', e);
        }

        const merged = await BillingService.getStaffMembers(businessId);
        setStaffList(merged);
        setLoading(false);
      },
      error: (e) => {
        console.error('Firestore real-time subscription error:', e);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [businessId, isAdminUnlocked]);

  // Handle Admin Verification Pin code
  const handlePinChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    const targetPin = localStorage.getItem('appPin') || '1234';
    
    if (pinInput === targetPin) {
      setIsAdminUnlocked(true);
      sessionStorage.setItem('staff_admin_unlocked', 'true');
      setPinInput('');
    } else {
      setPinError(isHi ? 'गलत सिक्योरिटी पिन! पुनः प्रयास करें।' : 'Incorrect security PIN! Please try again.');
    }
  };

  const handleBackNavigation = () => {
    if (activeView === 'profile') {
      setActiveView('list');
      setSelectedStaff(null);
    } else {
      onBack();
    }
  };

  // Redirect to Audit Log Screen inside SettingsScreen with target filter
  const handleViewAllLogsRedirect = (userId: string) => {
    if (onViewAuditLogs) {
      onViewAuditLogs(userId);
    } else {
      console.warn('onViewAuditLogs callback is not hooked up on settings configuration.');
    }
  };

  // Admin Verification Gate render shields
  if (!isAdminUnlocked) {
    return (
      <div className="flex-1 min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
        
        {/* Sync Line visible at the top */}
        <div className="fixed top-0 inset-x-0 bg-indigo-600 dark:bg-indigo-700 text-white text-[10px] py-1.5 px-3 flex items-center justify-between shadow-sm z-50 select-none">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-indigo-300 animate-pulse" />
            <span>EazyBilling Shield • Administrative Terminal Protection Guard</span>
          </div>
          <span className="font-mono text-[9px] tracking-wide bg-indigo-500/30 px-2 rounded">SECURE</span>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl space-y-4 text-center mt-8"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400">
            <Lock size={28} />
          </div>
          
          <div className="space-y-1.5">
            <h3 className="text-lg font-black tracking-tight">{isHi ? 'प्रशासक सत्यापन' : 'Admin Security Gate'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 select-none leading-relaxed font-semibold">
              {isHi ? 'स्टाफ प्रबंधन तक पहुंचने के लिए सुरक्षा कोड दर्ज करें।' : 'Enter security authorization PIN to manage authorized operators.'}
            </p>
          </div>

          <form onSubmit={handlePinChallenge} className="space-y-4">
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              autoFocus
              onChange={(e) => {
                setPinError('');
                setPinInput(e.target.value.replace(/\D/g, ''));
              }}
              placeholder="••••"
              className="w-full text-center text-3xl font-mono tracking-widest bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 p-3 rounded-2xl outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
            />

            {pinError && (
              <div className="text-xs text-red-500 font-semibold bg-red-50 dark:bg-red-900/10 p-2.5 rounded-xl border border-red-500/20">
                ⚠️ {pinError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 py-2.5 rounded-xl border border-slate-20 pointer-events-auto hover:bg-slate-50 text-slate-650 font-bold transition text-xs"
              >
                {isHi ? 'वापस' : 'Back'}
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold transition text-xs shadow-md shadow-indigo-600/10"
              >
                {isHi ? 'सत्यापित करें' : 'Unlock Gate'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-100 pb-[max(env(safe-area-inset-bottom),0px)]">
      
      {/* Dynamic Sync Status bar visible at the top */}
      <div className="bg-emerald-600 dark:bg-emerald-700 text-white text-[10.5px] py-1.5 px-4.5 flex items-center justify-between sticky top-0 z-50 shadow-sm leading-none select-none">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
          <span><b>EazySync Line Active</b> • Cloud database mirroring is live and online</span>
        </div>
        <span className="font-mono text-[9px] font-black tracking-widest uppercase opacity-95">ONLINE</span>
      </div>

      {/* Roster Pages Container */}
      <div className="flex-1 relative overflow-hidden h-full">
        <AnimatePresence mode="wait">
          {activeView === 'list' && (
            <motion.div 
              key="list-screen"
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 h-full flex flex-col"
            >
              <StaffManagementScreen
                staffList={staffList}
                loading={loading}
                businessId={businessId}
                onSelectStaff={(staff) => {
                  setSelectedStaff(staff);
                  setActiveView('profile');
                }}
                onBack={onBack}
                onRefresh={() => fetchLocalStaff(true)}
                onAddStaffSuccess={() => fetchLocalStaff(false)}
                currentLanguage={currentLanguage}
              />
            </motion.div>
          )}

          {activeView === 'profile' && selectedStaff && (
            <motion.div
              key="profile-screen"
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', tension: 350, friction: 35 }}
              className="absolute inset-0 h-full flex flex-col z-20"
            >
              <StaffProfileDashboard
                staff={selectedStaff}
                onBack={handleBackNavigation}
                onViewAuditLogs={handleViewAllLogsRedirect}
                onDeleteSuccess={() => {
                  setActiveView('list');
                  setSelectedStaff(null);
                  fetchLocalStaff();
                }}
                currentLanguage={currentLanguage}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
