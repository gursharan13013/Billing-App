import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Upload, Download, CloudUpload, CloudDownload, 
  Key, User, SlidersHorizontal, FileText, ArrowDownCircle,
  Globe, Sun, Moon, Check, X, Hash, Database, Loader2, AlertTriangle, ShieldCheck, RefreshCcw, Bot, ScanBarcode, HelpCircle, Trash2,
  ChevronDown, ChevronUp, HardDrive, Info, ExternalLink, Sparkles, Cloud, Laptop, Activity, Lock, Users, ShieldAlert, Crown, Heart
} from 'lucide-react';
import { StaffManagement } from './StaffManagement';
import { Language, VoucherSettings, APP_VERSION, BUILD_DATE, AppSettings } from '../../../core/types/';
import { Theme } from '../../../App';
import { billingService } from '../../../services/billingService';
import { auth, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPasswordEmail } from '../../../services/firebaseService';
import { LocalBackupService } from '../../../services/localBackupService';
import Step1Validator from '../../../components/shared/Step1Validator';
import { googleAuthService, isMockGoogleEnabled, setMockGoogleEnabled } from '../../../services/googleAuthService';
import { GoogleDriveService, DriveSnapshot, isSimulateNetworkError, setSimulateNetworkError } from '../../../services/googleDriveService';
import { useAuth } from '../../../context/AuthContext';
import { getSyncStatus, subscribeToSyncStatus, SyncStatus } from '../../../services/syncEngine';
import { SystemHealth } from '../../../components/shared/SystemHealth';
import { SystemHealthDashboard } from './SystemHealthDashboard';
import { AuditLogScreen } from './AuditLogScreen';
import { SettingsAccordion } from '../../../components/features/SettingsAccordion';
import { TestCaseRunner } from './TestCaseRunner';
import { THEME } from '../../../core/theme';
import { OnboardingManager } from '../../../services/OnboardingManager';
import { CloudGatewayManager } from '../../../services/CloudGatewayManager';


interface SettingsCardProps {
  title: string;
  hindiTitle?: string;
  description: string;
  children?: React.ReactNode;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ title, hindiTitle, description, children }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-4 hover:shadow-md transition duration-200">
      <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 leading-relaxed">
          {title} {hindiTitle && <span className="text-slate-500 dark:text-slate-400 font-medium text-xs font-sans tracking-normal leading-relaxed">({hindiTitle})</span>}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">{description}</p>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
};


