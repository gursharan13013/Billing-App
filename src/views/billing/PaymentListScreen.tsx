import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Search, Trash2, Calendar, Edit2, Share2, 
  AlertCircle, Receipt, Trash, Check, ArrowUpDown
} from 'lucide-react';
import { PaymentRecord } from '../../core/types/';
import { billingService } from '../../services/billingService';
import { SwipeableRow } from '../../components/layout/SwipeableRow';
import { motion, AnimatePresence } from 'motion/react';

interface PaymentListScreenProps {
  onBack: () => void;
  type: 'Payment' | 'Receipt';
  onCreateNew: () => void;
  onEdit?: (payment: PaymentRecord) => void;
  currentLanguage?: 'en' | 'hi';
}

const translations = {
  en: {
    payment: 'Payment Ledger',
    receipt: 'Receipt Ledger',
    searchPlaceholder: 'Search by partner name or voucher code...',
    today: 'Today',
    noResult: 'No Records Found !',
    noResultDesc: 'Try adjusting your search terms or date filter',
    deleteTitle: 'Delete Record?',
    deleteDesc: 'Are you absolutely sure you want to permanently delete this billing payment record?',
    cancel: 'Cancel',
    deleteBtn: 'Delete',
    loading: 'Loading transaction records...',
    modeLabel: 'Mode',
    synced: 'Synced to Cloud',
    unsynced: 'Pending Sync',
    months: {
      January: 'January', February: 'February', March: 'March', April: 'April', May: 'May', June: 'June',
      July: 'July', August: 'August', September: 'September', October: 'October', November: 'November', December: 'December'
    }
  },
  hi: {
    payment: 'भुगतान बही (Payment)',
    receipt: 'रसीद बही (Receipt)',
    searchPlaceholder: 'साझेदार का नाम या वाउचर संख्या खोजें...',
    today: 'आज',
    noResult: 'कोई रिकॉर्ड नहीं मिला !',
    noResultDesc: 'कृपया नया खोजने या फ़िल्टर बदलने का प्रयास करें',
    deleteTitle: 'रिकॉर्ड हटाएं?',
    deleteDesc: 'क्या आप वाकई इस भुगतान रिकॉर्ड को स्थायी रूप से हटाना चाहते हैं?',
    cancel: 'रद्द करें',
    deleteBtn: 'हटाएं (Delete)',
    loading: 'लेनदेन लोड हो रहे हैं...',
    modeLabel: 'माध्यम',
    synced: 'क्लाउड में सुरक्षित',
    unsynced: 'सिंक लंबित',
    months: {
      January: 'जनवरी', February: 'फरवरी', March: 'मार्च', April: 'अप्रैल', May: 'मई', June: 'जून',
      July: 'जुलाई', August: 'अगस्त', September: 'सितंबर', October: 'अक्टूबर', November: 'नवंबर', December: 'दिसंबर'
    }
  }
};

