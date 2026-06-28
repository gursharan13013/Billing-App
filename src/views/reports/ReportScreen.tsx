import React, { useState, useEffect } from 'react';
import { 
  FileText, HandCoins, File, ScrollText, Undo2, Redo2, 
  Database, Share, Bell, Calendar, MoreVertical, Settings, 
  Info, Phone, QrCode, ArrowLeft, Book, Scale, TrendingUp, 
  Building2, Table, Factory, FileCog, Home, LayoutGrid, FileBarChart 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BillingService as billingService } from '../../services/SecureBillingService';
import { APP_VERSION } from '../../core/types/';
import { useAuth } from '../../context/AuthContext';

interface ReportScreenProps {
  onSwitchTab: (tab: 'dashboard' | 'master' | 'report') => void;
  onOpenSettings: () => void;
  onNotification?: () => void;
  onNavigate?: (screen: any, params?: any) => void;
  onBack?: () => void;
  initialView?: 'main' | 'accounting';
  language: any;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  hideFooter?: boolean;
}

export const ReportScreen: React.FC<ReportScreenProps> = ({ 
  onSwitchTab, onOpenSettings, onNavigate, initialView, onNotification, onBack,
  language, selectedDate, onDateChange, hideFooter
}) => {
  const { currentUser } = useAuth();
  const isStaff = currentUser?.role === 'staff';
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [view, setView] = useState<'main' | 'accounting'>(initialView || 'main');

  const isHi = language === 'hi';

  useEffect(() => {
    billingService.getCompanyProfile().then(setCompanyProfile).catch(console.error);
  }, []);

  useEffect(() => {
    setView(initialView || 'main');
  }, [initialView]);

  const datePickerValue = selectedDate.toLocalDateString();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onDateChange(Date.fromLocalDateString(e.target.value));
    }
  };

  const handleClick = (type: string) => {
    if (type === 'Accounting') {
      setView('accounting');
    } else if (type === 'Stock' && onNavigate) {
      onNavigate('stockSummary');
    } else if (type === 'GST' && onNavigate) {
      onNavigate('gstReport', { reportView: 'main' }); 
    } else if (type === 'Manufacturing' && onNavigate) {
      onNavigate('manufacturing');
    } else if (type === 'Mfg Report' && onNavigate) {
      onNavigate('manufacturingReport');
    } else if (['Sale', 'Purchase', 'Sale Return', 'Purchase Return'].includes(type) && onNavigate) {
      onNavigate('businessReport', { tab: type });
    } else if (type === 'More' && onNavigate) {
      onNavigate('reportOptions');
    }
  };

  // Dynamic Bilingual Localization Dictionary Data Object
  const t = {
    auditorConsole: isHi ? 'ऑडिटर कंसोल' : 'Auditor Console',
    accountingDesk: isHi ? 'एकाउंटिंग डेस्क' : 'Accounting Desk',
    accountingFinancials: isHi ? 'एकाउंटिंग और फाइनेंशियल्स' : 'Accounting & Financials',
    myBusiness: isHi ? 'मेरा व्यवसाय' : 'My Business',
    businessAuditsReports: isHi ? 'व्यापार ऑडिट और रिपोर्ट्स' : 'BUSINESS AUDITS & REPORTS',
    accountingBooksLedger: isHi ? 'एकाउंटिंग बुक्स और लेजर' : 'ACCOUNTING & FINANCIAL BOOKS',
    secureLedger: isHi ? 'सुरक्षित लेज़र' : 'SECURE LEDGER',
    setting: isHi ? 'सेटिंग्स' : 'Settings',
    aboutUs: isHi ? 'हेल्प और लीगल' : 'About Us',
    contactUs: isHi ? 'संपर्क करें' : 'Contact Us',
    qrCode: isHi ? 'क्यूआर कोड' : 'QR Code',
    restrictedMsg: isHi ? '🔒 प्रतिबंधित: केवल एडमिन ही लाभ और हानि देख सकते हैं।' : '🔒 Restricted: Only Admin can view Profit & Loss details.',
    home: isHi ? 'होम' : 'Home',
    master: isHi ? 'मास्टर' : 'Master',
    report: isHi ? 'रिपोर्ट' : 'Report'
  };

  // Main Report Menu
  const menuGrid = [
    { label: isHi ? 'एकाउंटिंग' : 'ACCOUNTING', icon: <FileText size={18} className="text-emerald-500" />, bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15', action: () => handleClick('Accounting') },
    { label: isHi ? 'जीएसटी रिपोर्ट्स' : 'GST REPORTS', icon: <HandCoins size={18} className="text-[#ea580c]" />, bgColor: 'bg-[#ea580c]/10 dark:bg-[#ea580c]/15', action: () => handleClick('GST') },
    { label: isHi ? 'खरीद रजिस्टर' : 'PURCHASE REG', icon: <File size={18} className="text-blue-500" />, bgColor: 'bg-blue-500/10 dark:bg-blue-500/15', action: () => handleClick('Purchase') },
    { label: isHi ? 'बिक्री रजिस्टर' : 'SALE REGISTER', icon: <ScrollText size={18} className="text-blue-500" />, bgColor: 'bg-blue-500/10 dark:bg-blue-500/15', action: () => handleClick('Sale') },
    { label: isHi ? 'खरीद रिटर्न' : 'PUR. RETURN', icon: <Undo2 size={18} className="text-violet-500" />, bgColor: 'bg-violet-500/10 dark:bg-violet-500/15', action: () => handleClick('Purchase Return') },
    { label: isHi ? 'बिक्री रिटर्न' : 'SALE RETURN', icon: <Redo2 size={18} className="text-violet-500" />, bgColor: 'bg-violet-500/10 dark:bg-violet-500/15', action: () => handleClick('Sale Return') },
    { label: isHi ? 'स्टॉक रिपोर्ट' : 'STOCK SUMMARY', icon: <Database size={18} className="text-indigo-500" />, bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/15', action: () => handleClick('Stock') },
    { label: isHi ? 'उत्पादन' : 'MANUFACTURING', icon: <Factory size={18} className="text-pink-500" />, bgColor: 'bg-pink-500/10 dark:bg-pink-500/15', action: () => handleClick('Manufacturing') },
    { label: isHi ? 'उत्पादन रिपोर्ट' : 'MFG REPORT', icon: <FileCog size={18} className="text-pink-500" />, bgColor: 'bg-pink-500/10 dark:bg-pink-500/15', action: () => handleClick('Mfg Report') },
    { label: isHi ? 'अधिक रिपोर्ट्स' : 'MORE REPORTS', icon: <Share size={18} className="text-slate-500" />, bgColor: 'bg-slate-500/10 dark:bg-slate-500/15', action: () => handleClick('More') },
  ];

  // Accounting Sub Menu
  const accountingMenu = [
    { label: isHi ? 'मास्टर डेटा तालिका' : 'MASTER DATA TABLE', icon: <Table size={18} className="text-slate-500" />, bgColor: 'bg-slate-500/10 dark:bg-slate-500/15', action: () => onNavigate && onNavigate('masterDataTable') },
    { label: isHi ? 'लेजर रिपोर्ट' : 'LEDGER REPORT', icon: <Book size={18} className="text-blue-500" />, bgColor: 'bg-blue-500/10 dark:bg-blue-500/15', action: () => onNavigate && onNavigate('ledgerReport') }, 
    { label: isHi ? 'जीएसटी रिपोर्ट' : 'GST REPORT', icon: <HandCoins size={18} className="text-[#ea580c]" />, bgColor: 'bg-[#ea580c]/10 dark:bg-[#ea580c]/15', action: () => onNavigate && onNavigate('gstReport', { reportView: 'accounting' }) },
    { label: isHi ? 'ट्रायल बैलेंस' : 'TRIAL BALANCE', icon: <Scale size={18} className="text-violet-500" />, bgColor: 'bg-violet-500/10 dark:bg-violet-500/15', action: () => onNavigate && onNavigate('financialReport', { reportType: 'TrialBalance' }) },
    { 
      label: isStaff 
        ? (isHi ? 'लाभ और हानि (🔒 प्रतिबंधित)' : 'PROFIT & LOSS (🔒 RESTRICTED)')
        : (isHi ? 'लाभ और हानि' : 'PROFIT & LOSS'), 
      icon: <TrendingUp size={18} className="text-emerald-500" />, 
      bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15', 
      action: () => {
        if (isStaff) {
          alert(t.restrictedMsg);
        } else {
          onNavigate && onNavigate('financialReport', { reportType: 'ProfitLoss' });
        }
      }
    },
    { label: isHi ? 'तुलन पत्र' : 'BALANCE SHEET', icon: <Building2 size={18} className="text-indigo-500" />, bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/15', action: () => onNavigate && onNavigate('financialReport', { reportType: 'BalanceSheet' }) },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-main)] overflow-hidden relative pb-[max(env(safe-area-inset-bottom),0px)]"
      onClick={() => isMenuOpen && setIsMenuOpen(false)}
    >
      {/* Dynamic Header */}
      <div className="p-5 pt-[max(env(safe-area-inset-top),36px)] bg-[var(--bg-card)] border-b border-[var(--border-ui)] pb-4 relative shrink-0 shadow-sm transition-colors">
        <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-2">
            {view === 'accounting' && (
              <button 
                onClick={() => {
                  if (onBack) {
                    onBack();
                  } else if (onNavigate) {
                    onNavigate('report', { reportView: undefined });
                  } else {
                    setView('main');
                  }
                }}
                className="p-1.5 rounded-full hover:bg-[var(--bg-app)] text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-500 font-mono">
                {view === 'accounting' ? t.accountingDesk : t.auditorConsole}
              </span>
              <h1 className="text-lg font-bold tracking-tight text-[var(--text-main)] line-clamp-1">
                {view === 'accounting' ? t.accountingFinancials : (companyProfile?.name || t.myBusiness)}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Notification Button */}
            <button onClick={onNotification} className="p-2 rounded-lg hover:bg-[var(--bg-app)] text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center relative active:scale-95">
              <Bell size={18} />
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
            </button>
            
            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className="p-2 rounded-lg hover:bg-[var(--bg-app)] text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 relative">
              <MoreVertical size={18} />
            </button>
            
            {/* Dropdown Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-16 right-5 w-48 bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-[var(--border-ui)] text-[var(--text-main)]"
                >
                  <button onClick={onOpenSettings} className="w-full text-left px-4 py-3 hover:bg-[var(--bg-app)] text-xs font-bold flex items-center gap-2"><Settings size={14}/> {t.setting}</button>
                  <button onClick={() => onNavigate && onNavigate('helpLegal' as any)} className="w-full text-left px-4 py-3 hover:bg-[var(--bg-app)] text-xs font-bold flex items-center gap-2"><Info size={14}/> {t.aboutUs}</button>
                  <button className="w-full text-left px-4 py-3 hover:bg-[var(--bg-app)] text-xs font-bold flex items-center gap-2"><Phone size={14}/> {t.contactUs}</button>
                  <button onClick={() => {
                    const next = localStorage.getItem('showDashboardQR') === 'false' ? 'true' : 'false';
                    localStorage.setItem('showDashboardQR', next);
                    window.dispatchEvent(new Event('storage'));
                  }} className="w-full text-left px-4 py-3 hover:bg-[var(--bg-app)] text-xs font-bold flex items-center gap-2"><QrCode size={14}/> {t.qrCode}</button>
                  <div className="px-4 py-2.5 text-[10px] text-center text-slate-400 dark:text-slate-500 font-bold bg-[var(--bg-app)]">
                    v{APP_VERSION}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 bg-[var(--bg-app)] border border-[var(--border-ui)] px-3 py-1.5 rounded-full w-fit">
          <Calendar size={13} className="text-teal-600 dark:text-teal-400" />
          <input 
            type="date" 
            value={datePickerValue} 
            onChange={handleDateChange} 
            className="bg-transparent text-[var(--text-secondary)] text-xs font-bold outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
      </div>

      {/* Main Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4 relative flex flex-col w-full max-w-6xl mx-auto custom-scrollbar">
        <div className="w-full space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#ea580c] px-1 flex items-center justify-between">
            <span>
              {view === 'accounting' ? t.accountingBooksLedger : t.businessAuditsReports}
            </span>
            {view === 'accounting' && (
              <span className="text-[9px] bg-[var(--brand-light)] text-[var(--brand-primary)] font-bold px-2.5 py-0.5 rounded-full border border-[var(--brand-primary)]/10">
                {t.secureLedger}
              </span>
            )}
          </div>

          {/* Premium Grid Menu - Styling inspired by Customer List & Tax Master layouts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {(view === 'accounting' ? accountingMenu : menuGrid).map((item, index) => (
              <button 
                key={index} 
                onClick={item.action}
                type="button"
                className="flex items-center gap-4 bg-[var(--bg-card)] hover:bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl p-4 shadow-sm text-[var(--text-main)] active:scale-[0.99] hover:scale-[1.01] transition-all duration-200 text-left w-full"
              >
                {/* Visual Initial Emblem box flanking left */}
                <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center shrink-0`}>
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold tracking-tight uppercase block text-[var(--text-main)]">
                    {item.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Tab Navigation */}
      {!hideFooter && (
        <footer className="bg-[var(--bg-card)] border-t border-[var(--border-ui)] shrink-0 z-40 pt-2 pb-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div className="max-w-5xl mx-auto w-full flex items-center justify-between px-8">
            <button onClick={() => onSwitchTab('dashboard')} className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-[var(--text-main)] min-w-[44px]">
              <Home size={22} />
              <span className="text-[10px] font-bold">{t.home}</span>
            </button>
            <button onClick={() => onSwitchTab('master')} className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-[var(--text-main)] min-w-[44px]">
              <LayoutGrid size={22} />
              <span className="text-[10px] font-bold">{t.master}</span>
            </button>
            <button className="flex flex-col items-center gap-0.5 text-[var(--brand-primary)] min-w-[44px]">
              <FileBarChart size={22} fill="currentColor" />
              <span className="text-[10px] font-bold">{t.report}</span>
            </button>
          </div>
        </footer>
      )}
    </motion.div>
  );
};
