import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Upload, Download, CloudUpload, CloudDownload, 
  Key, User, SlidersHorizontal, FileText, ArrowDownCircle,
  Globe, Sun, Moon, Check, Hash, Database, Loader2, AlertTriangle, ShieldCheck, RefreshCcw, Bot, ScanBarcode, HelpCircle, Trash2,
  ChevronDown, ChevronUp, HardDrive, Info, ExternalLink, Sparkles, Cloud, Laptop, Activity, Lock, Users, ShieldAlert
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
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'business_identity' | 'security_access' | 'data_cloud' | 'app_preferences' | 'admin_panel' | 'diagnostics'>('business_identity');
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

  useEffect(() => {
    billingService.getAppSettings().then(setAppSettings);
    CloudGatewayManager.checkPremiumStatus().then(setIsPremiumLicensed);
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
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
            <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center justify-between shadow-sm border-b border-slate-100 dark:border-slate-800 shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
                <div className="flex items-center gap-3">
                    <button onClick={() => setActiveView('preferences')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition">
                        <ArrowLeft size={22} />
                    </button>
                    <h1 className="text-lg font-bold truncate text-[#3b5998] dark:text-indigo-400 font-sans tracking-tight leading-none">
                        {currentLanguage === 'hi' ? 'इन्वॉइस नंबरिंग' : 'Invoice Numbering'}
                    </h1>
                </div>
                <button onClick={saveVoucherSettings} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-extrabold transition">
                    {currentLanguage === 'hi' ? 'सहेजें' : 'Save'}
                </button>
            </header>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
                {voucherSettings.map((setting, index) => (
                    <div key={setting.type} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
                        <h3 className="font-extrabold text-slate-800 dark:text-white mb-3 text-sm border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                            <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full"></span>
                            {setting.type}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider font-mono">{currentLanguage === 'hi' ? 'प्रीफिक्स' : 'Prefix'}</label>
                                <input 
                                    type="text" 
                                    value={setting.prefix} 
                                    onChange={e => handleVoucherSettingChange(index, 'prefix', e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 outline-none uppercase font-sans text-slate-900 dark:text-white"
                                    placeholder="e.g. S"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider font-mono">{currentLanguage === 'hi' ? 'प्रारंभ संख्या' : 'Start From'}</label>
                                <input 
                                    type="number" value={setting.currentSequence} 
                                    onChange={e => handleVoucherSettingChange(index, 'currentSequence', parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 outline-none font-sans text-slate-900 dark:text-white"
                                />
                                <p className="text-[10px] text-slate-400 mt-1 font-mono font-medium">{currentLanguage === 'hi' ? 'अगला: ' : 'Next: '}{setting.currentSequence + 1}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      );
  }

  // PREFERENCES SUB-SCREEN
  if (activeView === 'preferences') {
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)] animate-fadeIn">
        <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center gap-3 shadow-sm border-b border-slate-100 dark:border-slate-800 shrink-0 pt-[max(env(safe-area-inset-top),48px)] sticky top-0 z-40">
          <button onClick={() => onBack()} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-bold truncate text-[#3b5998] dark:text-indigo-400 font-sans tracking-tight leading-none animate-fadeIn">
            {currentLanguage === 'hi' ? 'प्राथमिकताएं' : 'Preferences'}
          </h1>
        </header>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
             {/* Unified Refactoring Design System Sandbox */}
             <button 
               onClick={() => onNavigate('masterLayoutShell')}
               className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-5 flex items-center justify-between w-full hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 active:scale-98 text-left"
             >
                 <div className="flex items-center gap-3.5 flex-1 min-w-0">
                     <div className="bg-amber-100 dark:bg-amber-950/45 p-2.5 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                         <Sparkles size={22} className="animate-pulse" />
                     </div>
                     <div className="flex-1 min-w-0">
                         <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">
                             {currentLanguage === 'hi' ? 'यूनीफाइड थीम सैंडबॉक्स' : 'Unified Theme Sandbox'}
                         </h3>
                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal font-sans">
                             {currentLanguage === 'hi' ? 'ऑनबोर्डिंग, लॉकस्क्रीन, पीओएस और सेटिंग्स का सैंडबॉक्स' : 'Interactive console for Onboarding, Lock Screen, POS & Settings views'}
                         </p>
                     </div>
                 </div>
                 <ExternalLink size={18} className="text-slate-400 dark:text-slate-500 shrink-0" />
             </button>

             {/* QR Visibility Toggle */}
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between w-full hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-3">
                 <div className="flex items-center gap-3 flex-1 min-w-0">
                     <div className="bg-green-50 dark:bg-green-950/40 p-2.5 rounded-xl text-green-600 dark:text-green-400 shrink-0">
                         <SlidersHorizontal size={22} />
                     </div>
                     <div className="flex-1 min-w-0 text-left">
                         <h3 className="font-bold text-slate-800 dark:text-white truncate text-sm sm:text-base">{currentLanguage === 'hi' ? 'होम QR कोड' : 'Home QR Code'}</h3>
                         <p className="text-xs text-slate-500 dark:text-slate-400 break-words">{currentLanguage === 'hi' ? 'डैशबोर्ड पर मर्चेंट UPI QR कोड दिखाएं' : 'Show quick UPI QR on landing dashboard'}</p>
                     </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={localStorage.getItem('showDashboardQR') !== 'false'}
                      onChange={(e) => {
                          localStorage.setItem('showDashboardQR', e.target.checked.toString());
                          window.dispatchEvent(new Event('storage'));
                          setActiveView('main');
                          setTimeout(() => setActiveView('preferences'), 10);
                      }}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-700 peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                 </label>
             </div>

             {/* Smart Assistant Visibility Toggle */}
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between w-full hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-3">
                 <div className="flex items-center gap-3 flex-1 min-w-0">
                     <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                         <Bot size={22} />
                     </div>
                     <div className="flex-1 min-w-0 text-left">
                         <h3 className="font-bold text-slate-800 dark:text-white truncate text-sm sm:text-base">{currentLanguage === 'hi' ? 'स्मार्ट असिस्टेंट' : 'Smart Assistant'}</h3>
                         <p className="text-xs text-slate-500 dark:text-slate-400 break-words">{currentLanguage === 'hi' ? 'फ्लोटिंग एआई असिस्टेंट विजेट दिखाएं' : 'Show floating Gemini AI assistant widget'}</p>
                     </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={localStorage.getItem('showSmartAssistant') !== 'false'}
                      onChange={(e) => {
                          localStorage.setItem('showSmartAssistant', e.target.checked.toString());
                          window.dispatchEvent(new Event('storage'));
                          setActiveView('main');
                          setTimeout(() => setActiveView('preferences'), 10);
                      }}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-700 peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                 </label>
             </div>

             {/* Barcode Scanner Settings */}
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between w-full hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-3">
                 <div className="flex items-center gap-3 flex-1 min-w-0">
                     <div className="bg-orange-50 dark:bg-orange-950/40 p-2.5 rounded-xl text-orange-600 dark:text-orange-400 shrink-0">
                         <ScanBarcode size={22} />
                     </div>
                     <div className="flex-1 min-w-0 text-left">
                         <h3 className="font-bold text-slate-800 dark:text-white truncate text-sm sm:text-base">{currentLanguage === 'hi' ? 'बारकोड स्कैनर' : 'Barcode Scanner'}</h3>
                         <p className="text-xs text-slate-500 dark:text-slate-400 break-words">{currentLanguage === 'hi' ? 'कैमरा स्कैनर फीचर्स सक्षम करें' : 'Enable device camera for scans inputs'}</p>
                     </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={localStorage.getItem('showBarcodeScanner') !== 'false'}
                      onChange={(e) => {
                          localStorage.setItem('showBarcodeScanner', e.target.checked.toString());
                          window.dispatchEvent(new Event('storage'));
                          setActiveView('main');
                          setTimeout(() => setActiveView('preferences'), 10);
                      }}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-700 peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                 </label>
             </div>

             {/* Invoice Numbering Link */}
             <button 
                onClick={() => setActiveView('invoice_numbering')}
                className="w-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                id="pref_invoice_numbering_btn"
             >
                 <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                     <Hash size={22} />
                 </div>
                 <div className="flex-1 min-w-0 text-left">
                     <h3 className="font-bold text-slate-800 dark:text-white truncate text-sm sm:text-base">{currentLanguage === 'hi' ? 'इन्वॉइस नंबरिंग' : 'Invoice Numbering'}</h3>
                     <p className="text-xs text-slate-500 dark:text-slate-400 break-words">{currentLanguage === 'hi' ? 'प्रीफिक्स और वाउचर संख्या क्रम सेट करें' : 'Set prefixes and starting numbers'}</p>
                 </div>
                 <ArrowLeft size={18} className="rotate-180 text-slate-400 shrink-0" />
             </button>

             {/* Demo Data Link */}
             {authContext.currentUser?.role === 'admin' && (
                <button 
                  onClick={handleSeedClick}
                  className="w-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  id="pref_load_demo_btn"
                >
                    <div className="bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded-xl text-purple-600 dark:text-purple-400 shrink-0 group-hover:bg-purple-100 dark:group-hover:bg-purple-900 transition-colors">
                        <Database size={22} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base truncate">
                            {currentLanguage === 'hi' ? 'डेमो डेटा लोड करें' : 'Load Demo Data'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 break-words">
                            {currentLanguage === 'hi' ? 'डेयरी मिल्क व्यावसायिक डेटाबेस लोड करें' : 'Dairy Milk Business Scenario'}
                        </p>
                    </div>
                    <ArrowLeft size={18} className="rotate-180 text-slate-400 shrink-0" />
                </button>
             )}

             {/* CEO Control Section */}
             {authContext.currentUser?.role === 'admin' && (
               <button 
                 onClick={() => setActiveView('ceo_control')}
                 className="w-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-950/35 p-4 flex items-center gap-4 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/15 transition-colors group text-indigo-600 dark:text-indigo-400"
                 id="p_ceo_control_btn"
               >
                   <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors shrink-0">
                       <SlidersHorizontal size={22} />
                   </div>
                   <div className="flex-1 text-left min-w-0">
                       <h3 className="font-bold text-sm sm:text-base truncate text-slate-800 dark:text-white">
                           {currentLanguage === 'hi' ? 'सीईओ नियंत्रण पैनल' : 'CEO Control'}
                       </h3>
                       <p className="text-xs text-slate-500 dark:text-slate-400 break-words font-sans">
                           {currentLanguage === 'hi' ? 'ऑनलाइन फीचर्स और डेटा प्राइवेसी प्रबंधित करें' : 'Manage Online Features & Privacy'}
                       </p>
                   </div>
                   <ArrowLeft size={18} className="rotate-180 text-[#3b5998] dark:text-indigo-400 shrink-0" />
               </button>
             )}

             {/* Quick App Restart & Reload Action Panel */}
             <div className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 space-y-3.5">
                 <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                     <RefreshCcw size={20} className="text-indigo-600 dark:text-indigo-400 animate-spin" style={{ animationDuration: '8s' }} />
                     <div className="min-w-0 flex-1">
                         <h3 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm truncate">
                             {currentLanguage === 'hi' ? 'त्वरित ऐप नियंत्रण' : 'Quick App Control'}
                         </h3>
                         <p className="text-[11px] text-slate-500 dark:text-slate-400 break-words">
                             {currentLanguage === 'hi' ? 'त्वरित ऐप रीलोड और नया सेटअप' : 'Easy reload and setup reset controls'}
                         </p>
                     </div>
                 </div>

                 <div className="grid grid-cols-2 gap-2.5">
                     <button
                         onClick={() => {
                             window.location.reload();
                         }}
                         className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/75 rounded-xl flex flex-col items-center justify-center text-center gap-1 hover:border-indigo-400 dark:hover:border-indigo-505 transition-all active:scale-[0.98] group"
                         id="quick_soft_reload_btn"
                     >
                         <RefreshCcw size={18} className="text-indigo-500 group-hover:rotate-180 transition-transform duration-500" />
                         <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                             {currentLanguage === 'hi' ? 'सॉफ्ट रीलोड' : 'Soft Reload'}
                         </span>
                         <span className="text-[9px] text-slate-500 select-none">
                             {currentLanguage === 'hi' ? 'तुरंत रीलोड करें  🔄' : 'Quick Reload 🔄'}
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
                         className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/75 rounded-xl flex flex-col items-center justify-center text-center gap-1 hover:border-amber-500 dark:hover:border-amber-500 transition-all active:scale-[0.98] group"
                         id="quick_redo_setup_btn"
                     >
                         <ShieldCheck size={18} className="text-amber-500 group-hover:scale-110 transition-transform" />
                         <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                             {currentLanguage === 'hi' ? 'सेट अप दोहराएं' : 'Redo Setup'}
                         </span>
                         <span className="text-[9px] text-slate-500 select-none">
                             {currentLanguage === 'hi' ? 'नया सेटअप करें 🛡️' : 'Fresh Setup 🛡️'}
                         </span>
                     </button>
                 </div>
             </div>

             {/* Reset App Data Link */}
             <button 
                onClick={handleResetClick}
                className="w-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-rose-200 dark:border-rose-950/20 p-4 flex items-center gap-4 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 transition-colors group"
                id="pref_reset_data_btn"
             >
                 <div className="bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl text-rose-600 dark:text-rose-400 group-hover:bg-rose-200 dark:group-hover:bg-rose-900 transition-colors shrink-0">
                     <Trash2 size={22} />
                 </div>
                 <div className="flex-1 text-left min-w-0">
                     <h3 className="font-bold text-rose-600 dark:text-rose-400 text-sm sm:text-base">
                         {currentLanguage === 'hi' ? 'डेटा रीसेट (सावधानी)' : 'Reset App Data'}
                     </h3>
                     <p className="text-xs text-rose-500/80 dark:text-rose-400/80 break-words">
                         {currentLanguage === 'hi' ? 'सभी डेटा डिलीट करके शुरू से शुरू करें' : 'Clear all local data and start fresh'}
                     </p>
                 </div>
                 <ArrowLeft size={18} className="rotate-180 text-rose-400 shrink-0" />
             </button>

             {/* Language Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                    <h2 className="font-bold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                        <Globe size={18} className="text-blue-600"/> 
                        App Language
                    </h2>
                </div>
                <button onClick={() => onLanguageChange('en')} className="w-full flex justify-between items-center p-4 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-slate-800">
                    <div className="flex flex-col items-start">
                        <span className="font-semibold text-gray-800 dark:text-white">English</span>
                        <span className="text-xs text-gray-500">Default</span>
                    </div>
                    {currentLanguage === 'en' && <Check size={20} className="text-blue-600" />}
                </button>
                <button onClick={() => onLanguageChange('hi')} className="w-full flex justify-between items-center p-4 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex flex-col items-start">
                        <span className="font-semibold text-gray-800 dark:text-white">हिंदी</span>
                        <span className="text-xs text-gray-500">Hindi</span>
                    </div>
                    {currentLanguage === 'hi' && <Check size={20} className="text-blue-600" />}
                </button>
            </div>

            {/* Theme Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                    <h2 className="font-bold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                        {currentTheme === 'light' ? <Sun size={18} className="text-orange-500"/> : currentTheme === 'dark' ? <Moon size={18} className="text-blue-500"/> : <Laptop size={18} className="text-indigo-500"/>}
                        App Theme
                    </h2>
                </div>
                <button onClick={() => onThemeChange('system')} className="w-full flex justify-between items-center p-4 hover:bg-indigo-50/50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-slate-800">
                    <div className="flex flex-col items-start text-left">
                        <span className="font-semibold text-gray-800 dark:text-white">System Default</span>
                        <span className="text-xs text-gray-500">Auto adapt to device theme settings</span>
                    </div>
                    {currentTheme === 'system' && <Check size={20} className="text-blue-600" />}
                </button>
                <button onClick={() => onThemeChange('light')} className="w-full flex justify-between items-center p-4 hover:bg-orange-50/50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-slate-800">
                    <div className="flex flex-col items-start text-left">
                        <span className="font-semibold text-gray-800 dark:text-white">Light Mode</span>
                        <span className="text-xs text-gray-500">Bright & Clean layout look</span>
                    </div>
                    {currentTheme === 'light' && <Check size={20} className="text-blue-600" />}
                </button>
                <button onClick={() => onThemeChange('dark')} className="w-full flex justify-between items-center p-4 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-colors">
                     <div className="flex flex-col items-start text-left">
                        <span className="font-semibold text-gray-800 dark:text-white">Dark Mode</span>
                        <span className="text-xs text-gray-500">Easy on the eyes</span>
                    </div>
                    {currentTheme === 'dark' && <Check size={20} className="text-blue-600" />}
                </button>
            </div>
        </div>

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
      </div>
    );
  }

  if (activeView === 'ceo_control') {
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
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('main')} className="p-1 hover:bg-white/10 rounded-lg transition"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold truncate">{currentLanguage === 'hi' ? 'प्राथमिकताएं (क्रम-2)' : 'Preferences (Set-2)'}</h1>
        </header>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
            <div className="flex flex-col">
                
                {/* General Settings */}
                <div onClick={() => setActiveView('general_settings')} className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-w-0">
                    <h2 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 truncate">{currentLanguage === 'hi' ? 'सामान्य सेटिंग्स' : 'General Settings'}</h2>
                    <p className="text-xs sm:text-[15px] mt-1 text-slate-600 dark:text-slate-400 break-words">{currentLanguage === 'hi' ? 'व्यवसाय का लोगो, बैंक विवरण, नियम व शर्तें आदि' : 'Company logo, bank details, terms, conditions and print templates'}</p>
                </div>

                {/* Auto upload */}
                <div className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer gap-3 min-w-0">
                    <div className="pr-2 flex-1 min-w-0">
                        <h2 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 truncate">{currentLanguage === 'hi' ? 'ऑटो बैकअप अपलोड' : 'Auto upload'}</h2>
                        <p className="text-xs sm:text-[15px] mt-1 text-slate-600 dark:text-slate-400 leading-snug break-words">{currentLanguage === 'hi' ? 'इंटरनेट उपलब्ध होने पर बैकअप को स्वचालित रूप से क्लाउड पर सुरक्षित करें' : 'Upload the Backup automatically when Internet is available'}</p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center">
                        <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#d32f2f] rounded-[2px]" />
                    </div>
                </div>

                {/* Member's Permissions */}
                <div className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-w-0">
                    <h2 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 truncate">{currentLanguage === 'hi' ? 'सदस्य अनुमतियाँ' : "Member's Permissions"}</h2>
                    <p className="text-xs sm:text-[15px] mt-1 text-slate-600 dark:text-slate-400 leading-snug break-words">{currentLanguage === 'hi' ? 'पार्टियों और ग्राहकों से बिल और भुगतान साझा करने की पहुंच अधिकार' : 'Send/Receive Bills and Payments to/from your Parties and Customer'}</p>
                </div>

                {/* Send Item(s) */}
                <div className="p-[18px] border-b border-slate-200 dark:border-slate-800 bg-[#ebebeb] dark:bg-slate-800 hover:bg-[#e0e0e0] dark:hover:bg-slate-700 cursor-pointer min-w-0">
                    <h2 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 truncate">{currentLanguage === 'hi' ? 'आइटम सूची भेजें' : 'Send Item(s)'}</h2>
                    <p className="text-xs sm:text-[15px] mt-1 text-slate-600 dark:text-slate-400 break-words">{currentLanguage === 'hi' ? 'अपने सभी आइटम्स सहयोगियों या ग्राहकों को साझा करें' : 'Send Your Item(s) directly to Parties or Customers'}</p>
                </div>

                {/* Billing Header */}
                <div className="px-[18px] pt-5 pb-3 font-semibold shrink-0">
                    <h2 className="text-[#d32f2f] dark:text-[#ef5350] text-[15px] uppercase tracking-wider">{currentLanguage === 'hi' ? 'बिलिंग व अकाउंट्स' : 'Billing'}</h2>
                </div>

                {/* Items */}
                <div onClick={() => setActiveView('item_settings')} className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-w-0">
                    <h2 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 truncate">{currentLanguage === 'hi' ? 'आइटम्स' : 'Items'}</h2>
                    <p className="text-xs sm:text-[15px] mt-1 text-slate-600 dark:text-slate-400 break-words">{currentLanguage === 'hi' ? 'आइटम सेटिंग्स बदलें (जैसे उप-श्रेणियाँ, बारकोड फ़ील्ड)' : 'Change your Item(s) active field configurations'}</p>
                </div>

                {/* Purchase Bill Settings */}
                <div onClick={() => setActiveView('purchase_bill_settings')} className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-w-0">
                    <h2 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 truncate">{currentLanguage === 'hi' ? 'खरीद बिल सेटिंग्स' : 'Purchase Bill Settings'}</h2>
                    <p className="text-xs sm:text-[15px] mt-1 text-slate-600 dark:text-slate-400 break-words">{currentLanguage === 'hi' ? 'खरीद बिल प्रविष्टि फ़ील्ड्स और सेटिंग्स को व्यवस्थित करें' : 'Change Purchase Bill validation fields settings'}</p>
                </div>

                {/* Purchase Return Settings */}
                <div onClick={() => setActiveView('purchase_return_settings')} className="p-[18px] border-b border-slate-200 dark:border-slate-800 bg-[#ebebeb] dark:bg-slate-800 hover:bg-[#e0e0e0] dark:hover:bg-slate-700 cursor-pointer min-w-0">
                    <h2 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 truncate">{currentLanguage === 'hi' ? 'खरीद वापस सेटिंग्स' : 'Purchase Return Settings'}</h2>
                    <p className="text-xs sm:text-[15px] mt-1 text-slate-600 dark:text-slate-400 break-words">{currentLanguage === 'hi' ? 'डेबिट नोट/वापसी सेटिंग्स में संशोधन करें' : 'Change Purchase Return layout fields'}</p>
                </div>

                {/* Sale Bill Settings */}
                <div onClick={() => setActiveView('sale_bill_settings')} className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-w-0">
                    <h2 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 truncate">{currentLanguage === 'hi' ? 'बिक्री बिल सेटिंग्स' : 'Sale Bill Settings'}</h2>
                    <p className="text-xs sm:text-[15px] mt-1 text-slate-600 dark:text-slate-400 break-words">{currentLanguage === 'hi' ? 'बिक्री बिल प्रेषण फ़ील्ड और जीएसटी विकल्पों को बदलें' : 'Change Sale Bill settings and format terms'}</p>
                </div>

                {/* Sale Return Settings */}
                <div onClick={() => setActiveView('sale_return_settings')} className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-w-0">
                    <h2 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 truncate">{currentLanguage === 'hi' ? 'बिक्री वापस सेटिंग्स' : 'Sale Return Settings'}</h2>
                    <p className="text-xs sm:text-[15px] mt-1 text-slate-600 dark:text-slate-400 break-words">{currentLanguage === 'hi' ? 'बिक्री वापसी (क्रेडिट नोट) इनपुट बदलें' : 'Change Sale Return screen parameters'}</p>
                </div>

                {/* Enable/Disable Ledger(s) Tax settings */}
                <div onClick={() => setActiveView('ledger_settings')} className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-w-0">
                    <h2 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 truncate">{currentLanguage === 'hi' ? 'खाता बही टैक्स सेटिंग्स' : 'Enable/Disable Ledger(s) Tax settings'}</h2>
                    <p className="text-xs sm:text-[15px] mt-1 text-slate-600 dark:text-slate-400 break-words">{currentLanguage === 'hi' ? 'सभी लेजर के लिए टैक्स नियम और लिमिट सेटिंग्स लागू करें' : 'Configure taxes on a per-ledger or party basis'}</p>
                </div>

                {/* Transportation Detail Settings */}
                <div onClick={() => setActiveView('transportation_settings')} className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-w-0">
                    <h2 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 truncate">{currentLanguage === 'hi' ? 'परिवहन विवरण सेटिंग्स' : 'Transportation Detail Settings'}</h2>
                    <p className="text-xs sm:text-[15px] mt-1 text-slate-600 dark:text-slate-400 break-words">{currentLanguage === 'hi' ? 'वाहनों और चालान फ़ील्ड्स को सक्षम या अक्षम करें' : 'Enable/Disable Transportation fields and vehicle invoice details'}</p>
                </div>

            </div>
        </div>
      </div>
    );
  }

  // GENERAL SETTINGS SUB-SCREEN
  if (activeView === 'general_settings') {
    return (
      <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')} className="p-1 hover:bg-white/10 rounded-lg transition"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold truncate">{currentLanguage === 'hi' ? 'सामान्य सेटिंग्स' : 'General Settings'}</h1>
        </header>

        <div className="flex-1 flex flex-col pt-10 px-4 overflow-y-auto items-center">
            {/* Logo area */}
            <div className="w-24 h-24 bg-[#3ddc84] rounded-[24px] flex items-center justify-center mb-8 shadow-sm shrink-0">
                <Bot size={56} className="text-white animate-bounce" style={{ animationDuration: '3s' }} />
            </div>
            
            <div className="flex-1 w-full" />
            
            <div className="grid grid-cols-2 gap-2 w-full pb-3 max-w-sm">
                <button className="bg-[#3b5998] hover:bg-[#2d4373] text-white py-4 px-2 text-center text-xs sm:text-sm font-bold min-h-[56px] rounded-lg shadow-sm flex items-center justify-center transition-all duration-200 active:scale-95 leading-tight">
                    {currentLanguage === 'hi' ? 'बैंक विवरण' : 'Bank Details'}
                </button>
                <button className="bg-[#3b5998] hover:bg-[#2d4373] text-white py-4 px-2 text-center text-xs sm:text-sm font-bold min-h-[56px] rounded-lg shadow-sm flex items-center justify-center transition-all duration-200 active:scale-95 leading-tight">
                    {currentLanguage === 'hi' ? 'नियम व शर्तें' : 'Terms & Condition'}
                </button>
                <button className="bg-[#3b5998] hover:bg-[#2d4373] text-white py-4 px-2 text-center text-xs sm:text-sm font-bold min-h-[56px] rounded-lg shadow-sm flex items-center justify-center transition-all duration-200 active:scale-95 leading-tight">
                    {currentLanguage === 'hi' ? 'व्यवसाय लोगो' : 'Company Logo'}
                </button>
                <button className="bg-[#3b5998] hover:bg-[#2d4373] text-white py-4 px-2 text-center text-xs sm:text-sm font-bold min-h-[56px] rounded-lg shadow-sm flex items-center justify-center transition-all duration-200 active:scale-95 leading-tight">
                    {currentLanguage === 'hi' ? 'प्रिंट सेटिंग्स' : 'Print Settings'}
                </button>
                <button className="col-span-2 bg-[#3b5998] hover:bg-[#2d4373] text-white py-4 px-2 text-center text-xs sm:text-sm font-bold min-h-[56px] rounded-lg shadow-sm flex items-center justify-center transition-all duration-200 active:scale-95 leading-tight">
                    {currentLanguage === 'hi' ? 'अन्य सेटिंग्स व्यवस्थित करें' : 'Configure Other Settings'}
                </button>
            </div>
        </div>
      </div>
    );
  }

  // ITEM SETTINGS SUB-SCREEN
  if (activeView === 'item_settings') {
    const handleToggle = (key: keyof typeof itemSettings) => {
        setItemSettings(prev => ({...prev, [key]: !prev[key]}));
    };

    const CheckboxRow = ({ label, labelHi, checkedKey, isGray = false }: { label: string, labelHi: string, checkedKey: keyof typeof itemSettings, isGray?: boolean }) => {
        const textLabel = currentLanguage === 'hi' ? labelHi : label;
        return (
            <div onClick={() => handleToggle(checkedKey)} className={`p-4 sm:p-[18px] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer gap-4 min-w-0 transition-colors ${isGray ? 'bg-[#ebebeb] dark:bg-slate-800/60' : 'hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'}`}>
                <h2 className="text-[15px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 flex-1 min-w-0 break-words pr-2 leading-snug">{textLabel}</h2>
                <div className="shrink-0 flex items-center justify-center">
                    <input 
                        type="checkbox" 
                        checked={itemSettings[checkedKey]} 
                        onChange={() => {}}
                        className="w-5 h-5 sm:w-[22px] sm:h-[22px] accent-[#ef5350] rounded-[2px] border-gray-400 cursor-pointer pointer-events-none" 
                    />
                </div>
            </div>
        );
    };

    return (
      <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')} className="p-1 hover:bg-white/10 rounded-lg transition"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold truncate">{currentLanguage === 'hi' ? 'आइटम सेटिंग्स' : 'Item Settings'}</h1>
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-950">
            <CheckboxRow label="Enable Cess" labelHi="सेस कर सक्षम करें (Cess)" checkedKey="cess" />
            <CheckboxRow label="Enable Batch Number" labelHi="बैच संख्या सक्षम करें (Batch Number)" checkedKey="batchNumber" />
            <CheckboxRow label="Enable Manufacturing Date" labelHi="उत्पादन तिथि सक्षम करें (Mfg Date)" checkedKey="manufacturingDate" />
            <CheckboxRow label="Enable Expiry Date" labelHi="समाप्ति तिथि सक्षम करें (Expiry Date)" checkedKey="expiryDate" />
            <CheckboxRow label="Enable Wholesale Price" labelHi="थोक मूल्य सक्षम करें (Wholesale Price)" checkedKey="wholesalePrice" />
            <CheckboxRow label="Enable Item Company" labelHi="आइटम ब्रांड/कंपनी सक्षम करें (Item Brand)" checkedKey="itemCompany" />
            <CheckboxRow label="Enable Minimum Stock Alert" labelHi="न्यूनतम स्टॉक अलर्ट सक्षम करें (Min Stock Alert)" checkedKey="minimumStockAlert" isGray />
            <CheckboxRow label="Enable Category" labelHi="श्रेणी फ़ील्ड सक्षम करें (Category)" checkedKey="category" />
            <CheckboxRow label="Enable Bill Of Item" labelHi="आइटम संबंधित सामग्री विवरण सक्षम करें (Bill Of Item)" checkedKey="billOfItem" />
        </div>
      </div>
    );
  }

  // PURCHASE BILL SETTINGS SUB-SCREEN
  if (activeView === 'purchase_bill_settings') {
    const handleToggle = (key: keyof typeof purchaseBillSettings) => {
        setPurchaseBillSettings(prev => ({...prev, [key]: !prev[key]}));
    };

    const CheckboxRow = ({ label, labelHi, checkedKey, isGray = false }: { label: string, labelHi: string, checkedKey: keyof typeof purchaseBillSettings, isGray?: boolean }) => {
        const textLabel = currentLanguage === 'hi' ? labelHi : label;
        return (
            <div onClick={() => handleToggle(checkedKey)} className={`p-4 sm:p-[18px] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer gap-4 min-w-0 transition-colors ${isGray ? 'bg-[#ebebeb] dark:bg-slate-800/60' : 'hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'}`}>
                <h2 className="text-[15px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 flex-1 min-w-0 break-words pr-2 leading-snug">{textLabel}</h2>
                <div className="shrink-0 flex items-center justify-center">
                    <input 
                        type="checkbox" 
                        checked={purchaseBillSettings[checkedKey]} 
                        onChange={() => {}}
                        className="w-5 h-5 sm:w-[22px] sm:h-[22px] accent-[#ef5350] rounded-[2px] border-gray-400 cursor-pointer pointer-events-none" 
                    />
                </div>
            </div>
        );
    };

    return (
      <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')} className="p-1 hover:bg-white/10 rounded-lg transition"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold truncate">{currentLanguage === 'hi' ? 'खरीद बिल सेटिंग्स' : 'Purchase Bill Settings'}</h1>
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-950">
            <CheckboxRow label="Enable Bill Discount" labelHi="समग्र बिल छूट सक्षम करें (Bill Discount)" checkedKey="billDiscount" />
            <CheckboxRow label="Enable Sale Rate & MRP Calculation" labelHi="बिक्री दर और अधिकतम खुदरा मूल्य गणना सक्षम करें" checkedKey="saleRateMrpCalculation" />
            <CheckboxRow label="Enable Additional Charges" labelHi="अतिरिक्त प्रभार सक्षम करें (Additional Charges)" checkedKey="additionalCharges" />
            <CheckboxRow label="Enable Item Wise Discount" labelHi="आइटम अनुसार छूट सक्षम करें (Item-Wise Discount)" checkedKey="itemWiseDiscount" />
            <CheckboxRow label="Enable Transportation Detail" labelHi="परिवहन विवरण फ़ील्ड सक्षम करें (Transportation)" checkedKey="transportationDetail" isGray />
            <CheckboxRow label="Enable Ecommerce Detail" labelHi="ई-कॉमर्स विवरण सक्षम करें (Ecommerce Details)" checkedKey="ecommerceDetail" />
            <CheckboxRow label="Enable Reverse Charge" labelHi="विपरीत प्रभार सक्षम करें (Reverse Charge - RCM)" checkedKey="reverseCharge" />
        </div>
      </div>
    );
  }

  // PURCHASE RETURN SETTINGS SUB-SCREEN
  if (activeView === 'purchase_return_settings') {
    const handleToggle = (key: keyof typeof purchaseReturnSettings) => {
        setPurchaseReturnSettings(prev => ({...prev, [key]: !prev[key]}));
    };

    const CheckboxRow = ({ label, labelHi, checkedKey, isGray = false }: { label: string, labelHi: string, checkedKey: keyof typeof purchaseReturnSettings, isGray?: boolean }) => {
        const textLabel = currentLanguage === 'hi' ? labelHi : label;
        return (
            <div onClick={() => handleToggle(checkedKey)} className={`p-4 sm:p-[18px] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer gap-4 min-w-0 transition-colors ${isGray ? 'bg-[#ebebeb] dark:bg-slate-800/60' : 'hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'}`}>
                <h2 className="text-[15px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 flex-1 min-w-0 break-words pr-2 leading-snug">{textLabel}</h2>
                <div className="shrink-0 flex items-center justify-center">
                    <input 
                        type="checkbox" 
                        checked={purchaseReturnSettings[checkedKey]} 
                        onChange={() => {}}
                        className="w-5 h-5 sm:w-[22px] sm:h-[22px] accent-[#ef5350] rounded-[2px] border-gray-400 cursor-pointer pointer-events-none" 
                    />
                </div>
            </div>
        );
    };

    return (
      <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')} className="p-1 hover:bg-white/10 rounded-lg transition"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold truncate">{currentLanguage === 'hi' ? 'खरीद वापसी सेटिंग्स' : 'Purchase Return Settings'}</h1>
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-950">
            <CheckboxRow label="Enable Additional Charges" labelHi="अतिरिक्त प्रभार सक्षम करें (Additional Charges)" checkedKey="additionalCharges" />
            <CheckboxRow label="Enable Item Wise Discount" labelHi="आइटम अनुसार छूट सक्षम करें (Item-Wise Discount)" checkedKey="itemWiseDiscount" />
            <CheckboxRow label="Enable Transportation Detail" labelHi="परिवहन विवरण सक्षम करें (Transportation)" checkedKey="transportationDetail" />
            <CheckboxRow label="Enable Ecommerce Detail" labelHi="ई-कॉमर्स विवरण सक्षम करें (Ecommerce Details)" checkedKey="ecommerceDetail" />
            <CheckboxRow label="Enable Reverse Charge" labelHi="विपरीत प्रभार सक्षम करें (Reverse Charge - RCM)" checkedKey="reverseCharge" />
        </div>
      </div>
    );
  }

  // LEDGER SETTINGS SUB-SCREEN
  if (activeView === 'ledger_settings') {
    const handleToggle = (id: number) => {
        setLedgersList(prev => prev.map(ledger => 
            ledger.id === id ? { ...ledger, checked: !ledger.checked } : ledger
        ));
    };

    return (
      <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center justify-between shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setActiveView('preferences2')} className="p-1 hover:bg-white/10 rounded-lg transition shrink-0"><ArrowLeft size={24} /></button>
              <h1 className="text-xl font-bold truncate">{currentLanguage === 'hi' ? 'लेजर सूची' : 'Ledger List'}</h1>
          </div>
          <button onClick={() => setActiveView('preferences2')} className="p-1 hover:bg-white/10 rounded-lg transition shrink-0"><Check size={24} /></button>
        </header>

        <div className="flex bg-slate-50 dark:bg-slate-800/50 px-4 py-3 font-semibold border-b border-gray-200 dark:border-slate-800 text-sm sm:text-base gap-3 select-none">
            <div className="w-16 shrink-0">{currentLanguage === 'hi' ? 'क्रमांक' : 'No.'}</div>
            <div className="flex-1 min-w-0 text-left">{currentLanguage === 'hi' ? 'खाता का नाम' : 'Name'}</div>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-950 relative">
            {ledgersList.map((ledger) => (
                <div 
                    key={ledger.id} 
                    onClick={() => handleToggle(ledger.id)} 
                    className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 gap-3 min-w-0"
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                        <div className="w-12 text-sm sm:text-[17px] font-medium text-slate-500 shrink-0">{ledger.id}</div>
                        <div className="text-[15px] sm:text-[17px] font-semibold text-slate-800 dark:text-slate-200 truncate flex-1 min-w-0 text-left">{ledger.name}</div>
                    </div>
                    <div className="shrink-0 flex items-center justify-center pl-2">
                        <input 
                            type="checkbox" 
                            checked={ledger.checked} 
                            onChange={() => {}}
                            className="w-5 h-5 sm:w-[22px] sm:h-[22px] accent-[#ef5350] rounded border-gray-300 dark:border-slate-700 cursor-pointer pointer-events-none" 
                        />
                    </div>
                </div>
            ))}
        </div>
      </div>
    );
  }

  // TRANSPORTATION SETTINGS SUB-SCREEN
  if (activeView === 'transportation_settings') {
    const handleToggle = (key: keyof typeof transportationSettings) => {
        setTransportationSettings(prev => ({...prev, [key]: !prev[key]}));
    };

    const CheckboxRow = ({ label, labelHi, checkedKey, isGray = false }: { label: string, labelHi: string, checkedKey: keyof typeof transportationSettings, isGray?: boolean }) => {
        const textLabel = currentLanguage === 'hi' ? labelHi : label;
        return (
            <div onClick={() => handleToggle(checkedKey)} className={`p-4 sm:p-[18px] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer gap-4 min-w-0 transition-colors ${isGray ? 'bg-[#ebebeb] dark:bg-slate-800/60' : 'hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'}`}>
                <h2 className="text-[15px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 flex-1 min-w-0 break-words pr-2 leading-snug">{textLabel}</h2>
                <div className="shrink-0 flex items-center justify-center">
                    <input 
                        type="checkbox" 
                        checked={transportationSettings[checkedKey]} 
                        onChange={() => {}}
                        className="w-5 h-5 sm:w-[22px] sm:h-[22px] accent-[#ef5350] rounded-[2px] border-gray-400 cursor-pointer pointer-events-none" 
                    />
                </div>
            </div>
        );
    };

    return (
      <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')} className="p-1 hover:bg-white/10 rounded-lg transition"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold truncate">{currentLanguage === 'hi' ? 'परिवहन विवरण सेटिंग्स' : 'Transportation Settings'}</h1>
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-950">
            <CheckboxRow label="Enable GR No." labelHi="जीआर क्रमांक सक्षम करें (GR/LR No.)" checkedKey="grNo" />
            <CheckboxRow label="Enable Vehicle No." labelHi="वाहन क्रमांक सक्षम करें (Vehicle No.)" checkedKey="vehicleNo" />
            <CheckboxRow label="Enable Origin" labelHi="उद्गम स्थल सक्षम करें (Origin)" checkedKey="origin" />
            <CheckboxRow label="Enable Destination" labelHi="गंतव्य स्थल सक्षम करें (Destination)" checkedKey="destination" />
            <CheckboxRow label="Enable Dispatch Mode" labelHi="परिवहन माध्यम विवरण सक्षम करें (Dispatch Mode)" checkedKey="dispatchMode" isGray />
            <CheckboxRow label="Enable Date" labelHi="परिवहन प्रस्थान तिथि सक्षम करें (Date Field)" checkedKey="date" />
        </div>
      </div>
    );
  }

  // SALE RETURN SETTINGS SUB-SCREEN
  if (activeView === 'sale_return_settings') {
    const handleToggle = (key: keyof typeof saleReturnSettings) => {
        setSaleReturnSettings(prev => ({...prev, [key]: !prev[key]}));
    };

    const CheckboxRow = ({ label, labelHi, checkedKey, isGray = false }: { label: string, labelHi: string, checkedKey: keyof typeof saleReturnSettings, isGray?: boolean }) => {
        const textLabel = currentLanguage === 'hi' ? labelHi : label;
        return (
            <div onClick={() => handleToggle(checkedKey)} className={`p-4 sm:p-[18px] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer gap-4 min-w-0 transition-colors ${isGray ? 'bg-[#ebebeb] dark:bg-slate-800/60' : 'hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'}`}>
                <h2 className="text-[15px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 flex-1 min-w-0 break-words pr-2 leading-snug">{textLabel}</h2>
                <div className="shrink-0 flex items-center justify-center">
                    <input 
                        type="checkbox" 
                        checked={saleReturnSettings[checkedKey]} 
                        onChange={() => {}}
                        className="w-5 h-5 sm:w-[22px] sm:h-[22px] accent-[#ef5350] rounded-[2px] border-gray-400 cursor-pointer pointer-events-none" 
                    />
                </div>
            </div>
        );
    };

    return (
      <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')} className="p-1 hover:bg-white/10 rounded-lg transition"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold truncate">{currentLanguage === 'hi' ? 'बिक्री वापसी सेटिंग्स' : 'Sale Return Settings'}</h1>
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-950">
            <CheckboxRow label="Enable Bill Discount" labelHi="बिल छूट सक्षम करें (Bill Discount)" checkedKey="billDiscount" />
            <CheckboxRow label="Enable Additional Charges" labelHi="अतिरिक्त प्रभार सक्षम करें (Additional Charges)" checkedKey="additionalCharges" />
            <CheckboxRow label="Enable Item Wise Discount" labelHi="आइटम अनुसार छूट सक्षम करें (Item-Wise Discount)" checkedKey="itemWiseDiscount" />
            <CheckboxRow label="Enable Transportation Detail" labelHi="परिवहन विवरण सक्षम करें (Transportation)" checkedKey="transportationDetail" />
            <CheckboxRow label="Enable Ecommerce Detail" labelHi="ई-कॉमर्स विवरण सक्षम करें (Ecommerce Details)" checkedKey="ecommerceDetail" />
            <CheckboxRow label="Enable Reverse Charge" labelHi="विपरीत प्रभार सक्षम करें (Reverse Charge - RCM)" checkedKey="reverseCharge" isGray />
            
            <div className="p-4 sm:p-[18px] border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-start text-left min-w-0 gap-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <h2 className="text-[15px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                    {currentLanguage === 'hi' ? 'बिक्री वापसी बिल संख्या उपसर्ग (Prefix)' : 'Sale Bill Number Prefix'}
                </h2>
                <p className="text-xs sm:text-[15px] text-slate-500 dark:text-slate-400 break-words leading-relaxed">
                    {currentLanguage === 'hi' ? 'वापसी बिल नंबर से पहले विशेष उपसर्ग वर्ण सेट करें' : 'Add prefix before Bill Number'}
                </p>
            </div>
        </div>
      </div>
    );
  }

  // SALE BILL SETTINGS SUB-SCREEN
  if (activeView === 'sale_bill_settings') {
    const handleToggle = (key: keyof typeof saleSettings) => {
        setSaleSettings(prev => ({...prev, [key]: !prev[key]}));
    };

    const CheckboxRow = ({ label, labelHi, checkedKey, isGray = false }: { label: string, labelHi: string, checkedKey: keyof typeof saleSettings, isGray?: boolean }) => {
        const textLabel = currentLanguage === 'hi' ? labelHi : label;
        return (
            <div onClick={() => handleToggle(checkedKey)} className={`p-4 sm:p-[18px] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer gap-4 min-w-0 transition-colors ${isGray ? 'bg-[#ebebeb] dark:bg-slate-800/60' : 'hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'}`}>
                <h2 className="text-[15px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 flex-1 min-w-0 break-words pr-2 leading-snug">{textLabel}</h2>
                <div className="shrink-0 flex items-center justify-center">
                    <input 
                        type="checkbox" 
                        checked={saleSettings[checkedKey]} 
                        onChange={() => {}}
                        className="w-5 h-5 sm:w-[22px] sm:h-[22px] accent-[#ef5350] rounded-[2px] border-gray-400 cursor-pointer pointer-events-none" 
                    />
                </div>
            </div>
        );
    };

    return (
      <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')} className="p-1 hover:bg-white/10 rounded-lg transition"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold truncate">{currentLanguage === 'hi' ? 'बिक्री बिल सेटिंग्स' : 'Sale Bill Settings'}</h1>
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-950">
            <CheckboxRow label="Enable Cash Billing" labelHi="नकद बिलिंग सक्षम करें (Cash Billing)" checkedKey="cashBilling" />
            <CheckboxRow label="Enable Bill Discount" labelHi="समग्र बिल छूट सक्षम करें (Bill Discount)" checkedKey="billDiscount" />
            <CheckboxRow label="Enable Additional Charges" labelHi="अतिरिक्त प्रभार सक्षम करें (Additional Charges)" checkedKey="additionalCharges" />
            <CheckboxRow label="Enable Item Wise Discount" labelHi="आइटम अनुसार छूट सक्षम करें (Item-Wise Discount)" checkedKey="itemWiseDiscount" />
            <CheckboxRow label="Enable Transportation Detail" labelHi="परिवहन विवरण सक्षम करें (Transportation)" checkedKey="transportationDetail" />
            <CheckboxRow label="Enable Ecommerce Detail" labelHi="ई-कॉमर्स विवरण सक्षम करें (Ecommerce Details)" checkedKey="ecommerceDetail" />
            <CheckboxRow label="Enable Reverse Charge" labelHi="विपरीत प्रभार सक्षम करें (Reverse Charge - RCM)" checkedKey="reverseCharge" />
            <CheckboxRow label="Show logo on bill" labelHi="बिल प्रारूप पर ब्रांड लोगो दिखाएं (Show Logo)" checkedKey="showLogo" />
            <CheckboxRow label="Enable Item Out Of Stock Alert" labelHi="स्टॉक समाप्ति अलर्ट सक्षम करें (Stock Warnings)" checkedKey="outOfStockAlert" isGray />
            <CheckboxRow label="Enable Discounted Quantity" labelHi="छूट वाली मात्रा सक्षम करें (Discounted Qty)" checkedKey="discountedQuantity" />
            <CheckboxRow label="Get Previous Bill Sale Rate" labelHi="बिल निर्माण में पिछला बिक्री मूल्य लागू करें (Last Price)" checkedKey="previousBillSaleRate" />
            
            <div className="p-4 sm:p-[18px] border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-start text-left min-w-0 gap-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <h2 className="text-[15px] sm:text-[17px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                    {currentLanguage === 'hi' ? 'बिक्री बिल संख्या उपसर्ग (Prefix)' : 'Sale Bill Number Prefix'}
                </h2>
                <p className="text-xs sm:text-[15px] text-slate-500 dark:text-slate-400 break-words leading-relaxed">
                    {currentLanguage === 'hi' ? 'बिल नंबर से पहले विशेष उपसर्ग अक्षर जोड़ें' : 'Add prefix before Bill Number'}
                </p>
            </div>
        </div>
      </div>
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
          {/* Category 1: Business Identity */}
          <SettingsAccordion
            title="Business Identity"
            icon={User}
            description="Manage store identification, business address, contact numbers, and voucher printing headers."
            isLocked={isStaff}
            disabled={isStaff}
          >
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
          </SettingsAccordion>

          {/* Category 2: Security & Access */}
          <SettingsAccordion
            title="Security & Access"
            icon={ShieldCheck}
            description="Simulate roles to verify enterprise RBAC permissions limits, change secure login details."
          >
            {/* Simulated Role Switcher */}
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

            {/* Cloud Firebase Session Account */}
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
                    className="text-[10.5px] font-bold text-rose-500 hover:text-rose-600 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md bg-white dark:bg-slate-900 shadow-sm shrink-0 font-sans"
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
                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg shadow-sm text-center font-sans"
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
                      className="flex-1 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-center font-sans"
                    >
                      Google
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Set Pin / Password Settings */}
            <button
              onClick={() => setActiveView('password_settings')}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/85 transition cursor-pointer text-left min-w-0 gap-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                <div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg text-amber-600 dark:text-amber-400 shrink-0">
                  <Key size={18} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm truncate">
                    {currentLanguage === 'hi' ? 'ऐप पिन और पासवर्ड' : 'App Pin & Password'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block truncate font-sans">
                    {currentLanguage === 'hi' ? 'मास्टर पिन रीसेट करें या नया एडमिन पासवर्ड सेट करें' : 'Change Master Pin security, update administrator credentials'}
                  </span>
                </div>
              </div>
              <span className="text-slate-400 shrink-0">&#10145;</span>
            </button>
          </SettingsAccordion>

          {/* Category 3: Data & Cloud */}
          <SettingsAccordion
            title="Data & Cloud"
            icon={HardDrive}
            description="Manage databases snapshot point-in-time recovery saves, financial rollbacks, backups and demo data inputs."
          >
            {/* Time Machine & Financial Year controls */}
            <div className="space-y-2.5">
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

              {/* Transfer Financial Year limit */}
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
                  <div className="text-left flex-1 min-w-0">
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
            </div>
          </SettingsAccordion>

          {/* Category 4: App Preferences */}
          <SettingsAccordion
            title="App Preferences"
            icon={SlidersHorizontal}
            description="Fully customize features, invoice structures, floating assistants, ledger settings, and display indicators."
          >
            <div className="space-y-3.5">
              {/* Bilingual App Language Row */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-center justify-between gap-3 min-w-0">
                <div className="text-left flex-1 min-w-0 pr-1 select-auto font-sans">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block font-sans truncate">App Language (भाषा)</span>
                  <span className="text-xs text-slate-400 leading-relaxed block truncate">
                    {currentLanguage === 'hi' ? 'सक्रिय भाषा: हिंदी' : 'Active language: English'}
                  </span>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full shadow-inner border border-slate-200/50 dark:border-slate-700/60 pointer-events-auto items-center shrink-0">
                  <button 
                    onClick={() => onLanguageChange('en')}
                    className={`px-3.5 py-1 rounded-full text-xs font-extrabold tracking-wide transition-all duration-200 ${
                      currentLanguage === 'en' 
                        ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm font-black scale-102' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    EN
                  </button>
                  <button 
                    onClick={() => onLanguageChange('hi')}
                    className={`px-3.5 py-1 rounded-full text-xs font-extrabold tracking-wide transition-all duration-200 ${
                      currentLanguage === 'hi' 
                        ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm font-black scale-102' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    हिंदी
                  </button>
                </div>
              </div>

              {/* Home QR Code inline Switcher */}
              <div className="flex items-center justify-between py-2.5 border-b border-slate-200/60 dark:border-slate-800/80 gap-3 min-w-0">
                <div className="text-left flex-1 min-w-0 font-sans">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm block truncate border-b-0">Home QR Code</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block truncate border-b-0">Render merchant quick scan UPI QR onto the landing dashboard</span>
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
              <div className="flex items-center justify-between py-2.5 border-b border-slate-200/60 dark:border-slate-800/80 gap-3 min-w-0">
                <div className="text-left flex-1 min-w-0 font-sans">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm block truncate border-b-0">Barcode Scanner</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block truncate border-b-0">Leverage native device frame cameras for items scan inputs</span>
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

              {/* Smart assistant inline switcher */}
              <div className="flex items-center justify-between py-2.5 border-b border-slate-200/60 dark:border-slate-800/80 gap-3 min-w-0">
                <div className="text-left flex-1 min-w-0 font-sans">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm block truncate border-b-0">Smart Floating AI Assistant</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block truncate border-b-0">
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

              {/* Configuration screen triggers */}
              <div className="space-y-2 mt-4 font-sans max-w-4xl">
                <button
                  onClick={() => setActiveView('preferences2')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                      <SlidersHorizontal size={17} />
                    </div>
                    <div className="text-left flex-1 font-sans">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">Sale & Purchase Settings</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block">Item, tax rates, batch numbers, discount tables and parameters</span>
                    </div>
                  </div>
                  <span className="text-slate-400">&#10145;</span>
                </button>

                <button
                  onClick={() => setActiveView('preferences')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                      <SlidersHorizontal size={17} />
                    </div>
                    <div className="text-left flex-1 font-sans">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">Dashboard & General Preferences</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block">Configure quick links, home panels and help instructions</span>
                    </div>
                  </div>
                  <span className="text-slate-400">&#10145;</span>
                </button>
              </div>
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
                    {currentLanguage === 'hi' ? 'व्यवसाय पहचान' : 'Business Identity'}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-snug font-sans mt-0.5">
                    {currentLanguage === 'hi' ? 'कंपनी प्रोफ़ाइल, टैक्स विवरण' : 'Store configuration & print profile'}
                  </p>
                </div>
              </button>

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
                    {currentLanguage === 'hi' ? 'सुरक्षा और पहुंच' : 'Security & Access'}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-snug font-sans mt-0.5">
                    {currentLanguage === 'hi' ? 'पिन लॉक, रोल्स, सिंक' : 'Access credentials & pin control'}
                  </p>
                </div>
              </button>

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
                    {currentLanguage === 'hi' ? 'डेटा और क्लाउड' : 'Data & Cloud'}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-snug font-sans mt-0.5">
                    {currentLanguage === 'hi' ? 'रोलबैक, बैकअप, डेटा रीसेट' : 'Point-in-time state & snapshots'}
                  </p>
                </div>
              </button>

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
                    {currentLanguage === 'hi' ? 'ऐप प्राथमिकताएं' : 'App Preferences'}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-snug font-sans mt-0.5">
                    {currentLanguage === 'hi' ? 'भाषा, सहायक, सहायक उपकरण' : 'Invoicing behaviors & language'}
                  </p>
                </div>
              </button>

              {authContext.currentUser?.role === 'admin' && (
                <>
                  <button
                    onClick={() => setSelectedCategoryTab('admin_panel')}
                    className={`flex items-start gap-3 p-3 rounded-xl transition text-left cursor-pointer border ${
                      selectedCategoryTab === 'admin_panel'
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 font-bold'
                        : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/65 border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${
                      selectedCategoryTab === 'admin_panel' ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      <ShieldAlert size={16} />
                    </div>
                    <div className="flex-1 min-w-0 font-sans">
                      <h3 className="text-xs font-bold truncate">
                        {currentLanguage === 'hi' ? 'एडमिन पैनल' : 'Admin Control'}
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-snug font-sans mt-0.5">
                        {currentLanguage === 'hi' ? 'कर्मचारी प्रबंधन और ऑडिट' : 'Operator permission logs & staff'}
                      </p>
                    </div>
                  </button>

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
                        {currentLanguage === 'hi' ? 'सिस्टम डायग्नोस्टिक्स' : 'Diagnostics & Testing'}
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-snug font-sans mt-0.5">
                        {currentLanguage === 'hi' ? 'टेस्ट केस और सिस्टम ऑडिट' : 'Run automated trade math trials'}
                      </p>
                    </div>
                  </button>
                </>
              )}
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
                      {currentLanguage === 'hi' ? 'व्यवसाय पहचान' : 'Business Identity'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                      {currentLanguage === 'hi' ? 'कंपनी प्रोफ़ाइल, टैक्स विवरण और प्रिंट हेडर प्रबंधित करें।' : 'Manage store identification, business address, contact numbers, and voucher printing headers.'}
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
                      {currentLanguage === 'hi' ? 'सुरक्षा और पहुंच' : 'Security & Access'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                      {currentLanguage === 'hi' ? 'सुरक्षित पहुंच पासवर्ड सेट करें, कर्मचारी मोड चुनौती दें या सिंक क्रेडेंशियल देखें।' : 'Change credentials, simulate staff restrictions, modify PIN lock parameters, or view cloud synchronization credentials.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    {/* Simulated Role Switcher */}
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

                    {/* Cloud Firebase Session Account */}
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

                    {/* Set Pin / Password Settings */}
                    <button
                      onClick={() => setActiveView('password_settings')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left min-w-0 gap-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                        <div className="bg-amber-50 dark:bg-amber-900/30 p-2.5 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                          <Key size={20} />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm truncate">
                            {currentLanguage === 'hi' ? 'ऐप पिन और पासवर्ड' : 'App Pin & Password'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block truncate font-sans mt-0.5">
                            {currentLanguage === 'hi' ? 'मास्टर पिन रीसेट करें या नया एडमिन पासवर्ड सेट करें' : 'Change Master Pin security, update administrator credentials'}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-400 shrink-0">&#10145;</span>
                    </button>
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
                      {currentLanguage === 'hi' ? 'डेटा और क्लाउड' : 'Data & Cloud'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                      {currentLanguage === 'hi' ? 'वित्तीय लेनदेन, पॉइंट-इन-टाइम रिकवरी बैकअप और सिस्टम रीसेट कार्यों का प्रबंधन।' : 'Configure secure storage caches, perform fiscal close rollbacks, deploy point-in-time recovery saves or seeding assets.'}
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

                    {/* System diagnostics */}
                    <button
                      onClick={() => setActiveView('system_health')}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer text-left min-w-0 gap-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                          <Activity size={20} />
                        </div>
                        <div className="text-left flex-1 min-w-0 font-sans">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm truncate">System Diagnostics & Health</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block truncate mt-0.5 font-sans">Diagnostic integrity reports & performance indicators</span>
                        </div>
                      </div>
                      <span className="text-slate-400 shrink-0">&#10145;</span>
                    </button>

                    {/* Master Stress Test Dashboard */}
                    {authContext.currentUser?.role === 'admin' && (
                      <button
                        onClick={() => setActiveView('master_health')}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-rose-100 dark:border-rose-900 bg-[#fef2f2] dark:bg-rose-950/20 hover:bg-[#fee2e2] dark:hover:bg-rose-900/35 transition cursor-pointer text-left font-sans min-w-0 gap-4 shadow-sm"
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                          <div className="bg-rose-100 dark:bg-rose-900/30 p-2.5 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
                            <ShieldCheck size={20} />
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <span className="font-bold text-slate-800 dark:text-rose-400 block text-sm flex items-center gap-1.5 font-sans truncate">Master Stress-Test Dashboard</span>
                            <span className="text-xs text-slate-500 dark:text-rose-350 leading-normal block truncate mt-0.5 font-sans">Database query profiling and memory threshold diagnostics</span>
                          </div>
                        </div>
                        <span className="text-rose-500 font-bold shrink-0">&#10145;</span>
                      </button>
                    )}

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
                      {currentLanguage === 'hi' ? 'ऐप प्राथमिकताएं' : 'App Preferences'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                      {currentLanguage === 'hi' ? 'इनवॉइसिंग डिज़ाइनों, भाषा स्थानीयकरण, स्कैनर सेटिंग्स और फ्लोटिंग सहायकों को बदलें।' : 'Customize local billing rules, enable automated QR modules, select preferred localizations, or configure smart AI dialog utilities.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    {/* Bilingual App Language Row */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/65 shadow-sm flex items-center justify-between gap-4 min-w-0">
                      <div className="text-left flex-1 min-w-0 pr-1 select-auto font-sans">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block font-sans truncate">App Language (भाषा)</span>
                        <span className="text-xs text-slate-400 leading-relaxed block truncate font-sans mt-0.5">
                          {currentLanguage === 'hi' ? 'सक्रिय भाषा: हिंदी' : 'Active language: English'}
                        </span>
                      </div>
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full shadow-inner border border-slate-200 dark:border-slate-700/60 pointer-events-auto items-center shrink-0">
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

                      {/* Smart assistant inline switcher */}
                      <div className="flex items-center justify-between py-1 gap-3 min-w-0">
                        <div className="text-left flex-1 min-w-0 font-sans">
                          <span className="font-bold text-slate-800 dark:text-indigo-600 text-sm block">Smart Floating AI Assistant</span>
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

              {selectedCategoryTab === 'admin_panel' && authContext.currentUser?.role === 'admin' && (
                <motion.div
                  key="admin_panel"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 text-left"
                >
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldAlert className="text-indigo-600 dark:text-indigo-400" size={24} />
                      {currentLanguage === 'hi' ? 'एडमिन पैनल' : 'Admin Control Panel'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                      {currentLanguage === 'hi' ? 'स्टाफ सदस्यों और उनके डिलीट/स्टॉक संपादन अनुमतियों को नियंत्रित करें।' : 'Review system modifications, restrict operational privileges, or manage business operator accounts.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
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
                        <div className="text-left flex-1 min-w-0">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm truncate">
                            {currentLanguage === 'hi' ? 'स्टाफ और अनुमतियाँ प्रबंधित करें' : 'Manage Staff & Permissions'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block truncate font-sans mt-0.5">
                            {currentLanguage === 'hi' ? 'स्टाफ सदस्य जोड़ें और उनके डिलीट/स्टॉक अनुमतियों को सेट करें' : 'Add staff operators, manage deleted billing & stock edits limitations'}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-400 shrink-0">&#10145;</span>
                    </button>

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
                        <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Activity size={20} />
                        </div>
                        <div className="text-left flex-1 min-w-0 font-sans">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm truncate">
                            {currentLanguage === 'hi' ? 'सिस्टम ऑडिट लॉग्स' : 'System Audit Logs'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal block truncate font-sans mt-0.5">
                            {currentLanguage === 'hi' ? 'सभी यूजर गतिविधियों, डेटा बदलावों और महत्वपूर्ण लॉगिन ऑडिट को ट्रैक करें' : 'Track all user activities, data modifications, and secure logins history'}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-400 shrink-0">&#10145;</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {selectedCategoryTab === 'diagnostics' && authContext.currentUser?.role === 'admin' && (
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
                      {currentLanguage === 'hi' ? 'सिस्टम डायग्नोस्टिक्स' : 'Diagnostics & System Trials'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                      {currentLanguage === 'hi' ? 'ऑटोमेटेड परीक्षा और सुरक्षा ऑडिट ट्रेल को निष्पादित करें।' : 'Run system trials, monitor synchronization status, and verify mathematical invoicing structures.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <TestCaseRunner />
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