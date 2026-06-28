
import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, RotateCcw, Banknote, Download, MessageSquare, 
  Edit, Users, BookOpen, Home, LayoutGrid, FileBarChart, 
  Bell, Calendar, MoreVertical, QrCode, ScanLine, 
  Settings, Info, Phone, ArrowRightLeft, Factory, LogOut, Sparkles, ClipboardPaste, X, ArrowLeft, Search
} from 'lucide-react';
import { TransactionType, Language, CompanyProfile, Party, APP_VERSION, AppSettings } from '../../core/types/';
import { BillingService as billingService } from '../../services/SecureBillingService';
import { InventoryService } from '../../services/inventoryService';
import { Html5Qrcode } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { DraggableFAB } from '../../components/shared/DraggableFAB';
import { AIAssistant } from '../../components/features/AIAssistant';


import { HeroGraphic } from '../../components/shared/HeroGraphic';
import { firebaseAuthError, signInWithGoogle } from '../../services/firebaseService';
import { AlertTriangle, ExternalLink, LogIn, Cloud, CloudOff } from 'lucide-react';
import { SyncStatusIcon } from '../../components/shared/SyncStatusIcon';
import { PullToRefresh } from '../../components/layout/PullToRefresh';

interface DashboardScreenProps {
  onNavigate: (type: TransactionType | string, party?: Party, prefilledItems?: any[], invoiceId?: string) => void;
  onSwitchTab: (tab: 'dashboard' | 'master' | 'report') => void;
  onOpenSettings: () => void;
  onNotification?: () => void; // NEW PROP
  onChat: () => void;
  onJournal?: () => void;
  onAttendance?: () => void;
  onContra?: () => void;
  language: Language;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  hideFooter?: boolean;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ 
    onNavigate, onSwitchTab, onOpenSettings, onNotification, onChat, onJournal, onAttendance, onContra, language,
    selectedDate, onDateChange, hideFooter
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  
  // Fintech Dashboard Metrics State
  const [totalSales, setTotalSales] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScannerRunning = useRef(false);

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  // Menu Category Filter State
  const [menuFilter, setMenuFilter] = useState<'all' | 'bills' | 'cash' | 'misc'>('all');

  useEffect(() => {
    const loadProfile = async () => {
        const data = await billingService.getCompanyProfile();
        setProfile(data);
    };
    const loadSettings = async () => {
        const settings = await billingService.getAppSettings();
        setAppSettings(settings);
    };
    const loadMetrics = async () => {
        try {
            const sales = await billingService.getInvoices('Sale');
            const receipts = await billingService.getAllPayments('Receipt');
            const sumSales = sales.reduce((sum, inv) => sum + inv.totalAmount, 0);
            const sumPending = sales.reduce((sum, inv) => {
                const linked = receipts.filter(p => p.invoiceId === inv.id);
                const paid = linked.reduce((pSum, p) => pSum + p.amount, 0);
                const bal = inv.totalAmount - paid;
                return sum + (bal > 0 ? bal : 0);
            }, 0);
            setTotalSales(sumSales);
            setPendingBalance(sumPending);
        } catch (e) {
            console.warn("Error loading fintech dashboard metrics:", e);
        }
    };
    loadProfile();
    loadSettings();
    loadMetrics();

    const handleSettingsChanged = () => { loadSettings(); loadMetrics(); };
    window.addEventListener('appSettingsChanged', handleSettingsChanged);
    return () => window.removeEventListener('appSettingsChanged', handleSettingsChanged);
  }, []);