const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  color?: string;
  disabled?: boolean;
}> = ({ checked, onChange, color = 'bg-indigo-600 dark:bg-indigo-500', disabled = false }) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      type="button"
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? color : 'bg-slate-200 dark:bg-slate-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`${
          checked ? 'translate-x-6' : 'translate-x-1'
        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm`}
      />
    </button>
  );
};


interface SettingsScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ 
    onBack, 
    onNavigate,
    currentLanguage, 
    onLanguageChange,
    currentTheme,
    onThemeChange
}) => {
  const authContext = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('Synced');

  const isHi = currentLanguage === 'hi';
  const t = {
    adminPinChallenge: isHi ? 'एडमिन सुरक्षा पिन चुनौती' : 'Admin PIN Challenge',
    adminPinSubtitle: isHi ? 'सुरक्षा कोड दर्ज करें। (डिफ़ॉल्ट पिन: 1234)' : 'Enter security code. (Default PIN: 1234)',
    invalidPinError: isHi ? 'गलत सिक्योरिटी पिन! पुनः प्रयास करें।' : 'Incorrect security PIN! Please try again.',
    cancel: isHi ? 'रद्द करें (Cancel)' : 'Cancel',
    unlock: isHi ? 'अनलॉक करें (Unlock)' : 'Unlock',
    appSecurity: isHi ? 'ऐप सुरक्षा' : 'App Security',
    appLock: isHi ? 'ऐप लॉक' : 'App Lock',
    requirePin: isHi ? 'ऐप खोलने के लिए पिन आवश्यक करें' : 'Require PIN to open app',
    changePin: isHi ? 'पिन बदलें' : 'Change PIN',
    setNewPin: isHi ? 'नया पिन सेट करें' : 'Set New PIN',
    enterPinDisable: isHi ? 'अक्षम करने के लिए पिन दर्ज करें' : 'Enter PIN to Disable',
    enterCurrentPin: isHi ? 'वर्तमान पिन दर्ज करें' : 'Enter Current PIN',
    enterNewPin: isHi ? 'नया पिन दर्ज करें' : 'Enter New PIN',
    numericPinPrompt: isHi ? 'कृपया अपना ऐप सुरक्षित करने के लिए अंकों का पिन दर्ज करें।' : 'Please enter a numeric PIN to secure your app.',
    verifyPinPrompt: isHi ? 'आगे बढ़ने के लिए अपना अंकों का पिन सत्यापित करें।' : 'Verify your numeric PIN to proceed.',
    incorrectPin: isHi ? 'गलत पिन!' : 'Incorrect PIN!',
    confirm: isHi ? 'पुष्टि करें (Confirm)' : 'Confirm',
    success: isHi ? 'सफलता' : 'Success',
    appLockEnabledMsg: isHi ? 'ऐप लॉक सफलतापूर्वक सक्षम किया गया!' : 'App lock successfully enabled!',
    appLockDisabledMsg: isHi ? 'ऐप लॉक अक्षम कर दिया गया है।' : 'App lock disabled.',
    pinChangedMsg: isHi ? 'पिन सफलतापूर्वक बदला गया!' : 'PIN changed successfully!',
  };

  useEffect(() => {
    try {
      setSyncStatus(getSyncStatus());
      const unsubscribe = subscribeToSyncStatus((status) => {
        setSyncStatus(status);
      });
      return () => {
        if (unsubscribe) unsubscribe();
      };
    } catch (e) {
      console.error("Sync status subscription failed:", e);
    }
  }, []);

  const [activeView, setActiveView] = useState<'main' | 'preferences' | 'preferences2' | 'general_settings' | 'sale_bill_settings' | 'item_settings' | 'purchase_bill_settings' | 'purchase_return_settings' | 'sale_return_settings' | 'ledger_settings' | 'transportation_settings' | 'invoice_numbering' | 'password_settings' | 'ceo_control' | 'time_machine' | 'system_health' | 'master_health' | 'staff_members' | 'audit_logs'>('main');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'business_identity' | 'security_access' | 'data_cloud' | 'app_preferences' | 'diagnostics' | 'premium_license'>('business_identity');
  const [showDashboardQR, setShowDashboardQR] = useState(() => localStorage.getItem('showDashboardQR') !== 'false');
  const [showSmartAssistant, setShowSmartAssistant] = useState(() => localStorage.getItem('showSmartAssistant') !== 'false');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(() => localStorage.getItem('showBarcodeScanner') !== 'false');
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [auditLogUserFilter, setAuditLogUserFilter] = useState<string>('all');
  const [pendingAdminView, setPendingAdminView] = useState<'staff_members' | 'audit_logs'>('staff_members');
  const [showAdminPinModal, setShowAdminPinModal] = useState<boolean>(false);
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [adminPinError, setAdminPinError] = useState<string>('');
  const [voucherSettings, setVoucherSettings] = useState<VoucherSettings[]>([]);
  
  const [snapshotsList, setSnapshotsList] = useState<string[]>([]);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false);
  const [snapshotMessage, setSnapshotMessage] = useState('');
  const [snapshotConfirm, setSnapshotConfirm] = useState<{
    type: 'restore' | 'delete';
    filename: string;
  } | null>(null);

  // Google Drive Integration State variables
  const [isDriveConnected, setIsDriveConnected] = useState(googleAuthService.isConnected());
  const [driveEmail, setDriveEmail] = useState(googleAuthService.getConnectedEmail());
  const [driveSnapshotsList, setDriveSnapshotsList] = useState<DriveSnapshot[]>([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [driveStatusMsg, setDriveStatusMsg] = useState('');
  const [driveError, setDriveError] = useState<string | null>(null);

  // Diagnostic Simulator / Mock Sync Mode states
  const [useMockGoogle, setUseMockGoogle] = useState(isMockGoogleEnabled());
  const [simulateNetError, setSimulateNetError] = useState(isSimulateNetworkError());
  const [uploadProgressValue, setUploadProgressValue] = useState<number | null>(null);

  const handleToggleMockGoogle = (val: boolean) => {
    setMockGoogleEnabled(val);
    setUseMockGoogle(val);
    setIsDriveConnected(googleAuthService.isConnected());
    setDriveEmail(googleAuthService.getConnectedEmail());
  };

  const handleToggleSimulateNetError = (val: boolean) => {
    setSimulateNetworkError(val);
    setSimulateNetError(val);
  };

  // Load Google Drive Snapshots
  const loadDriveSnapshots = async () => {
    if (!googleAuthService.isConnected()) return;
    setIsDriveLoading(true);
    setDriveError(null);
    try {
      const list = await GoogleDriveService.listDriveSnapshots();
      setDriveSnapshotsList(list);
    } catch (err: any) {
      console.warn("Failed to retrieve Google Drive backups list:", err);
      setDriveError(err.message || "Failed to list files from Google Drive.");
    } finally {
      setIsDriveLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'time_machine') {
      console.log("[TIME MACHINE] Time Machine view standard list loaded");
      setIsSnapshotLoading(true);
      LocalBackupService.listSnapshots()
        .then((list) => {
          console.log("[TIME MACHINE] Successfully listed snapshots:", list);
          setSnapshotsList(list);
        })
        .catch(err => {
          console.error("[TIME MACHINE] Listing snapshots failed", err);
          setDialogMessage({
            title: "Backup snapshots load problem",
            message: "Backup snapshots check karne mein problem aayee. Please try again.",
            isError: true
          });
        })
        .finally(() => {
          setIsSnapshotLoading(false);
          // Auto load Google Drive files if connected
          if (googleAuthService.isConnected()) {
            loadDriveSnapshots();
          }
        });

      // Update local drive state variables from localStorage cache
      setIsDriveConnected(googleAuthService.isConnected());
      setDriveEmail(googleAuthService.getConnectedEmail());
    }
  }, [activeView, useMockGoogle]);

  const handleConnectDrive = async () => {
    setDriveStatusMsg('Google account se connect kiya ja raha hai...');
    try {
      await googleAuthService.signIn();
      setIsDriveConnected(true);
      setDriveEmail(googleAuthService.getConnectedEmail());
      setDriveStatusMsg('');
      setDialogMessage({
        title: "Google Drive Connected!",
        message: isMockGoogleEnabled() 
          ? "Logged in as ceo@eazybilling.test" 
          : "Google Drive se connection safal raha! Aapka data ab cloud par automatic sync ke liye taiyyaar hai."
      });
      // Immediately load files list from drive
      loadDriveSnapshots();
    } catch (err: any) {
      console.error("Google Drive Auth Link Fail:", err);
      setDriveStatusMsg('');
      
      const isPopupError = err?.message?.includes("cancelled-popup-request") || 
                           err?.message?.includes("popup-blocked") || 
                           err?.message?.includes("closed-by-user") ||
                           err?.code === "auth/cancelled-popup-request";

      setDialogMessage({
        title: isPopupError ? "Popup Blocked or Cancelled" : "Connection Failed",
        message: isPopupError 
          ? "Browser window popup blocked ya user ke dwara close ho gaya hai. AI Studio preview iframe boundaries ki wajah se real account login popups block ho sakte hain. Bypass karne ke liye: \n\n1. App window ko upar 'Open in New Tab' karke naye tab mein open karein.\n2. Ya Simulator settings se 'Mock Google Drive' toggler control on rakhein testing ke liye."
          : (err.message || `Google link fail ho gaya: ${err.message || 'Unknown error'}`),
        isError: true
      });
    }
  };

  const handleDisconnectDrive = async () => {
    if (!window.confirm("Kya aap Google Drive se disconnect karna chahte hain? Automatic backup cloud sync ruk jayega.")) {
      return;
    }
    
    try {
      await googleAuthService.signOut();
      setIsDriveConnected(false);
      setDriveEmail(null);
      setDriveSnapshotsList([]);
      setDialogMessage({
        title: "Google Drive Disconnected",
        message: "Aapka account successfully disconnect ho gaya hai."
      });
    } catch (err: any) {
      console.error("Disconnect error:", err);
    }
  };

  const handleManualUploadToDrive = async (filename: string) => {
    setSnapshotMessage(`Snapshot '${filename}' ko Google Drive par sync kiya ja raha hai...`);
    setIsSnapshotLoading(true);
    setUploadProgressValue(0);

    let progressInterval: any = null;
    if (isMockGoogleEnabled() && !isSimulateNetworkError()) {
      const start = Date.now();
      const dur = 3000;
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.min(Math.round((elapsed / dur) * 100), 100);
        setUploadProgressValue(pct);
        if (pct >= 100) {
          clearInterval(progressInterval);
        }
      }, 100);
    }

    try {
      const res = await GoogleDriveService.uploadSnapshotToDrive(filename);
      if (res.success) {
        setUploadProgressValue(100);
        await new Promise(resolve => setTimeout(resolve, 300));
        setDialogMessage({
          title: "Cloud Backup Successful!",
          message: res.message
        });
        // Refresh Drive Backups List
        await loadDriveSnapshots();
      } else {
        setDialogMessage({
          title: "Cloud Backup Failed",
          message: res.message,
          isError: true
        });
      }
    } catch (e: any) {
      setDialogMessage({
        title: "Sync Error",
        message: e.message || `Cloud upload mein issue aaya: ${e.message || e}`,
        isError: true
      });
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setUploadProgressValue(null);
      setIsSnapshotLoading(false);
      setSnapshotMessage('');
    }
  };

  const handleRestoreFromDrive = async (driveFile: { id: string; name: string }) => {
    const consent = window.confirm(`ALERT: Kya aap sach mein Google Drive backup "${driveFile.name}" se poora database restore karna chahte hain? Isse aapka abhi ka local data replace ho jayega (Hum restore se pehle aapka safety backup bana denge).`);
    if (!consent) return;

    setSnapshotMessage(`Google Drive se '${driveFile.name}' ko download aur restore kiya ja raha hai...`);
    setIsSnapshotLoading(true);
    try {
      const fileDataContent = await GoogleDriveService.downloadSnapshotFromDrive(driveFile.id);
      const restoreRes = await LocalBackupService.restoreFromSnapshot(driveFile.name, fileDataContent);
      
      if (restoreRes.success) {
        setDialogMessage({
          title: "Cloud Restore Successful!",
          message: restoreRes.message
        });
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        setDialogMessage({
          title: "Cloud Restore Failed",
          message: restoreRes.message,
          isError: true
        });
      }
    } catch (err: any) {
      console.error("Cloud restore error flow:", err);
      setDialogMessage({
        title: "Restore Fail",
        message: `Restore unsuccessful: ${err.message || 'Unknown error'}`,
        isError: true
      });
    } finally {
      setIsSnapshotLoading(false);
      setSnapshotMessage('');
    }
  };

  const handleCreateSnapshot = async () => {
    console.log("[TIME MACHINE] Create database snapshot button clicked!");
    setIsSnapshotLoading(true);
    setSnapshotMessage('Ek secure database snapshot banaya ja raha hai...');
    try {
      const res = await LocalBackupService.createSnapshot();
      console.log("[TIME MACHINE] Create snapshot success:", res);
      setDialogMessage({
        title: "Backup Created Successfully!",
        message: res.message
      });
      const list = await LocalBackupService.listSnapshots();
      setSnapshotsList(list);
    } catch (e: any) {
      console.error("[TIME MACHINE] Create snapshot failed:", e);
      setDialogMessage({
        title: "Snapshot Creation Failed",
        message: `Error: ${e?.message || 'Snapshot creation failed.'}`,
        isError: true
      });
    } finally {
      setIsSnapshotLoading(false);
      setSnapshotMessage('');
    }
  };

  const initiateRestoreSnapshot = (filename: string) => {
    console.log("[TIME MACHINE BUTTON] Initiate Restore Clicked for filename:", filename);
    setSnapshotConfirm({ type: 'restore', filename });
  };

  const initiateDeleteSnapshot = (filename: string) => {
    console.log("[TIME MACHINE BUTTON] Initiate Delete Clicked for filename:", filename);
    setSnapshotConfirm({ type: 'delete', filename });
  };

  const executeRestoreSnapshot = async (filename: string) => {
    console.log("[TIME MACHINE ACTION] executeRestoreSnapshot trigger active for:", filename);
    setSnapshotConfirm(null);
    setIsSnapshotLoading(true);
    setSnapshotMessage('Time machine rollback process shuru ho chuka hai...');
    try {
      const res = await LocalBackupService.restoreFromSnapshot(filename);
      console.log("[TIME MACHINE ACTION] restore success response:", res);
      setDialogMessage({
        title: "Database Rollback Successful!",
        message: res.message
      });
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (e: any) {
      console.error("[TIME MACHINE ACTION] Rollback restore process failed:", e);
      setDialogMessage({
        title: "Rollback Failed",
        message: `Restore mein galti hui: ${e.message || e || 'Unknown error'}.`,
        isError: true
      });
    } finally {
      setIsSnapshotLoading(false);
      setSnapshotMessage('');
    }
  };

  const executeDeleteSnapshot = async (filename: string) => {
    console.log("[TIME MACHINE ACTION] executeDeleteSnapshot trigger active for:", filename);
    setSnapshotConfirm(null);
    setIsSnapshotLoading(true);
    setSnapshotMessage('Snapshot delete ho raha hai...');
    try {
      const res = await LocalBackupService.deleteSnapshot(filename);
      console.log("[TIME MACHINE ACTION] delete success response:", res);
      setDialogMessage({
        title: "Snapshot Deleted!",
        message: res.message
      });
      const list = await LocalBackupService.listSnapshots();
      setSnapshotsList(list);
    } catch (e: any) {
      console.error("[TIME MACHINE ACTION] Delete process failed:", e);
      setDialogMessage({
        title: "Deletion Failed",
        message: `Delete karne mein galti hui: ${e.message || e || 'Unknown error'}.`,
        isError: true
      });
    } finally {
      setIsSnapshotLoading(false);
      setSnapshotMessage('');
    }
  };

  const [appSettings, setAppSettings] = useState<AppSettings>({
      offlineMode: true,
      cloudSyncEnabled: false,
      messagingEnabled: true,
      liveSearchEnabled: true
  });

  const [isPremiumLicensed, setIsPremiumLicensed] = useState(false);
  const [licenseCode, setLicenseCode] = useState('');
  const [licenseError, setLicenseError] = useState('');

  useEffect(() => {
    billingService.getAppSettings().then(setAppSettings);
    CloudGatewayManager.checkPremiumStatus().then(setIsPremiumLicensed);
    billingService.getSaleSettings().then(setSaleSettings);
    billingService.getItemSettings().then(setItemSettings);
    billingService.getPurchaseBillSettings().then(setPurchaseBillSettings);
    billingService.getPurchaseReturnSettings().then(setPurchaseReturnSettings);
    billingService.getSaleReturnSettings().then(setSaleReturnSettings);
    billingService.getTransportationSettings().then(setTransportationSettings);
    billingService.getLedgersList().then(setLedgersList);
  }, []);

  const handleUpgradeToPremium = async () => {
    try {
      if (isPremiumLicensed) {
        await CloudGatewayManager.revokePremium();
        setIsPremiumLicensed(false);
        setDialogMessage({
          title: currentLanguage === 'hi' ? 'लाइसेंस रद्द हुआ' : 'License Revoked',
          message: currentLanguage === 'hi'
            ? 'प्रीमियम लाइसेंस बंद कर दिया गया है।'
            : 'Sandbox Premium license deactivated. Synchronizations gates are now locked.',
          isError: false
        });
      } else {
        await CloudGatewayManager.upgradeToPremium();
        setIsPremiumLicensed(true);
        setDialogMessage({
          title: currentLanguage === 'hi' ? 'प्रीमियम पर अपग्रेड हुआ' : 'License Upgraded!',
          message: currentLanguage === 'hi'
            ? 'सफलतापूर्वक प्रीमियम लाइसेंस सक्रिय हो गया है! अब आप क्लाउड सिंक का उपयोग कर सकते हैं।'
            : 'You have been granted a full Sandbox Developer Premium Tier license. You can now toggle and run real-time Cloud Synchronization!',
          isError: false
        });
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleValidateLicenseCode = async () => {
      const key = licenseCode.trim().toUpperCase();
      if (!key) {
          setLicenseError(currentLanguage === 'hi' ? 'कृपया लाइसेंस कुंजी दर्ज करें।' : 'Please enter a license key.');
          return;
      }
      if (key === 'EAZY-PREMIUM-2026') {
          try {
              await CloudGatewayManager.upgradeToPremium();
              setIsPremiumLicensed(true);
              setLicenseCode('');
              setLicenseError('');
              setDialogMessage({
                title: currentLanguage === 'hi' ? 'प्रीमियम पर अपग्रेड हुआ' : 'License Upgraded!',
                message: currentLanguage === 'hi'
                  ? 'सफलतापूर्वक प्रीमियम लाइसेंस सक्रिय हो गया है! अब आप क्लाउड सिंक और प्रीमियम सुविधाओं का उपयोग कर सकते हैं।'
                  : 'You have been granted a full Sandbox Developer Premium Tier license. You can now access Chat, Category Search, and Cloud Sync!',
                isError: false
              });
          } catch (err: any) {
              setLicenseError(err.message || 'Upgrade failed.');
          }
      } else {
          setLicenseError(currentLanguage === 'hi' ? 'अमान्य लाइसेंस कुंजी! सही कोड दर्ज करें।' : 'Invalid license key! Enter correct code.');
      }
  };

  const handleAppSettingsChange = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (key === 'cloudSyncEnabled') {
      try {
        setIsCloudSyncing(true);
        const result = await CloudGatewayManager.toggleCloudPipeline(value as boolean);
        const updated = { ...appSettings, [key]: value };
        setAppSettings(updated);
        
        if (value) {
          setDialogMessage({
            title: currentLanguage === 'hi' ? 'क्लाउड सिंक सक्रिय' : 'Cloud Sync Activated',
            message: currentLanguage === 'hi' 
              ? 'आपका क्लाउड सिंक्रोनाइज़ेशन इंजन अब सक्रिय है। सभी लेनदेन ऑनलाइन सुरक्षित रूप से सिंक होंगे।'
              : 'Your real-time Firebase cloud synchronization gateway is now active. All invoices and ledger entries will sync seamlessly.',
            isError: false
          });
        } else {
          setDialogMessage({
            title: currentLanguage === 'hi' ? 'क्लाउड सिंक अक्षम' : 'Cloud Sync Paused',
            message: currentLanguage === 'hi'
              ? 'क्लाउड सिंक को सफलतापूर्वक अक्षम कर दिया गया है। आपका डेटा स्थानीय रूप से रहने वाला है।'
              : 'Real-time synchronization paused. Operational database records will reside exclusively in local Dexie IndexedDB storage.',
            isError: false
          });
        }
      } catch (err: any) {
        console.error('Cloud synchronization toggle failed:', err);
        setAppSettings(prev => ({ ...prev, [key]: false as any }));
        // Try to force reverse sync
        try {
          await CloudGatewayManager.toggleCloudPipeline(false);
        } catch (_) {}
        
        if (err.message === 'PREMIUM_TIER_UPGRADE_REQUIRED') {
          setDialogMessage({
            title: currentLanguage === 'hi' ? 'प्रीमियम संस्करण आवश्यक है' : 'Upgrade Required (Premium)',
            message: currentLanguage === 'hi'
              ? 'रियल-टाइम क्लाउड सिंक्रोनाइज़ेशन एक प्रीमियम सुविधा है। डिवाइस सिंक करने के लिए कृपया प्रीमियम पर अपग्रेड करें।'
              : 'Real-time cloud synchronization is a premium feature. Please upgrade your store/establishment to EazyBilling v2.0 Premium Tier to connect cross-device registers.',
            isError: true
          });
        } else if (err.message === 'RE_AUTH_REQUIRED') {
          setDialogMessage({
            title: currentLanguage === 'hi' ? 'पुनः प्रमाणीकरण आवश्यक है' : 'Authorization Expired',
            message: currentLanguage === 'hi'
              ? 'आपका प्रमाणीकरण सत्र समाप्त हो गया है या इंटरनेट कनेक्शन नहीं मिला। कृपया पुनः लॉग इन करें।'
              : 'Your cloud authentication token could not be verified or has expired. Please verify your internet connection and log back in.',
            isError: true
          });
        } else {
          setDialogMessage({
            title: 'Gateway Alert',
            message: err.message || 'Validation failed. Please verify your connection or upgrade to Premium.',
            isError: true
          });
        }
      } finally {
        setIsCloudSyncing(false);
      }
      return;
    }

    const updated = { ...appSettings, [key]: value };
    setAppSettings(updated);
    await billingService.saveAppSettings(updated);
  };
  
  // Demo Data Loading State
  const [showSeedConfirmation, setShowSeedConfirmation] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  
  // Reset App Data State
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [cloudAction, setCloudAction] = useState<'upload' | 'download' | null>(null);
  const [dialogMessage, setDialogMessage] = useState<{title: string, message: string, isError?: boolean} | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  const [showEmailAuthModal, setShowEmailAuthModal] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  const [saleSettings, setSaleSettings] = useState({
      cashBilling: false,
      billDiscount: false,
      additionalCharges: false,
      itemWiseDiscount: true,
      transportationDetail: false,
      ecommerceDetail: false,
      reverseCharge: false,
      showLogo: false,
      outOfStockAlert: false,
      discountedQuantity: false,
      previousBillSaleRate: false
  });
  
  const [itemSettings, setItemSettings] = useState({
      cess: false,
      batchNumber: false,
      manufacturingDate: false,
      expiryDate: false,
      wholesalePrice: false,
      itemCompany: false,
      minimumStockAlert: false,
      category: true,
      billOfItem: false
  });

  const [purchaseBillSettings, setPurchaseBillSettings] = useState({
      billDiscount: false,
      saleRateMrpCalculation: true,
      additionalCharges: false,
      itemWiseDiscount: true,
      transportationDetail: false,
      ecommerceDetail: false,
      reverseCharge: false
  });

  const [purchaseReturnSettings, setPurchaseReturnSettings] = useState({
      additionalCharges: false,
      itemWiseDiscount: true,
      transportationDetail: false,
      ecommerceDetail: false,
      reverseCharge: false
  });

  const [saleReturnSettings, setSaleReturnSettings] = useState({
      billDiscount: false,
      additionalCharges: false,
      itemWiseDiscount: true,
      transportationDetail: false,
      ecommerceDetail: false,
      reverseCharge: false
  });

  const [transportationSettings, setTransportationSettings] = useState({
      grNo: true,
      vehicleNo: true,
      origin: true,
      destination: true,
      dispatchMode: true,
      date: true
  });
  
  const [ledgersList, setLedgersList] = useState([
      { id: 1, name: "Bank Commision A/C", checked: false },
      { id: 2, name: "Cash", checked: false },
      { id: 3, name: "Discount A/C", checked: false },
      { id: 4, name: "Freight Inward A/C", checked: true },
      { id: 5, name: "Freight Outward A/C", checked: true },
      { id: 6, name: "Stock In Hand", checked: false },
      { id: 7, name: "Profit & Loss A/C", checked: false },
      { id: 8, name: "Purchase A/C", checked: false },
      { id: 9, name: "Sales A/C", checked: false },
      { id: 10, name: "Round Off A/C", checked: false },
      { id: 11, name: "Trading A/C", checked: false },
      { id: 12, name: "Extra A/C", checked: false },
      { id: 13, name: "IGST A/C", checked: false },
      { id: 14, name: "CGST A/C", checked: false },
      { id: 15, name: "SGST A/C", checked: false },
      { id: 16, name: "UTGST A/C", checked: false },
      { id: 17, name: "Packaging A/C", checked: true },
      { id: 18, name: "Insurance A/C", checked: true },
      { id: 19, name: "Allahabad Bank", checked: false },
      { id: 20, name: "Andhra Bank", checked: false },
      { id: 21, name: "Bank of Baroda", checked: false },
      { id: 22, name: "Bank of India", checked: false },
      { id: 23, name: "Bank of Maharashtra", checked: false },
      { id: 24, name: "Canara Bank", checked: false },
      { id: 25, name: "Central Bank of India", checked: false },
      { id: 26, name: "Corporation Bank", checked: false },
      { id: 27, name: "Dena Bank", checked: false },
      { id: 28, name: "Indian Bank", checked: false },
      { id: 29, name: "Indian Overseas Bank", checked: false },
      { id: 30, name: "IDBI Bank", checked: false },
      { id: 31, name: "Oriental Bank of Commerce", checked: false },
      { id: 32, name: "Punjab and Sindh Bank", checked: false },
      { id: 33, name: "Punjab National Bank", checked: false },
      { id: 34, name: "State Bank of India", checked: false },
      { id: 35, name: "Syndicate Bank", checked: false },
      { id: 36, name: "UCO Bank", checked: false },
      { id: 37, name: "Union Bank of India", checked: false },
      { id: 38, name: "United Bank of India", checked: false },
      { id: 39, name: "Vijaya Bank", checked: false },
      { id: 40, name: "Bandhan Bank", checked: false },
      { id: 41, name: "Catholic Syrian Bank", checked: false },
      { id: 42, name: "City Union Bank", checked: false },
      { id: 43, name: "DCB Bank", checked: false },
      { id: 44, name: "Dhanlaxmi Bank", checked: false },
      { id: 45, name: "Federal Bank", checked: false },
      { id: 46, name: "HDFC Bank", checked: false },
      { id: 47, name: "ICICI Bank", checked: false },
      { id: 48, name: "IDFC Bank", checked: false },
      { id: 49, name: "IndusInd Bank", checked: false },
      { id: 50, name: "Jammu and Kashmir Bank", checked: false },
      { id: 51, name: "Karnataka Bank", checked: false },
      { id: 52, name: "Karur Vysya Bank", checked: false },
      { id: 53, name: "Kotak Mahindra Bank", checked: false },
      { id: 54, name: "Lakshmi Vilas Bank", checked: false },
      { id: 55, name: "Nainital Bank", checked: false },
      { id: 56, name: "RBL Bank", checked: false },
      { id: 57, name: "Tamilnad Mercantile Bank", checked: false },
      { id: 58, name: "YES Bank", checked: false },
      { id: 59, name: "India Post", checked: false },
      { id: 60, name: "Paytm", checked: false },
      { id: 61, name: "Purchase Return A/C", checked: false },
      { id: 62, name: "Sales Return A/C", checked: false },
      { id: 63, name: "OPENING CAPITAL", checked: false }
  ]);

  // Pin Modal State
  const [pinModalConfig, setPinModalConfig] = useState<{
      isOpen: boolean;
      mode: 'enable' | 'disable' | 'change_verify' | 'change_new';
      tempPin?: string; // used when we verified current pin and now need new pin
  }>({ isOpen: false, mode: 'enable' });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Calculate FY dates
  const activeFY = localStorage.getItem('activeFY') || 'BillingDB';
  let initialStartYear = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  if (activeFY.startsWith('BillingDB_')) {
      const parts = activeFY.split('_');
      if (parts.length === 3) {
          initialStartYear = parseInt(parts[1]);
      }
  }
  const [transferStartYear, setTransferStartYear] = useState(initialStartYear);

  const currentFYString = `01/04/${transferStartYear} to 31/03/${transferStartYear + 1}`;
  const nextFYString = `01/04/${transferStartYear + 1} to 31/03/${transferStartYear + 2}`;

  useEffect(() => {
      if (activeView === 'invoice_numbering') {
          billingService.getVoucherSettings().then(setVoucherSettings);
      }
  }, [activeView]);

  const handleVoucherSettingChange = (index: number, field: keyof VoucherSettings, value: string | number) => {
      const updated = [...voucherSettings];
      updated[index] = { ...updated[index], [field]: value };
      setVoucherSettings(updated);
  };

  const saveVoucherSettings = async () => {
      await billingService.saveVoucherSettings(voucherSettings);
      alert('Invoice numbering settings saved!');
  };

  const handleSeedClick = () => {
      setShowSeedConfirmation(true);
  };

  const confirmSeedData = async () => {
      setIsSeeding(true);
      try {
          // Small artificial delay to show the spinner (UX)
          await new Promise(resolve => setTimeout(resolve, 800));
          await billingService.seedDairyData();
          window.location.reload();
      } catch (error) {
          console.error(error);
          alert('Failed to load demo data. Please check console for details.');
          setIsSeeding(false);
          setShowSeedConfirmation(false);
      }
  };

  const handleResetClick = () => {
      setShowResetConfirmation(true);
  };

  const confirmResetData = async () => {
      setIsResetting(true);
      try {
          // Small artificial delay to show the spinner (UX)
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Force active authentication sign outs
          try {
              if (auth) {
                  await auth.signOut();
              }
              if (googleAuthService) {
                  await googleAuthService.signOut();
              }
          } catch (authErr) {
              console.warn("Auth signout during database reset warning:", authErr);
          }

          await billingService.clearAllData();
          localStorage.clear();
          sessionStorage.clear();
          localStorage.setItem('app_reset_completed_v3', 'true');
          window.location.reload();
      } catch (error) {
          console.error(error);
          alert('Failed to reset app data. Please check console for details.');
          setIsResetting(false);
          setShowResetConfirmation(false);
      }
  };

  const handleBackup = async () => {
    try {
      const data = await billingService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EazyBilling_Backup_${new Date().toLocalDateString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Failed to create backup.');
    }
  };

  const handleRecover = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonString = event.target?.result as string;
          const data = JSON.parse(jsonString);
          
          // Phone number validation
          const currentProfile = await billingService.getCompanyProfile();
          
          let importedSettings = data.settings || [];
          if (data.formatName === 'dexie' && Array.isArray(data.data)) {
              const settingsTable = data.data.find((t: any) => t.tableName === 'settings');
              if (settingsTable && Array.isArray(settingsTable.rows)) {
                  importedSettings = settingsTable.rows;
              }
          }

          const importedProfileSetting = importedSettings.find((s: any) => s.key === 'companyProfile');
          const importedMobile = importedProfileSetting?.value?.mobile || '';
          
          if (!currentProfile.mobile) {
            alert('कृपया पहले "My Profile" में जाकर अपना फोन नंबर सेव करें, ताकि हम बैकअप को वेरीफाई कर सकें।');
            return;
          }

          if (currentProfile.mobile !== importedMobile) {
            const cleanCurrent = currentProfile.mobile?.replace(/\D/g, '') || '';
            const cleanImported = importedMobile?.replace(/\D/g, '') || '';
            
            if (cleanCurrent !== cleanImported) {
                const proceed = confirm('बैकअप का फोन नंबर आपके मौजूदा फोन नंबर से मेल नहीं खाता है। क्या आप फिर भी इस बैकअप को रिकवर करना चाहते हैं?');
                if (!proceed) return;
            }
          }

          await billingService.importData(jsonString);
          alert('Data recovered successfully! App will now reload.');
          window.location.reload();
        } catch (error) {
          console.error('Recovery failed:', error);
          alert('Failed to recover data. Invalid backup file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleCloudUpload = async () => {
      try {
          const profile = await billingService.getCompanyProfile();
          if (!profile.mobile) {
              setDialogMessage({ title: 'फ़ोन नंबर आवश्यक है', message: 'कृपया पहले "My Profile" में जाकर अपना फोन नंबर सेव करें।', isError: true });
              return;
          }
          setCloudAction('upload');
      } catch (error: any) {
          setDialogMessage({ title: 'Error', message: error.message || 'Cloud upload failed.', isError: true });
      }
  };

  const handleCloudDownload = async () => {
      try {
          const profile = await billingService.getCompanyProfile();
          if (!profile.mobile) {
              setDialogMessage({ title: 'फ़ोन नंबर आवश्यक है', message: 'कृपया पहले "My Profile" में जाकर अपना फोन नंबर सेव करें।', isError: true });
              return;
          }
          setCloudAction('download');
      } catch (error: any) {
          setDialogMessage({ title: 'Error', message: error.message || 'Cloud download failed.', isError: true });
      }
  };

  const executeCloudAction = async () => {
      const action = cloudAction;
      setCloudAction(null);
      
      if (action === 'upload') {
          try {
              if (navigator.onLine && !auth.currentUser) {
                  try {
                      await signInWithGoogle();
                  } catch (e) {
                      setDialogMessage({ title: 'Error', message: 'Sign in cancelled or failed.', isError: true });
                      return;
                  }
              }

              setIsCloudSyncing(true);
              setSyncMessage('डाटा अपलोड हो रहा है, कृपया प्रतीक्षा करें...');
              
              // Use setTimeout to allow UI to render the loading state
              setTimeout(async () => {
                  try {
                      const message = await billingService.uploadDataToCloud();
                      setIsCloudSyncing(false);
                      setDialogMessage({ title: 'सफलता (Success)', message: message });
                  } catch (error: any) {
                      setIsCloudSyncing(false);
                      setDialogMessage({ title: 'Error', message: error.message || 'Cloud upload failed.', isError: true });
                  }
              }, 100);
          } catch (error: any) {
              setIsCloudSyncing(false);
              setDialogMessage({ title: 'Error', message: error.message || 'Cloud upload failed.', isError: true });
          }
      } else if (action === 'download') {
          try {
              if (navigator.onLine && !auth.currentUser) {
                  try {
                      await signInWithGoogle();
                  } catch (e) {
                      setDialogMessage({ title: 'Error', message: 'Sign in cancelled or failed.', isError: true });
                      return;
                  }
              }

              setIsCloudSyncing(true);
              setSyncMessage('डाटा डाउनलोड हो रहा है, कृपया प्रतीक्षा करें...');
              
              // Use setTimeout to allow UI to render the loading state
              setTimeout(async () => {
                  try {
                      const message = await billingService.downloadDataFromCloud();
                      setIsCloudSyncing(false);
                      setDialogMessage({ title: 'सफलता (Success)', message: message });
                      setTimeout(() => window.location.reload(), 2000);
                  } catch (error: any) {
                      setIsCloudSyncing(false);
                      setDialogMessage({ title: 'Error', message: error.message || 'Cloud download failed.', isError: true });
                  }
              }, 100);
          } catch (error: any) {
              setIsCloudSyncing(false);
              setDialogMessage({ title: 'Error', message: error.message || 'Cloud download failed.', isError: true });
          }
      }
  };

  const handleTransferFinancialYear = async () => {
      setShowTransferDialog(false);
      setIsTransferring(true);
      try {
          // 1. Force a local backup first just in case
          const data = await billingService.exportData();
          const blob = new Blob([data], { type: "application/json" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `Backup_Before_Transfer_${new Date().toLocalDateString()}.json`;
          link.click();

          // 2. Perform the transfer
          const currentYear = transferStartYear;
          const nextYear = currentYear + 1;
          const newFyId = `BillingDB_${currentYear}_${nextYear}`;
          const newFyLabel = `FY ${currentYear}-${nextYear}`;
          
          await billingService.transferFinancialYear(newFyId, newFyLabel);
          
          setIsTransferring(false);
          setDialogMessage({ 
              title: 'सफलता (Success)', 
              message: `वित्तीय वर्ष सफलतापूर्वक ट्रांसफर हो गया है। नया साल (${newFyLabel}) शुरू हो गया है।` 
          });
          
          // Reload the app to reflect the new FY
          setTimeout(() => {
              window.location.reload();
          }, 3000);
      } catch (error: any) {
          setIsTransferring(false);
          setDialogMessage({ title: 'Error', message: error.message || 'Transfer failed.', isError: true });
      }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!emailInput) return;
      setAuthLoading(true);
      try {
          if (emailAuthMode === 'login') {
              await signInWithEmail(emailInput, passwordInput);
              setDialogMessage({ title: 'Success', message: 'Logged in successfully!' });
              setShowEmailAuthModal(false);
          } else if (emailAuthMode === 'signup') {
              if (passwordInput.length < 6) throw new Error('Password must be at least 6 characters.');
              await signUpWithEmail(emailInput, passwordInput);
              setDialogMessage({ title: 'Success', message: 'Account created successfully!' });
              setShowEmailAuthModal(false);
          } else if (emailAuthMode === 'forgot') {
              await resetPasswordEmail(emailInput);
              setDialogMessage({ title: 'Success', message: 'Password reset email sent. Please check your inbox.' });
              setEmailAuthMode('login');
          }
      } catch (err: any) {
          setDialogMessage({ title: 'Error', message: err.message || 'Authentication failed', isError: true });
      } finally {
          setAuthLoading(false);
      }
  };

  const Button = ({ icon: Icon, label, fullWidth = false, onClick }: any) => (
    <button 
      onClick={onClick}
      className={`${fullWidth ? 'col-span-2 py-3' : 'col-span-1 py-4'} bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white p-2 flex flex-col items-center justify-center gap-1.5 transition-colors`}
    >
      <Icon size={22} strokeWidth={2} />
      <span className="text-[12px] font-medium tracking-wide text-center leading-tight">{label}</span>
    </button>
  );

  // INVOICE NUMBERING SUB-SCREEN
  if (activeView === 'invoice_numbering') {
      return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
            <header className="bg-white/80 dark:bg-[#131B2E]/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/80 text-slate-900 dark:text-white p-4 shadow-sm shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
                <div className="max-w-md mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setActiveView('preferences')} 
                            className="p-2 bg-slate-100 dark:bg-[#182239] text-slate-600 dark:text-slate-300 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-xl transition active:scale-95 cursor-pointer touch-manipulation border border-slate-200/50 dark:border-slate-800"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div className="text-left">
                            <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 font-sans">
                                <Hash size={16} className="text-indigo-500" />
                                {currentLanguage === 'hi' ? 'इन्वॉइस नंबरिंग' : 'Invoice Numbering'}
                            </h1>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider font-mono mt-0.5 leading-none">
                                {currentLanguage === 'hi' ? 'सीक्वेंस और प्रीफिक्स सेटअप' : 'Sequence & Prefix Setup'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={saveVoucherSettings} 
                        className="bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-600/10 text-white px-4 py-2 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer border border-indigo-400/30"
                    >
                        {currentLanguage === 'hi' ? 'सहेजें' : 'Save'}
                    </button>
                </div>
            </header>

            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                <div className="max-w-md mx-auto w-full space-y-4">
                    {voucherSettings.map((setting, index) => (
                        <div key={setting.type} className="bg-white dark:bg-[#131B2E] rounded-3xl border border-slate-200/60 dark:border-slate-800/80 p-5 shadow-sm space-y-4 hover:border-indigo-500/20 dark:hover:border-indigo-500/20 transition-all duration-200">
                            <h3 className="font-extrabold text-slate-800 dark:text-white mb-3 text-xs border-b border-slate-100/80 dark:border-slate-850 pb-2.5 flex items-center justify-between uppercase tracking-wider font-mono select-none">
                                <span className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                                    {setting.type}
                                </span>
                                <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-black tracking-wider uppercase">
                                    {currentLanguage === 'hi' ? 'सीक्वेंस सेटअप' : 'SEQUENCE SETUP'}
                                </span>
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase mb-1.5 tracking-widest font-mono">{currentLanguage === 'hi' ? 'प्रीफिक्स' : 'Prefix'}</label>
                                    <input 
                                        type="text" 
                                        value={setting.prefix} 
                                        onChange={e => handleVoucherSettingChange(index, 'prefix', e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-3 text-xs font-bold focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none uppercase font-sans text-slate-900 dark:text-white transition-all shadow-sm"
                                        placeholder="e.g. S"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase mb-1.5 tracking-widest font-mono">{currentLanguage === 'hi' ? 'प्रारंभ संख्या' : 'Start From'}</label>
                                    <input 
                                        type="number" 
                                        value={setting.currentSequence} 
                                        onChange={e => handleVoucherSettingChange(index, 'currentSequence', parseInt(e.target.value) || 0)}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-3 text-xs font-bold focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none font-sans text-slate-900 dark:text-white transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-450 font-mono font-black flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-xl w-max border border-emerald-100/50 dark:border-emerald-900/20 select-none">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                                <span>
                                    {currentLanguage === 'hi' ? 'अगला नंबर (Next code): ' : 'Next Preview: '}
                                    <b className="tracking-wide font-black uppercase text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono ml-0.5">
                                        {setting.prefix || ''}{setting.currentSequence + 1}
                                    </b>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      );
  }

  // PREFERENCES SUB-SCREEN
  if (activeView === 'preferences') {
    const MenuItem = ({ 
      title, 
      subtitle, 
      icon: IconComponent, 
      onClick, 
      badge, 
      rightElement 
    }: { 
      title: string; 
      subtitle: string; 
      icon: React.ComponentType<any>; 
      onClick?: () => void; 
      badge?: string; 
      rightElement?: React.ReactNode; 
    }) => (
      <div 
        onClick={onClick} 
        className={`p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-md hover:border-indigo-100 dark:hover:border-slate-700 transition duration-200 gap-3 min-w-0 ${onClick ? 'active:scale-[0.99]' : ''}`}
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
            <IconComponent size={20} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white truncate">{title}</h3>
              {badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase bg-amber-500 text-slate-950 rounded-md">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{subtitle}</p>
          </div>
        </div>
        {rightElement ? (
          <div onClick={(e) => e.stopPropagation()}>{rightElement}</div>
        ) : (
          onClick && <ArrowLeft size={16} className="rotate-180 text-slate-400 dark:text-slate-500 shrink-0" />
        )}
      </div>
    );

    return (
      <>
        <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.2 }}
        className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]"
      >
        <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center gap-3 shadow-sm border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => onBack()} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition"><ArrowLeft size={22} /></button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-sans tracking-tight leading-none truncate">{currentLanguage === 'hi' ? 'प्राथमिकताएं' : 'Dashboard & General'}</h1>
            <p className="text-[10px] text-slate-400 select-none uppercase font-sans tracking-wider font-extrabold mt-0.5">{currentLanguage === 'hi' ? 'प्राथमिकताएं (क्रम-1)' : 'Preferences (Set-1)'}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Category 1: General & Invoicing Tools */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">
                {currentLanguage === 'hi' ? 'सामान्य और इनवॉइस टूल्स' : 'General & Invoicing Tools'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <MenuItem 
                  title={currentLanguage === 'hi' ? 'यूनीफाइड थीम सैंडबॉक्स' : 'Unified Theme Sandbox'}
                  subtitle={currentLanguage === 'hi' ? 'ऑनबोर्डिंग, लॉकस्क्रीन, पीओएस और सेटिंग्स का सैंडबॉक्स' : 'Interactive console for Onboarding, Lock Screen, POS & Settings views'}
                  icon={Sparkles}
                  badge="👑 PRO"
                  onClick={() => onNavigate('masterLayoutShell')}
                />
                <MenuItem 
                  title={currentLanguage === 'hi' ? 'इन्वेंटरी नंबरिंग' : 'Invoice Numbering'}
                  subtitle={currentLanguage === 'hi' ? 'प्रीफिक्स और वाउचर संख्या क्रम सेट करें' : 'Set prefixes and starting numbers'}
                  icon={Hash}
                  onClick={() => setActiveView('invoice_numbering')}
                />
                {authContext.currentUser?.role === 'admin' && (
                  <MenuItem 
                    title={currentLanguage === 'hi' ? 'डेमो डेटा लोड करें' : 'Load Demo Data'}
                    subtitle={currentLanguage === 'hi' ? 'डेयरी मिल्क व्यावसायिक डेटाबेस लोड करें' : 'Dairy Milk Business Scenario'}
                    icon={Database}
                    onClick={handleSeedClick}
                  />
                )}
              </div>
            </div>

            {/* Category 3: Language & Appearance */}
            <div className="space-y-3 text-left">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">
                {currentLanguage === 'hi' ? 'भाषा और स्वरूप' : 'Language & Appearance'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Language Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                  <div className="p-3.5 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-800/40 flex items-center gap-2">
                    <Globe size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-extrabold uppercase text-slate-500 tracking-wider font-sans">
                      {currentLanguage === 'hi' ? 'ऐप की भाषा' : 'App Language'}
                    </span>
                  </div>
                  <button 
                    onClick={() => onLanguageChange('en')} 
                    className="w-full flex justify-between items-center p-3.5 hover:bg-indigo-50/30 dark:hover:bg-slate-800/30 transition border-b border-slate-100 dark:border-slate-800 cursor-pointer text-left"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">English</span>
                      <span className="text-[10px] text-slate-400">Default Locale</span>
                    </div>
                    {currentLanguage === 'en' && <Check size={18} className="text-indigo-600 dark:text-indigo-400" />}
                  </button>
                  <button 
                    onClick={() => onLanguageChange('hi')} 
                    className="w-full flex justify-between items-center p-3.5 hover:bg-indigo-50/30 dark:hover:bg-slate-800/30 transition cursor-pointer text-left"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">हिंदी</span>
                      <span className="text-[10px] text-slate-400">Hindi Locale</span>
                    </div>
                    {currentLanguage === 'hi' && <Check size={18} className="text-indigo-600 dark:text-indigo-400" />}
                  </button>
                </div>

                {/* Theme Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                  <div className="p-3.5 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-800/40 flex items-center gap-2">
                    {currentTheme === 'light' ? <Sun size={16} className="text-orange-500"/> : currentTheme === 'dark' ? <Moon size={16} className="text-blue-500"/> : <Laptop size={16} className="text-indigo-500"/>}
                    <span className="text-xs font-extrabold uppercase text-slate-500 tracking-wider font-sans">
                      {currentLanguage === 'hi' ? 'ऐप थीम' : 'App Theme'}
                    </span>
                  </div>
                  <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      { key: 'system', label: currentLanguage === 'hi' ? 'सिस्टम डिफ़ॉल्ट' : 'System Default', desc: currentLanguage === 'hi' ? 'डिवाइस सेटिंग्स के अनुकूल' : 'Match device dark mode setting' },
                      { key: 'light', label: currentLanguage === 'hi' ? 'लाइट मोड' : 'Light Mode', desc: currentLanguage === 'hi' ? 'साफ और चमकीला स्वरूप' : 'Bright and high contrast layout' },
                      { key: 'dark', label: currentLanguage === 'hi' ? 'डार्क मोड' : 'Dark Mode', desc: currentLanguage === 'hi' ? 'आंको के लिए आसान' : 'Midnight battery-saver layout' }
                    ].map((t) => (
                      <button 
                        key={t.key}
                        onClick={() => onThemeChange(t.key as any)} 
                        className="w-full flex justify-between items-center p-3 hover:bg-indigo-50/30 dark:hover:bg-slate-800/30 transition text-left cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.label}</span>
                          <span className="text-[9px] text-slate-400 leading-none mt-0.5">{t.desc}</span>
                        </div>
                        {currentTheme === t.key && <Check size={16} className="text-indigo-600 dark:text-indigo-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Category 4: System Control & Recovery */}
            <div className="space-y-3 text-left">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">
                {currentLanguage === 'hi' ? 'सिस्टम नियंत्रण और पुनर्प्राप्ति' : 'System Control & Recovery'}
              </h2>
              
              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 space-y-4 shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <RefreshCcw size={18} className="text-indigo-600 dark:text-indigo-400 animate-spin" style={{ animationDuration: '8s' }} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
                      {currentLanguage === 'hi' ? 'त्वरित ऐप नियंत्रण' : 'Quick App Control'}
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-sans">
                      {currentLanguage === 'hi' ? 'त्वरित ऐप रीलोड और नया सेटअप' : 'Easy reload and setup reset controls'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center gap-1 hover:border-indigo-400 transition-all duration-200 active:scale-95 group cursor-pointer shadow-sm"
                  >
                    <RefreshCcw size={18} className="text-indigo-500 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {currentLanguage === 'hi' ? 'सॉफ्ट रीलोड' : 'Soft Reload'}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {currentLanguage === 'hi' ? 'त्वरित रीफ्रेश 🔄' : 'Quick Refresh 🔄'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      const confirmMsg = currentLanguage === 'hi' 
                        ? "Kya aap onboarding setup shuru se dubara chalana chahte hain? Aapka historic ledger safe rahega." 
                        : "Do you want to re-run the onboarding? Your existing accounts ledger will remain safe.";
                      if (confirm(confirmMsg)) {
                        localStorage.removeItem('onboardingCompleted');
                        localStorage.removeItem('companyProfileSetup');
                        sessionStorage.removeItem('hasShownSplash');
                        window.location.reload();
                      }
                    }}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center gap-1 hover:border-amber-500 transition-all duration-200 active:scale-95 group cursor-pointer shadow-sm"
                  >
                    <ShieldCheck size={18} className="text-amber-500 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {currentLanguage === 'hi' ? 'सेट अप दोहराएं' : 'Redo Setup'}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {currentLanguage === 'hi' ? 'नया सेटअप 🛡️' : 'Fresh Onboarding 🛡️'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Reset App Data */}
              <button 
                onClick={handleResetClick}
                className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-rose-100 dark:border-rose-950/20 p-4 flex items-center justify-between hover:shadow-md hover:border-rose-300 transition duration-200 gap-3 text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900 transition-colors">
                    <Trash2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-455 truncate">
                      {currentLanguage === 'hi' ? 'डेटा रीसेट (सावधानी)' : 'Reset App Data'}
                    </h3>
                    <p className="text-xs text-rose-455 dark:text-rose-500/80 truncate mt-0.5 font-sans">
                      {currentLanguage === 'hi' ? 'सभी डेटा डिलीट करके शुरू से शुरू करें' : 'Clear all local data and start fresh'}
                    </p>
                  </div>
                </div>
                <ArrowLeft size={16} className="rotate-180 text-rose-400 shrink-0" />
              </button>
            </div>

          </div>
        </div>
      </motion.div>

        {/* Confirmation Modal */}
        {showSeedConfirmation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                    {isSeeding ? (
                        <div className="flex flex-col items-center justify-center py-4">
                            <Loader2 size={48} className="text-blue-600 dark:text-blue-400 animate-spin mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Loading Data...</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Please wait while we set up your demo.</p>
                        </div>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-200 dark:border-orange-900/50">
                                <Database size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Load Demo Data?</h3>
                            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-900/30 mb-6">
                                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium flex gap-2 items-start text-left">
                                    <AlertTriangle size={16} className="text-orange-600 shrink-0 mt-0.5" />
                                    <span>Warning: This will <b>WIPE ALL EXISTING DATA</b> and load the "Dairy Milk" business scenario.</span>
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowSeedConfirmation(false)} 
                                    className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmSeedData} 
                                    className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-colors"
                                >
                                    Load Data
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* Reset App Data Confirmation Modal */}
        {showResetConfirmation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                    {isResetting ? (
                        <div className="flex flex-col items-center justify-center py-4">
                            <Loader2 size={48} className="text-red-600 dark:text-red-400 animate-spin mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Resetting App...</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Please wait while we clear your data.</p>
                        </div>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-900/50">
                                <RefreshCcw size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Reset App Data?</h3>
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30 mb-6">
                                <p className="text-red-700 dark:text-red-300 text-sm font-medium flex gap-2 items-start text-left">
                                    <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                                    <span>Warning: This will <b>PERMANENTLY DELETE ALL DATA</b> (items, clients, invoices, settings). You will start completely fresh.</span>
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowResetConfirmation(false)} 
                                    className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmResetData} 
                                    className="flex-1 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors"
                                >
                                    Reset App
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}
      </>
    );
  }

  if (false) {
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)] animate-fadeIn">
        <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center gap-3 shadow-sm border-b border-slate-100 dark:border-slate-800 shrink-0 pt-[max(env(safe-area-inset-top),48px)] sticky top-0 z-40">
          <button onClick={() => setActiveView('preferences')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition" id="ceo_back_pref_btn">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-bold truncate text-[#3b5998] dark:text-indigo-400 font-sans tracking-tight leading-none animate-fadeIn">
            {currentLanguage === 'hi' ? 'सीईओ नियंत्रण पैनल' : 'CEO Control'}
          </h1>
        </header>
 
        <div className="p-4 space-y-6 flex-1 overflow-y-auto">
            <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-100/60 dark:border-indigo-900/30">
                <p className="text-xs sm:text-sm text-indigo-900 dark:text-indigo-300 leading-relaxed font-sans break-words">
                    {currentLanguage === 'hi' 
                     ? 'यहाँ से आप अपने डिजिटल व्यापार के ऑनलाइन फीचर्स को पूरी तरह से चालू या बंद (ON / OFF) कर सकते हैं। डेटा बचाने या प्राइवेसी/ऑफलाइन काम करने के लिए इसे किसी भी समय बदलें।'
                     : 'Manage your digital business online integrations, live cross-device cloud synchronization, server messaging system and cloud query tools here.'}
                </p>
            </div>
 
            <div className="space-y-4">
                {/* Cloud Sync Toggle */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/25 transition space-y-3">
                    <div className="flex items-center justify-between w-full gap-3 min-w-0">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="bg-green-50 dark:bg-green-950/40 p-2.5 rounded-xl text-green-600 dark:text-green-400 shrink-0">
                                <CloudUpload size={22} />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base truncate">
                                    {currentLanguage === 'hi' ? 'क्लाउड सिंक और बैकअप (Cloud Sync)' : 'Cloud Sync & Backup'}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 break-words font-sans">
                                    {currentLanguage === 'hi' ? 'डेटा और इन्वॉइस को सुरक्षित क्लाउड सर्वर पर सिंक करें' : 'Online real-time sync of sales ledger to safe cloud'}
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={appSettings.cloudSyncEnabled}
                                onChange={(e) => handleAppSettingsChange('cloudSyncEnabled', e.target.checked)}
                                id="cloud_sync_toggle_input"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-700 peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                        </label>
                    </div>

                    {/* Premium Sandbox License Seeder Badge */}
                    <div className="border-t border-dashed border-slate-100 dark:border-slate-800 pt-3 mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${isPremiumLicensed ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></div>
                            <p className="text-[11px] font-mono tracking-tight uppercase text-slate-500 dark:text-slate-400">
                                License Mode: <span className={isPremiumLicensed ? 'text-amber-500 font-extrabold' : 'text-slate-600 dark:text-slate-500 font-bold'}>{isPremiumLicensed ? 'PREMIUM TIED (V2.0)' : 'FREE BASIC (OFFLINE ONLY)'}</span>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleUpgradeToPremium}
                            className={`px-3 py-1 text-xs rounded-full font-bold transition shadow-sm ${isPremiumLicensed ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200' : 'bg-amber-500 hover:bg-amber-600 text-slate-900 border border-amber-600/20'}`}
                            id="premium_toggle_trigger_button"
                        >
                            {isPremiumLicensed 
                              ? (currentLanguage === 'hi' ? 'मुफ़्त लाइसेंस बंद करें' : 'Demo Downgrade to Basic') 
                              : (currentLanguage === 'hi' ? 'मुफ़्त प्रीमियम सक्रिय करें' : 'Activate Sandbox Premium License')}
                        </button>
                    </div>

                    {!isPremiumLicensed && (
                        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-2.5 flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                {currentLanguage === 'hi' ? 'प्रीमियम सक्रिय करने के लिए लाइसेंस कुंजी दर्ज करें' : 'Enter License Key to Activate Premium'}
                            </label>
                            <div className="flex gap-2 w-full">
                                <input 
                                    type="text" 
                                    value={licenseCode}
                                    onChange={e => {
                                        setLicenseCode(e.target.value);
                                        setLicenseError('');
                                    }}
                                    placeholder="e.g. EAZY-PREMIUM-2026"
                                    className="flex-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold tracking-widest text-slate-800 dark:text-white outline-none focus:border-amber-500 dark:focus:border-amber-400 transition-colors uppercase"
                                />
                                <button 
                                    onClick={handleValidateLicenseCode}
                                    className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold px-5 rounded-xl transition-all active:scale-98 text-xs cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                                >
                                    <Crown size={12} className="fill-slate-900" />
                                    {currentLanguage === 'hi' ? 'सक्रिय करें' : 'Activate'}
                                </button>
                            </div>
                            {licenseError && (
                                <p className="text-[10px] font-bold text-rose-500 mt-1">
                                    ⚠️ {licenseError}
                                </p>
                            )}
                        </div>
                    )}
                </div>
 
                {/* Messaging Toggle */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between w-full gap-3 min-w-0 hover:bg-slate-50 dark:hover:bg-slate-800/25 transition">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded-xl text-purple-600 dark:text-purple-400 shrink-0">
                            <Bot size={22} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base truncate">
                                {currentLanguage === 'hi' ? 'ग्राहक चैट संवाद' : 'Customer Messaging'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 break-words font-sans">
                                {currentLanguage === 'hi' ? 'ग्राहकों के साथ डिजिटल संदेश और चैट' : 'Live conversation and digital chat with buyers'}
                            </p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={appSettings.messagingEnabled}
                            onChange={(e) => handleAppSettingsChange('messagingEnabled', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-700 peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                    </label>
                </div>
 
                {/* Live Search Toggle */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between w-full gap-3 min-w-0 hover:bg-slate-50 dark:hover:bg-slate-800/25 transition flex-1">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                            <Globe size={22} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base truncate">
                                {currentLanguage === 'hi' ? 'सक्रिय ग्राहक खोज' : 'Live Customer Search'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 break-words font-sans">
                                {currentLanguage === 'hi' ? 'ऑनलाइन डेटाबेस से त्वरित ग्राहक रिकॉर्ड खोजें' : 'Instantly look up client profiles from secure cloud storage'}
                            </p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={appSettings.liveSearchEnabled}
                            onChange={(e) => handleAppSettingsChange('liveSearchEnabled', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-700 peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                    </label>
                </div>
            </div>
 
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex items-start gap-2.5 text-slate-500 dark:text-slate-400 p-2 min-w-0 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-200 dark:border-slate-800/60">
                    <ShieldCheck size={18} className="shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                    <p className="text-xs leading-relaxed break-words font-sans">
                        <b>{currentLanguage === 'hi' ? 'मुख्य नोट:' : 'System Backup Note:'}</b> {currentLanguage === 'hi' 
                         ? 'ऑफ़लाइन कोर हमेशा सक्रिय रहता है। इंटरनेट न होने पर भी बिलिंग और खाता प्रबंधन सुचारू रूप से चलता रहेगा। ऑनलाइन फ़ीचर्स बंद होने पर ऐप केवल लोकल डेटा का उपयोग करेगी।'
                         : 'Offline-first core engine remains permanently operational. Billing, catalog access, and ledger books continue normal activity without any internet dependence.'}
                    </p>
                </div>
            </div>
        </div>
      </div>
    );
  }

  const legacyrelics = null; /*
                    <p className="text-xs leading-relaxed break-words font-sans">
                        <b>{currentLanguage === 'hi' ? 'मुख्य नोट:' : 'System Backup Note:'}</b> {currentLanguage === 'hi' 
                         ? 'ऑफ़लाइन कोर हमेशा सक्रिय रहता है। इंटरनेट न होने पर भी बिलिंग और खाता प्रबंधन सुचारू रूप से चलता रहेगा। ऑनलाइन फ़ीचर्स बंद होने पर ऐप केवल लोकल डेटा का उपयोग करेगी।'
                         : 'Offline-first core engine remains permanently operational. Billing, catalog access, and ledger books continue normal activity without any internet dependence.'}
                    </p>

                            <Globe size={24} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <h3 className="font-bold text-gray-800 dark:text-white text-sm sm:text-base truncate">{currentLanguage === 'hi' ? 'सक्रिय ग्राहक खोज' : 'Live Customer Search'}</h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400 break-words">{currentLanguage === 'hi' ? 'सुरक्षित ऑनलाइन डेटाबेस से ग्राहकों की खोज' : 'Instantly search customer profiles from secure cloud'}</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={appSettings.liveSearchEnabled}
                            onChange={(e) => handleAppSettingsChange('liveSearchEnabled', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
 
            <div className="pt-4 border-t border-gray-200 dark:border-slate-800">
                <div className="flex items-start gap-2.5 text-slate-500 dark:text-slate-400 p-2 min-w-0">
                    <ShieldCheck size={18} className="shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed break-words">
                        <b>{currentLanguage === 'hi' ? 'मुख्य नोट:' : 'System Note:'}</b> {currentLanguage === 'hi' 
                         ? 'ऑफ़लाइन कोर हमेशा चालू रहता है। इंटरनेट न होने पर भी बिलिंग और खाता प्रबंधन कभी नहीं रुकेगा। ऑनलाइन फ़ीचर्स बंद होने पर ऐप केवल लोकल डेटा का उपयोग करेगी।'
                         : 'Offline core stays always active. Your transactions, ledger calculations and bills continue to register securely in local storage environment.'}
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  )*/;

  // SYSTEM DIAGNOSTICS & HEALTH SUB-SCREEN
  if (activeView === 'system_health') {
    return (
      <SystemHealth onBack={() => setActiveView('main')} />
    );
  }

  // MASTER SYSTEM HEALTH & STRESS DASHBOARD
  if (activeView === 'master_health') {
    return (
      <SystemHealthDashboard onBack={() => setActiveView('main')} />
    );
  }

  // STAFF MEMBERS MANAGEMENT SCREEN
  if (activeView === 'staff_members') {
    return (
      <StaffManagement 
        onBack={() => setActiveView('main')} 
        currentLanguage={currentLanguage} 
        onViewAuditLogs={(userId) => {
          setAuditLogUserFilter(userId);
          setActiveView('audit_logs');
        }}
      />
    );
  }

  // SYSTEM AUDIT LOG RECONCILIATION SCREEN
  if (activeView === 'audit_logs') {
    return (
      <AuditLogScreen 
        onBack={() => {
          setAuditLogUserFilter('all');
          setActiveView('main');
        }} 
        currentLanguage={currentLanguage} 
        initialSelectedUser={auditLogUserFilter}
      />
    );
  }

  // PASSWORD SETTINGS SUB-SCREEN
  if (activeView === 'password_settings') {
    const isLockEnabled = localStorage.getItem('appLockEnabled') === 'true';
    
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)] animate-in fade-in duration-200">
        <header className="bg-indigo-600 dark:bg-slate-900 text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)] border-b border-indigo-700/30 dark:border-slate-800">
          <button onClick={() => setActiveView('main')} className="p-1 hover:bg-white/10 rounded-lg active:scale-90 transition-all duration-150"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold tracking-tight">{t.appSecurity}</h1>
        </header>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
             <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 p-5 flex items-center justify-between w-full">
                 <div className="flex items-center gap-4">
                     <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/15">
                         <ShieldCheck size={24} />
                     </div>
                     <div className="flex-1 text-left">
                         <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">{t.appLock}</h3>
                         <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">{t.requirePin}</p>
                     </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={isLockEnabled}
                      onChange={(e) => {
                          e.preventDefault(); // Prevent default checkbox action, we handle it via modal
                          const enable = !isLockEnabled;
                          if (enable) {
                              setPinError('');
                              setPinInput('');
                              setPinModalConfig({ isOpen: true, mode: 'enable' });
                          } else {
                              setPinError('');
                              setPinInput('');
                              setPinModalConfig({ isOpen: true, mode: 'disable' });
                          }
                      }}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                 </label>
             </div>

             {isLockEnabled && (
                <button 
                  onClick={() => {
                      setPinError('');
                      setPinInput('');
                      setPinModalConfig({ isOpen: true, mode: 'change_verify' });
                  }}
                  className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 p-5 flex items-center justify-between hover:bg-slate-50/55 dark:hover:bg-slate-800/40 transition-all duration-200 active:scale-98"
                >
                    <div className="flex items-center gap-4">
                         <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-slate-800/40">
                             <Key size={24} />
                         </div>
                         <div className="flex-1 text-left">
                             <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">{t.changePin}</h3>
                         </div>
                     </div>
                     <ArrowLeft size={20} className="rotate-180 text-slate-400 dark:text-slate-500" />
                </button>
             )}
        </div>

        {/* THEMED PIN MODAL */}
        {pinModalConfig.isOpen && (
             <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                 <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                     <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/45 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100/15">
                         <Key size={24} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
                     </div>
                     <h3 className={THEME.modal.title}>
                         {pinModalConfig.mode === 'enable' ? t.setNewPin : 
                          pinModalConfig.mode === 'disable' ? t.enterPinDisable :
                          pinModalConfig.mode === 'change_verify' ? t.enterCurrentPin :
                          t.enterNewPin}
                     </h3>
                     <p className={THEME.modal.subtitle}>
                         {pinModalConfig.mode === 'enable' || pinModalConfig.mode === 'change_new' ? t.numericPinPrompt : t.verifyPinPrompt}
                     </p>
                     
                     <form onSubmit={async (e) => {
                         e.preventDefault();
                         if (!pinInput) return;
                         
                         const mode = pinModalConfig.mode;
                         const savedPin = localStorage.getItem('appPin');
                         
                         if (mode === 'enable') {
                             localStorage.setItem('appPin', pinInput);
                             localStorage.setItem('appLockEnabled', 'true');
                             try {
                                 const pHash = await OnboardingManager.generatePinHash(pinInput);
                                 await OnboardingManager.setupLocalAccess(pHash);
                             } catch (err) {
                                 console.warn("Could not save to Dexie PIN: ", err);
                             }
                             setDialogMessage({ title: 'Success', message: 'App lock successfully enabled!' });
                             setPinModalConfig({ isOpen: false, mode: 'enable' });
                             setActiveView('main');
                             setTimeout(() => setActiveView('password_settings'), 10);
                         } else if (mode === 'disable') {
                             if (pinInput === savedPin) {
                                 localStorage.setItem('appLockEnabled', 'false');
                                 try {
                                     await OnboardingManager.removeLocalAccess();
                                 } catch (err) {
                                     console.warn("Could not remove Dexie PIN: ", err);
                                 }
                                 localStorage.removeItem('appPin');
                                 setDialogMessage({ title: 'Success', message: 'App lock disabled.' });
                                 setPinModalConfig({ isOpen: false, mode: 'enable' });
                                 setActiveView('main');
                                 setTimeout(() => setActiveView('password_settings'), 10);
                             } else {
                                 setPinError('Incorrect PIN!');
                             }
                         } else if (mode === 'change_verify') {
                             if (pinInput === savedPin) {
                                 setPinInput('');
                                 setPinError('');
                                 setPinModalConfig({ isOpen: true, mode: 'change_new' });
                             } else {
                                 setPinError('Incorrect PIN!');
                             }
                         } else if (mode === 'change_new') {
                             localStorage.setItem('appPin', pinInput);
                             try {
                                 const pHash = await OnboardingManager.generatePinHash(pinInput);
                                 await OnboardingManager.setupLocalAccess(pHash);
                             } catch (err) {
                                 console.warn("Could not change PIN configuration in Dexie: ", err);
                             }
                             setDialogMessage({ title: 'Success', message: 'PIN changed successfully!' });
                             setPinModalConfig({ isOpen: false, mode: 'enable' });
                             setActiveView('main');
                             setTimeout(() => setActiveView('password_settings'), 10);
                         }
                     }}>
                         <input 
                            
                            autoFocus
                            type="password" maxLength={6} value={pinInput}
                            onChange={(e) => {
                                setPinInput(e.target.value);
                                if (pinError) setPinError('');
                            }}
                            placeholder="••••"
                            className={THEME.input.pin}
                         />
                         <div className="h-5 flex items-center justify-center mb-4">
                             {pinError && <p className="text-red-500 text-xs font-bold animate-in slide-in-from-top-1">{pinError}</p>}
                         </div>
                         <div className="flex gap-3">
                            <button 
                                type="button"
                                onClick={() => {
                                    setPinModalConfig({ isOpen: false, mode: 'enable' });
                                    setPinError('');
                                    setPinInput('');
                                }}
                                className={THEME.button.secondary}
                            >
                                {t.cancel}
                            </button>
                            <button 
                                type="submit"
                                disabled={!pinInput}
                                className={THEME.button.primary}
                            >
                                {t.confirm}
                            </button>
                         </div>
                     </form>
                 </div>
             </div>
        )}
      </div>
    );
  }

  // TIME MACHINE SUB-SCREEN
  if (activeView === 'time_machine') {
    // Helper function inside component to format dates beautifully
    const formatSnapshotName = (filename: string) => {
      const isPreRestore = filename.includes('prerestore');
      const clean = filename.replace('eb_snapshot_', '').replace('_prerestore', '').replace('.json', '');
      const parts = clean.split('_');
      const datePart = parts[0] || ''; 
      const timePart = parts[1] || ''; 

      let displayDate = datePart;
      try {
        if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [y, m, d] = datePart.split('-');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthIndex = parseInt(m, 10) - 1;
          if (monthIndex >= 0 && monthIndex < 12) {
            displayDate = `${parseInt(d, 10)} ${months[monthIndex]} ${y}`;
          }
        }
      } catch (e) {}

      let displayTime = timePart;
      try {
        if (timePart && timePart.length >= 6) {
          const h = parseInt(timePart.substring(0, 2), 10);
          const min = timePart.substring(2, 4);
          const s = timePart.substring(4, 6);
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12 = h % 12 || 12;
          const padH = h12.toString().padStart(2, '0');
          displayTime = `${padH}:${min}:${s} ${ampm}`;
        }
      } catch (e) {}
      
      return { displayDate, displayTime, isPreRestore };
    };

    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)] font-sans">
        {/* Dynamic header */}
        <header className="bg-gradient-to-r from-slate-800 to-slate-950 text-white p-4 flex items-center justify-between shadow-lg shrink-0 pt-[max(env(safe-area-inset-top),48px)] border-b border-slate-700/50">
          <div className="flex items-center gap-3.5">
            <button 
              onClick={() => {
                console.log("[TIME MACHINE] Heading back to Main Settings");
                setActiveView('main');
              }}
              className="p-2 -m-2 rounded-full hover:bg-slate-800 active:scale-95 transition-all text-slate-300 hover:text-white"
              title="Go Back"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Time Machine</h1>
              <p className="text-[10px] text-slate-400 font-medium font-sans">Database Snapshots & Integrity</p>
            </div>
          </div>
          <button 
            onClick={handleCreateSnapshot} 
            disabled={isSnapshotLoading}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md hover:shadow-blue-500/10 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
          >
            {isSnapshotLoading && !snapshotsList.length ? (
              <Loader2 className="animate-spin" size={13} />
            ) : (
              <Database size={13} />
            )}
            <span>Create Snapshot</span>
          </button>
        </header>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Info Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900/50 dark:to-indigo-950/20 border border-blue-200 dark:border-indigo-900/30 rounded-xl p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/40 p-2.5 rounded-xl text-blue-600 dark:text-blue-400 shrink-0 h-fit">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white text-base">Triple-Sync Time-Machine</h3>
                <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Aapka saara billing aur ledger data humesha local device memory mein safe rehta hai. Is local engine ki help se aap kisi bhi purane checkpoint (snapshot) par ja sakte hain!
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] font-semibold text-gray-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Check size={14} className="text-green-500" />
                    <span>Immutable Ledger</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={14} className="text-green-500" />
                    <span>SHA-256 Hashing</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Check size={14} className="text-green-500" />
                    <span>Auto-Backup Before Restore (Suraksha Kavach)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <button 
            onClick={handleCreateSnapshot}
            disabled={isSnapshotLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#3b5998] hover:bg-[#2d4373] text-white font-bold rounded-xl shadow-md transition disabled:opacity-75"
          >
            {isSnapshotLoading && !snapshotsList.length ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Database size={20} />
            )}
            <span>Naya State Snapshot Banayein</span>
          </button>

          {/* Status Message */}
          {snapshotMessage && (
            <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-3 rounded-lg border border-blue-500/20 text-xs font-semibold text-center animate-pulse">
              {snapshotMessage}
            </div>
          )}

          {/* GOOGLE DRIVE INTEGRATION PANEL */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cloud className="text-blue-500 fill-blue-500/10 shrink-0" size={20} />
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">Google Drive Cloud Synchronization</h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isDriveConnected ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                {isDriveConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* GOOGLE DRIVE SIMULATION & DIAGNOSTIC RUNNER CONTROLS */}
            <div className="bg-blue-50/40 dark:bg-slate-950/40 p-3.5 rounded-xl border border-dashed border-blue-200 dark:border-blue-900/30 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                  🛠️ CEO Sandbox Sync Simulator
                </span>
                <span className="text-[9px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 px-1.5 py-0.5 rounded uppercase">
                  Testing Mode
                </span>
              </div>
              
              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5 text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-[11px]">Mock Sync Mode (USE_MOCK_GOOGLE)</span>
                  <p className="text-[10px] leading-tight text-slate-500">Mocks connection & upload without live Google Client credentials.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleMockGoogle(!useMockGoogle)}
                  className={`w-10 h-5 flex items-center rounded-all p-0.5 duration-300 cursor-pointer ${useMockGoogle ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'}`}
                  style={{ borderRadius: '999px', width: '38px', height: '20px' }}
                >
                  <span className="bg-white w-4 h-4 rounded-full shadow-md transform" style={{ borderRadius: '999px' }} />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 text-xs border-t border-slate-200/50 dark:border-slate-800/50 pt-2.5">
                <div className="space-y-0.5 text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-[11px] text-rose-600 dark:text-rose-400">Simulate Network Error</span>
                  <p className="text-[10px] leading-tight text-slate-500">Throws: "Net connection check karein, sync fail hua."</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSimulateNetError(!simulateNetError)}
                  className={`w-10 h-5 flex items-center rounded-all p-0.5 duration-300 cursor-pointer ${simulateNetError ? 'bg-rose-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'}`}
                  style={{ borderRadius: '999px', width: '38px', height: '20px' }}
                >
                  <span className="bg-white w-4 h-4 rounded-full shadow-md transform" style={{ borderRadius: '999px' }} />
                </button>
              </div>
            </div>

            {driveStatusMsg && (
              <div className="text-xs text-blue-500 dark:text-blue-400 font-semibold animate-pulse text-center">
                {driveStatusMsg}
              </div>
            )}

            {/* Lottie or UI Simulated Progress Loader bar */}
            {uploadProgressValue !== null && (
              <div className="bg-blue-50/55 dark:bg-slate-950 p-4 rounded-xl border border-blue-100 dark:border-slate-800/75 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-400">
                  <span className="flex items-center gap-1.5 animate-pulse">
                    <Loader2 size={13} className="animate-spin" />
                    Uploading snapshot to Google Drive...
                  </span>
                  <span>{uploadProgressValue}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-100 ease-out"
                    style={{ width: `${uploadProgressValue}%` }}
                  />
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 text-center leading-normal italic">
                  EazyBilling file components are being packaged and distributed to Cloud Drive buckets...
                </div>
              </div>
            )}

            {isDriveConnected ? (
              <div className="space-y-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-950/30 rounded-xl p-3 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <Check className="text-emerald-500 flex-shrink-0" size={16} />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Auto-sync active! Cloud connection surakshit hai.
                    </span>
                  </div>
                  {driveEmail && (
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded break-all max-w-[150px] truncate">
                      {driveEmail}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={loadDriveSnapshots}
                    disabled={isDriveLoading}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <RefreshCcw size={13} className={isDriveLoading ? 'animate-spin' : ''} />
                    <span>Refresh Cloud Backups</span>
                  </button>
                  <button 
                    onClick={handleDisconnectDrive}
                    className="py-2.5 px-3.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/25 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl active:scale-95 transition-all text-center"
                    title="Disconnect Account"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Apne billing data ko surakshit rakhne ke liye Google Drive account connect karein. Isse aapke manual aur auto checkpoints Google Drive (`EazyBilling_Backups` folder) mein automatic upload hote rahenge.
                </p>
                <button 
                  onClick={handleConnectDrive}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
                >
                  <CloudUpload size={16} />
                  <span>Connect Google Drive & Enable Sync</span>
                </button>
              </div>
            )}

            {/* Manual Setup Guide with folding toggle */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <button 
                onClick={() => setShowSetupGuide(!showSetupGuide)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                type="button"
              >
                <div className="flex items-center gap-1.5">
                  <Info size={14} className="text-slate-500" />
                  <span>CEO Google Console Credentials Guide</span>
                </div>
                {showSetupGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              
              {showSetupGuide && (
                <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 text-xs text-slate-600 dark:text-slate-400 space-y-3 leading-relaxed border-t border-slate-200 dark:border-slate-800">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Google OAuth Client configuration guide for CEO / Admins:</p>
                  <ol className="list-decimal pl-4 space-y-2">
                    <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink size={10} /></a> and select/create a project.</li>
                    <li>Navigate to <strong>APIs & Services &gt; Library</strong>. Search for <strong>Google Drive API</strong> and click <strong>Enable</strong>.</li>
                    <li>Go to <strong>OAuth consent screen</strong>, select <strong>External</strong> user type, and complete details (App name, support email, developer contact).</li>
                    <li>In the <strong>Scopes</strong> step, add <code>https://www.googleapis.com/auth/drive.file</code> (this limits applet access to ONLY folders/files created by this billing app itself, ensuring maximum privacy!).</li>
                    <li>Go to <strong>Credentials &gt; Create Credentials &gt; OAuth client ID</strong>.</li>
                    <li>Select <strong>Web Application</strong>. Add your deployment URL <code>https://...</code> to both:
                      <ul className="list-disc pl-4 mt-1 space-y-1">
                        <li><strong>Authorized JavaScript Origins</strong> (needed for Web login button)</li>
                        <li><strong>Authorized Redirect URIs</strong> (configured in Firebase Authentication auth provider)</li>
                      </ul>
                    </li>
                    <li>For Native Mobile builds, create an <strong>Android client ID</strong>. Enter your custom app package name (see <code>capacitor.config.ts</code>) and SHA-1 fingerprint, then update <code>capacitor.config.ts</code> GoogleAuth configurations.</li>
                  </ol>
                  <div className="p-3 bg-blue-100/50 dark:bg-blue-950/30 rounded-lg text-[11px] text-blue-700 dark:text-blue-300 mt-2">
                    💡 <strong>Pro-Tip:</strong> Firebase Authentication uses GIS automatically when enabled. Always ensure that 'Google' login is enabled under the Firebase console 'Authentication &gt; Sign-In Methods' with client IDs correctly synchronized.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* GOOGLE DRIVE CLOUD CHECKPOINTS */}
          {isDriveConnected && (
            <div className="space-y-3 font-sans">
              <div className="flex items-center justify-between pl-1">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Google Drive Cloud Backups</h2>
                {isDriveLoading && <Loader2 className="animate-spin text-blue-500" size={14} />}
              </div>

              {driveError ? (
                <div className="bg-red-50 dark:bg-rose-950/20 border border-red-100 dark:border-rose-900/30 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2">
                  <span className="text-xs text-rose-700 dark:text-rose-400 font-semibold">{driveError}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (isSimulateNetworkError()) {
                          handleToggleSimulateNetError(false);
                        }
                        loadDriveSnapshots();
                      }}
                      className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 text-gray-700 dark:text-gray-300 text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer select-none"
                    >
                      🔄 Run Scan Again
                    </button>
                    {isSimulateNetworkError() && (
                      <button 
                        onClick={() => {
                          handleToggleSimulateNetError(false);
                          showSetupGuide && setShowSetupGuide(false);
                          setTimeout(() => {
                            loadDriveSnapshots();
                          }, 100);
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer select-none"
                      >
                        ❌ Disable Error Simulation
                      </button>
                    )}
                  </div>
                </div>
              ) : isDriveLoading && driveSnapshotsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl">
                  <Loader2 className="animate-spin mb-2" size={24} />
                  <span className="text-[11px] font-semibold">Google Drive scans ho raha hai...</span>
                </div>
              ) : driveSnapshotsList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl p-6 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Google Drive backup directory mein abhi tak koi cloud snapshots nahi hain.</p>
                  <p className="text-[10px] text-gray-400 mt-1">Niche kisi bhi local snapshot ke sath wale upload button click karke use cloud par send karein.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {driveSnapshotsList.map((driveFile) => {
                    const { displayDate, displayTime } = formatSnapshotName(driveFile.name);
                    const sizeKB = driveFile.size ? `${(parseInt(driveFile.size) / 1024).toFixed(1)} KB` : 'Compressed';
                    
                    return (
                      <div 
                        key={driveFile.id} 
                        className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between shadow-sm hover:border-emerald-400 dark:hover:border-emerald-500/50 transition duration-150"
                      >
                        <div className="space-y-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-gray-800 dark:text-white">{displayDate}</span>
                            <span className="text-xs font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/45 px-1.5 py-0.5 rounded">{displayTime}</span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 text-gray-400 rounded uppercase font-bold">{sizeKB}</span>
                          </div>
                          <p className="text-[11px] font-mono text-gray-400 truncate max-w-[190px] sm:max-w-xs">{driveFile.name}</p>
                          <span className="inline-block text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 px-1.5 py-0.5 rounded mt-1">
                            ☁️ Google Drive Checkpoint
                          </span>
                        </div>

                        <button 
                          onClick={() => handleRestoreFromDrive(driveFile)}
                          className="bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-900/30 hover:border-transparent transition flex items-center gap-1 cursor-pointer active:scale-95 duration-75 select-none"
                        >
                          <CloudDownload size={13} />
                          <span>Restore</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* List Section */}
          <div className="space-y-3 font-sans">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Available Local Checkpoints</h2>
            
            {isSnapshotLoading && !snapshotsList.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Loader2 className="animate-spin mb-2" size={32} />
                <span className="text-sm font-semibold">Snapshots load ho rahe hain...</span>
              </div>
            ) : snapshotsList.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl p-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Abhi tak koi local snapshot nahi mila hai.</p>
                <p className="text-xs text-gray-400 mt-1">Upar diye button par click karke apna pehla local backup snapshot banayein!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {snapshotsList.map((filename) => {
                  const { displayDate, displayTime, isPreRestore } = formatSnapshotName(filename);

                  return (
                    <div 
                      key={filename} 
                      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between shadow-sm hover:border-blue-400 dark:hover:border-blue-500/50 transition duration-150"
                    >
                      <div className="space-y-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-gray-800 dark:text-white">{displayDate}</span>
                          <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{displayTime}</span>
                        </div>
                        <p className="text-[11px] font-mono text-gray-400 truncate max-w-[190px] sm:max-w-xs">{filename}</p>
                        {isPreRestore ? (
                          <span className="inline-block text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded mt-1">
                            ⚠️ Auto-Restore Suraksha Backup
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded mt-1">
                            ✅ Swa-banaaya Checkpoint
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isDriveConnected && (
                          <button 
                            onClick={() => handleManualUploadToDrive(filename)}
                            className="bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-600 hover:text-white text-sky-700 dark:text-sky-400 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-sky-100 dark:border-sky-900/20 hover:border-transparent transition flex items-center gap-1 cursor-pointer active:scale-95 duration-75 select-none"
                            title="Google Drive par sync karein"
                          >
                            <CloudUpload size={13} />
                          </button>
                        )}

                        <button 
                          onClick={() => {
                            console.log("[TIME MACHINE DOM] Restore Button HTML Clicked for filename:", filename);
                            initiateRestoreSnapshot(filename);
                          }}
                          className="bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:border-transparent transition flex items-center gap-1 cursor-pointer active:scale-95 duration-75 select-none"
                        >
                          <RefreshCcw size={13} />
                          <span>Restore</span>
                        </button>

                        <button 
                          onClick={() => {
                            console.log("[TIME MACHINE DOM] Delete Button HTML Clicked for filename:", filename);
                            initiateDeleteSnapshot(filename);
                          }}
                          className="bg-rose-50 hover:bg-rose-100 active:bg-rose-200 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-2.5 rounded-lg border border-rose-200/40 dark:border-rose-900/40 transition flex items-center justify-center cursor-pointer active:scale-95 duration-75 select-none"
                          title="Delete Snapshot"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 1 TRIPLE SYNC DIAGNOSTICS & CRYPTO INTEGRITY CHAIN VALIDATION */}
          <div className="pt-4 border-t border-gray-200 dark:border-slate-800">
            <Step1Validator />
          </div>
        </div>

        {/* Custom Dialog for Snapshot Confirmation inside Time Machine view */}
        {snapshotConfirm && (
            <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                        {snapshotConfirm.type === 'delete' ? (
                          <>
                            <Trash2 className="text-rose-500 shrink-0" size={22} />
                            <span>Delete Snapshot?</span>
                          </>
                        ) : (
                          <>
                            <RefreshCcw className="text-blue-500 shrink-0" size={22} />
                            <span>Rollback Snapshot?</span>
                          </>
                        )}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
                        {snapshotConfirm.type === 'delete' ? (
                            <>
                                ALERT: Kya aap sach mein snapshot <span className="font-mono font-bold text-rose-500 break-all">"{snapshotConfirm.filename}"</span> ko permanently delete karna chahte hain? Isse ye restore list se hamesha ke liye delete ho jayega aur recovers nahi kiya ja sakega.
                            </>
                        ) : (
                            <>
                                ALERT: Kya aap sach mein snapshot <span className="font-mono font-bold text-blue-500 break-all">"{snapshotConfirm.filename}"</span> se poora database rollback karna chahte hain? Isse aapka abhi ka data badal jayega, par hum safety ke liye current state ka automatic backup create kar lenge.
                            </>
                        )}
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => {
                                console.log("[TIME MACHINE] Confirmation cancelled for:", snapshotConfirm.filename);
                                setSnapshotConfirm(null);
                            }} 
                            className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer active:scale-95 duration-100 text-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => {
                                if (snapshotConfirm.type === 'delete') {
                                    executeDeleteSnapshot(snapshotConfirm.filename);
                                } else {
                                    executeRestoreSnapshot(snapshotConfirm.filename);
                                }
                            }} 
                            className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition cursor-pointer active:scale-95 duration-100 text-sm ${
                                snapshotConfirm.type === 'delete' 
                                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/15' 
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/15'
                            }`}
                        >
                            {snapshotConfirm.type === 'delete' ? 'Delete Now' : 'Rollback Now'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Custom Dialog for Messages inside Time Machine view */}
        {dialogMessage && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${dialogMessage.isError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {dialogMessage.isError ? <ShieldCheck size={32} /> : <ShieldCheck size={32} />}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{dialogMessage.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">{dialogMessage.message}</p>
                    <button 
                        onClick={() => setDialogMessage(null)} 
                        className="w-full py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-colors"
                    >
                        OK
                    </button>
                </div>
            </div>
        )}
      </div>
    );
  }

  // PREFERENCES 2 SUB-SCREEN
  if (activeView === 'preferences2') {
    const MenuItem = ({ 
      title, 
      subtitle, 
      icon: IconComponent, 
      onClick, 
      badge, 
      rightElement 
    }: { 
      title: string; 
      subtitle: string; 
      icon: React.ComponentType<any>; 
      onClick?: () => void; 
      badge?: string; 
      rightElement?: React.ReactNode; 
    }) => (
      <div 
        onClick={onClick} 
        className={`p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-md hover:border-indigo-100 dark:hover:border-slate-700 transition duration-200 gap-3 min-w-0 ${onClick ? 'active:scale-[0.99]' : ''}`}
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
            <IconComponent size={20} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white truncate">{title}</h3>
              {badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase bg-amber-500 text-slate-950 rounded-md">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{subtitle}</p>
          </div>
        </div>
        {rightElement ? (
          <div onClick={(e) => e.stopPropagation()}>{rightElement}</div>
        ) : (
          <div className="text-slate-400 dark:text-slate-600 shrink-0">
            <Check className="opacity-0 group-hover:opacity-100" size={16} />
          </div>
        )}
      </div>
    );

    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.2 }}
        className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]"
      >
        <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center gap-3 shadow-sm border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('main')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition"><ArrowLeft size={22} /></button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-sans tracking-tight leading-none truncate">{currentLanguage === 'hi' ? 'बिक्री और खरीद सेटिंग्स' : 'Sale & Purchase Settings'}</h1>
            <p className="text-[10px] text-slate-400 select-none uppercase font-sans tracking-wider font-extrabold mt-0.5">{currentLanguage === 'hi' ? 'प्राथमिकताएं (क्रम-2)' : 'Preferences (Set-2)'}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            

            {/* Category 2 */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">
                {currentLanguage === 'hi' ? 'इन्वेंटरी और आइटम्स' : 'Inventory & Items'}
              </h2>
              <MenuItem 
                title={currentLanguage === 'hi' ? 'आइटम्स' : 'Items Settings'}
                subtitle={currentLanguage === 'hi' ? 'आइटम सेटिंग्स बदलें (जैसे उप-श्रेणियाँ, बारकोड फ़ील्ड)' : 'Change your Item(s) active field configurations'}
                icon={Hash}
                onClick={() => setActiveView('item_settings')}
              />
            </div>

            {/* Category 3 */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">
                {currentLanguage === 'hi' ? 'बिलिंग व अकाउंट्स' : 'Billing & Transaction Settings'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <MenuItem 
                  title={currentLanguage === 'hi' ? 'बिक्री बिल सेटिंग्स' : 'Sale Bill Settings'}
                  subtitle={currentLanguage === 'hi' ? 'बिक्री बिल प्रेषण फ़ील्ड और जीएसटी विकल्पों को बदलें' : 'Change Sale Bill settings and format terms'}
                  icon={Download}
                  onClick={() => setActiveView('sale_bill_settings')}
                />
                <MenuItem 
                  title={currentLanguage === 'hi' ? 'खरीद बिल सेटिंग्स' : 'Purchase Bill Settings'}
                  subtitle={currentLanguage === 'hi' ? 'खरीद बिल प्रविष्टि फ़ील्ड्स और सेटिंग्स को व्यवस्थित करें' : 'Change Purchase Bill validation fields settings'}
                  icon={ArrowDownCircle}
                  onClick={() => setActiveView('purchase_bill_settings')}
                />
                <MenuItem 
                  title={currentLanguage === 'hi' ? 'बिक्री वापस सेटिंग्स' : 'Sale Return Settings'}
                  subtitle={currentLanguage === 'hi' ? 'बिक्री वापसी (क्रेडिट नोट) इनपुट बदलें' : 'Change Sale Return screen parameters'}
                  icon={RefreshCcw}
                  onClick={() => setActiveView('sale_return_settings')}
                />
                <MenuItem 
                  title={currentLanguage === 'hi' ? 'खरीद वापस सेटिंग्स' : 'Purchase Return Settings'}
                  subtitle={currentLanguage === 'hi' ? 'डेबिट नोट/वापसी सेटिंग्स में संशोधन करें' : 'Change Purchase Return layout fields'}
                  icon={RefreshCcw}
                  onClick={() => setActiveView('purchase_return_settings')}
                />
              </div>
            </div>

            {/* Category 4 */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">
                {currentLanguage === 'hi' ? 'परिवहन और टैक्स' : 'Logistics & Taxes'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <MenuItem 
                  title={currentLanguage === 'hi' ? 'परिवहन विवरण सेटिंग्स' : 'Transportation Detail Settings'}
                  subtitle={currentLanguage === 'hi' ? 'वाहनों और चालान फ़ील्ड्स को सक्षम या अक्षम करें' : 'Enable/Disable Transportation fields and vehicle invoice details'}
                  icon={ExternalLink}
                  onClick={() => setActiveView('transportation_settings')}
                />
                <MenuItem 
                  title={currentLanguage === 'hi' ? 'खाता बही टैक्स सेटिंग्स' : 'Ledger Tax Settings'}
                  subtitle={currentLanguage === 'hi' ? 'सभी लेजर के लिए टैक्स नियम और लिमिट सेटिंग्स लागू करें' : 'Configure taxes on a per-ledger or party basis'}
                  icon={SlidersHorizontal}
                  onClick={() => setActiveView('ledger_settings')}
                />
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    );
  }

  // GENERAL SETTINGS SUB-SCREEN
  if (activeView === 'general_settings') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.2 }}
        className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]"
      >
        <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center gap-3 shadow-sm border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition"><ArrowLeft size={22} /></button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-sans tracking-tight leading-none truncate">{currentLanguage === 'hi' ? 'सामान्य सेटिंग्स' : 'General Settings'}</h1>
            <p className="text-[10px] text-slate-400 select-none uppercase font-sans tracking-wider font-extrabold mt-0.5">{currentLanguage === 'hi' ? 'लोगो, बैंक और मुद्रण सेटिंग्स' : 'Logo, bank and printing profiles'}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center">
            {/* Logo area */}
            <div className="relative group mb-8">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-[26px] blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
              <div className="relative w-24 h-24 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-md shrink-0">
                  <Bot size={52} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
              </div>
            </div>
            
             <div className="w-full max-w-sm grid grid-cols-2 gap-3 mt-4">
                 <button 
                   onClick={() => onNavigate('companyProfile')}
                   className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 text-slate-800 dark:text-white py-4 px-2 text-center text-xs sm:text-sm font-bold min-h-[64px] rounded-2xl shadow-sm flex flex-col items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 leading-tight hover:shadow-md"
                 >
                     <Database size={18} className="text-indigo-600 dark:text-indigo-400" />
                     {currentLanguage === 'hi' ? 'बैंक विवरण' : 'Bank Details'}
                 </button>
                 <button 
                   onClick={() => onNavigate('companyProfile')}
                   className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 text-slate-800 dark:text-white py-4 px-2 text-center text-xs sm:text-sm font-bold min-h-[64px] rounded-2xl shadow-sm flex flex-col items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 leading-tight hover:shadow-md"
                 >
                     <FileText size={18} className="text-emerald-600 dark:text-emerald-400" />
                     {currentLanguage === 'hi' ? 'नियम व शर्तें' : 'Terms & Condition'}
                 </button>
                 <button 
                   onClick={() => onNavigate('companyProfile')}
                   className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 text-slate-800 dark:text-white py-4 px-2 text-center text-xs sm:text-sm font-bold min-h-[64px] rounded-2xl shadow-sm flex flex-col items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 leading-tight hover:shadow-md"
                 >
                     <Bot size={18} className="text-amber-600 dark:text-amber-400" />
                     {currentLanguage === 'hi' ? 'व्यवसाय लोगो' : 'Company Logo'}
                 </button>
                 <button 
                   onClick={() => onNavigate('companyProfile')}
                   className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 text-slate-800 dark:text-white py-4 px-2 text-center text-xs sm:text-sm font-bold min-h-[64px] rounded-2xl shadow-sm flex flex-col items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 leading-tight hover:shadow-md"
                 >
                     <Laptop size={18} className="text-sky-600 dark:text-sky-400" />
                     {currentLanguage === 'hi' ? 'प्रिंट सेटिंग्स' : 'Print Settings'}
                 </button>
                 <button 
                   onClick={() => setActiveView('preferences2')}
                   className="col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 px-2 text-center text-sm font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 leading-tight"
                 >
                     <SlidersHorizontal size={18} />
                     {currentLanguage === 'hi' ? 'अन्य सेटिंग्स व्यवस्थित करें' : 'Configure Other Settings'}
                 </button>
             </div>
        </div>
      </motion.div>
    );
  }

  // ITEM SETTINGS SUB-SCREEN
  if (activeView === 'item_settings') {
    const handleToggle = async (key: keyof typeof itemSettings) => {
        const updated = {...itemSettings, [key]: !itemSettings[key]};
        setItemSettings(updated);
        await billingService.saveItemSettings(updated);
    };

    const CheckboxRow = ({ 
      label, 
      labelHi, 
      checkedKey, 
      icon: IconComponent 
    }: { 
      label: string; 
      labelHi: string; 
      checkedKey: keyof typeof itemSettings; 
      icon: React.ComponentType<any>; 
    }) => {
        const textLabel = currentLanguage === 'hi' ? labelHi : label;
        return (
            <div 
              onClick={() => handleToggle(checkedKey)} 
              className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 gap-4 min-w-0 transition-colors bg-white dark:bg-slate-900"
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-slate-800 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                  <IconComponent size={16} />
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 truncate">{textLabel}</h2>
              </div>
              <div className="shrink-0">
                <ToggleSwitch 
                  checked={itemSettings[checkedKey]} 
                  onChange={() => handleToggle(checkedKey)} 
                />
              </div>
            </div>
        );
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.2 }}
        className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]"
      >
        <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center gap-3 shadow-sm border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition"><ArrowLeft size={22} /></button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-sans tracking-tight leading-none truncate">{currentLanguage === 'hi' ? 'आइटम सेटिंग्स' : 'Item Settings'}</h1>
            <p className="text-[10px] text-slate-400 select-none uppercase font-sans tracking-wider font-extrabold mt-0.5">{currentLanguage === 'hi' ? 'उत्पाद और सूची प्रविष्टि विवरण' : 'Product & inventory configuration fields'}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4">
          <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <CheckboxRow label="Enable Cess" labelHi="सेस कर सक्षम करें (Cess)" checkedKey="cess" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Batch Number" labelHi="बैच संख्या सक्षम करें (Batch Number)" checkedKey="batchNumber" icon={Hash} />
            <CheckboxRow label="Enable Manufacturing Date" labelHi="उत्पादन तिथि सक्षम करें (Mfg Date)" checkedKey="manufacturingDate" icon={Info} />
            <CheckboxRow label="Enable Expiry Date" labelHi="समाप्ति तिथि सक्षम करें (Expiry Date)" checkedKey="expiryDate" icon={Info} />
            <CheckboxRow label="Enable Wholesale Price" labelHi="थोक मूल्य सक्षम करें (Wholesale Price)" checkedKey="wholesalePrice" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Item Brand/Company" labelHi="आइटम ब्रांड/कंपनी सक्षम करें (Item Brand)" checkedKey="itemCompany" icon={Bot} />
            <CheckboxRow label="Enable Minimum Stock Alert" labelHi="न्यूनतम स्टॉक अलर्ट सक्षम करें (Min Stock Alert)" checkedKey="minimumStockAlert" icon={AlertTriangle} />
            <CheckboxRow label="Enable Category" labelHi="श्रेणी फ़ील्ड सक्षम करें (Category)" checkedKey="category" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Bill Of Item" labelHi="आइटम संबंधित सामग्री विवरण सक्षम करें (Bill Of Item)" checkedKey="billOfItem" icon={FileText} />
          </div>
        </div>
      </motion.div>
    );
  }

  // PURCHASE BILL SETTINGS SUB-SCREEN
  if (activeView === 'purchase_bill_settings') {
    const handleToggle = async (key: keyof typeof purchaseBillSettings) => {
        const updated = {...purchaseBillSettings, [key]: !purchaseBillSettings[key]};
        setPurchaseBillSettings(updated);
        await billingService.savePurchaseBillSettings(updated);
    };

    const CheckboxRow = ({ 
      label, 
      labelHi, 
      checkedKey, 
      icon: IconComponent 
    }: { 
      label: string; 
      labelHi: string; 
      checkedKey: keyof typeof purchaseBillSettings; 
      icon: React.ComponentType<any>; 
    }) => {
        const textLabel = currentLanguage === 'hi' ? labelHi : label;
        return (
            <div 
              onClick={() => handleToggle(checkedKey)} 
              className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 gap-4 min-w-0 transition-colors bg-white dark:bg-slate-900"
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-slate-800 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                  <IconComponent size={16} />
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 truncate">{textLabel}</h2>
              </div>
              <div className="shrink-0">
                <ToggleSwitch 
                  checked={purchaseBillSettings[checkedKey]} 
                  onChange={() => handleToggle(checkedKey)} 
                />
              </div>
            </div>
        );
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.2 }}
        className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]"
      >
        <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center gap-3 shadow-sm border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition"><ArrowLeft size={22} /></button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-sans tracking-tight leading-none truncate">{currentLanguage === 'hi' ? 'खरीद बिल सेटिंग्स' : 'Purchase Bill Settings'}</h1>
            <p className="text-[10px] text-slate-400 select-none uppercase font-sans tracking-wider font-extrabold mt-0.5">{currentLanguage === 'hi' ? 'आवक सामग्री और खरीद वाउचर प्राथमिकताएं' : 'Inward stock & purchase voucher settings'}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4">
          <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <CheckboxRow label="Enable Bill Discount" labelHi="समग्र बिल छूट सक्षम करें (Bill Discount)" checkedKey="billDiscount" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Sale Rate & MRP Calculation" labelHi="बिक्री दर और अधिकतम खुदरा मूल्य गणना सक्षम करें" checkedKey="saleRateMrpCalculation" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Additional Charges" labelHi="अतिरिक्त प्रभार सक्षम करें (Additional Charges)" checkedKey="additionalCharges" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Item Wise Discount" labelHi="आइटम अनुसार छूट सक्षम करें (Item-Wise Discount)" checkedKey="itemWiseDiscount" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Transportation Detail" labelHi="परिवहन विवरण फ़ील्ड सक्षम करें (Transportation)" checkedKey="transportationDetail" icon={ExternalLink} />
            <CheckboxRow label="Enable Ecommerce Detail" labelHi="ई-कॉमर्स विवरण सक्षम करें (Ecommerce Details)" checkedKey="ecommerceDetail" icon={Globe} />
            <CheckboxRow label="Enable Reverse Charge" labelHi="विपरीत प्रभार सक्षम करें (Reverse Charge - RCM)" checkedKey="reverseCharge" icon={SlidersHorizontal} />
          </div>
        </div>
      </motion.div>
    );
  }

  // PURCHASE RETURN SETTINGS SUB-SCREEN
  if (activeView === 'purchase_return_settings') {
    const handleToggle = async (key: keyof typeof purchaseReturnSettings) => {
        const updated = {...purchaseReturnSettings, [key]: !purchaseReturnSettings[key]};
        setPurchaseReturnSettings(updated);
        await billingService.savePurchaseReturnSettings(updated);
    };

    const CheckboxRow = ({ 
      label, 
      labelHi, 
      checkedKey, 
      icon: IconComponent 
    }: { 
      label: string; 
      labelHi: string; 
      checkedKey: keyof typeof purchaseReturnSettings; 
      icon: React.ComponentType<any>; 
    }) => {
        const textLabel = currentLanguage === 'hi' ? labelHi : label;
        return (
            <div 
              onClick={() => handleToggle(checkedKey)} 
              className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 gap-4 min-w-0 transition-colors bg-white dark:bg-slate-900"
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-slate-800 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                  <IconComponent size={16} />
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 truncate">{textLabel}</h2>
              </div>
              <div className="shrink-0">
                <ToggleSwitch 
                  checked={purchaseReturnSettings[checkedKey]} 
                  onChange={() => handleToggle(checkedKey)} 
                />
              </div>
            </div>
        );
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.2 }}
        className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]"
      >
        <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center gap-3 shadow-sm border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition"><ArrowLeft size={22} /></button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-sans tracking-tight leading-none truncate">{currentLanguage === 'hi' ? 'खरीद वापसी सेटिंग्स' : 'Purchase Return Settings'}</h1>
            <p className="text-[10px] text-slate-400 select-none uppercase font-sans tracking-wider font-extrabold mt-0.5">{currentLanguage === 'hi' ? 'डेबिट नोट एवं स्टॉक वापसी विकल्प' : 'Debit note & purchase return options'}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4">
          <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <CheckboxRow label="Enable Additional Charges" labelHi="अतिरिक्त प्रभार सक्षम करें (Additional Charges)" checkedKey="additionalCharges" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Item Wise Discount" labelHi="आइटम अनुसार छूट सक्षम करें (Item-Wise Discount)" checkedKey="itemWiseDiscount" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Transportation Detail" labelHi="परिवहन विवरण सक्षम करें (Transportation)" checkedKey="transportationDetail" icon={ExternalLink} />
            <CheckboxRow label="Enable Ecommerce Detail" labelHi="ई-कॉमर्स विवरण सक्षम करें (Ecommerce Details)" checkedKey="ecommerceDetail" icon={Globe} />
            <CheckboxRow label="Enable Reverse Charge" labelHi="विपरीत प्रभार सक्षम करें (Reverse Charge - RCM)" checkedKey="reverseCharge" icon={SlidersHorizontal} />
          </div>
        </div>
      </motion.div>
    );
  }

  // LEDGER SETTINGS SUB-SCREEN
  if (activeView === 'ledger_settings') {
    const handleToggle = async (id: number) => {
        const updated = ledgersList.map(ledger => 
            ledger.id === id ? { ...ledger, checked: !ledger.checked } : ledger
        );
        setLedgersList(updated);
        await billingService.saveLedgersList(updated);
    };

    const filteredLedgers = ledgersList.filter(ledger =>
        ledger.name.toLowerCase().includes(ledgerSearchQuery.toLowerCase())
    );

    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.2 }}
        className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]"
      >
        <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center justify-between shadow-sm border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 pt-[max(env(safe-area-inset-top),48px)]">
          <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => { setActiveView('preferences2'); setLedgerSearchQuery(''); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition shrink-0"><ArrowLeft size={22} /></button>
              <div className="flex flex-col min-w-0">
                <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-sans tracking-tight leading-none truncate">{currentLanguage === 'hi' ? 'लेजर सूची' : 'Ledger List'}</h1>
                <p className="text-[10px] text-slate-400 select-none uppercase font-sans tracking-wider font-extrabold mt-0.5">{currentLanguage === 'hi' ? '63 पूर्व-निर्धारित खाता बही कर नियम' : '63 predefined accounting ledger tax rules'}</p>
              </div>
          </div>
          <button onClick={() => { setActiveView('preferences2'); setLedgerSearchQuery(''); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition shrink-0"><Check size={22} /></button>
        </header>

        <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80">
          <div className="relative max-w-md mx-auto">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 dark:text-slate-500">
              <SlidersHorizontal size={16} />
            </span>
            <input
              type="text"
              value={ledgerSearchQuery}
              onChange={(e) => setLedgerSearchQuery(e.target.value)}
              placeholder={currentLanguage === 'hi' ? 'खाता खोजें...' : 'Search ledger...'}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        <div className="flex bg-slate-50 dark:bg-slate-800/30 px-4 py-3 font-bold border-b border-slate-100 dark:border-slate-800/80 text-xs sm:text-sm gap-3 select-none text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <div className="w-16 shrink-0">{currentLanguage === 'hi' ? 'क्रमांक' : 'No.'}</div>
            <div className="flex-1 min-w-0 text-left">{currentLanguage === 'hi' ? 'खाता का नाम' : 'Ledger Name'}</div>
            <div className="shrink-0 pr-4">{currentLanguage === 'hi' ? 'स्थिति' : 'Status'}</div>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/50">
            {filteredLedgers.length > 0 ? (
              filteredLedgers.map((ledger) => (
                <div 
                    key={ledger.id} 
                    onClick={() => handleToggle(ledger.id)} 
                    className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 gap-3 min-w-0"
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                        <div className="w-12 text-sm sm:text-base font-bold text-slate-400 dark:text-slate-500 shrink-0">{ledger.id}</div>
                        <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 truncate flex-1 min-w-0 text-left">{ledger.name}</div>
                    </div>
                    <div className="shrink-0 flex items-center justify-center pl-2">
                        <ToggleSwitch 
                            checked={ledger.checked} 
                            onChange={() => handleToggle(ledger.id)} 
                        />
                    </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                {currentLanguage === 'hi' ? 'कोई खाता बही नहीं मिली।' : 'No ledgers found matching search query.'}
              </div>
            )}
        </div>
      </motion.div>
    );
  }

  // TRANSPORTATION SETTINGS SUB-SCREEN
  if (activeView === 'transportation_settings') {
    const handleToggle = async (key: keyof typeof transportationSettings) => {
        const updated = {...transportationSettings, [key]: !transportationSettings[key]};
        setTransportationSettings(updated);
        await billingService.saveTransportationSettings(updated);
    };

    const CheckboxRow = ({ 
      label, 
      labelHi, 
      checkedKey, 
      icon: IconComponent 
    }: { 
      label: string; 
      labelHi: string; 
      checkedKey: keyof typeof transportationSettings; 
      icon: React.ComponentType<any>; 
    }) => {
        const textLabel = currentLanguage === 'hi' ? labelHi : label;
        return (
            <div 
              onClick={() => handleToggle(checkedKey)} 
              className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 gap-4 min-w-0 transition-colors bg-white dark:bg-slate-900"
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-slate-800 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                  <IconComponent size={16} />
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 truncate">{textLabel}</h2>
              </div>
              <div className="shrink-0">
                <ToggleSwitch 
                  checked={transportationSettings[checkedKey]} 
                  onChange={() => handleToggle(checkedKey)} 
                />
              </div>
            </div>
        );
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.2 }}
        className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]"
      >
        <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center gap-3 shadow-sm border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition"><ArrowLeft size={22} /></button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-sans tracking-tight leading-none truncate">{currentLanguage === 'hi' ? 'परिवहन विवरण सेटिंग्स' : 'Transportation Settings'}</h1>
            <p className="text-[10px] text-slate-400 select-none uppercase font-sans tracking-wider font-extrabold mt-0.5">{currentLanguage === 'hi' ? 'वाहनों and चालान फ़ील्ड्स का विवरण' : 'Logistics, GR number and vehicle layout rules'}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4">
          <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <CheckboxRow label="Enable GR No." labelHi="जीआर क्रमांक सक्षम करें (GR/LR No.)" checkedKey="grNo" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Vehicle No." labelHi="वाहन क्रमांक सक्षम करें (Vehicle No.)" checkedKey="vehicleNo" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Origin" labelHi="उद्गम स्थल सक्षम करें (Origin)" checkedKey="origin" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Destination" labelHi="गंतव्य स्थल सक्षम करें (Destination)" checkedKey="destination" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Dispatch Mode" labelHi="परिवहन माध्यम विवरण सक्षम करें (Dispatch Mode)" checkedKey="dispatchMode" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Date" labelHi="परिवहन प्रस्थान तिथि सक्षम करें (Date Field)" checkedKey="date" icon={SlidersHorizontal} />
          </div>
        </div>
      </motion.div>
    );
  }

  // SALE RETURN SETTINGS SUB-SCREEN
  if (activeView === 'sale_return_settings') {
    const handleToggle = async (key: keyof typeof saleReturnSettings) => {
        const updated = {...saleReturnSettings, [key]: !saleReturnSettings[key]};
        setSaleReturnSettings(updated);
        await billingService.saveSaleReturnSettings(updated);
    };

    const CheckboxRow = ({ 
      label, 
      labelHi, 
      checkedKey, 
      icon: IconComponent 
    }: { 
      label: string; 
      labelHi: string; 
      checkedKey: keyof typeof saleReturnSettings; 
      icon: React.ComponentType<any>; 
    }) => {
        const textLabel = currentLanguage === 'hi' ? labelHi : label;
        return (
            <div 
              onClick={() => handleToggle(checkedKey)} 
              className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 gap-4 min-w-0 transition-colors bg-white dark:bg-slate-900"
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-slate-800 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                  <IconComponent size={16} />
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 truncate">{textLabel}</h2>
              </div>
              <div className="shrink-0">
                <ToggleSwitch 
                  checked={saleReturnSettings[checkedKey]} 
                  onChange={() => handleToggle(checkedKey)} 
                />
              </div>
            </div>
        );
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.2 }}
        className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]"
      >
        <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center gap-3 shadow-sm border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition"><ArrowLeft size={22} /></button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-sans tracking-tight leading-none truncate">{currentLanguage === 'hi' ? 'बिक्री वापसी सेटिंग्स' : 'Sale Return Settings'}</h1>
            <p className="text-[10px] text-slate-400 select-none uppercase font-sans tracking-wider font-extrabold mt-0.5">{currentLanguage === 'hi' ? 'क्रेडिट नोट एवं ग्राहक माल वापसी प्राथमिकताएं' : 'Credit note & sales return configurations'}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 space-y-4">
          <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <CheckboxRow label="Enable Bill Discount" labelHi="बिल छूट सक्षम करें (Bill Discount)" checkedKey="billDiscount" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Additional Charges" labelHi="अतिरिक्त प्रभार सक्षम करें (Additional Charges)" checkedKey="additionalCharges" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Item Wise Discount" labelHi="आइटम अनुसार छूट सक्षम करें (Item-Wise Discount)" checkedKey="itemWiseDiscount" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Transportation Detail" labelHi="परिवहन विवरण सक्षम करें (Transportation)" checkedKey="transportationDetail" icon={ExternalLink} />
            <CheckboxRow label="Enable Ecommerce Detail" labelHi="ई-कॉमर्स विवरण सक्षम करें (Ecommerce Details)" checkedKey="ecommerceDetail" icon={Globe} />
            <CheckboxRow label="Enable Reverse Charge" labelHi="विपरीत प्रभार सक्षम करें (Reverse Charge - RCM)" checkedKey="reverseCharge" icon={SlidersHorizontal} />
          </div>

          <div 
            onClick={() => setSelectedCategoryTab('business_identity')}
            className="max-w-xl mx-auto p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="text-left">
              <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100">
                  {currentLanguage === 'hi' ? 'बिक्री वापसी बिल संख्या उपसर्ग (Prefix)' : 'Sale Return Number Prefix'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {currentLanguage === 'hi' ? 'वापसी बिल नंबर से पहले विशेष उपसर्ग वर्ण सेट करें' : 'Configure prefixes under Business Identity'}
              </p>
            </div>
            <ExternalLink size={16} className="text-slate-400 dark:text-slate-500" />
          </div>
        </div>
      </motion.div>
    );
  }

  // SALE BILL SETTINGS SUB-SCREEN
  if (activeView === 'sale_bill_settings') {
    const handleToggle = async (key: keyof typeof saleSettings) => {
        const updated = {...saleSettings, [key]: !saleSettings[key]};
        setSaleSettings(updated);
        await billingService.saveSaleSettings(updated);
    };

    const CheckboxRow = ({ 
      label, 
      labelHi, 
      checkedKey, 
      icon: IconComponent 
    }: { 
      label: string; 
      labelHi: string; 
      checkedKey: keyof typeof saleSettings; 
      icon: React.ComponentType<any>; 
    }) => {
        const textLabel = currentLanguage === 'hi' ? labelHi : label;
        return (
            <div 
              onClick={() => handleToggle(checkedKey)} 
              className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 gap-4 min-w-0 transition-colors bg-white dark:bg-slate-900"
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-slate-800 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                  <IconComponent size={16} />
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 truncate">{textLabel}</h2>
              </div>
              <div className="shrink-0">
                <ToggleSwitch 
                  checked={saleSettings[checkedKey]} 
                  onChange={() => handleToggle(checkedKey)} 
                />
              </div>
            </div>
        );
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.2 }}
        className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]"
      >
        <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center gap-3 shadow-sm border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition"><ArrowLeft size={22} /></button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-sans tracking-tight leading-none truncate">{currentLanguage === 'hi' ? 'बिक्री बिल सेटिंग्स' : 'Sale Bill Settings'}</h1>
            <p className="text-[10px] text-slate-400 select-none uppercase font-sans tracking-wider font-extrabold mt-0.5">{currentLanguage === 'hi' ? 'बिलिंग प्रारूप, जीएसटी और छूट प्राथमिकताएं' : 'POS billing templates, GST and discount options'}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 space-y-4">
          <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <CheckboxRow label="Enable Cash Billing" labelHi="नकद बिलिंग सक्षम करें (Cash Billing)" checkedKey="cashBilling" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Bill Discount" labelHi="समग्र बिल छूट सक्षम करें (Bill Discount)" checkedKey="billDiscount" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Additional Charges" labelHi="अतिरिक्त प्रभार सक्षम करें (Additional Charges)" checkedKey="additionalCharges" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Item Wise Discount" labelHi="आइटम अनुसार छूट सक्षम करें (Item-Wise Discount)" checkedKey="itemWiseDiscount" icon={SlidersHorizontal} />
            <CheckboxRow label="Enable Transportation Detail" labelHi="परिवहन विवरण सक्षम करें (Transportation)" checkedKey="transportationDetail" icon={ExternalLink} />
            <CheckboxRow label="Enable Ecommerce Detail" labelHi="ई-कॉमर्स विवरण सक्षम करें (Ecommerce Details)" checkedKey="ecommerceDetail" icon={Globe} />
            <CheckboxRow label="Enable Reverse Charge" labelHi="विपरीत प्रभार सक्षम करें (Reverse Charge - RCM)" checkedKey="reverseCharge" icon={SlidersHorizontal} />
            <CheckboxRow label="Show logo on bill" labelHi="बिल प्रारूप पर ब्रांड लोगो दिखाएं (Show Logo)" checkedKey="showLogo" icon={Bot} />
            <CheckboxRow label="Enable Item Out Of Stock Alert" labelHi="स्टॉक समाप्ति अलर्ट सक्षम करें (Stock Warnings)" checkedKey="outOfStockAlert" icon={AlertTriangle} />
            <CheckboxRow label="Enable Discounted Quantity" labelHi="छूट वाली मात्रा सक्षम करें (Discounted Qty)" checkedKey="discountedQuantity" icon={SlidersHorizontal} />
            <CheckboxRow label="Get Previous Bill Sale Rate" labelHi="बिल निर्माण में पिछला बिक्री मूल्य लागू करें (Last Price)" checkedKey="previousBillSaleRate" icon={SlidersHorizontal} />
          </div>

          <div 
            onClick={() => setSelectedCategoryTab('business_identity')}
            className="max-w-xl mx-auto p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="text-left">
              <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100">
                  {currentLanguage === 'hi' ? 'बिक्री बिल संख्या उपसर्ग (Prefix)' : 'Sale Bill Number Prefix'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {currentLanguage === 'hi' ? 'बिल नंबर से पहले विशेष उपसर्ग अक्षर जोड़ें' : 'Configure prefixes under Business Identity'}
              </p>
            </div>
            <ExternalLink size={16} className="text-slate-400 dark:text-slate-500" />
          </div>
        </div>
      </motion.div>
    );
  }

  // MAIN SCREEN MATCHING SCREENSHOT
  const isStaff = authContext.currentUser?.role === 'staff';

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-y-auto pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center justify-between shadow-sm border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 pt-[max(env(safe-area-inset-top),48px)]">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-base font-extrabold text-[#3b5998] dark:text-indigo-400 select-none font-bold text-xl">Settings</h1>
            <p className="text-[10px] text-slate-400 select-none uppercase font-sans tracking-wider font-extrabold text-xs">System Dashboard</p>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={() => onThemeChange(currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light')}
          className="relative inline-flex h-8 w-14 items-center rounded-full bg-slate-100 dark:bg-slate-800 transition shadow-inner border border-slate-200/50 dark:border-slate-700 pointer-events-auto mr-1"
          title="Toggle Theme: Click to cycle Light -> Dark -> System Default"
        >
          <span
            className={`${
              currentTheme === 'dark' 
                ? 'translate-x-[26px] bg-indigo-600 text-white' 
                : currentTheme === 'system'
                  ? 'translate-x-[13px] bg-[#3b5998] text-white'
                  : 'translate-x-1 bg-amber-500 text-white'
            } inline-flex h-6 w-6 transform items-center justify-center rounded-full transition-transform duration-200 shadow`}
          >
            {currentTheme === 'dark' ? <Moon size={12} strokeWidth={2.5} /> : currentTheme === 'system' ? <Laptop size={12} strokeWidth={2.5} /> : <Sun size={12} strokeWidth={2.5} />}
          </span>
        </button>
      </header>

      <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 space-y-6">
        {/* Dynamic Sync Engine status & General Title summary */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-slate-900 dark:to-slate-800 text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 border border-indigo-100 dark:border-slate-800">
          <div className="space-y-1">
            <h2 className="text-lg font-bold">Eazy Billing Enterprise</h2>
            <div className="text-xs text-indigo-100 dark:text-slate-300 font-semibold leading-relaxed font-sans">
              Premium System Dashboard • Active Version v{APP_VERSION}
            </div>
            <p className="text-[10px] text-indigo-200/70 dark:text-slate-400 font-mono">Current Server Sync Session active since login</p>
          </div>
          
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-xs font-semibold bg-white/10 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-white/10 dark:border-slate-700/50 flex items-center gap-1.5 backdrop-blur-sm font-sans">
              <span className={`h-2 w-2 rounded-full ${
                syncStatus === 'Syncing' ? 'bg-amber-400 animate-ping' :
                syncStatus === 'Synced' ? 'bg-green-400' : 'bg-rose-400'
              }`}></span>
              Sync: {syncStatus}
            </span>
            {authContext.currentUser?.role && (
              <span className="text-xs uppercase tracking-wide font-extrabold px-3 py-1.5 rounded-xl bg-white/10 dark:bg-slate-800/80 border border-white/10 dark:border-slate-700/50 font-sans">
                {authContext.currentUser?.role}
              </span>
            )}
          </div>
        </div>

        {/* Hierarchical Accordion Settings (Cat & Sub-Cat) */}
        <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full md:hidden">
                    {/* Category 1: Business Settings */}
          <SettingsAccordion
            title={currentLanguage === 'hi' ? 'व्यवसाय सेटअप' : 'Business Settings'}
            icon={User}
            description={currentLanguage === 'hi' ? 'कंपनी प्रोफ़ाइल, नंबरिंग सेटअप, और ऐप भाषा प्रबंधित करें।' : 'Manage store identification, business address, contact numbers, and voucher printing headers.'}
            isLocked={isStaff}
            disabled={isStaff}
          >
            <div className="space-y-3.5">
              {/* Store Code details */}
              <div className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-1">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Hash size={18} />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      {currentLanguage === 'hi' ? 'स्टोर कोड (6-अंकीय)' : 'Store Code (6-Digit)'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal block font-sans mt-0.5">
                      {currentLanguage === 'hi' ? 'स्टाफ से शेयर करके सिंक लिंक करें' : 'Share with staff to link business and sync'}
                    </span>
                  </div>
                </div>
                {authContext.currentUser?.storeCode ? (
                  <span className="text-sm font-mono font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-800/60 px-3 py-1.5 rounded-lg shadow-sm">
                    {authContext.currentUser?.storeCode}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-medium font-sans">Auto generating...</span>
                )}
              </div>

              {/* Company Profile link */}
              <button
                disabled={authContext.currentUser?.role === 'staff'}
                onClick={() => onNavigate('companyProfile')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left min-w-0 gap-3 ${
                  authContext.currentUser?.role === 'staff' ? 'opacity-[0.45] cursor-not-allowed' : 'cursor-pointer bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                    <User size={18} />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm flex items-center gap-1">
                      {currentLanguage === 'hi' ? 'कंपनी प्रोफ़ाइल संपादित करें' : 'Edit Company Profile'}
                      {authContext.currentUser?.role === 'staff' && <Lock size={12} className="text-amber-500 inline shrink-0" />}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block truncate font-sans">
                      {currentLanguage === 'hi' ? 'फोन नंबर, पता, और छपाई सेटिंग्स प्रबंधित करें' : 'Phone, address, tax configuration and print headers'}
                    </span>
                  </div>
                </div>
                {authContext.currentUser?.role === 'staff' ? (
                  <span className="text-xs text-amber-500 font-extrabold flex items-center gap-1 bg-amber-50 dark:bg-amber-900/10 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-900/30 font-sans shrink-0">
                    <Lock size={10} /> Lock
                  </span>
                ) : (
                  <span className="text-slate-400 shrink-0">&#10145;</span>
                )}
              </button>

              {/* Invoice Numbering Options */}
              <button
                disabled={authContext.currentUser?.role === 'staff'}
                onClick={() => setActiveView('invoice_numbering')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left min-w-0 gap-3 ${
                  authContext.currentUser?.role === 'staff' ? 'opacity-[0.45] cursor-not-allowed' : 'cursor-pointer bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Hash size={18} />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm flex items-center gap-1">
                      {currentLanguage === 'hi' ? 'नंबरिंग सेटअप' : 'Invoice Numbering'}
                      {authContext.currentUser?.role === 'staff' && <Lock size={12} className="text-amber-500 inline shrink-0" />}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block truncate font-sans">
                      {currentLanguage === 'hi' ? 'विभिन्न वाउचर नंबर प्रीफिक्स' : 'Set prefix, sequence start and numbering sequences'}
                    </span>
                  </div>
                </div>
                {authContext.currentUser?.role === 'staff' ? (
                  <span className="text-xs text-amber-500 font-extrabold flex items-center gap-1 bg-amber-50 dark:bg-amber-900/10 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-900/30 font-sans shrink-0">
                    <Lock size={10} /> Lock
                  </span>
                ) : (
                  <span className="text-slate-400 shrink-0">&#10145;</span>
                )}
              </button>

              {/* Bilingual App Language Row */}
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center justify-between gap-3 min-w-0">
                <div className="text-left flex-1 min-w-0 pr-1 select-auto font-sans">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block font-sans truncate">App Language (भाषा)</span>
                  <span className="text-xs text-slate-400 leading-relaxed block truncate">
                    {currentLanguage === 'hi' ? 'सक्रिय भाषा: हिंदी' : 'Active language: English'}
                  </span>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full shadow-inner border border-slate-200/50 dark:border-slate-700/60 pointer-events-auto items-center shrink-0">
                  <button 
                    onClick={() => onLanguageChange('en')}
                    className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wide transition-all duration-200 ${
                      currentLanguage === 'en' 
                        ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm font-black scale-102' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    EN
                  </button>
                  <button 
                    onClick={() => onLanguageChange('hi')}
                    className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wide transition-all duration-200 ${
                      currentLanguage === 'hi' 
                        ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm font-black scale-102' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    हिंदी
                  </button>
                </div>
              </div>
            </div>
          </SettingsAccordion>

          {/* Category 2: Billing Preferences */}
          <SettingsAccordion
            title={currentLanguage === 'hi' ? 'बिलिंग और उत्पाद' : 'Billing Preferences'}
            icon={SlidersHorizontal}
            description={currentLanguage === 'hi' ? 'बिलिंग प्राथमिकताओं, QR कोड, बारकोड, और स्मार्ट सहायक प्रबंधित करें।' : 'Configure invoice structures, QR codes, scan inputs, general dashboard layouts, and floating tools.'}
          >
            <div className="space-y-3.5">
              {/* Sale & Purchase Settings */}
              <button
                onClick={() => setActiveView('preferences2')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                    <SlidersHorizontal size={17} />
                  </div>
                  <div className="text-left flex-1 font-sans">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                      {currentLanguage === 'hi' ? 'बिक्री और खरीद प्राथमिकताएं' : 'Sale & Purchase Settings'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block">
                      {currentLanguage === 'hi' ? 'टैक्स नियम, बैच और छूट सेटिंग्स बदलें' : 'Tax rules, batch codes, discount tables, and billing parameters'}
                    </span>
                  </div>
                </div>
                <span className="text-slate-400">&#10145;</span>
              </button>

              {/* Dashboard & General Preferences */}
              <button
                onClick={() => setActiveView('preferences')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                    <SlidersHorizontal size={17} />
                  </div>
                  <div className="text-left flex-1 font-sans">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                      {currentLanguage === 'hi' ? 'डैशबोर्ड और सामान्य प्राथमिकताएं' : 'Dashboard & General Preferences'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block">
                      {currentLanguage === 'hi' ? 'होम स्क्रीन पैनल और त्वरित लिंक कस्टमाइज़ करें' : 'Configure quick links, landing dashboard summaries, and instruction cards'}
                    </span>
                  </div>
                </div>
                <span className="text-slate-400">&#10145;</span>
              </button>

              {/* Home UPI QR Code Toggler */}
              <div className="flex items-center justify-between py-2.5 border-b border-slate-200/60 dark:border-slate-800/80 gap-3 min-w-0">
                <div className="text-left flex-1 min-w-0 font-sans">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm block truncate">Home QR Code</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block truncate">Render merchant quick scan UPI QR onto the landing dashboard</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={localStorage.getItem('showDashboardQR') !== 'false'}
                    onChange={(e) => {
                      localStorage.setItem('showDashboardQR', e.target.checked.toString());
                      window.dispatchEvent(new Event('storage'));
                      setAppSettings(prev => ({...prev, offlineMode: !prev.offlineMode}));
                      setTimeout(() => setAppSettings(prev => ({...prev, offlineMode: !prev.offlineMode})), 5);
                    }}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Barcode Scanner Toggler */}
              <div className="flex items-center justify-between py-2.5 border-b border-slate-200/60 dark:border-slate-800/80 gap-3 min-w-0">
                <div className="text-left flex-1 min-w-0 font-sans">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm block truncate">Barcode Scanner</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block truncate">Leverage native device frame cameras for items scan inputs</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={localStorage.getItem('showBarcodeScanner') !== 'false'}
                    onChange={(e) => {
                      localStorage.setItem('showBarcodeScanner', e.target.checked.toString());
                      window.dispatchEvent(new Event('storage'));
                      setAppSettings(prev => ({...prev, offlineMode: !prev.offlineMode}));
                      setTimeout(() => setAppSettings(prev => ({...prev, offlineMode: !prev.offlineMode})), 5);
                    }}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Smart Floating AI Assistant [Premium 👑] */}
              {isPremiumLicensed && (
                <div className="flex items-center justify-between py-2.5 border-b border-slate-200/60 dark:border-slate-800/80 gap-3 min-w-0">
                  <div className="text-left flex-1 min-w-0 font-sans">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm block truncate">Smart Floating AI Assistant <span className="text-amber-500 font-extrabold text-xs">👑 Premium</span></span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block truncate">
                      {currentLanguage === 'hi' ? 'यूनिवर्सल चैटबॉट और हिंदी कमांड असिस्टेंट सक्षम करें' : 'Enable floating Gemini-backed command dialog widgets'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={localStorage.getItem('showSmartAssistant') !== 'false'}
                      onChange={(e) => {
                        localStorage.setItem('showSmartAssistant', e.target.checked.toString());
                        window.dispatchEvent(new Event('storage'));
                        setAppSettings(prev => ({...prev, offlineMode: !prev.offlineMode}));
                        setTimeout(() => setAppSettings(prev => ({...prev, offlineMode: !prev.offlineMode})), 5);
                      }}
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              )}
            </div>
          </SettingsAccordion>

          {/* Category 3: Security & Permissions */}
          <SettingsAccordion
            title={currentLanguage === 'hi' ? 'सुरक्षा और पहुंच' : 'Security & Permissions'}
            icon={ShieldCheck}
            description={currentLanguage === 'hi' ? 'सुरक्षा पिन, कर्मचारी पहुंच और भूमिकाओं को कॉन्फ़िगर करें।' : 'Change administrator PIN, simulate staff mode, or configure custom staff roles.'}
          >
            <div className="space-y-3.5">
              {/* App PIN & Password */}
              <button
                onClick={() => setActiveView('password_settings')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/85 transition cursor-pointer text-left min-w-0 gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg text-amber-600 dark:text-amber-400 shrink-0">
                    <Key size={18} />
                  </div>
                  <div className="text-left flex-1 min-w-0 font-sans">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                      {currentLanguage === 'hi' ? 'ऐप पिन और पासवर्ड' : 'App PIN & Password'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block truncate font-sans">
                      {currentLanguage === 'hi' ? 'मास्टर पिन बदलें या नया एडमिन पासवर्ड सेट करें' : 'Change Master PIN security, update administrator credentials'}
                    </span>
                  </div>
                </div>
                <span className="text-slate-400 shrink-0">&#10145;</span>
              </button>

              {/* Simulated Permissions Switcher */}
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm font-sans">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2 font-sans overflow-hidden">Simulated Permissions Mode</span>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => authContext.switchRole('admin')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg border transition ${
                      authContext.currentUser?.role === 'admin' 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm font-extrabold' 
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>Admin Mode</span>
                  </button>
                  <button 
                    onClick={() => authContext.switchRole('staff')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg border transition ${
                      authContext.currentUser?.role === 'staff' 
                        ? 'bg-amber-600 border-amber-600 text-white shadow-sm font-extrabold' 
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Lock size={12} />
                    <span>Staff Mode</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-sans">
                  {authContext.currentUser?.role === 'staff' 
                    ? "🔒 Simulated Staff Role active: Business edits, resetting db, rollback databases and some actions are locked."
                    : "🔓 Simulated Admin Role active: full control, access authorized for all backup uploads/downloads & db management."}
                </p>
              </div>

              {/* Manage Staff & Permissions */}
              <button
                onClick={() => {
                  if (isAdminUnlocked) {
                    setActiveView('staff_members');
                  } else {
                    setPendingAdminView('staff_members');
                    setAdminPinInput('');
                    setAdminPinError('');
                    setShowAdminPinModal(true);
                  }
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/85 transition cursor-pointer text-left shadow-sm min-w-0 gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Users size={18} />
                  </div>
                  <div className="text-left flex-1 min-w-0 font-sans">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm flex items-center gap-1.5">
                      {currentLanguage === 'hi' ? 'कर्मचारी और अनुमतियाँ' : 'Manage Staff & Permissions'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal block truncate mt-0.5">
                      {currentLanguage === 'hi' ? 'स्टाफ सदस्य जोड़ें और अनुमतियों को नियंत्रित करें' : 'Add new registers, configure print privileges and action locks'}
                    </span>
                  </div>
                </div>
                <span className="text-slate-400 shrink-0">&#10145;</span>
              </button>
            </div>
          </SettingsAccordion>

          {/* Category 4: Cloud & Licensing */}
          <SettingsAccordion
            title={currentLanguage === 'hi' ? 'क्लाउड और प्रीमियम' : 'Cloud & Licensing'}
            icon={Crown}
            description={currentLanguage === 'hi' ? 'क्लाउड सिंक विकल्प, प्रमाणीकरण, और लाइसेंस मोड कॉन्फ़िगर करें।' : 'Manage online databases, real-time sync nodes, and license verification parameters.'}
          >
            <div className="space-y-3.5">
              {/* Cloud Sync & Backup Toggle [Premium 👑] */}
              {isPremiumLicensed && (
                <div className="flex items-center justify-between py-2.5 border-b border-slate-200/60 dark:border-slate-800/80 gap-3 min-w-0">
                  <div className="text-left flex-1 min-w-0 font-sans">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm block truncate">Cloud Sync & Backup <span className="text-amber-500 font-extrabold text-xs">👑 Premium</span></span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block truncate">
                      {currentLanguage === 'hi' ? 'डेटा और इन्वॉइस को सुरक्षित क्लाउड सर्वर पर सिंक करें' : 'Online real-time sync of sales ledger to safe cloud'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={appSettings.cloudSyncEnabled}
                      onChange={(e) => handleAppSettingsChange('cloudSyncEnabled', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              )}

              {/* Cloud Account Detail (Google Sign-In, Email Auth) */}
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-sans">Cloud Account Detail</span>
                {auth.currentUser && !auth.currentUser.isAnonymous ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate font-sans">{auth.currentUser.email}</p>
                      <p className="text-[10px] text-emerald-500 font-semibold font-sans">Active Secure Session connected</p>
                    </div>
                    <button 
                      onClick={async () => {
                        await auth.signOut();
                        window.location.reload();
                      }} 
                      className="text-[10.5px] font-bold text-rose-500 hover:text-rose-600 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md bg-white dark:bg-slate-900 shadow-sm shrink-0 font-sans cursor-pointer transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-500 font-sans">Enable cloud sync & secure multi-device authorization.</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowEmailAuthModal(true)} 
                        className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg shadow-sm text-center font-sans cursor-pointer transition-colors"
                      >
                        Email Auth
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            await signInWithGoogle();
                            setDialogMessage({ title: 'Success', message: 'Signed in successfully!' });
                          } catch(e: any) {
                            setDialogMessage({ title: 'Error', message: e.message || 'Failed to sign in', isError: true });
                          }
                        }} 
                        className="flex-1 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-center font-sans cursor-pointer transition-colors"
                      >
                        Google
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Premium License Mode & Validation */}
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3.5 text-left font-sans shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left w-full">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${isPremiumLicensed ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <p className="text-[11px] font-mono tracking-tight uppercase text-slate-500 dark:text-slate-400">
                      License Mode: <span className={isPremiumLicensed ? 'text-amber-500 font-extrabold' : 'text-slate-600 dark:text-slate-500 font-bold'}>{isPremiumLicensed ? 'PREMIUM TIED (V2.0)' : 'FREE BASIC (OFFLINE ONLY)'}</span>
                    </p>
                  </div>
                  {authContext.currentUser?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={handleUpgradeToPremium}
                      className={`px-3 py-1 text-xs rounded-full font-bold transition shadow-sm shrink-0 cursor-pointer ${isPremiumLicensed ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200' : 'bg-amber-500 hover:bg-amber-600 text-slate-900 border border-amber-600/20'}`}
                      id="premium_toggle_trigger_button_mobile"
                    >
                      {isPremiumLicensed 
                        ? (currentLanguage === 'hi' ? 'मुफ़्त लाइसेंस बंद करें' : 'Demo Downgrade to Basic') 
                        : (currentLanguage === 'hi' ? 'मुफ़्त प्रीमियम सक्रिय करें' : 'Activate Sandbox Premium License')}
                    </button>
                  )}
                </div>

                {!isPremiumLicensed && authContext.currentUser?.role === 'admin' && (
                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-2 flex flex-col gap-2 w-full">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {currentLanguage === 'hi' ? 'प्रीमियम सक्रिय करने के लिए लाइसेंस कुंजी दर्ज करें' : 'Enter License Key to Activate Premium'}
                    </label>
                    <div className="flex gap-2 w-full">
                      <input 
                        type="text" 
                        value={licenseCode}
                        onChange={e => {
                          setLicenseCode(e.target.value);
                          setLicenseError('');
                        }}
                        placeholder="e.g. EAZY-PREMIUM-2026"
                        className="flex-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold tracking-widest text-slate-800 dark:text-white outline-none focus:border-amber-500 dark:focus:border-amber-400 transition-colors uppercase min-w-0"
                      />
                      <button 
                        onClick={handleValidateLicenseCode}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold px-4 py-2.5 rounded-xl transition-all active:scale-98 text-xs cursor-pointer shadow-sm flex items-center justify-center gap-1 shrink-0"
                      >
                        <Crown size={12} className="fill-slate-900" />
                        {currentLanguage === 'hi' ? 'सक्रिय' : 'Activate'}
                      </button>
                    </div>
                    {licenseError && (
                      <p className="text-[10px] font-bold text-rose-500 mt-1">
                        ⚠️ {licenseError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </SettingsAccordion>

          {/* Category 5: Database Tools */}
          <SettingsAccordion
            title={currentLanguage === 'hi' ? 'डेटाबेस उपकरण' : 'Database Tools'}
            icon={HardDrive}
            description={currentLanguage === 'hi' ? 'डेटाबेस बैकअप, वित्तीय वर्ष ट्रांसफर और ऐप रीसेट विकल्प प्रबंधित करें।' : 'Wipe records, reinstall default schemas, manage snapshots, and roll over fiscal terms.'}
          >
            <div className="space-y-3.5">
              {/* Time Machine Bookmarks */}
              <button
                onClick={() => setActiveView('time_machine')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/85 transition cursor-pointer text-left min-w-0 gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Database size={18} />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm truncate">Time Machine Bookmarks</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block truncate font-sans">Local snapshots database point-in-time recovery saves</span>
                  </div>
                </div>
                <span className="text-slate-400 shrink-0">&#10145;</span>
              </button>

              {/* Transfer Financial Year */}
              <button
                disabled={authContext.currentUser?.role === 'staff'}
                onClick={() => {
                  console.log("[SETTINGS] Initiate transfer financial year dialog modal triggers from button settings screen props");
                  setShowTransferDialog(true);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/85 transition text-left min-w-0 gap-3 ${
                  authContext.currentUser?.role === 'staff' ? 'opacity-[0.45] cursor-not-allowed' : 'cursor-pointer bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="text-left flex-1 min-w-0 font-sans">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm flex items-center gap-1 font-sans">
                      <span className="truncate">{currentLanguage === 'hi' ? 'वित्तीय वर्ष ट्रांसफर करें' : 'Transfer Financial Year'}</span>
                      {authContext.currentUser?.role === 'staff' && <Lock size={12} className="text-amber-500 inline shrink-0 font-sans" />}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block truncate font-sans">
                      {currentLanguage === 'hi' ? '🔒 स्टाफ रोल के लिए प्रतिबंधित क्रिया' : 'Carry balances to new fiscal period database'}
                    </span>
                  </div>
                </div>
                {authContext.currentUser?.role === 'staff' ? (
                  <span className="text-xs text-amber-500 font-extrabold flex items-center gap-1 bg-amber-50 dark:bg-amber-900/10 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-900/30 font-sans shrink-0">
                    <Lock size={10} /> Lock
                  </span>
                ) : (
                  <span className="text-slate-400 shrink-0">&#10145;</span>
                )}
              </button>

              {/* Seed Demo Data Button */}
              {authContext.currentUser?.role !== 'staff' && (
                <button
                  onClick={handleSeedClick}
                  className="w-full bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100/60 transition p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs text-center cursor-pointer block leading-snug font-sans shadow-sm"
                >
                  {isSeeding ? 'Seeding...' : '📥 Install Sample Enterprise Dairy Demo Data'}
                </button>
              )}

              {/* Wipe Reset Databases */}
              {authContext.currentUser?.role !== 'staff' && (
                <button
                  onClick={handleResetClick}
                  className="w-full bg-red-400/10 dark:bg-red-950/25 hover:bg-red-400/20 transition p-3.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 font-extrabold text-xs text-center cursor-pointer block leading-snug font-sans shadow-sm"
                >
                  {isResetting ? 'Resetting App...' : '⚠️ Wipe / Reset All Databases Point Blank'}
                </button>
              )}
            </div>
          </SettingsAccordion>

          {/* Category 6: Diagnostics & Logs */}
          <SettingsAccordion
            title={currentLanguage === 'hi' ? 'डायग्नोस्टिक्स' : 'Diagnostics & Logs'}
            icon={Activity}
            description={currentLanguage === 'hi' ? 'सिस्टम प्रदर्शन, डेटाबेस स्वास्थ्य और ऑडिट लॉग जांचें।' : 'Inspect system queries profile, health status, and action logs.'}
          >
            <div className="space-y-3.5">
              {/* System Health Check */}
              <button
                onClick={() => setActiveView('system_health')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/85 transition cursor-pointer text-left min-w-0 gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Activity size={18} />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm truncate">
                      {currentLanguage === 'hi' ? 'सिस्टम स्वास्थ्य' : 'System Health Check'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block truncate font-sans">
                      {currentLanguage === 'hi' ? 'सक्रिय डेटाबेस तालिकाओं के आकार और स्वास्थ्य को ऑडिट करें' : 'Verify active tables status, size counters and storage parameters'}
                    </span>
                  </div>
                </div>
                <span className="text-slate-400 shrink-0">&#10145;</span>
              </button>

              {/* Master Health Analysis */}
              <button
                onClick={() => setActiveView('master_health')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/85 transition cursor-pointer text-left min-w-0 gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg text-amber-600 dark:text-amber-400 shrink-0">
                    <Heart size={18} />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm truncate font-sans">
                      {currentLanguage === 'hi' ? 'मास्टर स्वास्थ्य विश्लेषण' : 'Master Health Analysis'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block truncate font-sans mt-0.5">
                      {currentLanguage === 'hi' ? 'टूटे हुए डेटा और अमान्य अनुक्रमणिकाओं को स्कैन करें' : 'Scan for broken referencing links & invalid indexing tables'}
                    </span>
                  </div>
                </div>
                <span className="text-slate-400 shrink-0">&#10145;</span>
              </button>

              {/* View Audit Logs */}
              <button
                onClick={() => {
                  if (isAdminUnlocked) {
                    setActiveView('audit_logs');
                  } else {
                    setPendingAdminView('audit_logs');
                    setAdminPinInput('');
                    setAdminPinError('');
                    setShowAdminPinModal(true);
                  }
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/85 transition cursor-pointer text-left min-w-0 gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <div className="bg-rose-50 dark:bg-rose-900/30 p-2 rounded-lg text-rose-600 dark:text-rose-400 shrink-0">
                    <ShieldAlert size={18} />
                  </div>
                  <div className="text-left flex-1 min-w-0 font-sans">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm truncate">
                      {currentLanguage === 'hi' ? 'सिस्टम ऑडिट लॉग्स' : 'System Audit Logs'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block truncate font-sans">
                      {currentLanguage === 'hi' ? 'संवेदनशील रिकॉर्ड हटाने और स्टॉक संशोधनों की जाँच करें' : 'Track admin changes, staff actions & secure billing edits'}
                    </span>
                  </div>
                </div>
                <span className="text-slate-400 shrink-0">&#10145;</span>
              </button>
            </div>
          </SettingsAccordion>

        </div>



        



        {/* Responsive Dual-Pane Layout on Tablets & Desktops */}
        <div className="hidden md:grid md:grid-cols-12 gap-6 max-w-6xl mx-auto w-full items-start">
          {/* L.H.S Sidebar Categories Navigation Panel */}
          <div className="md:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest font-sans">
                {currentLanguage === 'hi' ? 'सेटिंग्स श्रेणियां' : 'Settings Categories'}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-sans mt-0.5 leading-snug">
                {currentLanguage === 'hi' ? 'सिस्टम कॉन्फ़िगरेशन का चयन करें' : 'Select a system configuration area'}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {/* Category 1: Business Settings */}
              <button
                onClick={() => setSelectedCategoryTab('business_identity')}
                className={`flex items-start gap-3 p-3 rounded-xl transition text-left cursor-pointer border ${
                  selectedCategoryTab === 'business_identity'
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 font-bold'
                    : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/65 border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedCategoryTab === 'business_identity' ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  <User size={16} />
                </div>
                <div className="flex-1 min-w-0 font-sans">
                  <h3 className="text-xs font-bold truncate">
                    {currentLanguage === 'hi' ? 'व्यवसाय सेटअप' : 'Business Settings'}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-snug mt-0.5 font-sans">
                    {currentLanguage === 'hi' ? 'कंपनी प्रोफ़ाइल, भाषा, नंबरिंग' : 'Profile, language & invoicing setup'}
                  </p>
                </div>
              </button>

              {/* Category 2: Billing Preferences */}
              <button
                onClick={() => setSelectedCategoryTab('app_preferences')}
                className={`flex items-start gap-3 p-3 rounded-xl transition text-left cursor-pointer border ${
                  selectedCategoryTab === 'app_preferences'
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 font-bold'
                    : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/65 border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedCategoryTab === 'app_preferences' ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  <SlidersHorizontal size={16} />
                </div>
                <div className="flex-1 min-w-0 font-sans">
                  <h3 className="text-xs font-bold truncate">
                    {currentLanguage === 'hi' ? 'बिलिंग और उत्पाद' : 'Billing Preferences'}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-snug mt-0.5 font-sans">
                    {currentLanguage === 'hi' ? 'कर नियम, QR कोड, स्मार्ट सहायक' : 'Tax, scanner, UPI QR & smart assistant'}
                  </p>
                </div>
              </button>

              {/* Category 3: Security & Permissions */}
              <button
                onClick={() => setSelectedCategoryTab('security_access')}
                className={`flex items-start gap-3 p-3 rounded-xl transition text-left cursor-pointer border ${
                  selectedCategoryTab === 'security_access'
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 font-bold'
                    : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/65 border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedCategoryTab === 'security_access' ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  <ShieldCheck size={16} />
                </div>
                <div className="flex-1 min-w-0 font-sans">
                  <h3 className="text-xs font-bold truncate">
                    {currentLanguage === 'hi' ? 'सुरक्षा और पहुंच' : 'Security & Permissions'}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-snug mt-0.5 font-sans">
                    {currentLanguage === 'hi' ? 'पिन लॉक, रोल्स, कर्मचारी पहुंच' : 'PIN, admin password & staff logs'}
                  </p>
                </div>
              </button>

              {/* Category 4: Cloud & Licensing */}
              <button
                onClick={() => setSelectedCategoryTab('premium_license')}
                className={`flex items-start gap-3 p-3 rounded-xl transition text-left cursor-pointer border ${
                  selectedCategoryTab === 'premium_license'
                    ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 font-bold'
                    : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/65 border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedCategoryTab === 'premium_license' ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-amber-500 dark:text-amber-400'
                }`}>
                  <Crown size={16} />
                </div>
                <div className="flex-1 min-w-0 font-sans">
                  <h3 className="text-xs font-bold truncate">
                    {currentLanguage === 'hi' ? 'क्लाउड और प्रीमियम' : 'Cloud & Licensing'}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-snug mt-0.5 font-sans">
                    {currentLanguage === 'hi' ? 'क्लाउड सिंक, लाइसेंस कुंजी सक्रियता' : 'Firebase sync & license key activation'}
                  </p>
                </div>
              </button>

              {/* Category 5: Database Tools */}
              <button
                onClick={() => setSelectedCategoryTab('data_cloud')}
                className={`flex items-start gap-3 p-3 rounded-xl transition text-left cursor-pointer border ${
                  selectedCategoryTab === 'data_cloud'
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 font-bold'
                    : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/65 border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedCategoryTab === 'data_cloud' ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  <HardDrive size={16} />
                </div>
                <div className="flex-1 min-w-0 font-sans">
                  <h3 className="text-xs font-bold truncate">
                    {currentLanguage === 'hi' ? 'डेटाबेस उपकरण' : 'Database Tools'}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-snug mt-0.5 font-sans">
                    {currentLanguage === 'hi' ? 'रोलबैक, बैकअप, डेटा रीसेट' : 'Point-in-time snapshot recovery & demo data'}
                  </p>
                </div>
              </button>

              {/* Category 6: Diagnostics & Logs */}
              <button
                onClick={() => setSelectedCategoryTab('diagnostics')}
                className={`flex items-start gap-3 p-3 rounded-xl transition text-left cursor-pointer border ${
                  selectedCategoryTab === 'diagnostics'
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 font-bold'
                    : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/65 border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedCategoryTab === 'diagnostics' ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  <Activity size={16} />
                </div>
                <div className="flex-1 min-w-0 font-sans">
                  <h3 className="text-xs font-bold truncate">
                    {currentLanguage === 'hi' ? 'डायग्नोस्टिक्स' : 'Diagnostics & Logs'}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-snug mt-0.5 font-sans">
                    {currentLanguage === 'hi' ? 'सिस्टम प्रदर्शन, ऑडिट लॉग्स' : 'Verify schema health & actions log'}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* R.H.S Panels Area */}
          <div className="md:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm min-h-[500px]">
            <AnimatePresence mode="wait">
              {selectedCategoryTab === 'business_identity' && (
                <motion.div
                  key="business_identity"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 text-left"
                >
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="text-indigo-600 dark:text-indigo-400" size={24} />
                      {currentLanguage === 'hi' ? 'व्यवसाय सेटअप' : 'Business Settings'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                      {currentLanguage === 'hi' ? 'कंपनी प्रोफ़ाइल, नंबरिंग सेटअप, और ऐप भाषा प्रबंधित करें।' : 'Manage store identification, business address, contact numbers, and voucher printing headers.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                    {/* Store Code details */}
                    <div className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm gap-4">
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                          <Hash size={20} />
                        </div>
                        <div className="text-left flex-1 min-w-0 font-sans">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                            {currentLanguage === 'hi' ? 'स्टोर कोड (6-अंकीय)' : 'Store Code (6-Digit)'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block font-sans mt-0.5">
                            {currentLanguage === 'hi' ? 'स्टाफ से शेयर करके सिंक लिंक करें' : 'Share with staff to link business and sync'}
                          </span>
                        </div>
                      </div>
                      {authContext.currentUser?.storeCode ? (
                        <span className="text-sm font-mono font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-800/65 px-3 py-1.5 rounded-lg shadow-sm">
                          {authContext.currentUser?.storeCode}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium font-sans">Auto generating...</span>
                      )}
                    </div>

                    {/* Company Profile link */}
                    <button
                      disabled={authContext.currentUser?.role === 'staff'}
                      onClick={() => onNavigate('companyProfile')}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-left min-w-0 gap-4 shadow-sm ${
                        authContext.currentUser?.role === 'staff' ? 'opacity-[0.45] cursor-not-allowed' : 'cursor-pointer bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                          <User size={20} />
                        </div>
                        <div className="text-left flex-1 min-w-0 font-sans">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm flex items-center gap-1.5 font-sans">
                            {currentLanguage === 'hi' ? 'कंपनी प्रोफ़ाइल संपादित करें' : 'Edit Company Profile'}
                            {authContext.currentUser?.role === 'staff' && <Lock size={12} className="text-amber-500 inline shrink-0 font-sans" />}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block truncate mt-0.5 font-sans">
                            {currentLanguage === 'hi' ? 'फोन नंबर, पता, और छपाई सेटिंग्स प्रबंधित करें' : 'Phone, address, tax configuration and print headers'}
                          </span>
                        </div>
                      </div>
                      {authContext.currentUser?.role === 'staff' ? (
                        <span className="text-xs text-amber-500 font-extrabold flex items-center gap-1 bg-amber-50 dark:bg-amber-900/10 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-900/35 font-sans shrink-0">
                          <Lock size={12} /> Lock
                        </span>
                      ) : (
                        <span className="text-slate-400 shrink-0">&#10145;</span>
                      )}
                    </button>

                    {/* Invoice Numbering Options */}
                    <button
                      disabled={authContext.currentUser?.role === 'staff'}
                      onClick={() => setActiveView('invoice_numbering')}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-left min-w-0 gap-4 shadow-sm ${
                        authContext.currentUser?.role === 'staff' ? 'opacity-[0.45] cursor-not-allowed' : 'cursor-pointer bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                          <Hash size={20} />
                        </div>
                        <div className="text-left flex-1 min-w-0 font-sans">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm flex items-center gap-1.5 font-sans">
                            {currentLanguage === 'hi' ? 'नंबरिंग सेटअप' : 'Invoice Numbering'}
                            {authContext.currentUser?.role === 'staff' && <Lock size={12} className="text-amber-500 inline shrink-0 font-sans" />}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block truncate mt-0.5 font-sans">
                            {currentLanguage === 'hi' ? 'विभिन्न वाउचर नंबर प्रीफिक्स' : 'Set prefix, sequence start and numbering sequences'}
                          </span>
                        </div>
                      </div>
                      {authContext.currentUser?.role === 'staff' ? (
                        <span className="text-xs text-amber-500 font-extrabold flex items-center gap-1 bg-amber-50 dark:bg-amber-900/10 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-900/35 font-sans shrink-0">
                          <Lock size={12} /> Lock
                        </span>
                      ) : (
                        <span className="text-slate-400 shrink-0">&#10145;</span>
                      )}
                    </button>

                    {/* Bilingual App Language Row */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/65 shadow-sm flex items-center justify-between gap-4 min-w-0">
                      <div className="text-left flex-1 min-w-0 pr-1 select-auto font-sans">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block font-sans truncate">App Language (भाषा)</span>
                        <span className="text-xs text-slate-400 leading-relaxed block truncate font-sans mt-0.5">
                          {currentLanguage === 'hi' ? 'सक्रिय भाषा: हिंदी' : 'Active language: English'}
                        </span>
                      </div>
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full shadow-inner border border-slate-200/50 dark:border-slate-700/60 pointer-events-auto items-center shrink-0">
                        <button 
                          onClick={() => onLanguageChange('en')}
                          className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wide transition-all duration-200 cursor-pointer ${
                            currentLanguage === 'en' 
                              ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm font-black scale-102' 
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          EN
                        </button>
                        <button 
                          onClick={() => onLanguageChange('hi')}
                          className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wide transition-all duration-200 cursor-pointer ${
                            currentLanguage === 'hi' 
                              ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm font-black scale-102' 
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          हिंदी
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedCategoryTab === 'app_preferences' && (
                <motion.div
                  key="app_preferences"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 text-left"
                >
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <SlidersHorizontal className="text-indigo-600 dark:text-indigo-400" size={24} />
                      {currentLanguage === 'hi' ? 'बिलिंग और उत्पाद' : 'Billing Preferences'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                      {currentLanguage === 'hi' ? 'बिलिंग प्राथमिकताओं, QR कोड, बारकोड, और स्मार्ट सहायक प्रबंधित करें।' : 'Configure invoice structures, QR codes, scan inputs, general dashboard layouts, and floating tools.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    {/* Switch Toggles */}
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-3.5">
                      {/* Home QR Code inline Switcher */}
                      <div className="flex items-center justify-between py-1 border-b border-slate-100/80 dark:border-slate-800/70 gap-3 min-w-0">
                        <div className="text-left flex-1 min-w-0 font-sans">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm block">Home QR Code</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block truncate font-sans">Render merchant quick scan UPI QR onto the landing dashboard</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={localStorage.getItem('showDashboardQR') !== 'false'}
                            onChange={(e) => {
                              localStorage.setItem('showDashboardQR', e.target.checked.toString());
                              window.dispatchEvent(new Event('storage'));
                              setAppSettings(prev => ({...prev, offlineMode: !prev.offlineMode}));
                              setTimeout(() => setAppSettings(prev => ({...prev, offlineMode: !prev.offlineMode})), 5);
                            }}
                          />
                          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      {/* Barcode Scanner inline Switcher */}
                      <div className="flex items-center justify-between py-1 border-b border-slate-100/80 dark:border-slate-800/70 gap-3 min-w-0">
                        <div className="text-left flex-1 min-w-0 font-sans">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm block">Barcode Scanner</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block font-sans">Leverage native device frame cameras for items scan inputs</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={localStorage.getItem('showBarcodeScanner') !== 'false'}
                            onChange={(e) => {
                              localStorage.setItem('showBarcodeScanner', e.target.checked.toString());
                              window.dispatchEvent(new Event('storage'));
                              setAppSettings(prev => ({...prev, offlineMode: !prev.offlineMode}));
                              setTimeout(() => setAppSettings(prev => ({...prev, offlineMode: !prev.offlineMode})), 5);
                            }}
                          />
                          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      {/* Smart assistant inline switcher [Premium 👑] */}
                      {isPremiumLicensed && (
                        <div className="flex items-center justify-between py-1 gap-3 min-w-0">
                          <div className="text-left flex-1 min-w-0 font-sans">
                            <span className="font-bold text-slate-800 dark:text-indigo-600 text-sm block">Smart Floating AI Assistant <span className="text-amber-500 font-extrabold text-xs">👑 Premium</span></span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block font-sans">
                              {currentLanguage === 'hi' ? 'यूनिवर्सल चैटबॉट और हिंदी कमांड असिस्टेंट सक्षम करें' : 'Enable floating Gemini-backed command dialog widgets'}
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={localStorage.getItem('showSmartAssistant') !== 'false'}
                              onChange={(e) => {
                                localStorage.setItem('showSmartAssistant', e.target.checked.toString());
                                window.dispatchEvent(new Event('storage'));
                                setAppSettings(prev => ({...prev, offlineMode: !prev.offlineMode}));
                                setTimeout(() => setAppSettings(prev => ({...prev, offlineMode: !prev.offlineMode})), 5);
                              }}
                            />
                            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Secondary preferences settings pages */}
                    <div className="space-y-3">
                      <button
                        onClick={() => setActiveView('preferences2')}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left shadow-sm gap-4"
                      >
                        <div className="flex items-center gap-3.5 pr-2">
                          <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                            <SlidersHorizontal size={20} />
                          </div>
                          <div className="text-left flex-1 font-sans">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">Sale & Purchase Settings</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block font-sans mt-0.5">Configure item batches, tax rules, wholesale controls and discounts</span>
                          </div>
                        </div>
                        <span className="text-slate-400 shrink-0">&#10145;</span>
                      </button>

                      <button
                        onClick={() => setActiveView('preferences')}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left shadow-sm gap-4"
                      >
                        <div className="flex items-center gap-3.5 pr-2">
                          <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                            <SlidersHorizontal size={20} />
                          </div>
                          <div className="text-left flex-1 font-sans">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">Dashboard & General Preferences</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block font-sans mt-0.5">Toggle home screen components, system guides and visual rails</span>
                          </div>
                        </div>
                        <span className="text-slate-400 shrink-0">&#10145;</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedCategoryTab === 'security_access' && (
                <motion.div
                  key="security_access"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 text-left"
                >
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="text-indigo-600 dark:text-indigo-400" size={24} />
                      {currentLanguage === 'hi' ? 'सुरक्षा और पहुंच' : 'Security & Permissions'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                      {currentLanguage === 'hi' ? 'सुरक्षा पिन, कर्मचारी पहुंच और भूमिकाओं को कॉन्फ़िगर करें।' : 'Change administrator PIN, simulate staff mode, or configure custom staff roles.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    {/* App PIN & Password */}
                    <button
                      onClick={() => setActiveView('password_settings')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left min-w-0 gap-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                        <div className="bg-amber-50 dark:bg-amber-900/30 p-2.5 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                          <Key size={20} />
                        </div>
                        <div className="text-left flex-1 min-w-0 font-sans">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">
                            {currentLanguage === 'hi' ? 'ऐप पिन और पासवर्ड' : 'App PIN & Password'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block truncate font-sans mt-0.5">
                            {currentLanguage === 'hi' ? 'मास्टर पिन बदलें या नया एडमिन पासवर्ड सेट करें' : 'Change Master PIN security, update administrator credentials'}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-400 shrink-0">&#10145;</span>
                    </button>

                    {/* Simulated Permissions Switcher */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm font-sans space-y-3">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans">Simulated Permissions Mode</span>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => authContext.switchRole('admin')}
                          className={`flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-bold rounded-xl border transition cursor-pointer ${
                            authContext.currentUser?.role === 'admin' 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm font-extrabold pb-2.5 pt-2.5' 
                              : 'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 pb-2.5 pt-2.5'
                          }`}
                        >
                          <span>Admin Mode</span>
                        </button>
                        <button 
                          onClick={() => authContext.switchRole('staff')}
                          className={`flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-bold rounded-xl border transition cursor-pointer ${
                            authContext.currentUser?.role === 'staff' 
                              ? 'bg-amber-600 border-amber-600 text-white shadow-sm font-extrabold pb-2.5 pt-2.5' 
                              : 'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 pb-2.5 pt-2.5'
                          }`}
                        >
                          <Lock size={12} />
                          <span>Staff Mode</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-sans">
                        {authContext.currentUser?.role === 'staff' 
                          ? "🔒 Simulated Staff Role active: Business edits, resetting db, rollback databases and some actions are locked."
                          : "🔓 Simulated Admin Role active: full control, access authorized for all backup uploads/downloads & db management."}
                      </p>
                    </div>

                    {/* Manage Staff & Permissions */}
                    <button
                      onClick={() => {
                        if (isAdminUnlocked) {
                          setActiveView('staff_members');
                        } else {
                          setPendingAdminView('staff_members');
                          setAdminPinInput('');
                          setAdminPinError('');
                          setShowAdminPinModal(true);
                        }
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition cursor-pointer text-left shadow-sm min-w-0 gap-4"
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                          <Users size={20} />
                        </div>
                        <div className="text-left flex-1 min-w-0 font-sans">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm flex items-center gap-1.5 font-sans">
                            {currentLanguage === 'hi' ? 'कर्मचारी और अनुमतियाँ' : 'Manage Staff & Permissions'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block truncate mt-0.5 font-sans">
                            {currentLanguage === 'hi' ? 'स्टाफ सदस्य जोड़ें और अनुमतियों को नियंत्रित करें' : 'Add new registers, configure print privileges and action locks'}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-400 shrink-0">&#10145;</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {selectedCategoryTab === 'premium_license' && (
                <motion.div
                  key="premium_license"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 text-left"
                >
                  <div>
                    <h2 className="text-xl font-extrabold text-amber-500 flex items-center gap-2">
                      <Crown className="text-amber-500" size={24} />
                      {currentLanguage === 'hi' ? 'क्लाउड और प्रीमियम' : 'Cloud & Licensing'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                      {currentLanguage === 'hi' ? 'क्लाउड सिंक विकल्प, प्रमाणीकरण, और लाइसेंस मोड कॉन्फ़िगर करें।' : 'Manage online databases, real-time sync nodes, and license verification parameters.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                    {/* Cloud Sync & Backup Toggle [Premium 👑] */}
                    {isPremiumLicensed && (
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 min-w-0">
                        <div className="text-left flex-1 min-w-0 pr-1 select-auto font-sans">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm block">Cloud Sync & Backup <span className="text-amber-500 font-extrabold text-xs">👑 Premium</span></span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block font-sans mt-0.5">
                            {currentLanguage === 'hi' ? 'डेटा और इन्वॉइस को सुरक्षित क्लाउड सर्वर पर सिंक करें' : 'Online real-time sync of sales ledger to safe cloud'}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={appSettings.cloudSyncEnabled}
                            onChange={(e) => handleAppSettingsChange('cloudSyncEnabled', e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    )}

                    {/* Cloud Account Detail (Google Sign-In, Email Auth) */}
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 flex flex-col gap-2.5 shadow-sm">
                      <span className="text-xs uppercase font-extrabold text-slate-500 tracking-wider font-sans">Cloud Account Detail</span>
                      {auth.currentUser && !auth.currentUser.isAnonymous ? (
                        <div className="flex items-center justify-between gap-4">
                          <div className="truncate flex-1">
                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate font-sans">{auth.currentUser.email}</p>
                            <p className="text-xs text-emerald-500 font-semibold font-sans mt-0.5">Active Secure Session connected</p>
                          </div>
                          <button 
                            onClick={async () => {
                              await auth.signOut();
                              window.location.reload();
                            }} 
                            className="text-xs font-bold text-rose-500 hover:text-rose-600 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 shadow-sm shrink-0 font-sans cursor-pointer transition"
                          >
                            Sign Out
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-500 font-sans">Enable cloud sync & secure multi-device authorization.</p>
                          <div className="flex gap-3">
                            <button 
                              onClick={() => setShowEmailAuthModal(true)} 
                              className="flex-grow py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm text-center font-sans cursor-pointer transition"
                            >
                              Email Auth
                            </button>
                            <button 
                              onClick={async () => {
                                try {
                                  await signInWithGoogle();
                                  setDialogMessage({ title: 'Success', message: 'Signed in successfully!' });
                                } catch(e: any) {
                                  setDialogMessage({ title: 'Error', message: e.message || 'Failed to sign in', isError: true });
                                }
                              }} 
                              className="flex-grow py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-center font-sans cursor-pointer hover:bg-slate-50 transition"
                            >
                              Google Sign-In
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Premium License Mode & Activation */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/85 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between gap-3 text-left w-full">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className={`w-2.5 h-2.5 rounded-full ${isPremiumLicensed ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></div>
                          <p className="text-[11px] font-mono tracking-tight uppercase text-slate-500 dark:text-slate-400">
                            License Mode: <span className={isPremiumLicensed ? 'text-amber-500 font-extrabold' : 'text-slate-600 dark:text-slate-500 font-bold'}>{isPremiumLicensed ? 'PREMIUM TIED (V2.0)' : 'FREE BASIC (OFFLINE ONLY)'}</span>
                          </p>
                        </div>
                        {authContext.currentUser?.role === 'admin' && (
                          <button
                            type="button"
                            onClick={handleUpgradeToPremium}
                            className={`px-3 py-1 text-xs rounded-full font-bold transition shadow-sm shrink-0 cursor-pointer ${isPremiumLicensed ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200' : 'bg-amber-500 hover:bg-amber-600 text-slate-900 border border-amber-600/20'}`}
                            id="premium_toggle_trigger_button_desktop"
                          >
                            {isPremiumLicensed 
                              ? (currentLanguage === 'hi' ? 'मुफ़्त लाइसेंस बंद करें' : 'Demo Downgrade to Basic') 
                              : (currentLanguage === 'hi' ? 'मुफ़्त प्रीमियम सक्रिय करें' : 'Activate Sandbox Premium License')}
                          </button>
                        )}
                      </div>

                      {!isPremiumLicensed && authContext.currentUser?.role === 'admin' && (
                        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-2 flex flex-col gap-2 w-full">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {currentLanguage === 'hi' ? 'प्रीमियम सक्रिय करने के लिए लाइसेंस कुंजी दर्ज करें' : 'Enter License Key to Activate Premium'}
                          </label>
                          <div className="flex gap-2 w-full">
                            <input 
                              type="text" 
                              value={licenseCode}
                              onChange={e => {
                                setLicenseCode(e.target.value);
                                setLicenseError('');
                              }}
                              placeholder="e.g. EAZY-PREMIUM-2026"
                              className="flex-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold tracking-widest text-slate-800 dark:text-white outline-none focus:border-amber-500 dark:focus:border-amber-400 transition-colors uppercase min-w-0"
                            />
                            <button 
                              onClick={handleValidateLicenseCode}
                              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold px-5 rounded-xl transition-all active:scale-98 text-xs cursor-pointer shadow-sm flex items-center justify-center gap-1.5 shrink-0"
                            >
                              <Crown size={12} className="fill-slate-900" />
                              {currentLanguage === 'hi' ? 'सक्रिय' : 'Activate'}
                            </button>
                          </div>
                          {licenseError && (
                            <p className="text-[10px] font-bold text-rose-500 mt-1">
                              ⚠️ {licenseError}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Premium Features Status Checklist */}
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/85 dark:border-slate-800 space-y-4 text-left">
                      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                        <Crown className="text-amber-500 shrink-0" size={18} />
                        <span className="text-xs uppercase font-extrabold text-slate-500 tracking-wider font-sans">
                          {currentLanguage === 'hi' ? 'प्रीमियम सुविधाओं की सूची' : 'Premium Feature Checklist'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          {
                            title: currentLanguage === 'hi' ? 'रीयल-टाइम क्लाउड सिंक' : 'Cloud Sync & Backups',
                            desc: currentLanguage === 'hi' ? 'सुरक्षित क्लाउड पर ऑटो बैकअप और रियल-टाइम सिंक' : 'Automatically sync invoice data & backups to cloud storage',
                          },
                          {
                            title: currentLanguage === 'hi' ? 'बहु-मल्टी डिवाइस रजिस्टर' : 'Multi-Device Registers',
                            desc: currentLanguage === 'hi' ? 'एक साथ कई डिवाइस पर बिलिंग और कैशियर काउंटर जोड़ें' : 'Connect concurrent cashiers & mobile billing terminals',
                          },
                          {
                            title: currentLanguage === 'hi' ? 'स्मार्ट एआई सहायक' : 'Gemini AI Assistant',
                            desc: currentLanguage === 'hi' ? 'स्टॉक पूछताछ, चालान निर्माण और व्यावसायिक रिपोर्ट के लिए एआई' : 'Ask questions, search products, & auto-fill billing via AI',
                          },
                          {
                            title: currentLanguage === 'hi' ? 'उन्नत ऑडिट लॉग जांच' : 'Advanced Audit & Security Logs',
                            desc: currentLanguage === 'hi' ? 'कर्मचारियों के प्रत्येक लेनदेन और संशोधनों पर नज़र रखें' : 'Detailed tracking of cashier activities and system actions',
                          }
                        ].map((feature, idx) => (
                          <div key={idx} className="flex gap-3 items-start">
                            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                              isPremiumLicensed 
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500'
                            }`}>
                              {isPremiumLicensed ? <Check size={14} className="font-extrabold" /> : <X size={14} />}
                            </div>
                            <div className="flex-grow select-none">
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 leading-none font-sans">
                                {feature.title}
                                {!isPremiumLicensed && (
                                  <span className="text-[9px] font-extrabold uppercase px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 leading-none">PRO</span>
                                )}
                              </h4>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal font-sans">{feature.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedCategoryTab === 'data_cloud' && (
                <motion.div
                  key="data_cloud"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 text-left"
                >
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <HardDrive className="text-indigo-600 dark:text-indigo-400" size={24} />
                      {currentLanguage === 'hi' ? 'डेटाबेस उपकरण' : 'Database Tools'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                      {currentLanguage === 'hi' ? 'डेटाबेस बैकअप, वित्तीय वर्ष ट्रांसफर और ऐप रीसेट विकल्प प्रबंधित करें।' : 'Wipe records, reinstall default schemas, manage snapshots, and roll over fiscal terms.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    {/* Time Machine Link */}
                    <button
                      onClick={() => setActiveView('time_machine')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left min-w-0 gap-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                        <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Database size={20} />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm truncate">Time Machine Bookmarks</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block truncate font-sans mt-0.5">Local snapshots database point-in-time recovery saves</span>
                        </div>
                      </div>
                      <span className="text-slate-400 shrink-0">&#10145;</span>
                    </button>

                    {/* Financial year transfer */}
                    <button
                      disabled={authContext.currentUser?.role === 'staff'}
                      onClick={() => setShowTransferDialog(true)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800/85 hover:bg-slate-50/50 dark:hover:bg-slate-800/55 transition text-left min-w-0 gap-4 shadow-sm ${
                        authContext.currentUser?.role === 'staff' ? 'opacity-[0.45] cursor-not-allowed' : 'cursor-pointer bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                          <FileText size={20} />
                        </div>
                        <div className="text-left flex-1 min-w-0 font-sans">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm flex items-center gap-1.5 font-sans">
                            <span className="truncate">{currentLanguage === 'hi' ? 'वित्तीय वर्ष ट्रांसफर करें' : 'Transfer Financial Year'}</span>
                            {authContext.currentUser?.role === 'staff' && <Lock size={12} className="text-amber-500 inline shrink-0 font-sans" />}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block truncate mt-0.5 font-sans">
                            {currentLanguage === 'hi' ? '🔒 स्टाफ रोल के लिए प्रतिबंधित क्रिया' : 'Carry balances to new fiscal period database'}
                          </span>
                        </div>
                      </div>
                      {authContext.currentUser?.role === 'staff' ? (
                        <span className="text-xs text-amber-500 font-extrabold flex items-center gap-1 bg-amber-50 dark:bg-amber-900/10 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-900/35 font-sans shrink-0">
                          <Lock size={12} /> Lock
                        </span>
                      ) : (
                        <span className="text-slate-400 shrink-0">&#10145;</span>
                      )}
                    </button>

                    {/* Seed Demo Data Button */}
                    {authContext.currentUser?.role !== 'staff' && (
                      <button
                        onClick={handleSeedClick}
                        className="w-full bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100/60 transition p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs text-center cursor-pointer block leading-snug font-sans shadow-sm"
                      >
                        {isSeeding ? 'Seeding...' : '📥 Install Sample Enterprise Dairy Demo Data'}
                      </button>
                    )}

                    {/* Wipe Reset Databases */}
                    {authContext.currentUser?.role !== 'staff' && (
                      <button
                        onClick={handleResetClick}
                        className="w-full bg-red-400/10 dark:bg-red-950/25 hover:bg-red-400/20 transition p-4 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 font-extrabold text-xs text-center cursor-pointer block leading-snug font-sans shadow-sm"
                      >
                        {isResetting ? 'Resetting App...' : '⚠️ Wipe / Reset All Databases Point Blank'}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {selectedCategoryTab === 'diagnostics' && (
                <motion.div
                  key="diagnostics"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 text-left"
                >
                  <div>
                    <h2 className="text-xl font-extrabold text-[#3b5998] dark:text-indigo-400 flex items-center gap-2">
                      <Activity className="text-indigo-600 dark:text-indigo-400" size={24} />
                      {currentLanguage === 'hi' ? 'डायग्नोस्टिक्स' : 'Diagnostics & Logs'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                      {currentLanguage === 'hi' ? 'सिस्टम प्रदर्शन, डेटाबेस स्वास्थ्य और ऑडिट लॉग जांचें।' : 'Inspect system queries profile, health status, and action logs.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                    {/* System Health Check */}
                    <button
                      onClick={() => setActiveView('system_health')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left min-w-0 gap-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                          <Activity size={20} />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm truncate">
                            {currentLanguage === 'hi' ? 'सिस्टम स्वास्थ्य' : 'System Health Check'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block truncate font-sans mt-0.5">
                            {currentLanguage === 'hi' ? 'सक्रिय डेटाबेस तालिकाओं के आकार और स्वास्थ्य को ऑडिट करें' : 'Verify active tables status, size counters and storage parameters'}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-400 shrink-0">&#10145;</span>
                    </button>

                    {/* Master Health Analysis */}
                    <button
                      onClick={() => setActiveView('master_health')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left min-w-0 gap-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                        <div className="bg-amber-50 dark:bg-amber-900/30 p-2.5 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                          <Heart size={20} />
                        </div>
                        <div className="text-left flex-1 min-w-0 font-sans">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm truncate">
                            {currentLanguage === 'hi' ? 'मास्टर स्वास्थ्य विश्लेषण' : 'Master Health Analysis'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block truncate font-sans mt-0.5">
                            {currentLanguage === 'hi' ? 'टूटे हुए डेटा और अमान्य अनुक्रमणिकाओं को स्कैन करें' : 'Scan for broken referencing links & invalid indexing tables'}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-400 shrink-0">&#10145;</span>
                    </button>

                    {/* View Audit Logs */}
                    <button
                      onClick={() => {
                        if (isAdminUnlocked) {
                          setActiveView('audit_logs');
                        } else {
                          setPendingAdminView('audit_logs');
                          setAdminPinInput('');
                          setAdminPinError('');
                          setShowAdminPinModal(true);
                        }
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition cursor-pointer text-left shadow-sm min-w-0 gap-4"
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                        <div className="bg-rose-50 dark:bg-rose-900/30 p-2.5 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
                          <ShieldAlert size={20} />
                        </div>
                        <div className="text-left flex-1 min-w-0 font-sans">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm truncate">
                            {currentLanguage === 'hi' ? 'सिस्टम ऑडिट लॉग्स' : 'System Audit Logs'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block truncate font-sans mt-0.5 font-sans">
                            {currentLanguage === 'hi' ? 'संवेदनशील रिकॉर्ड हटाने और स्टॉक संशोधनों की जाँच करें' : 'Track admin changes, staff actions & secure billing edits'}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-400 shrink-0">&#10145;</span>
                    </button>

                    {/* Automated trade math trials */}
                    {authContext.currentUser?.role === 'admin' && (
                      <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 font-sans">Automated Test Execution</h3>
                        <TestCaseRunner />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Footer info lockup */}
        <div className="flex items-center justify-center flex-col py-6 opacity-65 text-center">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2.5">
            <ShieldCheck size={24} className="text-slate-400 dark:text-slate-600" />
          </div>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-sm select-auto">Eazy Billing App</p>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider font-semibold font-sans">Version {APP_VERSION} • Secure Sandbox Container</p>
          <p className="text-slate-400 dark:text-slate-600 text-[9px] mt-0.5 font-mono">Updated: {BUILD_DATE}</p>
        </div>
      </div>

      {/* Cloud Syncing Overlay */}
      {(isCloudSyncing || isTransferring) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{isTransferring ? 'Transferring...' : 'Syncing...'}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{isTransferring ? 'कृपया प्रतीक्षा करें, वित्तीय वर्ष ट्रांसफर हो रहा है...' : syncMessage}</p>
              </div>
          </div>
      )}

      {/* Email Auth Modal */}
      {showEmailAuthModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col relative">
                  <button onClick={() => setShowEmailAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                      X
                  </button>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                      {emailAuthMode === 'login' ? 'Login' : emailAuthMode === 'signup' ? 'Create Account' : 'Reset Password'}
                  </h3>
                  <p className="text-sm text-slate-500 mb-6 font-medium">Use your email to access your data on any device.</p>
                  
                  <form onSubmit={handleEmailAuthSubmit} className="flex flex-col gap-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email</label>
                          <input 
                              type="email" 
                              required 
                              value={emailInput} 
                              onChange={e => setEmailInput(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-none outline-none ring-1 ring-slate-200 dark:ring-slate-700 p-3 rounded-lg text-slate-800 dark:text-white text-sm"
                              placeholder="Enter your email"
                          />
                      </div>
                      
                      {emailAuthMode !== 'forgot' && (
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Password</label>
                              <input 
                                  type="password" 
                                  required 
                                  minLength={6}
                                  value={passwordInput} 
                                  onChange={e => setPasswordInput(e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border-none outline-none ring-1 ring-slate-200 dark:ring-slate-700 p-3 rounded-lg text-slate-800 dark:text-white text-sm"
                                  placeholder="Password (min 6 chars)"
                              />
                          </div>
                      )}

                      <button 
                          type="submit" 
                          disabled={authLoading}
                          className="w-full py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-colors mt-2 disabled:opacity-50 flex justify-center items-center h-[52px]"
                      >
                          {authLoading ? <Loader2 size={24} className="animate-spin" /> : 
                           emailAuthMode === 'login' ? 'Login' : 
                           emailAuthMode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
                      </button>
                  </form>

                  <div className="mt-6 flex flex-col gap-3 text-center text-sm font-medium">
                      {emailAuthMode === 'login' ? (
                          <>
                              <button onClick={() => setEmailAuthMode('signup')} className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                                  Don't have an account? Sign up
                              </button>
                              <button onClick={() => setEmailAuthMode('forgot')} className="text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs">
                                  Forgot Password?
                              </button>
                          </>
                      ) : (
                          <button onClick={() => setEmailAuthMode('login')} className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                              Back to Login
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Financial Year Transfer Dialog */}
      {showTransferDialog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                      Financial Year Transfer
                  </h3>
                  <div className="bg-blue-50 dark:bg-slate-800 p-4 rounded-xl mb-4 border border-blue-100 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-slate-500 dark:text-slate-400">From:</span>
                          <span className="font-bold text-slate-800 dark:text-white">{currentFYString}</span>
                      </div>
                      <div className="flex justify-center my-2">
                          <ArrowDownCircle size={24} className="text-blue-500" />
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-500 dark:text-slate-400">To:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">{nextFYString}</span>
                      </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
                      यह प्रक्रिया आपके सभी पुराने बिलों और लेन-देन को हटा देगी और केवल पार्टियों (ग्राहकों/सप्लायरों) और उनके वर्तमान बैलेंस को नए वित्तीय वर्ष के लिए 'ओपनिंग बैलेंस' के रूप में रखेगी।<br/><br/>
                      <span className="text-red-500 font-bold">चेतावनी: यह एक स्थायी प्रक्रिया है। आगे बढ़ने से पहले एक बैकअप फ़ाइल डाउनलोड की जाएगी।</span>
                  </p>
                  <div className="flex gap-3">
                      <button 
                          onClick={() => setShowTransferDialog(false)} 
                          className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={handleTransferFinancialYear} 
                          className="flex-1 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors"
                      >
                          Transfer Now
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Custom Dialog for Confirmation */}
      {cloudAction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                      {cloudAction === 'upload' ? 'Upload Data' : 'Download Data'}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                      {cloudAction === 'upload' 
                          ? 'क्या आप अपना सारा डाटा ऑनलाइन क्लाउड पर सुरक्षित (Upload) करना चाहते हैं?'
                          : 'क्या आप ऑनलाइन क्लाउड से अपना डाटा वापस (Download) लाना चाहते हैं? यह आपके मौजूदा डाटा को बदल देगा।'}
                  </p>
                  <div className="flex gap-3">
                      <button 
                          onClick={() => setCloudAction(null)} 
                          className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={executeCloudAction} 
                          className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-colors"
                      >
                          Confirm
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Custom Dialog for Snapshot Confirmation */}
      {snapshotConfirm && (
          <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                      {snapshotConfirm.type === 'delete' ? (
                        <>
                          <Trash2 className="text-rose-500 shrink-0" size={22} />
                          <span>Delete Snapshot?</span>
                        </>
                      ) : (
                        <>
                          <RefreshCcw className="text-blue-500 shrink-0" size={22} />
                          <span>Rollback Snapshot?</span>
                        </>
                      )}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
                      {snapshotConfirm.type === 'delete' ? (
                          <>
                              ALERT: Kya aap sach mein snapshot <span className="font-mono font-bold text-rose-500 break-all">"{snapshotConfirm.filename}"</span> ko permanently delete karna chahte hain? Isse ye restore list se hamesha ke liye delete ho jayega aur recovers nahi kiya ja sakega.
                          </>
                      ) : (
                          <>
                              ALERT: Kya aap sach mein snapshot <span className="font-mono font-bold text-blue-500 break-all">"{snapshotConfirm.filename}"</span> se poora database rollback karna chahte hain? Isse aapka abhi ka data badal jayega, par hum safety ke liye current state ka automatic backup create kar lenge.
                          </>
                      )}
                  </p>
                  <div className="flex gap-3">
                      <button 
                          onClick={() => {
                              console.log("[TIME MACHINE] Confirmation cancelled for:", snapshotConfirm.filename);
                              setSnapshotConfirm(null);
                          }} 
                          className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer active:scale-95 duration-100 text-sm"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={() => {
                              if (snapshotConfirm.type === 'delete') {
                                  executeDeleteSnapshot(snapshotConfirm.filename);
                              } else {
                                  executeRestoreSnapshot(snapshotConfirm.filename);
                              }
                          }} 
                          className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition cursor-pointer active:scale-95 duration-100 text-sm ${
                              snapshotConfirm.type === 'delete' 
                                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/15' 
                                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/15'
                          }`}
                      >
                          {snapshotConfirm.type === 'delete' ? 'Delete Now' : 'Rollback Now'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Custom Dialog for Messages */}
      {dialogMessage && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${dialogMessage.isError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {dialogMessage.isError ? <ShieldCheck size={32} /> : <ShieldCheck size={32} />}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{dialogMessage.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">{dialogMessage.message}</p>
                  <button 
                      onClick={() => setDialogMessage(null)} 
                      className="w-full py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-colors"
                  >
                      OK
                  </button>
              </div>
          </div>
      )}

      {showAdminPinModal && (
        <div className={THEME.modal.overlay}>
          <div className={THEME.modal.panel}>
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={THEME.modal.iconContainer}>
                <Lock size={28} />
              </div>
              <h2 className={THEME.modal.title}>{t.adminPinChallenge}</h2>
              <p className={THEME.modal.subtitle}>
                {t.adminPinSubtitle}
              </p>
            </div>

            <div className="space-y-4">
              <input 
                type="password" 
                maxLength={6}
                value={adminPinInput}
                onChange={(e) => {
                  setAdminPinError('');
                  setAdminPinInput(e.target.value.replace(/\D/g, ''));
                }}
                placeholder="••••"
                className={THEME.input.pin}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const currentPin = localStorage.getItem('appPin') || '1234';
                    if (adminPinInput === currentPin) {
                      setIsAdminUnlocked(true);
                      setShowAdminPinModal(false);
                      setAdminPinInput('');
                      setAdminPinError('');
                      setActiveView(pendingAdminView);
                    } else {
                      setAdminPinError(t.invalidPinError);
                    }
                  }
                }}
              />

              {adminPinError && (
                <div className="text-xs text-red-500 text-center font-semibold bg-red-50 dark:bg-red-900/10 p-2 rounded-xl border border-red-500/20">
                  ⚠️ {adminPinError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPinModal(false);
                    setAdminPinInput('');
                    setAdminPinError('');
                  }}
                  className={THEME.button.secondary}
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentPin = localStorage.getItem('appPin') || '1234';
                    if (adminPinInput === currentPin) {
                      setIsAdminUnlocked(true);
                      setShowAdminPinModal(false);
                      setAdminPinInput('');
                      setAdminPinError('');
                      setActiveView(pendingAdminView);
                    } else {
                      setAdminPinError(t.invalidPinError);
                    }
                  }}
                  className={THEME.button.primary}
                >
                  {t.unlock}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};