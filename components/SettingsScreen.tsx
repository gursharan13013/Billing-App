import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Upload, Download, CloudUpload, CloudDownload, 
  Key, User, SlidersHorizontal, FileText, ArrowDownCircle,
  Globe, Sun, Moon, Check, Hash, Database, Loader2, AlertTriangle, ShieldCheck, RefreshCcw, Bot, ScanBarcode, HelpCircle, Trash2,
  ChevronDown, ChevronUp, HardDrive, Info, ExternalLink, Cloud, Laptop, Activity, Lock
} from 'lucide-react';
import { Language, VoucherSettings, APP_VERSION, BUILD_DATE, AppSettings } from '../types';
import { Theme } from '../App';
import { billingService } from '../src/services/billingService';
import { auth, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPasswordEmail } from '../src/services/firebaseService';
import { LocalBackupService } from '../src/services/LocalBackupService';
import Step1Validator from './Step1Validator';
import { googleAuthService, isMockGoogleEnabled, setMockGoogleEnabled } from '../src/services/googleAuthService';
import { GoogleDriveService, DriveSnapshot, isSimulateNetworkError, setSimulateNetworkError } from '../src/services/GoogleDriveService';
import { useAuth } from '../src/infrastructure/AuthContext';
import { getSyncStatus, subscribeToSyncStatus, SyncStatus } from '../src/infrastructure/SyncEngine';
import { SystemHealth } from './SystemHealth';
import { SystemHealthDashboard } from './SystemHealthDashboard';
import { SettingsAccordion } from './SettingsAccordion';


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
          {title} {hindiTitle && <span className="text-slate-550 dark:text-slate-400 font-medium text-xs font-sans tracking-normal leading-relaxed">({hindiTitle})</span>}
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

  const [activeView, setActiveView] = useState<'main' | 'preferences' | 'preferences2' | 'general_settings' | 'sale_bill_settings' | 'item_settings' | 'purchase_bill_settings' | 'purchase_return_settings' | 'sale_return_settings' | 'ledger_settings' | 'transportation_settings' | 'invoice_numbering' | 'password_settings' | 'ceo_control' | 'time_machine' | 'system_health' | 'master_health'>('main');
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
      cloudSyncEnabled: true,
      messagingEnabled: true,
      liveSearchEnabled: true
  });

  useEffect(() => {
    billingService.getAppSettings().then(setAppSettings);
  }, []);
  
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
          await billingService.clearAllData();
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
      className={`${fullWidth ? 'col-span-2 py-3' : 'col-span-1 py-4'} bg-[#3b5998] hover:bg-[#2d4373] active:bg-[#1e2e4f] text-white p-2 flex flex-col items-center justify-center gap-1.5 transition-colors`}
    >
      <Icon size={22} strokeWidth={2} />
      <span className="text-[12px] font-medium tracking-wide text-center leading-tight">{label}</span>
    </button>
  );

  // INVOICE NUMBERING SUB-SCREEN
  if (activeView === 'invoice_numbering') {
      return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
            <header className="bg-[#3b5998] text-white p-4 flex items-center justify-between shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
                <div className="flex items-center gap-3">
                    <button onClick={() => setActiveView('main')}><ArrowLeft size={24} /></button>
                    <h1 className="text-xl font-bold">Invoice Numbering</h1>
                </div>
                <button onClick={saveVoucherSettings} className="bg-white/20 px-3 py-1 rounded hover:bg-white/30 text-sm font-bold">
                    Save
                </button>
            </header>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
                {voucherSettings.map((setting, index) => (
                    <div key={setting.type} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 text-lg border-b border-gray-100 dark:border-slate-800 pb-2">
                            {setting.type}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prefix</label>
                                <input 
                                    type="text" 
                                    value={setting.prefix} 
                                    onChange={e => handleVoucherSettingChange(index, 'prefix', e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                    placeholder="e.g. S"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start From</label>
                                <input 
                                    type="number" 
                                    value={setting.currentSequence} 
                                    onChange={e => handleVoucherSettingChange(index, 'currentSequence', parseInt(e.target.value) || 0)}
                                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg p-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Next: {setting.currentSequence + 1}</p>
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
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('main')}><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold">Preferences</h1>
        </header>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
             {/* QR Visibility Toggle */}
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 flex items-center justify-between w-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                 <div className="flex items-center gap-4">
                     <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600 dark:text-green-400">
                         <SlidersHorizontal size={24} />
                     </div>
                     <div className="flex-1 text-left">
                         <h3 className="font-bold text-gray-800 dark:text-white">Home QR Code</h3>
                         <p className="text-sm text-gray-500 dark:text-slate-400">Show QR on dashboard</p>
                     </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={localStorage.getItem('showDashboardQR') !== 'false'}
                      onChange={(e) => {
                          localStorage.setItem('showDashboardQR', e.target.checked.toString());
                          // Force a re-render locally by dispatching event and triggering state change
                          window.dispatchEvent(new Event('storage'));
                          setActiveView('main');
                          setTimeout(() => setActiveView('preferences'), 10);
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                 </label>
             </div>

             {/* Smart Assistant Visibility Toggle */}
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 flex items-center justify-between w-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                 <div className="flex items-center gap-4">
                     <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                         <Bot size={24} />
                     </div>
                     <div className="flex-1 text-left">
                         <h3 className="font-bold text-gray-800 dark:text-white">Smart Assistant</h3>
                         <p className="text-sm text-gray-500 dark:text-slate-400">Show floating AI assistant</p>
                     </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                 </label>
             </div>

             {/* Barcode Scanner Settings */}
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 flex items-center justify-between w-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                 <div className="flex items-center gap-4">
                     <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full text-orange-600 dark:text-orange-400">
                         <ScanBarcode size={24} />
                     </div>
                     <div className="flex-1 text-left">
                         <h3 className="font-bold text-gray-800 dark:text-white">Barcode Scanner</h3>
                         <p className="text-sm text-gray-500 dark:text-slate-400">Enable scanning features</p>
                     </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                 </label>
             </div>

             {/* Invoice Numbering Link */}
             <button 
                onClick={() => setActiveView('invoice_numbering')}
                className="w-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
             >
                 <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                     <Hash size={24} />
                 </div>
                 <div className="flex-1 text-left">
                     <h3 className="font-bold text-gray-800 dark:text-white">Invoice Numbering</h3>
                     <p className="text-sm text-gray-500 dark:text-slate-400">Set prefixes and starting numbers</p>
                 </div>
                 <ArrowLeft size={20} className="rotate-180 text-gray-400" />
             </button>

             {/* Demo Data Link */}
             <button 
                onClick={handleSeedClick}
                className="w-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
             >
                 <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full text-purple-600 dark:text-purple-400 group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
                     <Database size={24} />
                 </div>
                 <div className="flex-1 text-left">
                     <h3 className="font-bold text-gray-800 dark:text-white">Load Demo Data</h3>
                     <p className="text-sm text-gray-500 dark:text-slate-400">Dairy Milk Business Scenario</p>
                 </div>
                 <ArrowLeft size={20} className="rotate-180 text-gray-400" />
             </button>

             {/* CEO Control Section */}
             <button 
               onClick={() => setActiveView('ceo_control')}
               className="w-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-blue-200 dark:border-blue-900/30 p-4 flex items-center gap-4 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group"
             >
                 <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                     <SlidersHorizontal size={24} />
                 </div>
                 <div className="flex-1 text-left">
                     <h3 className="font-bold text-blue-600 dark:text-blue-400">CEO Control</h3>
                     <p className="text-sm text-blue-500/80 dark:text-blue-400/80">Manage Online Features & Privacy</p>
                 </div>
                 <ArrowLeft size={20} className="rotate-180 text-blue-400" />
             </button>

             {/* Quick App Restart & Reload Action Panel */}
             <div className="w-full bg-slate-50 dark:bg-slate-900 border border-cyan-200 dark:border-cyan-900/30 rounded-xl p-4 space-y-3.5">
                 <div className="flex items-center gap-3 border-b border-cyan-100 dark:border-cyan-905/30 pb-2">
                     <RefreshCcw size={20} className="text-cyan-600 dark:text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
                     <div>
                         <h3 className="font-bold text-slate-800 dark:text-white text-sm">Quick App Control (त्वरित ऐप नियंत्रण)</h3>
                         <p className="text-[11px] text-slate-500 dark:text-slate-400">Easy reload and setup reset controls</p>
                     </div>
                 </div>

                 <div className="grid grid-cols-2 gap-2.5">
                     <button
                         onClick={() => {
                             window.location.reload();
                         }}
                         className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center gap-1 hover:border-cyan-400 dark:hover:border-cyan-500 transition-all active:scale-[0.98] group"
                     >
                         <RefreshCcw size={18} className="text-cyan-500 group-hover:rotate-180 transition-transform duration-500" />
                         <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Soft Reload</span>
                         <span className="text-[9px] text-slate-500 select-none">तुरंत रीलोड करें 🔄</span>
                     </button>

                     <button
                         onClick={() => {
                             if (confirm("Kya aap onboarding setup shuru se dubara chalana chahte hain? Aapka historic ledger safe rahega. (Do you want to re-run the onboarding?)")) {
                                 localStorage.removeItem('onboardingCompleted');
                                 localStorage.removeItem('companyProfileSetup');
                                 sessionStorage.removeItem('hasShownSplash');
                                 window.location.reload();
                             }
                         }}
                         className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center gap-1 hover:border-rose-400 dark:hover:border-rose-500 transition-all active:scale-[0.98] group"
                     >
                         <ShieldCheck size={18} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                         <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Redo Setup</span>
                         <span className="text-[9px] text-slate-500 select-none">नया सेटअप चालू करें 🛡️</span>
                     </button>
                 </div>
             </div>

             {/* Reset App Data Link */}
             <button 
                onClick={handleResetClick}
                className="w-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-red-200 dark:border-red-900/30 p-4 flex items-center gap-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group"
             >
                 <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full text-red-600 dark:text-red-400 group-hover:bg-red-200 dark:group-hover:bg-red-800 transition-colors">
                     <RefreshCcw size={24} />
                 </div>
                 <div className="flex-1 text-left">
                     <h3 className="font-bold text-red-600 dark:text-red-400">Reset App Data</h3>
                     <p className="text-sm text-red-500/80 dark:text-red-400/80">Clear all data and start fresh</p>
                 </div>
                 <ArrowLeft size={20} className="rotate-180 text-red-400" />
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
                        {currentTheme === 'light' ? <Sun size={18} className="text-orange-500"/> : <Moon size={18} className="text-blue-500"/>}
                        App Theme
                    </h2>
                </div>
                <button onClick={() => onThemeChange('light')} className="w-full flex justify-between items-center p-4 hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-slate-800">
                    <div className="flex flex-col items-start">
                        <span className="font-semibold text-gray-800 dark:text-white">Light Mode</span>
                        <span className="text-xs text-gray-500">Bright & Clean</span>
                    </div>
                    {currentTheme === 'light' && <Check size={20} className="text-blue-600" />}
                </button>
                <button onClick={() => onThemeChange('dark')} className="w-full flex justify-between items-center p-4 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors">
                     <div className="flex flex-col items-start">
                        <span className="font-semibold text-gray-800 dark:text-white">Dark Mode</span>
                        <span className="text-xs text-gray-500">Easy on eyes</span>
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

  const handleAppSettingsChange = async (key: keyof AppSettings, value: boolean) => {
      const updated = { ...appSettings, [key]: value };
      setAppSettings(updated);
      await billingService.saveAppSettings(updated);
  };

  // CEO CONTROL SUB-SCREEN
  if (activeView === 'ceo_control') {
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('main')}><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold">CEO Control Panel</h1>
        </header>

        <div className="p-4 space-y-6 flex-1 overflow-y-auto">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
                    Yahan se aap apni app ke online features ko control kar sakte hain. Privacy ya data bachane ke liye aap inhen kabhi bhi off kar sakte hain.
                </p>
            </div>

            <div className="space-y-4">
                {/* Cloud Sync Toggle */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600 dark:text-green-400">
                            <CloudUpload size={24} />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="font-bold text-gray-800 dark:text-white">Cloud Sync & Backup</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">Invoice aur payment ka online backup</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={appSettings.cloudSyncEnabled}
                            onChange={(e) => handleAppSettingsChange('cloudSyncEnabled', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                {/* Messaging Toggle */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full text-purple-600 dark:text-purple-400">
                            <Bot size={24} />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="font-bold text-gray-800 dark:text-white">Customer Messaging (Chat)</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">Customers ke sath chat aur live messaging</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={appSettings.messagingEnabled}
                            onChange={(e) => handleAppSettingsChange('messagingEnabled', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                {/* Live Search Toggle */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                        <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full text-orange-600 dark:text-orange-400">
                            <Globe size={24} />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="font-bold text-gray-800 dark:text-white">Live Customer Search</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">Online database se customer search karna</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={appSettings.liveSearchEnabled}
                            onChange={(e) => handleAppSettingsChange('liveSearchEnabled', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-slate-800">
                <div className="flex items-start gap-3 text-slate-500 dark:text-slate-400 p-2">
                    <ShieldCheck size={18} className="shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">
                        <b>Note:</b> Offline Core hamesha ON rehta hai. Internet na hone par bhi billing aur management kabhi nahi rukega. Online features OFF karne par app sirf local data ka use karegi.
                    </p>
                </div>
            </div>
        </div>
      </div>
    );
  }

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

  // PASSWORD SETTINGS SUB-SCREEN
  if (activeView === 'password_settings') {
    const isLockEnabled = localStorage.getItem('appLockEnabled') === 'true';
    
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('main')}><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-bold">App Security</h1>
        </header>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 flex items-center justify-between w-full">
                 <div className="flex items-center gap-4">
                     <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                         <ShieldCheck size={24} />
                     </div>
                     <div className="flex-1 text-left">
                         <h3 className="font-bold text-gray-800 dark:text-white">App Lock</h3>
                         <p className="text-sm text-gray-500 dark:text-slate-400">Require PIN to open app</p>
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                 </label>
             </div>

             {isLockEnabled && (
                <button 
                  onClick={() => {
                      setPinError('');
                      setPinInput('');
                      setPinModalConfig({ isOpen: true, mode: 'change_verify' });
                  }}
                  className="w-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    <div className="flex items-center gap-4">
                         <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-600 dark:text-slate-400">
                             <Key size={24} />
                         </div>
                         <div className="flex-1 text-left">
                             <h3 className="font-bold text-gray-800 dark:text-white">Change PIN</h3>
                         </div>
                     </div>
                     <ArrowLeft size={20} className="rotate-180 text-gray-400" />
                </button>
             )}
        </div>

        {/* PIN Modal */}
        {pinModalConfig.isOpen && (
             <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                 <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                     <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                         <Key size={24} className="text-blue-600 dark:text-blue-400" />
                     </div>
                     <h3 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-2">
                         {pinModalConfig.mode === 'enable' ? 'Set New PIN' : 
                          pinModalConfig.mode === 'disable' ? 'Enter PIN to Disable' :
                          pinModalConfig.mode === 'change_verify' ? 'Enter Current PIN' :
                          'Enter New PIN'}
                     </h3>
                     <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
                         {pinModalConfig.mode === 'enable' || pinModalConfig.mode === 'change_new' ? 'Please enter a numeric PIN to secure your app.' : 'Verify your numeric PIN to proceed.'}
                     </p>
                     
                     <form onSubmit={(e) => {
                         e.preventDefault();
                         if (!pinInput) return;
                         
                         const mode = pinModalConfig.mode;
                         const savedPin = localStorage.getItem('appPin');
                         
                         if (mode === 'enable') {
                             localStorage.setItem('appPin', pinInput);
                             localStorage.setItem('appLockEnabled', 'true');
                             setDialogMessage({ title: 'Success', message: 'App lock successfully enabled!' });
                             setPinModalConfig({ isOpen: false, mode: 'enable' });
                             setActiveView('main');
                             setTimeout(() => setActiveView('password_settings'), 10);
                         } else if (mode === 'disable') {
                             if (pinInput === savedPin) {
                                 localStorage.setItem('appLockEnabled', 'false');
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
                             setDialogMessage({ title: 'Success', message: 'PIN changed successfully!' });
                             setPinModalConfig({ isOpen: false, mode: 'enable' });
                             setActiveView('main');
                             setTimeout(() => setActiveView('password_settings'), 10);
                         }
                     }}>
                         <input 
                            type="number"
                            autoFocus
                            value={pinInput}
                            onChange={(e) => {
                                setPinInput(e.target.value);
                                if (pinError) setPinError('');
                            }}
                            placeholder="****"
                            className={`w-full text-center text-2xl tracking-[0.5em] font-mono p-4 border-2 rounded-xl outline-none transition-all mb-2 ${
                                pinError ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-400' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500'
                            }`}
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
                                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={!pinInput}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm
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
            className="bg-blue-600 hover:bg-blue-505 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md hover:shadow-blue-500/10 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
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
              <div className="bg-blue-105 dark:bg-blue-900/40 p-2.5 rounded-xl text-blue-600 dark:text-blue-400 shrink-0 h-fit">
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
                <Cloud className="text-blue-500 fill-blue-5/10 shrink-0" size={20} />
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
                  className={`w-10 h-5 flex items-center rounded-all p-0.5 duration-300 cursor-pointer ${useMockGoogle ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-750 justify-start'}`}
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
                  className={`w-10 h-5 flex items-center rounded-all p-0.5 duration-300 cursor-pointer ${simulateNetError ? 'bg-rose-500 justify-end' : 'bg-slate-300 dark:bg-slate-750 justify-start'}`}
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
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-950/30 rounded-xl p-3 flex items-center justify-between gap-1.5">
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
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
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
                      className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-750 hover:bg-gray-50 text-gray-700 dark:text-gray-300 text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer select-none"
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
                        className="bg-rose-650 hover:bg-rose-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer select-none"
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
          <button onClick={() => setActiveView('main')}><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-normal tracking-wide">Preferences</h1>
        </header>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
            <div className="flex flex-col">
                
                {/* General Settings */}
                <div onClick={() => setActiveView('general_settings')} className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">General Settings</h2>
                    <p className="text-[15px] mt-1 text-slate-600 dark:text-slate-400">General Settings</p>
                </div>

                {/* Auto upload */}
                <div className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer">
                    <div className="pr-4 flex-1">
                        <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">Auto upload</h2>
                        <p className="text-[15px] mt-1 text-slate-600 dark:text-slate-400 leading-snug">Upload the Backup when Internet is<br/>available</p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center">
                        <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#d32f2f] rounded-[2px] border-gray-300" />
                    </div>
                </div>

                {/* Member's Permissions */}
                <div className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">Member's Permissions</h2>
                    <p className="text-[15px] mt-1 text-slate-600 dark:text-slate-400 leading-snug">Send/Receive Bills and Payments to/from your<br/>Parties and Customer</p>
                </div>

                {/* Send Item(s) */}
                <div className="p-[18px] border-b border-slate-200 dark:border-slate-800 bg-[#ebebeb] dark:bg-slate-800 hover:bg-[#e0e0e0] dark:hover:bg-slate-700 cursor-pointer">
                    <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">Send Item(s)</h2>
                    <p className="text-[15px] mt-1 text-slate-600 dark:text-slate-400">Send Your Item(s) to Parties or Customers</p>
                </div>

                {/* Billing Header */}
                <div className="px-[18px] pt-5 pb-3 font-normal">
                    <h2 className="text-[#d32f2f] dark:text-[#ef5350] text-[15px]">Billing</h2>
                </div>

                {/* Items */}
                <div onClick={() => setActiveView('item_settings')} className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">Items</h2>
                    <p className="text-[15px] mt-1 text-slate-600 dark:text-slate-400">Change your Item(s) settings</p>
                </div>

                {/* Purchase Bill Settings */}
                <div onClick={() => setActiveView('purchase_bill_settings')} className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">Purchase Bill Settings</h2>
                    <p className="text-[15px] mt-1 text-slate-600 dark:text-slate-400">Change Purchase Bill settings</p>
                </div>

                {/* Purchase Return Settings */}
                <div onClick={() => setActiveView('purchase_return_settings')} className="p-[18px] border-b border-slate-200 dark:border-slate-800 bg-[#ebebeb] dark:bg-slate-800 hover:bg-[#e0e0e0] dark:hover:bg-slate-700 cursor-pointer">
                    <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">Purchase Return Settings</h2>
                    <p className="text-[15px] mt-1 text-slate-600 dark:text-slate-400">Change Purchase Return settings</p>
                </div>

                {/* Sale Bill Settings */}
                <div onClick={() => setActiveView('sale_bill_settings')} className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">Sale Bill Settings</h2>
                    <p className="text-[15px] mt-1 text-slate-600 dark:text-slate-400">Change Sale Bill settings</p>
                </div>

                {/* Sale Return Settings */}
                <div onClick={() => setActiveView('sale_return_settings')} className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">Sale Return Settings</h2>
                    <p className="text-[15px] mt-1 text-slate-600 dark:text-slate-400">Change Sale Return settings</p>
                </div>

                {/* Enable/Disable Ledger(s) Tax settings */}
                <div onClick={() => setActiveView('ledger_settings')} className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">Enable/Disable Ledger(s) Tax settings</h2>
                    <p className="text-[15px] mt-1 text-slate-600 dark:text-slate-400">Enable/Disable Ledger(s) Tax settings</p>
                </div>

                {/* Transportation Detail Settings */}
                <div onClick={() => setActiveView('transportation_settings')} className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">Transportation Detail Settings</h2>
                    <p className="text-[15px] mt-1 text-slate-600 dark:text-slate-400">Enable/Disable Transportation Fields</p>
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
          <button onClick={() => setActiveView('preferences2')}><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-normal tracking-wide">General Settings</h1>
        </header>

        <div className="flex-1 flex flex-col pt-10 px-2 overflow-y-auto items-center">
            {/* Logo area */}
            <div className="w-24 h-24 bg-[#3ddc84] rounded-[24px] flex items-center justify-center mb-8 shadow-sm">
                <Bot size={56} className="text-white" />
            </div>
            
            <div className="flex-1 w-full" />
            
            <div className="grid grid-cols-2 gap-1 w-full pb-2">
                <button className="bg-[#3b5998] hover:bg-[#2d4373] text-white py-4 px-2 text-center text-[15px] font-bold h-14 flex items-center justify-center transition-colors">
                    Bank Details
                </button>
                <button className="bg-[#3b5998] hover:bg-[#2d4373] text-white py-4 px-2 text-center text-[15px] font-bold h-14 flex items-center justify-center transition-colors">
                    Terms & Condition
                </button>
                <button className="bg-[#3b5998] hover:bg-[#2d4373] text-white py-4 px-2 text-center text-[15px] font-bold h-14 flex items-center justify-center transition-colors">
                    Logo
                </button>
                <button className="bg-[#3b5998] hover:bg-[#2d4373] text-white py-4 px-2 text-center text-[15px] font-bold h-14 flex items-center justify-center transition-colors">
                    Print Settings
                </button>
                <button className="col-span-2 bg-[#3b5998] hover:bg-[#2d4373] text-white py-4 px-2 text-center text-[15px] font-bold h-14 flex items-center justify-center transition-colors">
                    Other Settings
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

    const CheckboxRow = ({ label, checkedKey, isGray = false }: { label: string, checkedKey: keyof typeof itemSettings, isGray?: boolean }) => (
        <div onClick={() => handleToggle(checkedKey)} className={`p-[18px] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer ${isGray ? 'bg-[#ebebeb] dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">{label}</h2>
            <div className="shrink-0 flex items-center justify-center">
                <input 
                    type="checkbox" 
                    checked={itemSettings[checkedKey]} 
                    onChange={() => {}}
                    className="w-[22px] h-[22px] accent-[#ef5350] rounded-[2px] border-gray-400 cursor-pointer pointer-events-none" 
                />
            </div>
        </div>
    );

    return (
      <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')}><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-normal tracking-wide">Item Settings</h1>
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-950">
            <CheckboxRow label="Enable Cess" checkedKey="cess" />
            <CheckboxRow label="Enable Batch Number" checkedKey="batchNumber" />
            <CheckboxRow label="Enable Manufacturing Date" checkedKey="manufacturingDate" />
            <CheckboxRow label="Enable Expiry Date" checkedKey="expiryDate" />
            <CheckboxRow label="Enable Wholesale Price" checkedKey="wholesalePrice" />
            <CheckboxRow label="Enable Item Company" checkedKey="itemCompany" />
            <CheckboxRow label="Enable Minimum Stock Alert" checkedKey="minimumStockAlert" isGray />
            <CheckboxRow label="Enable Category" checkedKey="category" />
            <CheckboxRow label="Enable Bill Of Item" checkedKey="billOfItem" />
        </div>
      </div>
    );
  }

  // PURCHASE BILL SETTINGS SUB-SCREEN
  if (activeView === 'purchase_bill_settings') {
    const handleToggle = (key: keyof typeof purchaseBillSettings) => {
        setPurchaseBillSettings(prev => ({...prev, [key]: !prev[key]}));
    };

    const CheckboxRow = ({ label, checkedKey, isGray = false }: { label: string, checkedKey: keyof typeof purchaseBillSettings, isGray?: boolean }) => (
        <div onClick={() => handleToggle(checkedKey)} className={`p-[18px] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer ${isGray ? 'bg-[#ebebeb] dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">{label}</h2>
            <div className="shrink-0 flex items-center justify-center">
                <input 
                    type="checkbox" 
                    checked={purchaseBillSettings[checkedKey]} 
                    onChange={() => {}}
                    className="w-[22px] h-[22px] accent-[#ef5350] rounded-[2px] border-gray-400 cursor-pointer pointer-events-none" 
                />
            </div>
        </div>
    );

    return (
      <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')}><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-normal tracking-wide">Purchase Bill Setting</h1>
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-950">
            <CheckboxRow label="Enable Bill Discount" checkedKey="billDiscount" />
            <CheckboxRow label="Enable Sale Rate & MRP Calculation" checkedKey="saleRateMrpCalculation" />
            <CheckboxRow label="Enable Additional Charges" checkedKey="additionalCharges" />
            <CheckboxRow label="Enable Item Wise Discount" checkedKey="itemWiseDiscount" />
            <CheckboxRow label="Enable Transportation Detail" checkedKey="transportationDetail" isGray />
            <CheckboxRow label="Enable Ecommerce Detail" checkedKey="ecommerceDetail" />
            <CheckboxRow label="Enable Reverse Charge" checkedKey="reverseCharge" />
        </div>
      </div>
    );
  }

  // PURCHASE RETURN SETTINGS SUB-SCREEN
  if (activeView === 'purchase_return_settings') {
    const handleToggle = (key: keyof typeof purchaseReturnSettings) => {
        setPurchaseReturnSettings(prev => ({...prev, [key]: !prev[key]}));
    };

    const CheckboxRow = ({ label, checkedKey, isGray = false }: { label: string, checkedKey: keyof typeof purchaseReturnSettings, isGray?: boolean }) => (
        <div onClick={() => handleToggle(checkedKey)} className={`p-[18px] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer ${isGray ? 'bg-[#ebebeb] dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">{label}</h2>
            <div className="shrink-0 flex items-center justify-center">
                <input 
                    type="checkbox" 
                    checked={purchaseReturnSettings[checkedKey]} 
                    onChange={() => {}}
                    className="w-[22px] h-[22px] accent-[#ef5350] rounded-[2px] border-gray-400 cursor-pointer pointer-events-none" 
                />
            </div>
        </div>
    );

    return (
      <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')}><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-normal tracking-wide">Purchase Return Settings</h1>
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-950">
            <CheckboxRow label="Enable Additional Charges" checkedKey="additionalCharges" />
            <CheckboxRow label="Enable Item Wise Discount" checkedKey="itemWiseDiscount" />
            <CheckboxRow label="Enable Transportation Detail" checkedKey="transportationDetail" />
            <CheckboxRow label="Enable Ecommerce Detail" checkedKey="ecommerceDetail" />
            <CheckboxRow label="Enable Reverse Charge" checkedKey="reverseCharge" />
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
          <div className="flex items-center gap-3">
              <button onClick={() => setActiveView('preferences2')}><ArrowLeft size={24} /></button>
              <h1 className="text-xl font-normal tracking-wide">Ledger List</h1>
          </div>
          <button onClick={() => setActiveView('preferences2')}><Check size={24} /></button>
        </header>

        <div className="flex bg-white dark:bg-slate-950 px-4 py-3 font-bold border-b border-gray-200 dark:border-slate-800 text-[17px]">
            <div className="w-16">No.</div>
            <div>Name</div>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-950 relative">
            {ledgersList.map((ledger) => (
                <div 
                    key={ledger.id} 
                    onClick={() => handleToggle(ledger.id)} 
                    className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 text-[17px]">{ledger.id}</div>
                        <div className="text-[17px]">{ledger.name}</div>
                    </div>
                    <div className="shrink-0 flex items-center justify-center pl-2">
                        <input 
                            type="checkbox" 
                            checked={ledger.checked} 
                            onChange={() => {}}
                            className="w-[22px] h-[22px] accent-[#ef5350] rounded-[2px] border-gray-400 cursor-pointer pointer-events-none" 
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

    const CheckboxRow = ({ label, checkedKey, isGray = false }: { label: string, checkedKey: keyof typeof transportationSettings, isGray?: boolean }) => (
        <div onClick={() => handleToggle(checkedKey)} className={`p-[18px] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer ${isGray ? 'bg-[#ebebeb] dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">{label}</h2>
            <div className="shrink-0 flex items-center justify-center">
                <input 
                    type="checkbox" 
                    checked={transportationSettings[checkedKey]} 
                    onChange={() => {}}
                    className="w-[22px] h-[22px] accent-[#ef5350] rounded-[2px] border-gray-400 cursor-pointer pointer-events-none" 
                />
            </div>
        </div>
    );

    return (
      <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')}><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-normal tracking-wide">Transportation Settings</h1>
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-950">
            <CheckboxRow label="Enable GR No." checkedKey="grNo" />
            <CheckboxRow label="Enable Vehicle No." checkedKey="vehicleNo" />
            <CheckboxRow label="Enable Origin" checkedKey="origin" />
            <CheckboxRow label="Enable Destination" checkedKey="destination" />
            <CheckboxRow label="Enable Dispatch Mode" checkedKey="dispatchMode" isGray />
            <CheckboxRow label="Enable Date" checkedKey="date" />
        </div>
      </div>
    );
  }

  // SALE RETURN SETTINGS SUB-SCREEN
  if (activeView === 'sale_return_settings') {
    const handleToggle = (key: keyof typeof saleReturnSettings) => {
        setSaleReturnSettings(prev => ({...prev, [key]: !prev[key]}));
    };

    const CheckboxRow = ({ label, checkedKey, isGray = false }: { label: string, checkedKey: keyof typeof saleReturnSettings, isGray?: boolean }) => (
        <div onClick={() => handleToggle(checkedKey)} className={`p-[18px] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer ${isGray ? 'bg-[#ebebeb] dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">{label}</h2>
            <div className="shrink-0 flex items-center justify-center">
                <input 
                    type="checkbox" 
                    checked={saleReturnSettings[checkedKey]} 
                    onChange={() => {}}
                    className="w-[22px] h-[22px] accent-[#ef5350] rounded-[2px] border-gray-400 cursor-pointer pointer-events-none" 
                />
            </div>
        </div>
    );

    return (
      <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')}><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-normal tracking-wide">Sale Return Settings</h1>
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-950">
            <CheckboxRow label="Enable Bill Discount" checkedKey="billDiscount" />
            <CheckboxRow label="Enable Additional Charges" checkedKey="additionalCharges" />
            <CheckboxRow label="Enable Item Wise Discount" checkedKey="itemWiseDiscount" />
            <CheckboxRow label="Enable Transportation Detail" checkedKey="transportationDetail" />
            <CheckboxRow label="Enable Ecommerce Detail" checkedKey="ecommerceDetail" />
            <CheckboxRow label="Enable Reverse Charge" checkedKey="reverseCharge" isGray />
            
            <div className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">Sale Bill Number Prefix</h2>
                <p className="text-[15px] mt-1 text-slate-600 dark:text-slate-400">Add prefix before Bill Number</p>
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

    const CheckboxRow = ({ label, checkedKey, isGray = false }: { label: string, checkedKey: keyof typeof saleSettings, isGray?: boolean }) => (
        <div onClick={() => handleToggle(checkedKey)} className={`p-[18px] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer ${isGray ? 'bg-[#ebebeb] dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">{label}</h2>
            <div className="shrink-0 flex items-center justify-center">
                <input 
                    type="checkbox" 
                    checked={saleSettings[checkedKey]} 
                    onChange={() => {}}
                    className="w-[22px] h-[22px] accent-[#ef5350] rounded-[2px] border-gray-400 cursor-pointer pointer-events-none" 
                />
            </div>
        </div>
    );

    return (
      <div className="flex flex-col h-full bg-[#fcfcfc] dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
        <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
          <button onClick={() => setActiveView('preferences2')}><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-normal tracking-wide">Sale Bill Settings</h1>
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-slate-950">
            <CheckboxRow label="Enable Cash Billing" checkedKey="cashBilling" />
            <CheckboxRow label="Enable Bill Discount" checkedKey="billDiscount" />
            <CheckboxRow label="Enable Additional Charges" checkedKey="additionalCharges" />
            <CheckboxRow label="Enable Item Wise Discount" checkedKey="itemWiseDiscount" />
            <CheckboxRow label="Enable Transportation Detail" checkedKey="transportationDetail" />
            <CheckboxRow label="Enable Ecommerce Detail" checkedKey="ecommerceDetail" />
            <CheckboxRow label="Enable Reverse Charge" checkedKey="reverseCharge" />
            <CheckboxRow label="Show logo on bill" checkedKey="showLogo" />
            <CheckboxRow label="Enable Item Out Of Stock Alert" checkedKey="outOfStockAlert" isGray />
            <CheckboxRow label="Enable Discounted Quantity" checkedKey="discountedQuantity" />
            <CheckboxRow label="Get Previous Bill Sale Rate" checkedKey="previousBillSaleRate" />
            
            <div className="p-[18px] border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <h2 className="text-[17px] font-normal text-slate-900 dark:text-slate-100">Sale Bill Number Prefix</h2>
                <p className="text-[15px] mt-1 text-slate-600 dark:text-slate-400">Add prefix before Bill Number</p>
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
          onClick={() => onThemeChange(currentTheme === 'light' ? 'dark' : 'light')}
          className="relative inline-flex h-8 w-14 items-center rounded-full bg-slate-100 dark:bg-slate-800 transition shadow-inner border border-slate-200/50 dark:border-slate-700 pointer-events-auto mr-1"
          title="Toggle Theme"
        >
          <span
            className={`${
              currentTheme === 'dark' ? 'translate-x-[26px] bg-indigo-600 text-white' : 'translate-x-1 bg-amber-500 text-white'
            } inline-flex h-6 w-6 transform items-center justify-center rounded-full transition-transform duration-200 shadow`}
          >
            {currentTheme === 'dark' ? <Moon size={12} strokeWidth={2.5} /> : <Sun size={12} strokeWidth={2.5} />}
          </span>
        </button>
      </header>

      <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 space-y-6">
        {/* Dynamic Sync Engine status & General Title summary */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-slate-900 dark:to-slate-850 text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 border border-indigo-100 dark:border-slate-800">
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
                syncStatus === 'Synced' ? 'bg-green-400' : 'bg-rose-450'
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
        <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
          {/* Category 1: Business Identity */}
          <SettingsAccordion
            title="Business Identity"
            icon={User}
            description="Manage store identification, business address, contact numbers, and voucher printing headers."
            isLocked={isStaff}
            disabled={isStaff}
          >
            {/* Store Code details */}
            <div className="bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block font-sans">Store Code (6-Digit)</span>
                <span className={`text-[11px] leading-relaxed block text-slate-500 font-sans ${currentLanguage === 'hi' ? 'leading-relaxed' : ''}`}>
                  {currentLanguage === 'hi' ? 'स्टाफ से शेयर करके सिंक लिंक करें' : 'Share with staff to link business and sync'}
                </span>
              </div>
              {authContext.currentUser?.storeCode ? (
                <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 px-3 py-1 rounded-lg">
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
              className={`w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left ${
                authContext.currentUser?.role === 'staff' ? 'opacity-[0.45] cursor-not-allowed' : 'cursor-pointer bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
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
                <span className="text-xs text-amber-500 font-extrabold flex items-center gap-1 bg-amber-50 dark:bg-amber-900/10 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-900/30 font-sans">
                  <Lock size={10} /> Lock
                </span>
              ) : (
                <span className="text-slate-400">&#10145;</span>
              )}
            </button>

            {/* Invoice Numbering Options */}
            <button
              disabled={authContext.currentUser?.role === 'staff'}
              onClick={() => setActiveView('invoice_numbering')}
              className={`w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left ${
                authContext.currentUser?.role === 'staff' ? 'opacity-[0.45] cursor-not-allowed' : 'cursor-pointer bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
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
                <span className="text-xs text-amber-500 font-extrabold flex items-center gap-1 bg-amber-50 dark:bg-amber-900/10 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-900/30 font-sans">
                  <Lock size={10} /> Lock
                </span>
              ) : (
                <span className="text-slate-400">&#10145;</span>
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
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Key size={18} />
                </div>
                <div className="text-left flex-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">App Pin & Password</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block font-sans">Add secure screen-lock validation barriers</span>
                </div>
              </div>
              <span className="text-slate-400">&#10145;</span>
            </button>

            {/* CEO Control */}
            <button
              onClick={() => setActiveView('ceo_control')}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                  <SlidersHorizontal size={18} />
                </div>
                <div className="text-left flex-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">CEO Admin Panel</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block font-sans">Change underlying system params, debug logs and sync states</span>
                </div>
              </div>
              <span className="text-slate-400">&#10145;</span>
            </button>
          </SettingsAccordion>

          {/* Category 3: Data & Cloud */}
          <SettingsAccordion
            title="Data & Cloud"
            icon={Database}
            description="Enterprise database sync engine. Download encrypted backups, seed simulation, or rollback data."
            isLocked={isStaff}
            disabled={isStaff}
          >
            {/* Backup & Recover buttons */}
            <div className="grid grid-cols-2 gap-3.5 mb-3.5">
              <button
                onClick={handleBackup}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 hover:border-indigo-400 dark:hover:border-indigo-500/80 transition cursor-pointer shadow-sm"
              >
                <Upload size={18} className="text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent font-sans">Export Backup</span>
                <span className="text-[9px] text-slate-500 leading-relaxed">डाटा फाइल बनाएं</span>
              </button>

              <button
                disabled={authContext.currentUser?.role === 'staff'}
                onClick={handleRecover}
                className={`p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 hover:border-indigo-400 dark:hover:border-indigo-500/80 transition shadow-sm ${
                  authContext.currentUser?.role === 'staff' ? 'opacity-[0.45] cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-1 shrink-0">
                  <Download size={18} className="text-indigo-600 dark:text-indigo-400" />
                  {authContext.currentUser?.role === 'staff' && <Lock size={11} className="text-amber-500 shrink-0" />}
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent font-sans">Import Restore</span>
                <span className="text-[9px] text-slate-500 leading-relaxed">
                  {authContext.currentUser?.role === 'staff' ? '🔒 प्रतिबंधित' : 'डाटा रीस्टोर करें'}
                </span>
              </button>
            </div>

            {/* Online Sync Triggers */}
            <div className="grid grid-cols-2 gap-3.5 mb-3.5">
              <button
                onClick={handleCloudUpload}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 hover:border-emerald-400 transition cursor-pointer shadow-sm"
              >
                <CloudUpload size={18} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans">Cloud Sync (Up)</span>
                <span className="text-[9px] text-slate-500 leading-relaxed">क्लाउड अपलोड</span>
              </button>

              <button
                disabled={authContext.currentUser?.role === 'staff'}
                onClick={handleCloudDownload}
                className={`p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 hover:border-emerald-400 transition shadow-sm ${
                  authContext.currentUser?.role === 'staff' ? 'opacity-[0.45] cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-1 shrink-0">
                  <CloudDownload size={18} className="text-emerald-600 dark:text-emerald-400" />
                  {authContext.currentUser?.role === 'staff' && <Lock size={11} className="text-amber-500 shrink-0" />}
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent font-sans">Cloud Sync (Down)</span>
                <span className="text-[9px] text-slate-500 leading-relaxed">
                  {authContext.currentUser?.role === 'staff' ? '🔒 प्रतिबंधित' : 'क्लाउड डाउनलोड'}
                </span>
              </button>
            </div>

            {/* Time Machine & Financial Year controls */}
            <div className="space-y-2.5">
              <button
                onClick={() => setActiveView('time_machine')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Database size={18} />
                  </div>
                  <div className="text-left flex-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">Time Machine Bookmarks</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block font-sans">Local snapshots database point-in-time recovery saves</span>
                  </div>
                </div>
                <span className="text-slate-400">&#10145;</span>
              </button>

              {/* Transfer Financial Year limit */}
              <button
                disabled={authContext.currentUser?.role === 'staff'}
                onClick={() => {
                  console.log("[SETTINGS] Initiate transfer financial year dialog modal triggers from button settings screen props");
                  setShowTransferDialog(true);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left ${
                  authContext.currentUser?.role === 'staff' ? 'opacity-[0.45] cursor-not-allowed' : 'cursor-pointer bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="text-left flex-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm flex items-center gap-1">
                      {currentLanguage === 'hi' ? 'वित्तीय वर्ष ट्रांसफर करें' : 'Transfer Financial Year'}
                      {authContext.currentUser?.role === 'staff' && <Lock size={12} className="text-amber-500 inline shrink-0" />}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block font-sans">
                      {currentLanguage === 'hi' ? '🔒 स्टाफ रोल के लिए प्रतिबंधित क्रिया' : 'Carry balances to new fiscal period database'}
                    </span>
                  </div>
                </div>
                {authContext.currentUser?.role === 'staff' ? (
                  <span className="text-xs text-amber-500 font-extrabold flex items-center gap-1 bg-amber-50 dark:bg-amber-900/10 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-900/30 font-sans">
                    <Lock size={10} /> Lock
                  </span>
                ) : (
                  <span className="text-slate-400">&#10145;</span>
                )}
              </button>

              {/* Switch Financial Year */}
              <button
                disabled={authContext.currentUser?.role === 'staff'}
                onClick={() => {
                  localStorage.removeItem('activeFY');
                  window.location.reload();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left ${
                  authContext.currentUser?.role === 'staff' ? 'opacity-[0.45] cursor-not-allowed' : 'cursor-pointer bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Database size={18} />
                  </div>
                  <div className="text-left flex-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm flex items-center gap-1">
                      Switch Financial Year (बदलें वित्तीय वर्ष)
                      {authContext.currentUser?.role === 'staff' && <Lock size={12} className="text-amber-500 inline shrink-0" />}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block font-sans">Change current work directory and dataset</span>
                  </div>
                </div>
                {authContext.currentUser?.role === 'staff' ? (
                  <span className="text-xs text-amber-500 font-extrabold flex items-center gap-1 bg-amber-50 dark:bg-amber-900/10 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-900/30 font-sans">
                    <Lock size={10} /> Lock
                  </span>
                ) : (
                  <span className="text-slate-400">&#10145;</span>
                )}
              </button>

              {/* Diagnostics System health info */}
              <button
                onClick={() => setActiveView('system_health')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Activity size={18} />
                  </div>
                  <div className="text-left flex-1 font-sans">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">System Diagnostics & Health</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block font-sans">Diagnostic integrity reports & performance indicators</span>
                  </div>
                </div>
                <span className="text-slate-400">&#10145;</span>
              </button>

              {/* Admin Master Health Stress-Test Dashboard */}
              {authContext.currentUser?.role === 'admin' && (
                <button
                  onClick={() => setActiveView('master_health')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-100 dark:border-rose-900 bg-[#fef2f2] dark:bg-rose-950/20 hover:bg-[#fee2e2] dark:hover:bg-rose-900/30 transition cursor-pointer text-left font-sans"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-rose-100 dark:bg-rose-900/30 p-2 rounded-lg text-rose-600 dark:text-rose-400 shrink-0">
                      <ShieldCheck size={18} />
                    </div>
                    <div className="text-left flex-1">
                      <span className="font-bold text-slate-800 dark:text-rose-400 block text-sm flex items-center gap-1 font-sans">Master Stress-Test Dashboard</span>
                      <span className="text-[11px] text-slate-500 dark:text-rose-350 leading-relaxed block font-sans">Database query profiling and memory threshold diagnostics</span>
                    </div>
                  </div>
                  <span className="text-rose-500 font-bold">&#10145;</span>
                </button>
              )}

              {/* Seed Dairy Demo Data button (restricted/hidden for staff) */}
              {authContext.currentUser?.role !== 'staff' && (
                <button
                  onClick={handleSeedClick}
                  className="w-full bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100/60 transition p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs text-center cursor-pointer block leading-relaxed font-sans shadow-sm"
                >
                  {isSeeding ? 'Seeding...' : '📥 Install Sample Enterprise Dairy Demo Data'}
                </button>
              )}

              {/* Reset Database Option (completely restricted/hidden for staff) */}
              {authContext.currentUser?.role !== 'staff' && (
                <button
                  onClick={handleResetClick}
                  className="w-full bg-red-400/10 dark:bg-red-955/20 hover:bg-red-400/20 transition p-3.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 font-extrabold text-xs text-center cursor-pointer block leading-relaxed font-sans shadow-sm"
                >
                  {isResetting ? 'Resetting App...' : '⚠️ Wipe / Reset All Databases Point Blank'}
                </button>
              )}
            </div>
          </SettingsAccordion>

          {/* Category 4: App Preferences */}
          <SettingsAccordion
            title="App Preferences"
            icon={SlidersHorizontal}
            description="Fully customize features, invoice structures, floating assistants, ledger settings, and display indicators."
          >
            {/* Bilingual App Language Row */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-sm flex items-center justify-between">
              <div className="text-left flex-1 pr-3">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block font-sans">App Language (भाषा)</span>
                <span className="text-xs text-slate-400 leading-relaxed block leading-relaxed font-sans">
                  {currentLanguage === 'hi' ? 'सक्रिय भाषा: हिंदी' : 'Active language: English'}
                </span>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full shadow-inner border border-slate-200/50 dark:border-slate-700/60 pointer-events-auto items-center">
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
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="text-left flex-1 pr-4">
                <span className="font-bold text-slate-805 dark:text-slate-200 text-sm block">Home QR Code</span>
                <span className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed block font-sans">Render merchant quick scan UPI QR onto the landing dashboard</span>
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
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="text-left flex-1 pr-4">
                <span className="font-bold text-slate-805 dark:text-slate-205 text-sm block">Barcode Scanner</span>
                <span className="text-[11px] text-slate-555 dark:text-slate-400 leading-relaxed block font-sans leading-relaxed">Leverage native device frame cameras for items scan inputs</span>
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
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Smart assistant inline switcher */}
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="text-left flex-1 pr-4">
                <span className="font-bold text-slate-850 dark:text-indigo-600 text-sm block">Smart Floating AI Assistant</span>
                <span className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed block leading-relaxed font-sans">
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
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 dark:after:border-slate-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Configuration screen triggers */}
            <div className="space-y-2 mt-4 font-sans max-w-4xl">
              <button
                onClick={() => setActiveView('preferences2')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-55 dark:hover:bg-slate-800/80 transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                    <SlidersHorizontal size={17} />
                  </div>
                  <div className="text-left flex-1 font-sans">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-sm">Sale & Purchase Settings</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed block text-slate-500">Item, tax rates, batch numbers, discount tables and parameters</span>
                  </div>
                </div>
                <span className="text-slate-400">&#10145;</span>
              </button>

              <button
                onClick={() => setActiveView('preferences')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-55 dark:hover:bg-slate-800/80 transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                    <SlidersHorizontal size={17} />
                  </div>
                  <div className="text-left flex-1 font-sans">
                    <span className="font-bold text-slate-800 dark:text-slate-202 block text-sm">Dashboard & General Preferences</span>
                    <span className="text-[11px] text-slate-505 dark:text-slate-455 leading-relaxed block text-slate-550">Configure quick links, home panels and help instructions</span>
                  </div>
                </div>
                <span className="text-slate-400">&#10145;</span>
              </button>
            </div>
          </SettingsAccordion>
        </div>

        {/* Footer info lockup */}
        <div className="flex items-center justify-center flex-col py-6 opacity-65 text-center">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2.5">
            <ShieldCheck size={24} className="text-slate-400 dark:text-slate-650" />
          </div>
          <p className="text-slate-700 dark:text-slate-350 font-bold text-sm select-auto">Eazy Billing App</p>
          <p className="text-slate-400 dark:text-slate-550 text-[10px] uppercase tracking-wider font-semibold font-sans">Version {APP_VERSION} • Secure Sandbox Container</p>
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
    </div>
  );
};