  const handleRefresh = async () => {
    try {
        const [prof, setts, sales, receipts] = await Promise.all([
            billingService.getCompanyProfile(),
            billingService.getAppSettings(),
            billingService.getInvoices('Sale'),
            billingService.getAllPayments('Receipt'),
        ]);
        setProfile(prof);
        setAppSettings(setts);
        const sumSales = sales.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const sumPending = sales.reduce((sum, inv) => {
            const linked = receipts.filter(p => p.invoiceId === inv.id);
            const paid = linked.reduce((pSum, p) => pSum + p.amount, 0);
            const bal = inv.totalAmount - paid;
            return sum + (bal > 0 ? bal : 0);
        }, 0);
        setTotalSales(sumSales);
        setPendingBalance(sumPending);
        
        // Let other listeners know that metrics refreshed
        window.dispatchEvent(new Event('appSettingsChanged'));
    } catch (e) {
        console.warn("Failed to refresh dashboard:", e);
    }
  };

  useEffect(() => {
      return () => {
          if (scannerRef.current) {
              if (isScannerRunning.current) {
                  scannerRef.current.stop().catch(() => {}).finally(() => { try { scannerRef.current?.clear(); } catch(e) {} });
              } else {
                  try { scannerRef.current.clear(); } catch(e) {}
              }
          }
      };
  }, []);

