import React, { useState, useEffect } from 'react';
import { 
  Ruler, Package, LayoutGrid, UserPlus, ScatterChart, Book, 
  Scissors, Briefcase, Bell, Calendar, MoreVertical, Settings, 
  Info, Phone, QrCode, Home, FileBarChart 
} from 'lucide-react';
import { APP_VERSION } from '../core/types/';
import { motion } from 'motion/react';
import { billingService } from '../services/billingService';
import { HeroGraphic } from '../components/shared/HeroGraphic';

interface MasterScreenProps {
  onSwitchTab: (tab: 'dashboard' | 'master' | 'report') => void;
  onOpenSettings: () => void;
  onNotification?: () => void;
  onNavigate?: (screen: any, params?: any) => void;
  language: any;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  hideFooter?: boolean;
}

export const MasterScreen: React.FC<MasterScreenProps> = ({ 
  onSwitchTab, onOpenSettings, onNavigate, onNotification,
  language, selectedDate, onDateChange, hideFooter
}) => {
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // DB Counter Stats for the modern Bento sidebar HUD
  const [itemCount, setItemCount] = useState(0);
  const [partyCount, setPartyCount] = useState(0);
  const [unitCount, setUnitCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [taxCount, setTaxCount] = useState(0);

  useEffect(() => {
    billingService.getCompanyProfile().then(setCompanyProfile).catch(console.error);

    const loadStats = async () => {
      try {
        const items = await billingService.getAllItems();
        const parties = await billingService.getAllParties();
        const units = await billingService.getAllUnits();
        const categories = await billingService.getAllCategories();
        const taxes = await billingService.getAllTaxes();
        
        setItemCount(items.length);
        setPartyCount(parties.length);
        setUnitCount(units.length);
        setCategoryCount(categories.length);
        setTaxCount(taxes.length);
      } catch (e) {
        console.warn("Error loading Master HUD stats:", e);
      }
    };
    
    loadStats();
  }, []);

  const formattedDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(selectedDate);
  const datePickerValue = selectedDate.toLocalDateString();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onDateChange(Date.fromLocalDateString(e.target.value));
    }
  };

  const labels = {
    en: {
      setting: 'Settings', aboutUs: 'About Us', contactUs: 'Contact Us', qrCode: 'QR Code'
    },
    hi: {
      setting: 'सेटिंग्स', aboutUs: 'हेल्प और लीगल', contactUs: 'संपर्क करें', qrCode: 'क्यूआर कोड'
    }
  };
  const t = labels[language] || labels['en'];

  // Match the button styling perfectly with Home Tab action cards
  const menuGrid = [
    { id: 'add_unit', label: language === 'hi' ? 'यूनिट जोड़ें' : 'Add Unit', icon: <Ruler size={18} className="text-blue-500" />, bgColor: 'bg-blue-500/10 dark:bg-blue-500/15', action: () => onNavigate && onNavigate('unitList') },
    { id: 'add_item', label: language === 'hi' ? 'आइटम जोड़ें' : 'Add Item', icon: <Package size={18} className="text-emerald-500" />, bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15', action: () => onNavigate && onNavigate('itemList') },
    { id: 'add_group', label: language === 'hi' ? 'ग्रुप जोड़ें' : 'Add Group', icon: <LayoutGrid size={18} className="text-indigo-500" />, bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/15', action: () => onNavigate && onNavigate('accountGroupList') },
    { id: 'add_customer', label: language === 'hi' ? 'ग्राहक जोड़ें' : 'Add Customer', icon: <UserPlus size={18} className="text-indigo-500" />, bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/15', action: () => onNavigate && onNavigate('partyList', { partyMode: 'customer' }) },
    { id: 'add_hsn', label: language === 'hi' ? 'HSN जोड़ें' : 'Add HSN', icon: <ScatterChart size={18} className="text-violet-500" />, bgColor: 'bg-violet-500/10 dark:bg-violet-500/15', action: () => onNavigate && onNavigate('hsnList') },
    { id: 'add_ledger', label: language === 'hi' ? 'लेजर जोड़ें' : 'Add Ledger', icon: <Book size={18} className="text-violet-500" />, bgColor: 'bg-violet-500/10 dark:bg-violet-500/15', action: () => onNavigate && onNavigate('partyList', { partyMode: 'ledger' }) },
    { id: 'tax_category', label: language === 'hi' ? 'टैक्स केटेगरी' : 'Tax Category', icon: <Scissors size={18} className="text-teal-500" />, bgColor: 'bg-teal-500/10 dark:bg-teal-500/15', action: () => onNavigate && onNavigate('taxList') },
    { id: 'add_category', label: language === 'hi' ? 'केटेगरी जोड़ें' : 'Add Category', icon: <Briefcase size={18} className="text-teal-500" />, bgColor: 'bg-teal-500/10 dark:bg-teal-500/15', action: () => onNavigate && onNavigate('categoryList') },
    { id: 'opening_stock', label: language === 'hi' ? 'ओपनिंग स्टॉक' : 'Opening Stock', icon: <Package size={18} className="text-orange-600 dark:text-orange-500" />, bgColor: 'bg-orange-500/10 dark:bg-orange-500/15', action: () => onNavigate && onNavigate('openingStock') },
    { id: 'settings', label: language === 'hi' ? 'सेटिंग्स' : 'Settings', icon: <Settings size={18} className="text-slate-500" />, bgColor: 'bg-slate-500/10 dark:bg-slate-500/15', action: onOpenSettings },
  ];

  return (
    <div 
      className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden relative pb-[max(env(safe-area-inset-bottom),0px)]" 
      onClick={() => isMenuOpen && setIsMenuOpen(false)}
    >
      
      {/* Synchronized Header Section - Perfectly aligned with Home tab */}
      <div className="p-5 pt-[max(env(safe-area-inset-top),36px)] bg-slate-900 border-b border-slate-800 text-white pb-4 relative shrink-0 shadow-lg">
          <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
              <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-400 font-mono">Master Console</span>
                  <h1 className="text-lg font-extrabold tracking-tight text-white line-clamp-1">{companyProfile?.name || 'My Business'}</h1>
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
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                          Registry Console
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold">
                          Local Database
                      </span>
                  </div>

                  <HeroGraphic qrData={companyProfile?.mobile} mobile={companyProfile?.mobile} formattedDate={formattedDate} />

                  {/* Master Ledger counters HUD */}
                  <div className="grid grid-cols-2 gap-3 shrink-0">
                      <div className="bg-slate-50/50 dark:bg-slate-950/40 rounded-xl p-3.5 shadow-xs border border-slate-100 dark:border-slate-800/40 transition-all hover:scale-[1.01] hover:border-indigo-500/20">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block leading-tight">
                              {language === 'hi' ? 'आइटम्स' : 'Item Registry'}
                          </span>
                          <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 tracking-tight">
                              {itemCount}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-2 text-[9px] text-indigo-500/80 font-bold">
                              <span>{language === 'hi' ? 'उत्पाद / सेवाएं' : 'Products & Services'}</span>
                          </div>
                      </div>
                      <div className="bg-slate-50/50 dark:bg-slate-950/40 rounded-xl p-3.5 shadow-xs border border-slate-100 dark:border-slate-800/40 transition-all hover:scale-[1.01] hover:border-violet-500/20">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block leading-tight">
                              {language === 'hi' ? 'पक्ष (Parties)' : 'Ledger Parties'}
                          </span>
                          <h3 className="text-xl font-black text-violet-600 dark:text-violet-400 mt-1 tracking-tight">
                              {partyCount}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-2 text-[9px] text-violet-500/80 font-bold">
                              <span>{language === 'hi' ? 'ग्राहक और आपूर्तिकर्ता' : 'Customers & Sellers'}</span>
                          </div>
                      </div>
                  </div>

                  {/* Auxiliary Master Database statistics progress bars */}
                  <div className="bg-slate-50/40 dark:bg-slate-950/30 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800/20 space-y-3">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                          <span>Structured Units</span>
                          <span className="text-blue-500 font-extrabold">{unitCount} Profiles</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                          <span>Group Categories</span>
                          <span className="text-teal-500 font-extrabold">{categoryCount} Subdivisions</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                          <span>Tax Directives</span>
                          <span className="text-emerald-500 font-extrabold">{taxCount} Configs</span>
                      </div>
                  </div>
              </div>

              {/* RIGHT COLUMN: Active Operations Desk & Action Shortcuts */}
              <div className="col-span-1 lg:col-span-7 flex flex-col gap-4">
                  <div className="text-xs font-black uppercase tracking-widest text-indigo-500 px-1">
                     {language === 'hi' ? 'दर्ज करें और सेटअप करें' : 'Setup Operations Desk'}
                  </div>

                  {/* Premium Grid Menu */}
                  <div className="grid grid-cols-2 gap-3 mb-2">
                      {menuGrid.map((item, index) => {
                          const buttonId = "master_btn_" + item.id;
                          return (
                              <button 
                                key={index} 
                                id={buttonId}
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
                          );
                      })}
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
                <button className="flex flex-col items-center gap-0.5 text-[#1e293b] dark:text-white">
                    <LayoutGrid size={22} fill="currentColor" />
                    <span className="text-[10px] font-bold">Master</span>
                </button>
                <button onClick={() => onSwitchTab('report')} className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-[#1e293b] dark:hover:text-white">
                    <FileBarChart size={22} />
                    <span className="text-[10px] font-bold">Report</span>
                </button>
            </div>
        </footer>
      )}
    </div>
  );
};