const formatNumber = (val: number) => {
    return Number(val.toFixed(2)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const PaymentListScreen: React.FC<PaymentListScreenProps> = ({ 
  onBack, 
  type, 
  onCreateNew, 
  onEdit,
  currentLanguage = 'en'
}) => {
  const isHi = currentLanguage === 'hi';
  const t = isHi ? translations.hi : translations.en;

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date period tab state
  const currentMonthEnglishValue = new Date().toLocaleString('en-US', { month: 'long' });
  const currentMonthLabel = isHi && translations.hi.months[currentMonthEnglishValue as keyof typeof translations.hi.months]
    ? translations.hi.months[currentMonthEnglishValue as keyof typeof translations.hi.months]
    : currentMonthEnglishValue;

  const currentYear = new Date().getFullYear().toString();
  const [period, setPeriod] = useState<'Today' | 'Month' | 'Year'>('Today');

  // Custom Deletion Dialog Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getFormattedHeaderDate = () => {
    try {
      const today = new Date();
      const day = today.getDate();
      const monthEnglishValue = today.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const year = today.getFullYear();
      return `${day} ${monthEnglishValue} ${year}`;
    } catch {
      return "21 JUN 2026";
    }
  };

  useEffect(() => {
    loadPayments();
  }, [type]);

  const loadPayments = async () => {
    setLoading(true);
    const data = await billingService.getAllPayments(type);
    setPayments(data);
    setLoading(false);
  };

  const confirmDelete = async () => {
      if (deleteId) {
          await billingService.deletePayment(deleteId);
          setDeleteId(null);
          loadPayments();
      }
  };

  // Filter and Sort Payments by searchQuery and selected period
  const filteredPayments = payments.filter(p => {
    // 1. Search filter
    const matchesSearch = p.partyName.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
                          p.voucherNo.toLowerCase().includes(searchQuery.trim().toLowerCase());
    if (!matchesSearch) return false;

    // 2. Period filter
    try {
      const recDate = Date.fromLocalDateString(p.date);
      const today = new Date();
      if (period === 'Today') {
        return recDate.getDate() === today.getDate() && 
               recDate.getMonth() === today.getMonth() && 
               recDate.getFullYear() === today.getFullYear();
      } else if (period === 'Month') {
        return recDate.getMonth() === today.getMonth() && 
               recDate.getFullYear() === today.getFullYear();
      } else if (period === 'Year') {
        return recDate.getFullYear() === today.getFullYear();
      }
    } catch (e) {
      console.error("Error parsing/filtering payment date:", e);
    }
    return true;
  }).sort((a, b) => {
    const dateDiff = Date.fromLocalDateString(b.date).getTime() - Date.fromLocalDateString(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    
    if (a.createdAt && b.createdAt) {
      return b.createdAt - a.createdAt;
    } else if (a.createdAt) {
      return -1;
    } else if (b.createdAt) {
      return 1;
    }
    return b.id.localeCompare(a.id); 
  });

  const handleSharePayment = async (pay: PaymentRecord) => {
      try {
          const party = await billingService.getAllParties().then(parties => parties.find(p => p.id === pay.partyId));
          const company = await billingService.getCompanyProfile();
          
          let message = `*Payment Receipt*\n\n`;
          message += `Dear ${pay.partyName},\n`;
          message += `We have received a payment of *₹${formatNumber(pay.amount)}* on ${pay.date} via ${pay.mode}.\n\n`;
          if (pay.remarks) {
              message += `Remarks: ${pay.remarks}\n\n`;
          }
          if (company?.name) {
              message += `Thank You,\n*${company.name}*`;
          }

          const encodedMsg = encodeURIComponent(message);
          let whatsappUrl = `https://wa.me/?text=${encodedMsg}`;

          if (party?.mobile) {
               let cleanNumber = party.mobile.replace(/\D/g, '');
               if (cleanNumber.length === 10) cleanNumber = '91' + cleanNumber;
               whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;
          }

          const link = document.createElement('a');
          link.href = whatsappUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Mark as synced/sent
          await billingService.savePayment({ ...pay, isSyncedToCloud: true }, true);
          loadPayments();
      } catch (err) {
          console.error('Error sharing payment:', err);
      }
  };

  const isPayment = type === 'Payment';
  
  // Custom themed styling constants
  const headerThemeClass = isPayment 
    ? 'from-red-600 to-red-700 dark:from-red-950/40 dark:to-red-900/30' 
    : 'from-emerald-600 to-emerald-700 dark:from-slate-900 dark:to-slate-950';

  const badgeColorClass = isPayment
    ? 'bg-red-50 text-red-600 dark:bg-red-950/45 dark:text-red-400 border border-red-100 dark:border-red-900/40'
    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/45 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40';

  const amountColorClass = isPayment ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400';

  const buttonColor = isPayment 
    ? 'bg-gradient-to-r from-red-600 to-red-700 dark:from-red-750 dark:to-red-800' 
    : 'bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800';

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      
      {/* Header */}
      <header className="bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white p-4 pt-[max(env(safe-area-inset-top),48px)] flex justify-between items-center z-20 relative overflow-hidden shrink-0">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={onBack} 
            className="p-2.5 bg-slate-100/60 dark:bg-[#111b2d] text-slate-800 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-[#1a2842] active:scale-95 rounded-full border border-slate-205/30 dark:border-slate-800/40 transition-all cursor-pointer shadow-3xs"
          >
            <ArrowLeft size={16} className="stroke-[2.5px]" />
          </button>
          <div className="font-sans">
            <h1 className="text-lg font-extrabold tracking-tight leading-none flex items-center gap-1.5 dark:text-slate-150">
              <span>{isPayment ? t.payment : t.receipt}</span>
            </h1>
            <p className="text-[10px] text-slate-550 dark:text-slate-400 font-bold tracking-widest uppercase font-mono mt-1.5">
              {getFormattedHeaderDate()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={onCreateNew}
            className="p-2.5 bg-slate-100/60 dark:bg-[#111b2d] text-slate-800 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-[#1a2842] active:scale-95 rounded-full border border-slate-205/30 dark:border-slate-800/40 transition-all cursor-pointer shadow-3xs"
            title={isPayment ? translations.en.payment : translations.en.receipt}
          >
            <Plus size={16} className="stroke-[2.5px]" />
          </button>
        </div>
      </header>

      {/* Segmented Period Tabs */}
      <div className="p-3 bg-slate-50 dark:bg-[#030712] sticky top-0 z-10 transition-colors">
        <div className="flex bg-slate-200/50 dark:bg-[#091122]/90 border border-slate-205/10 dark:border-[#12203b]/40 p-1 rounded-xl w-full relative">
          <button
            type="button"
            onClick={() => setPeriod('Today')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-lg relative cursor-pointer text-center transition-colors duration-200 ${
              period === 'Today'
                ? 'text-slate-850 dark:text-white z-10 font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 font-bold z-10'
            }`}
          >
            <span className="relative z-10">{t.today}</span>
            {period === 'Today' && (
              <motion.div
                layoutId="activePaymentTab"
                className="absolute inset-0 bg-white dark:bg-[#1e293b] rounded-lg shadow-3xs border border-slate-200/30 dark:border-slate-800/40"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setPeriod('Month')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-lg relative cursor-pointer text-center transition-colors duration-200 ${
              period === 'Month'
                ? 'text-slate-850 dark:text-white z-10 font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 font-bold z-10'
            }`}
          >
            <span className="relative z-10">{currentMonthLabel}</span>
            {period === 'Month' && (
              <motion.div
                layoutId="activePaymentTab"
                className="absolute inset-0 bg-white dark:bg-[#1e293b] rounded-lg shadow-3xs border border-slate-200/30 dark:border-slate-800/40"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setPeriod('Year')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-lg relative cursor-pointer text-center transition-colors duration-200 ${
              period === 'Year'
                ? 'text-slate-850 dark:text-white z-10 font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 font-bold z-10'
            }`}
          >
            <span className="relative z-10">{currentYear}</span>
            {period === 'Year' && (
              <motion.div
                layoutId="activePaymentTab"
                className="absolute inset-0 bg-white dark:bg-[#1e293b] rounded-lg shadow-3xs border border-slate-200/30 dark:border-slate-800/40"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Styled Search Block */}
      <div className="p-4 pt-1 pb-2 shrink-0 bg-slate-50 dark:bg-[#030712]">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Search size={16} className="stroke-[2.5px]" />
          </div>
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            className="w-full border border-slate-205/30 dark:border-[#111e35]/65 bg-slate-100/10 dark:bg-[#091122]/95 rounded-xl py-3 pl-10 pr-3.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-bold outline-none focus:border-emerald-500/30 dark:focus:border-emerald-500/20 transition-all shadow-3xs"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List Body Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50 dark:bg-[#030712]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={period + '_' + searchQuery}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="space-y-3"
          >
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-xs font-bold gap-3 animate-pulse">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>{t.loading}</span>
                </div>
            ) : filteredPayments.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-24 text-center px-4"
                >
                    <div className="w-16 h-16 bg-slate-105/10 dark:bg-[#111c33]/50 rounded-2xl flex items-center justify-center text-slate-400 mb-4 border border-slate-200/5 dark:border-slate-800/40 shadow-xs">
                       <Receipt size={32} className="stroke-[1.6px]" />
                    </div>
                    <h2 className="text-xl font-extrabold italic tracking-tight text-slate-800 dark:text-slate-200 mb-1">
                      {t.noResult}
                    </h2>
                    <p className="text-xs text-slate-400 font-bold max-w-xs">{t.noResultDesc}</p>
                </motion.div>
            ) : (
                <div className="space-y-3">
                    {filteredPayments.map(pay => {
                        const isSynced = pay.isSyncedToCloud && pay.type === 'Receipt';
                        
                        // Theme classes for individual card
                        const cardBg = isSynced 
                          ? 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200' 
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-850/70 text-slate-800 dark:text-slate-200';

                        return (
                        <SwipeableRow
                            key={pay.id}
                            enabled={!isSynced}
                            onEdit={onEdit ? () => onEdit(pay) : undefined}
                            onDelete={() => setDeleteId(pay.id)}
                        >
                            <motion.div 
                              layout
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.98 }}
                              className={`p-4 rounded-2xl border ${cardBg} shadow-3xs transition-all relative group w-full text-left overflow-hidden`}
                            >
                                <div className="flex justify-between items-start gap-3">
                                    <div onClick={() => onEdit && onEdit(pay)} className="cursor-pointer flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-extrabold text-sm text-slate-850 dark:text-slate-100 pr-1 truncate max-w-[200px]">{pay.partyName}</span>
                                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black tracking-wider uppercase border ${
                                              isSynced 
                                                ? 'bg-emerald-100/60 dark:bg-emerald-950/50 border-emerald-200/50 text-emerald-700 dark:text-emerald-400' 
                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-205 dark:border-slate-750 text-slate-500 dark:text-slate-400'
                                            }`}>
                                              {pay.mode}
                                            </span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-2">
                                          <span>{pay.date}</span>
                                          <span className="text-slate-300">•</span>
                                          <span className="font-mono text-slate-500">{pay.voucherNo}</span>
                                        </p>
                                    </div>
                                    <div className="text-right flex flex-col items-end justify-between shrink-0 h-full">
                                        <span className={`text-base font-black tracking-tight ${amountColorClass}`}>
                                            ₹{formatNumber(pay.amount)}
                                        </span>

                                        {/* Synced Badge or Action Controls */}
                                        <div className="flex items-center gap-1.5 mt-2 transition-all">
                                            {isSynced && (
                                                <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                  <Check size={11} className="stroke-[2.5px]" />
                                                  <span>{t.synced}</span>
                                                </span>
                                            )}
                                            <div className="flex gap-2 opacity-10 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button 
                                                  type="button"
                                                  onClick={(e) => { e.stopPropagation(); handleSharePayment(pay); }} 
                                                  className="text-green-600 p-1.5 bg-green-50/50 dark:bg-green-950/20 active:scale-95 border border-green-200/40 rounded-xl hover:bg-green-100 font-bold" 
                                                  title={isHi ? 'शेयर करें' : 'Share Receipt via WhatsApp'}
                                                >
                                                    <Share2 size={13} className="stroke-[2.5px]" />
                                                </button>
                                                {onEdit && !isSynced && (
                                                    <button 
                                                      type="button"
                                                      onClick={() => onEdit(pay)} 
                                                      className="text-indigo-600 p-1.5 bg-indigo-50/50 dark:bg-indigo-950/20 active:scale-95 border border-indigo-205/40 rounded-xl hover:bg-indigo-100"
                                                    >
                                                        <Edit2 size={13} className="stroke-[2.5px]" />
                                                    </button>
                                                )}
                                                {!isSynced && (
                                                    <button 
                                                      type="button"
                                                      onClick={(e) => { e.stopPropagation(); setDeleteId(pay.id); }} 
                                                      className="text-red-500 p-1.5 bg-red-50/50 dark:bg-red-950/20 active:scale-95 border border-red-205/45 rounded-xl hover:bg-red-100"
                                                    >
                                                        <Trash2 size={13} className="stroke-[2.5px]" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </SwipeableRow>
                        )
                    })}
                </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 z-30">
          <button 
            type="button"
            onClick={onCreateNew}
            className={`${buttonColor} text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center h-14 w-14 cursor-pointer`}
            title={isPayment ? translations.en.payment : translations.en.receipt}
          >
              <Plus size={28} className="stroke-[2.5px]" />
          </button>
      </div>

      {/* Glassmorphic Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-3xs select-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-center"
            >
              <div className="w-13 h-13 bg-red-50 dark:bg-red-950/40 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400 border border-red-150/40">
                <Trash size={22} className="stroke-[2.5px]" />
              </div>
              <h4 className="text-base font-black text-slate-800 dark:text-white tracking-wide uppercase mb-1.5">
                {t.deleteTitle}
              </h4>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6 leading-relaxed px-2">
                {isPayment 
                  ? (isHi ? 'क्या आप वाकई इस भुगतान रिकॉर्ड को स्थायी रूप से हटाना चाहते हैं?' : 'Are you absolutely sure you want to permanently delete this billing payment record?')
                  : (isHi ? 'क्या आप वाकई इस रसीद रिकॉर्ड को स्थायी रूप से हटाना चाहते हैं?' : 'Are you absolutely sure you want to permanently delete this receipt record?')
                }
              </p>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-3 text-xs font-bold border border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button 
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 py-3 text-xs font-black text-white hover:opacity-90 rounded-xl shadow-xs transition-all cursor-pointer bg-red-650 hover:bg-red-700"
                >
                  {t.deleteBtn}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