  const formattedDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(selectedDate);
  const datePickerValue = selectedDate.toLocalDateString();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onDateChange(Date.fromLocalDateString(e.target.value));
    }
  };

  // --- Scanner Functions ---
  const startScanner = async () => {
      if (Capacitor.isNativePlatform()) {
          try {
              const status = await Camera.requestPermissions();
              if (status.camera === 'denied' || status.camera === 'prompt-with-rationale') {
                  alert("Please grant Camera permission to use the scanner.");
                  return;
              }
          } catch (e) {
              console.warn("Camera permission request failed", e);
          }
      }

      setIsScanning(true);
      setTimeout(async () => {
          const elementId = "client-reader";
          if (!document.getElementById(elementId)) {
              setIsScanning(false);
              return;
          }
          if (scannerRef.current) {
              try { if (isScannerRunning.current) await scannerRef.current.stop(); await scannerRef.current.clear(); } catch(e) {}
              scannerRef.current = null;
              isScannerRunning.current = false;
          }
          const html5QrCode = new Html5Qrcode(elementId);
          scannerRef.current = html5QrCode;
          try {
              await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, 
                  (decodedText) => handleScanSuccess(decodedText), () => {});
              isScannerRunning.current = true;
          } catch (err: any) {
              setIsScanning(false);
              alert("Camera error: " + err.message);
          }
      }, 300);
  };

  const stopScanner = () => {
      if (scannerRef.current && isScannerRunning.current) {
          scannerRef.current.stop().then(() => {
              isScannerRunning.current = false;
              try { scannerRef.current?.clear(); } catch(e) {}
              setIsScanning(false);
              scannerRef.current = null;
          }).catch(() => setIsScanning(false));
      } else {
          setIsScanning(false);
      }
  };

  const handleScanSuccess = async (text: string) => {
      stopScanner();
      const cleanMobile = text.replace(/[^0-9]/g, ''); 
      if (!cleanMobile) { alert("Invalid QR"); return; }
      const party = await billingService.getPartyByMobile(cleanMobile);
      if (party) onNavigate('Purchase Order', party);
      else alert("Client Not Found");
  };

  // --- Import Function ---
  const handleImportPaste = async () => {
      if (!pasteContent) return;
      setImportLoading(true);
      try {
          const startMarker = "---QUICKBILL_DATA_START---";
          const endMarker = "---QUICKBILL_DATA_END---";
          const startIndex = pasteContent.indexOf(startMarker);
          const endIndex = pasteContent.indexOf(endMarker);
          
          let jsonString = "";
          if (startIndex !== -1 && endIndex !== -1) {
             jsonString = pasteContent.substring(startIndex + startMarker.length, endIndex).trim();
          } else {
             // Try parsing raw JSON if marker not found
             jsonString = pasteContent.trim();
          }

          // FIX: result is now an object { id, type }, not just a string
          const result = await billingService.importTransaction(jsonString);
          
          setImportLoading(false);
          setShowImportModal(false);
          setPasteContent('');
          alert(`Success! Imported as ${result.type}.`);
          
          // Navigate based on the returned type
          onNavigate(result.type, undefined, undefined, result.id);
          
      } catch (error: any) {
          setImportLoading(false);
          alert(`Import Failed: ${error.message}. Please paste valid transaction data.`);
      }
  };

  // Labels
  const labels = {
    en: {
      purchaseBill: 'Purchase Bill', saleBill: 'Sale Bill', purchaseReturn: 'Purchase Return', saleReturn: 'Sale Return',
      payment: 'Payment', receipt: 'Receipt', chat: 'Chat', order: 'Order',
      journal: 'Journal Entry', contra: 'Contra', attendance: 'Attendance', manufacturing: 'Manufacturing',
      categorySearch: 'Category Search',
      setting: 'Settings', aboutUs: 'About Us', contactUs: 'Contact Us', qrCode: 'QR Code'
    },
    hi: {
      purchaseBill: 'परचेज़ बिल', saleBill: 'सेल बिल', purchaseReturn: 'परचेज़ रिटर्न', saleReturn: 'सेल रिटर्न',
      payment: 'भुगतान', receipt: 'रसीद', chat: 'चैट', order: 'ऑर्डर',
      journal: 'जर्नल एंट्री', contra: 'कॉन्ट्रा', attendance: 'उपस्थिति', manufacturing: 'मैन्युफैक्चरिंग',
      categorySearch: 'दुकानें खोजें',
      setting: 'सेटिंग्स', aboutUs: 'हेल्प और लीगल', contactUs: 'संपर्क करें', qrCode: 'क्यूआर कोड'
    }
  };
  const t = labels[language] || labels['en'];

  // Menu Items Config with custom pastel colors & category identifiers
  const menuItems = [
    { label: t.saleBill, icon: <FileText size={18} className="text-emerald-500 dark:text-emerald-400" />, action: () => onNavigate('Sale'), bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15', category: 'bills' },
    { label: t.purchaseBill, icon: <FileText size={18} className="text-blue-500 dark:text-blue-400" />, action: () => onNavigate('Purchase'), bgColor: 'bg-blue-500/10 dark:bg-blue-500/15', category: 'bills' },
    { label: t.saleReturn, icon: <RotateCcw size={18} className="text-rose-500 dark:text-rose-400 scale-x-[-1]" />, action: () => onNavigate('Sale Return'), bgColor: 'bg-rose-500/10 dark:bg-rose-500/15', category: 'bills' },
    { label: t.purchaseReturn, icon: <RotateCcw size={18} className="text-yellow-600 dark:text-yellow-400" />, action: () => onNavigate('Purchase Return'), bgColor: 'bg-yellow-500/10 dark:bg-yellow-500/15', category: 'bills' },
    { label: t.order, icon: <Edit size={18} className="text-indigo-500 dark:text-indigo-400" />, action: () => onNavigate('Sale Order'), bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/15', category: 'bills' },

    { label: t.payment, icon: <Banknote size={18} className="text-red-500 dark:text-red-400" />, action: () => onNavigate('Payment'), bgColor: 'bg-red-500/10 dark:bg-red-500/15', category: 'cash' },
    { label: t.receipt, icon: <Download size={18} className="text-emerald-500 dark:text-emerald-400" />, action: () => onNavigate('Receipt'), bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15', category: 'cash' },
    { label: t.contra, icon: <ArrowRightLeft size={18} className="text-orange-500 dark:text-orange-400" />, action: onContra || (() => onNavigate('Contra')), bgColor: 'bg-orange-500/10 dark:bg-orange-500/15', category: 'cash' },
    { label: t.journal, icon: <BookOpen size={18} className="text-slate-500 dark:text-slate-400" />, action: onJournal || (() => onNavigate('Journal')), bgColor: 'bg-slate-500/10 dark:bg-slate-500/15', category: 'cash' },

    { label: t.chat, icon: <MessageSquare size={18} className="text-purple-500 dark:text-purple-400" />, action: onChat || (() => onNavigate('chatList' as any)), bgColor: 'bg-purple-500/10 dark:bg-purple-500/15', category: 'misc' },
    { label: t.attendance, icon: <Users size={18} className="text-pink-500 dark:text-pink-400" />, action: onAttendance || (() => onNavigate('Attendance')), bgColor: 'bg-pink-500/10 dark:bg-pink-500/15', category: 'misc' },
    { label: t.categorySearch, icon: <Search size={18} className="text-sky-500 dark:text-sky-400" />, action: () => onNavigate('nearbyShops' as any), bgColor: 'bg-sky-500/10 dark:bg-sky-500/15', category: 'misc' },
  ];

  // QR Code (No longer needs url generation here)
  const qrData = profile?.mobile || 'No Number';

  const filteredMenuItems = menuItems.filter(item => menuFilter === 'all' || item.category === menuFilter);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden relative pb-[max(env(safe-area-inset-bottom),0px)]" onClick={() => isMenuOpen && setIsMenuOpen(false)}>
      
      {/* Header Section Redesigned for Premium Slate/Theme Look */}
      <div className="p-5 pt-[max(env(safe-area-inset-top),36px)] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white pb-4 relative shrink-0 shadow-sm dark:shadow-lg">
          <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
              <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400 font-mono">Workspace App</span>
                  <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white line-clamp-1">{profile?.name || 'My Business'}</h1>
              </div>

              <div className="flex items-center gap-1">
                  <SyncStatusIcon />
                  <button 
                    onClick={() => setShowImportModal(true)} 
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    title="Import Transaction"
                  >
                      <ClipboardPaste size={16} />
                  </button>
                  <button 
                    onClick={() => onNavigate('ledgerReport')}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    title="Ledger Report"
                  >
                      <BookOpen size={16} />
                  </button>
                  {/* NOTIFICATION BUTTON */}
                  <button onClick={onNotification} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors relative">
                      <Bell size={16} />
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors relative">
                      <MoreVertical size={16} />
                  </button>
                  
                  {/* Dropdown Menu Overlay */}
                  {isMenuOpen && (
                    <div className="absolute top-16 right-5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-white">
                        <button onClick={onOpenSettings} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2"><Settings size={14}/> {t.setting || 'Settings'}</button>
                        <button onClick={() => onNavigate('helpLegal')} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2"><Info size={14}/> {t.aboutUs || 'About Us'}</button>
                        <button className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2"><Phone size={14}/> {t.contactUs || 'Contact Us'}</button>
                        <button onClick={() => {
                            const next = localStorage.getItem('showDashboardQR') === 'false' ? 'true' : 'false';
                            localStorage.setItem('showDashboardQR', next);
                            window.dispatchEvent(new Event('storage'));
                        }} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2"><QrCode size={14}/> {t.qrCode || 'QR Code'}</button>
                        <div className="px-4 py-2.5 text-[10px] text-center text-slate-400 dark:text-slate-500 font-bold bg-slate-50 dark:bg-slate-950/40">
                            v{APP_VERSION}
                        </div>
                    </div>
                  )}
              </div>
          </div>

          <div className="mt-3 flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 px-3 py-1.5 rounded-full w-fit">
              <Calendar size={13} className="text-teal-600 dark:text-teal-400" />
              <input 
                  type="date" 
                  value={datePickerValue} 
                  onChange={handleDateChange} 
                  className="bg-transparent text-slate-700 dark:text-slate-200 text-xs font-bold outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
              />
          </div>
      </div>

      {/* Main Scroll Area */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="px-4 pb-6 pt-4 relative flex flex-col w-full max-w-6xl mx-auto">
          
          {/* Responsive Layout representing modern Billing Software layout */}
          <div className="w-full">
              
              {/* Active Operations Desk & Action Shortcuts */}
              <div className="flex flex-col gap-4">
                  
                  {/* Firebase Setup Warning */}
                  {firebaseAuthError && (
                    <div className="p-3.5 bg-red-500/10 dark:bg-red-500/5 border border-red-500/20 rounded-xl animate-in slide-in-from-top duration-500">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-[11px] font-extrabold text-red-600 dark:text-red-400">Cloud Sync: Setup Needed</p>
                                <p className="text-[10px] text-red-600/90 dark:text-red-400/80 leading-relaxed mt-0.5">
                                    {firebaseAuthError.includes('admin-restricted-operation') || firebaseAuthError.includes('operation-not-allowed') 
                                        ? "Anonymous login is disabled. Please enable it in Firebase Console or use Google Login below."
                                        : `Authentication failed: ${firebaseAuthError}. Please login manually.`
                                    }
                                </p>
                                <div className="flex items-center gap-4 mt-2">
                                    <button 
                                        onClick={async () => {
                                            try {
                                                await signInWithGoogle();
                                                window.location.reload();
                                            } catch(e: any) {
                                                alert(e.message);
                                            }
                                        }}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-red-600 text-[10px] text-white font-extrabold rounded-lg hover:bg-red-700 active:scale-95 transition-all shadow-sm"
                                    >
                                        <LogIn size={10} /> Login with Google
                                    </button>
                                    <a 
                                        href="https://console.firebase.google.com/" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        Open Console <ExternalLink size={10} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                  )}

                  {/* Category Filter Pills segment */}
                  <div className="flex items-center gap-1.5 my-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-1.5 rounded-xl shrink-0 shadow-xs">
                      <button 
                        type="button"
                        onClick={() => setMenuFilter('all')}
                        className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-lg transition-all ${
                          menuFilter === 'all' 
                            ? 'bg-[#1e293b] text-white dark:bg-slate-800 dark:text-white shadow-xs' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {language === 'hi' ? 'सभी' : 'All'}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setMenuFilter('bills')}
                        className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-lg transition-all ${
                          menuFilter === 'bills' 
                            ? 'bg-[#1e293b] text-white dark:bg-slate-800 dark:text-white shadow-xs' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {language === 'hi' ? 'बिल' : 'Bills'}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setMenuFilter('cash')}
                        className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-lg transition-all ${
                          menuFilter === 'cash' 
                            ? 'bg-[#1e293b] text-white dark:bg-slate-800 dark:text-white shadow-xs' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {language === 'hi' ? 'लेजर' : 'Ledger'}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setMenuFilter('misc')}
                        className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-lg transition-all ${
                          menuFilter === 'misc' 
                            ? 'bg-[#1e293b] text-white dark:bg-slate-800 dark:text-white shadow-xs' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {language === 'hi' ? 'टूल' : 'Tools'}
                      </button>
                  </div>

                  {/* Custom relative container for grid menu and its aligned floating buttons */}
                  <div className="relative">
                      {/* Premium Grid Menu with Categorized filters */}
                      <div className="grid grid-cols-2 gap-3 mb-2">
                          {filteredMenuItems.map((item, index) => {
                              const isSaleBill = item.label === t.saleBill;
                              return (
                                  <button 
                                    key={index} 
                                    onClick={() => { if (item.action) item.action(); }}
                                    type="button"
                                    className={`flex items-center gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-850 rounded-xl p-3.5 shadow-xs text-slate-800 dark:text-slate-200 active:scale-[0.98] transition-all duration-150 text-left w-full h-[62px] cursor-pointer ${
                                        isSaleBill ? 'ring-2 ring-emerald-500/30 dark:ring-emerald-400/20 bg-emerald-50/20 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30' : ''
                                    }`}
                                  >
                                      <div className={`p-2.5 rounded-xl shrink-0 ${item.bgColor} flex items-center justify-center`}>
                                          {item.icon}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <span className={`text-xs md:text-sm font-extrabold tracking-tight leading-none uppercase font-sans select-none block ${
                                            isSaleBill ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'
                                        }`}>
                                          {item.label}
                                        </span>
                                      </div>
                                      {isSaleBill && (
                                          <span className="bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider scale-90 self-center">
                                              FAST
                                          </span>
                                      )}
                                  </button>
                              );
                          })}
                      </div>

                      {/* Floating Buttons (Draggable - positioned relative to Grid wrapper for perfect alignment) */}
                      {localStorage.getItem('showBarcodeScanner') !== 'false' && (
                          <DraggableFAB
                            id="scanner_btn"
                            defaultPosition={(w, h) => {
                              // Circle 1: Centered horizontally, vertically aligned with middle of Row 2 ("Sale Return / Purchase Return")
                              // Row 2 center inside grid is at y = 101px (with height 62px and 12px gap), so top = 101 - 28 = 73px.
                              return { x: w / 2 - 28, y: 73 };
                            }}
                            persistPosition={false}
                            onClick={startScanner}
                          >
                              <div className="w-14 h-14 bg-rose-600 border-4 border-white dark:border-slate-800 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform pointer-events-auto">
                                  <ScanLine size={24} className="text-white" />
                              </div>
                          </DraggableFAB>
                      )}

                      {/* AI Assistant Component handles its button and layout relative to Grid wrapper */}
                      {localStorage.getItem('showSmartAssistant') !== 'false' && (
                          <AIAssistant 
                            onNavigate={onNavigate} 
                            defaultPosition={(w, h) => {
                              // Circle 2: Centered horizontally, vertically aligned with middle of Row 4 ("Receipt / Contra")
                              // Row 4 center inside grid is at y = 249px, so top = 249 - 28 = 221px.
                              return { x: w / 2 - 28, y: 221 };
                            }}
                            persistPosition={false}
                            language={language}
                          />
                      )}
                  </div>
              </div>

          </div>

        </div>
      </PullToRefresh>

      {/* Bottom Navigation */}
      {!hideFooter && (
        <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shrink-0 z-40 pt-2 pb-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <div className="max-w-5xl mx-auto w-full flex items-center justify-between px-8">
                <button className="flex flex-col items-center gap-0.5 text-[#1e293b] dark:text-white">
                    <Home size={22} fill="currentColor" />
                    <span className="text-[10px] font-bold">Home</span>
                </button>
                <button onClick={() => onSwitchTab('master')} className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-[#1e293b] dark:hover:text-white">
                    <LayoutGrid size={22} />
                    <span className="text-[10px] font-bold">Master</span>
                </button>
                <button onClick={() => onSwitchTab('report')} className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-[#1e293b] dark:hover:text-white">
                    <FileBarChart size={22} />
                    <span className="text-[10px] font-bold">Report</span>
                </button>
            </div>
        </footer>
      )}

      {/* Scanner Overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center pb-[max(env(safe-area-inset-bottom),0px)]">
            <button onClick={stopScanner} className="absolute top-6 left-6 z-[70] p-3 bg-white/20 backdrop-blur-md rounded-full text-white"><ArrowLeft size={24} /></button>
            <div id="client-reader" className="w-full max-w-sm h-full max-h-[60vh] bg-black"></div>
            <p className="text-white mt-4 font-bold">Scanning...</p>
            <button onClick={stopScanner} className="mt-6 bg-white text-black px-8 py-3 rounded-full font-bold">Cancel</button>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-6 relative border border-gray-200 dark:border-slate-700">
                  <button onClick={() => setShowImportModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"><X size={24} /></button>
                  <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">Import Transaction</h3>
                  <p className="text-xs text-slate-500 mb-3">Paste the text/JSON copied from a bill shared via WhatsApp.</p>
                  <textarea 
                    className="w-full h-40 border border-gray-300 dark:border-slate-600 rounded-lg p-3 mb-4 text-black dark:text-white dark:bg-slate-800 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                    placeholder="Paste here..." 
                    value={pasteContent} 
                    onChange={e => setPasteContent(e.target.value)} 
                  />
                  <button 
                    onClick={handleImportPaste} 
                    disabled={importLoading || !pasteContent} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      {importLoading ? 'Processing...' : 'Import Data'}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
