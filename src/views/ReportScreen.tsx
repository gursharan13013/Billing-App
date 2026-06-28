import React, { useState, useEffect } from 'react';
import { 
  FileText, HandCoins, File, ScrollText, Undo2, Redo2, 
  Database, Share, Bell, Calendar, MoreVertical, Settings, 
  Info, Phone, QrCode, ArrowLeft, Book, Scale, TrendingUp, 
  Building2, Table, Factory, FileCog, Home, LayoutGrid, FileBarChart 
} from 'lucide-react';
import { motion } from 'motion/react';
import { BillingService as billingService } from '../services/SecureBillingService';
import { InventoryService } from '../services/inventoryService';
import { APP_VERSION } from '../core/types/';
import { HeroGraphic } from '../components/shared/HeroGraphic';

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
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [view, setView] = useState<'main' | 'accounting'>(initialView || 'main');

  // Real financial metrics for the modern Bento sidebar HUD
  const [totalSales, setTotalSales] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [saleCount, setSaleCount] = useState(0);
  const [purchaseCount, setPurchaseCount] = useState(0);

  useEffect(() => {
    billingService.getCompanyProfile().then(setCompanyProfile).catch(console.error);

    const loadStats = async () => {
      try {
        const sales = await billingService.getInvoices('Sale');
        const purchases = await billingService.getInvoices('Purchase');
        
        const salesSum = sales.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const purchaseSum = purchases.reduce((sum, inv) => sum + inv.totalAmount, 0);
        
        setTotalSales(salesSum);
        setTotalPurchases(purchaseSum);
        setSaleCount(sales.length);
        setPurchaseCount(purchases.length);
      } catch (e) {
        console.warn("Error loading Report HUD stats:", e);
      }
    };
    
    loadStats();
  }, []);

  useEffect(() => {
    setView(initialView || 'main');
  }, [initialView]);

  const formattedDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(selectedDate);
  const datePickerValue = selectedDate.toLocalDateString();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onDateChange(Date.fromLocalDateString(e.target.value));
    }
  };

  const handleClick = (type: string) => {
    if (type === 'Accounting') {
      if (onNavigate) {
        onNavigate('report', { reportView: 'accounting' });
      } else {
        setView('accounting');
      }
    } else if (type === 'Stock' && onNavigate) {
      onNavigate('stockSummary');
    } else if (type === 'GST' && onNavigate) {
      onNavigate('gstReport', { reportView: 'main' }); 
    } else if (type === 'Manufacturing' && onNavigate) {
      onNavigate('manufacturing');
    } else if (type === 'Mfg Report' && onNavigate) {
      onNavigate('manufacturingReport');
    } else if (['Sale', 'Purchase', 'Sale Return', 'Purchase Return'].includes(type) && onNavigate) {
      onNavigate('reportOptions', { type: type });
    } else {
      if (type !== 'Stock' && type !== 'GST' && type !== 'Accounting' && type !== 'Manufacturing' && type !== 'Mfg Report') console.log(`Opening ${type} Report...`);
    }
  };

  // Main Report Menu
  const menuGrid = [
    { label: language === 'hi' ? 'एकाउंटिंग बुक्स' : 'Accounting', icon: <FileText size={18} className="text-emerald-500" />, bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15', action: () => handleClick('Accounting') },
    { label: language === 'hi' ? 'जीएसटी रिपोर्ट्स' : 'GST Reports', icon: <HandCoins size={18} className="text-[#ea580c]" />, bgColor: 'bg-[#ea580c]/10 dark:bg-[#ea580c]/15', action: () => handleClick('GST') },
    { label: language === 'hi' ? 'खरीद रजिस्टर' : 'Purchase Reg', icon: <File size={18} className="text-blue-500" />, bgColor: 'bg-blue-500/10 dark:bg-blue-500/15', action: () => handleClick('Purchase') },
    { label: language === 'hi' ? 'बिक्री रजिस्टर' : 'Sale Register', icon: <ScrollText size={18} className="text-blue-500" />, bgColor: 'bg-blue-500/10 dark:bg-blue-500/15', action: () => handleClick('Sale') },
    { label: language === 'hi' ? 'खरीद रिटर्न' : 'Pur. Return', icon: <Undo2 size={18} className="text-violet-500" />, bgColor: 'bg-violet-500/10 dark:bg-violet-500/15', action: () => handleClick('Purchase Return') },
    { label: language === 'hi' ? 'बिक्री रिटर्न' : 'Sale Return', icon: <Redo2 size={18} className="text-violet-500" />, bgColor: 'bg-violet-500/10 dark:bg-violet-500/15', action: () => handleClick('Sale Return') },
    { label: language === 'hi' ? 'स्टॉक रिपोर्ट' : 'Stock Summary', icon: <Database size={18} className="text-indigo-500" />, bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/15', action: () => handleClick('Stock') },
    { label: language === 'hi' ? 'उत्पादन' : 'Manufacturing', icon: <Factory size={18} className="text-pink-500" />, bgColor: 'bg-pink-500/10 dark:bg-pink-500/15', action: () => handleClick('Manufacturing') },
    { label: language === 'hi' ? 'उत्पादन रिपोर्ट' : 'Mfg Report', icon: <FileCog size={18} className="text-pink-500" />, bgColor: 'bg-pink-500/10 dark:bg-pink-500/15', action: () => handleClick('Mfg Report') },
    { label: language === 'hi' ? 'अधिक रिपोर्ट्स' : 'More Reports', icon: <Share size={18} className="text-slate-500" />, bgColor: 'bg-slate-500/10 dark:bg-slate-500/15', action: () => alert('More Reports Coming Soon') },
  ];

  // Accounting Sub Menu
  const accountingMenu = [
    { label: language === 'hi' ? 'मास्टर डेटा तालिका' : 'Master Data Table', icon: <Table size={18} className="text-slate-500" />, bgColor: 'bg-slate-500/10 dark:bg-slate-500/15', action: () => onNavigate && onNavigate('masterDataTable') },
    { label: language === 'hi' ? 'लेजर रिपोर्ट' : 'Ledger Report', icon: <Book size={18} className="text-blue-500" />, bgColor: 'bg-blue-500/10 dark:bg-blue-500/15', action: () => onNavigate && onNavigate('ledgerReport') }, 
    { label: language === 'hi' ? 'जीएसटी रिपोर्ट' : 'GST Report', icon: <HandCoins size={18} className="text-[#ea580c]" />, bgColor: 'bg-[#ea580c]/10 dark:bg-[#ea580c]/15', action: () => onNavigate && onNavigate('gstReport', { reportView: 'accounting' }) },
    { label: language === 'hi' ? 'ट्रायल बैलेंस' : 'Trial Balance', icon: <Scale size={18} className="text-violet-500" />, bgColor: 'bg-violet-500/10 dark:bg-violet-500/15', action: () => onNavigate && onNavigate('financialReport', { reportType: 'TrialBalance' }) },
    { label: language === 'hi' ? 'लाभ और हानि' : 'Profit & Loss', icon: <TrendingUp size={18} className="text-emerald-500" />, bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15', action: () => onNavigate && onNavigate('financialReport', { reportType: 'ProfitLoss' }) },
    { label: language === 'hi' ? 'तुलन पत्र' : 'Balance Sheet', icon: <Building2 size={18} className="text-indigo-500" />, bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/15', action: () => onNavigate && onNavigate('financialReport', { reportType: 'BalanceSheet' }) },
  ];

  const labels = {
    en: {
      setting: 'Settings', aboutUs: 'About Us', contactUs: 'Contact Us', qrCode: 'QR Code'
    },
    hi: {
      setting: 'सेटिंग्स', aboutUs: 'हेल्प और लीगल', contactUs: 'संपर्क करें', qrCode: 'क्यूआर कोड'
    }
  };
  const t = labels[language] || labels['en'];

  return (
    <div 
      className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden relative pb-[max(env(safe-area-inset-bottom),0px)]" 
      onClick={() => isMenuOpen && setIsMenuOpen(false)}
    >
      
      {/* Dynamic Header syncing exactly with DashBoard Screen and Master Screen */}
      <div className="p-5 pt-[max(env(safe-area-inset-top),36px)] bg-slate-900 border-b border-slate-800 text-white pb-4 relative shrink-0 shadow-lg">
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
                        className="p-1.5 rounded-lg bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors mr-1"
                      >
                          <ArrowLeft size={16} />
                      </button>
                  )}
                  <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-400 font-mono">
                          {view === 'accounting' ? 'Accounting Desk' : 'Auditor Console'}
                      </span>
                      <h1 className="text-lg font-extrabold tracking-tight text-white line-clamp-1">
                          {view === 'accounting' ? 'Accounting & Financials' : (companyProfile?.name || 'My Business')}
                      </h1>
                  </div>
              </div>

              <div className="flex items-center gap-1">
                  {/* NOTIFICATION BUTTON */}
                  <button onClick={onNotification} className="p-1.5 rounded-lg bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors relative">
                      <Bell size={16} />
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className="p-1.5 rounded-lg bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors relative">
                      <MoreVertical size={16} />
                  </button>
                  
                  {/* Dropdown Menu Overlay */}
                  {isMenuOpen && (
                    <div className="absolute top-16 right-5 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/60 text-white">
                        <button onClick={onOpenSettings} className="w-full text-left px-4 py-3 hover:bg-slate-800 text-xs font-bold flex items-center gap-2"><Settings size={14}/> {t.setting || 'Settings'}</button>
                        <button onClick={() => onNavigate && onNavigate('helpLegal' as any)} className="w-full text-left px-4 py-3 hover:bg-slate-800 text-xs font-bold flex items-center gap-2"><Info size={14}/> {t.aboutUs || 'About Us'}</button>
                        <button className="w-full text-left px-4 py-3 hover:bg-slate-800 text-xs font-bold flex items-center gap-2"><Phone size={14}/> {t.contactUs || 'Contact Us'}</button>
                        <button onClick={() => {
                            const next = localStorage.getItem('showDashboardQR') === 'false' ? 'true' : 'false';
                            localStorage.setItem('showDashboardQR', next);
                            window.dispatchEvent(new Event('storage'));
                        }} className="w-full text-left px-4 py-3 hover:bg-slate-800 text-xs font-bold flex items-center gap-2"><QrCode size={14}/> {language === 'hi' ? 'क्यूआर कोड' : 'QR Code'}</button>
                        <div className="px-4 py-2.5 text-[10px] text-center text-slate-500 font-bold bg-slate-950/40">
                            v{APP_VERSION}
                        </div>
                    </div>
                  )}
              </div>
          </div>

          <div className="mt-3 flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-full w-fit">
              <Calendar size={13} className="text-teal-400" />
              <input 
                  type="date" 
                  value={datePickerValue} 
                  onChange={handleDateChange} 
                  className="bg-transparent text-slate-200 text-xs font-bold outline-none cursor-pointer [color-scheme:dark]"
              />
          </div>
      </div>

      {/* Main Scroll Area with Bento responsive layout */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4 relative flex flex-col w-full max-w-6xl mx-auto">
          
          {/* Responsive Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
              
              {/* LEFT COLUMN: Business Terminal Insights & Profile */}
              <div className="col-span-1 lg:col-span-5 flex flex-col gap-4 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm transition-all">
                  
                  {/* Registry Console Badge */}
                  <div className="hidden lg:flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ea580c] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Terminal Auditor
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold">
                          Financial Year Live
                      </span>
                  </div>

                  <HeroGraphic qrData={companyProfile?.mobile} mobile={companyProfile?.mobile} formattedDate={formattedDate} />

                  {/* Operational stats parameters HUD */}
                  <div className="grid grid-cols-2 gap-3 shrink-0">
                      <div className="bg-slate-50/50 dark:bg-slate-950/40 rounded-xl p-3.5 shadow-xs border border-slate-100 dark:border-slate-800/40 transition-all hover:scale-[1.01] hover:border-emerald-500/20">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block leading-tight">
                              {language === 'hi' ? 'कुल बिक्री (Sales)' : 'Total Sales'}
                          </span>
                          <h3 className="text-[15px] md:text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 tracking-tight">
                              ₹{totalSales.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                          </h3>
                          <div className="text-[8px] text-slate-400 mt-1.5 font-bold">
                              {saleCount} {language === 'hi' ? 'इनवॉइस दर्ज' : 'Invoices Drafted'}
                          </div>
                      </div>
                      <div className="bg-slate-50/50 dark:bg-slate-950/40 rounded-xl p-3.5 shadow-xs border border-slate-100 dark:border-slate-800/40 transition-all hover:scale-[1.01] hover:border-blue-500/20">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block leading-tight">
                              {language === 'hi' ? 'कुल खरीद (Purchases)' : 'Total Purchases'}
                          </span>
                          <h3 className="text-[15px] md:text-base font-black text-blue-600 dark:text-blue-400 mt-1 tracking-tight">
                              ₹{totalPurchases.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                          </h3>
                          <div className="text-[8px] text-slate-400 mt-1.5 font-bold">
                              {purchaseCount} {language === 'hi' ? 'बिल दर्ज' : 'Bills Logged'}
                          </div>
                      </div>
                  </div>

                  {/* Net margin summary view */}
                  <div className="bg-slate-50/40 dark:bg-slate-950/30 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800/20">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                          <span>Trade Cash Margin</span>
                          <span className={`font-black ${totalSales >= totalPurchases ? 'text-emerald-500' : 'text-rose-500'}`}>
                              ₹{(totalSales - totalPurchases).toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                          </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                          <div 
                              className={`h-1 rounded-full ${totalSales >= totalPurchases ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              style={{ width: `${totalSales + totalPurchases > 0 ? Math.min(100, Math.max(10, Math.round((totalSales / (totalSales + totalPurchases)) * 100))) : 50}%` }}
                          ></div>
                      </div>
                  </div>
              </div>

              {/* RIGHT COLUMN: Active Operations Desk & Action Shortcuts */}
              <div className="col-span-1 lg:col-span-7 flex flex-col gap-4">
                  <div className="text-xs font-black uppercase tracking-widest text-[#ea580c] px-1 flex items-center justify-between">
                     <span>
                         {view === 'accounting' 
                           ? (language === 'hi' ? 'एकाउंटिंग बुक्स और लेजर' : 'Accounting & Financial Books') 
                           : (language === 'hi' ? 'रिपोर्ट्स और रजिस्टर्स' : 'Business Audits & Reports')
                         }
                     </span>
                     {view === 'accounting' && (
                         <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black px-2 py-0.5 rounded">
                             SECURE LEDGER
                         </span>
                     )}
                  </div>

                  {/* Premium Grid Menu */}
                  <div className="grid grid-cols-2 gap-3 mb-2">
                      {(view === 'accounting' ? accountingMenu : menuGrid).map((item, index) => (
                          <button 
                            key={index} 
                            onClick={item.action}
                            type="button"
                            className="flex items-center gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-850 rounded-xl p-3.5 shadow-xs text-slate-800 dark:text-slate-200 active:scale-[0.98] transition-all duration-150 text-left w-full h-[62px]"
                          >
                              <div className={`p-2.5 rounded-xl shrink-0 ${item.bgColor} flex items-center justify-center`}>
                                  {item.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs md:text-sm font-extrabold tracking-tight leading-none uppercase font-sans select-none block text-slate-700 dark:text-slate-300">
                                  {item.label}
                                </span>
                              </div>
                          </button>
                      ))}
                  </div>
              </div>

          </div>

      </div>

      {/* Synchronized Bottom Tab Navigation */}
      {!hideFooter && (
        <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shrink-0 z-40 pt-2 pb-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <div className="max-w-5xl mx-auto w-full flex items-center justify-between px-8">
                <button onClick={() => onSwitchTab('dashboard')} className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-[#1e293b] dark:hover:text-white">
                    <Home size={22} />
                    <span className="text-[10px] font-bold">Home</span>
                </button>
                <button onClick={() => onSwitchTab('master')} className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-[#1e293b] dark:hover:text-white">
                    <LayoutGrid size={22} />
                    <span className="text-[10px] font-bold">Master</span>
                </button>
                <button className="flex flex-col items-center gap-0.5 text-[#1e293b] dark:text-white">
                    <FileBarChart size={22} fill="currentColor" />
                    <span className="text-[10px] font-bold">Report</span>
                </button>
            </div>
        </footer>
      )}
    </div>
  );
};
