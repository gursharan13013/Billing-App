import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Trash2, BookOpen, AlertCircle, Calendar } from 'lucide-react';
import { JournalVoucher, Language } from '../../core/types/';
import { billingService } from '../../services/billingService';
import { motion, AnimatePresence } from 'motion/react';

interface JournalListScreenProps {
  onBack: () => void;
  onCreateNew: () => void;
  language: Language;
}

export const JournalListScreen: React.FC<JournalListScreenProps> = ({ onBack, onCreateNew, language }) => {
  const [journals, setJournals] = useState<JournalVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedJournal, setSelectedJournal] = useState<JournalVoucher | null>(null);
  
  // Localize Date based on app language setting, not system default
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  const currentMonth = new Date().toLocaleString(locale, { month: 'long' });
  const currentYear = new Date().getFullYear().toString();
  const todayDate = new Date().toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

  const [filterPeriod, setFilterPeriod] = useState<'Today' | 'Month' | 'Year'>('Today');

  // Translations
  const t = {
      journalVouchers: language === 'hi' ? 'जर्नल वाउचर' : 'Journal Vouchers',
      today: language === 'hi' ? 'आज' : 'Today',
      noResult: language === 'hi' ? 'कोई परिणाम नहीं !!' : 'No Result !!',
      loading: language === 'hi' ? 'लोड हो रहा है...' : 'Loading...',
      deleteTitle: language === 'hi' ? 'जर्नल हटाएं?' : 'Delete Journal?',
      deleteMsg: language === 'hi' ? 'क्या आप वाकई इस जर्नल वाउचर को हटाना चाहते हैं?' : 'Are you sure you want to delete this journal voucher?',
      cancel: language === 'hi' ? 'रद्द करें' : 'Cancel',
      delete: language === 'hi' ? 'हटाएं' : 'Delete',
      details: language === 'hi' ? 'विवरण' : 'Details',
      amount: language === 'hi' ? 'कुल राशि' : 'Total Amount',
      noNarration: language === 'hi' ? 'कोई विवरण नहीं' : 'No Narration',
      searchPlaceholder: language === 'hi' ? 'वाउचर नंबर या विवरण खोजें...' : 'Search Voucher No or Narration...',
      narrationLabel: language === 'hi' ? 'विवरण' : 'Narration'
  };

  useEffect(() => {
    loadJournals();
  }, []);

  const loadJournals = async () => {
    setLoading(true);
    const data = await billingService.getAllJournals();
    setJournals(data);
    setLoading(false);
  };

  const confirmDelete = async () => {
      if (deleteId) {
          await billingService.deleteJournalVoucher(deleteId);
          setDeleteId(null);
          loadJournals();
      }
  };

  const filteredJournals = journals.filter(j => {
    const matchesSearch = j.voucherNo.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
                          j.narration.toLowerCase().includes(searchQuery.trim().toLowerCase());
    
    if (!matchesSearch) return false;

    const date = Date.fromLocalDateString(j.date);
    const today = new Date();

    if (filterPeriod === 'Today') {
        return date.toDateString() === today.toDateString();
    } else if (filterPeriod === 'Month') {
        return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    } else { // Year
        return date.getFullYear() === today.getFullYear();
    }
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      
      {/* Premium Custom Custom-Styled Header */}
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
            <h1 className="text-lg font-extrabold tracking-tight leading-none bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent uppercase">
              {t.journalVouchers}
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 font-mono">
              {todayDate}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={onCreateNew}
            className="p-2.5 bg-slate-100/60 dark:bg-[#111b2d] text-slate-800 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-[#1a2842] active:scale-95 rounded-full border border-slate-205/30 dark:border-slate-800/40 transition-all cursor-pointer shadow-3xs"
            title="Create Journal"
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
            onClick={() => setFilterPeriod('Today')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-lg relative cursor-pointer text-center transition-colors duration-200 ${
              filterPeriod === 'Today'
                ? 'text-indigo-600 dark:text-indigo-400 z-10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-705 dark:hover:text-slate-200 z-10'
            }`}
          >
            <span className="relative z-10">{t.today}</span>
            {filterPeriod === 'Today' && (
              <motion.div
                layoutId="activeJournalTab"
                className="absolute inset-0 bg-white dark:bg-[#111c30] rounded-lg shadow-3xs border border-slate-200/30 dark:border-slate-800/40"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterPeriod('Month')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-lg relative cursor-pointer text-center transition-colors duration-200 ${
              filterPeriod === 'Month'
                ? 'text-indigo-600 dark:text-indigo-400 z-10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-705 dark:hover:text-slate-200 z-10'
            }`}
          >
            <span className="relative z-10">{currentMonth}</span>
            {filterPeriod === 'Month' && (
              <motion.div
                layoutId="activeJournalTab"
                className="absolute inset-0 bg-white dark:bg-[#111c30] rounded-lg shadow-3xs border border-slate-200/30 dark:border-slate-800/40"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterPeriod('Year')}
            className={`flex-1 py-2 text-xs font-extrabold rounded-lg relative cursor-pointer text-center transition-colors duration-200 ${
              filterPeriod === 'Year'
                ? 'text-indigo-600 dark:text-indigo-400 z-10'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-705 dark:hover:text-slate-200 z-10'
            }`}
          >
            <span className="relative z-10">{currentYear}</span>
            {filterPeriod === 'Year' && (
              <motion.div
                layoutId="activeJournalTab"
                className="absolute inset-0 bg-white dark:bg-[#111c30] rounded-lg shadow-3xs border border-slate-200/30 dark:border-slate-800/40"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Modern Search Area */}
      <div className="px-4 pb-1 z-10">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Search size={16} className="stroke-[2.5px]" />
          </div>
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            className="w-full border border-slate-205/30 dark:border-[#111e35]/65 bg-slate-100/10 dark:bg-[#091122]/95 rounded-xl py-3 pl-10 pr-3.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-bold outline-none focus:border-indigo-500/30 dark:focus:border-indigo-550/20 transition-all shadow-3xs"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Active Log List Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={filterPeriod + '_' + searchQuery}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="space-y-3.5"
          >
            {loading ? (
                <div className="py-20 text-center text-xs font-bold text-slate-400 select-none animate-pulse">{t.loading}</div>
            ) : filteredJournals.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-center text-slate-400 select-none">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900/40 border border-slate-200/20 rounded-2xl flex items-center justify-center mb-3 text-slate-350 dark:text-slate-600">
                        <BookOpen size={24} />
                    </div>
                    <h2 className="text-base font-black uppercase tracking-wider">{t.noResult}</h2>
                </div>
            ) : (
                <div className="space-y-3.5">
                    {filteredJournals.map(journal => (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          key={journal.id} 
                          className="bg-white dark:bg-[#091122]/90 border border-slate-200/60 dark:border-[#12203b]/40 rounded-2xl p-4 shadow-3xs hover:border-slate-300 dark:hover:border-slate-800 transition-all relative group cursor-pointer" 
                          onClick={() => setSelectedJournal(journal)}
                        >
                            <div className="flex justify-between items-start">
                                <div className="space-y-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 tracking-tight">{journal.voucherNo}</span>
                                        <span className="text-[9px] px-2 py-0.5 bg-slate-100 dark:bg-slate-850 border border-slate-200/10 dark:border-slate-800 text-slate-500 dark:text-slate-405 rounded-full font-bold uppercase tracking-wider">
                                            {journal.type || 'Journal'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                        <Calendar size={11} />
                                        {journal.date}
                                    </p>
                                    {journal.narration && (
                                        <p className="text-xs text-slate-600 dark:text-slate-400 italic truncate max-w-xs pt-0.5">
                                            {journal.narration}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right shrink-0 flex flex-col items-end">
                                    <span className="font-black text-sm text-slate-905 dark:text-white">
                                        ₹{Number(journal.totalAmount.toFixed(2)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                    
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setDeleteId(journal.id); }} 
                                        className="mt-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-450 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-950/40 rounded-lg opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                                        title={t.delete}
                                    >
                                        <Trash2 size={14} className="stroke-[2px]" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Action CTA Button */}
      <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 z-30">
          <button 
            type="button"
            onClick={onCreateNew}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 hover:brightness-110 text-white p-4 rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center animate-bounce"
            title="Add New Journal"
          >
              <Plus size={24} className="stroke-[2.5px]" />
          </button>
      </div>

      {/* Modern High-Contrast Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-3xs">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-slate-200 dark:border-slate-800"
              >
                  <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100 dark:border-rose-900/30">
                      <Trash2 size={24} className="stroke-[2.5px]" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-2">{t.deleteTitle}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-semibold px-2">{t.deleteMsg}</p>
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setDeleteId(null)} 
                        className="flex-1 py-3 text-xs font-black tracking-wider uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
                      >
                        {t.cancel}
                      </button>
                      <button 
                        onClick={confirmDelete} 
                        className="flex-1 py-3 text-xs font-black tracking-wider uppercase bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        {t.delete}
                      </button>
                  </div>
              </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Premium Glassmorphic Journal Details Modal */}
      <AnimatePresence>
        {selectedJournal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-3xs select-none">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-205 dark:border-slate-800"
            >
              <div className="p-6 font-sans">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight font-mono">
                      {selectedJournal.voucherNo}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">{selectedJournal.date}</p>
                  </div>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase bg-slate-100 dark:bg-slate-850 border border-slate-204 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    {selectedJournal.type || 'Journal'}
                  </span>
                </div>

                {/* Rows List */}
                <div className="my-5 max-h-[220px] overflow-y-auto space-y-2 pr-1 font-sans">
                  {selectedJournal.rows && selectedJournal.rows.map((row) => (
                    <div key={row.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-850/60 transition-all hover:bg-slate-100/50">
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-xs text-slate-800 dark:text-slate-200 truncate pr-2">
                          {row.partyName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {row.debit > 0 && (
                          <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            Dr. ₹{Number(row.debit.toFixed(2)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                        {row.credit > 0 && (
                          <p className="text-xs font-black text-rose-500 dark:text-rose-400">
                            Cr. ₹{Number(row.credit.toFixed(2)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Narration & Footer Status summary */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                      {t.narrationLabel}
                    </span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-350 italic bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850/40 leading-relaxed">
                      {selectedJournal.narration || t.noNarration}
                    </p>
                  </div>

                  <div className="flex justify-between items-center py-1 flex-row pl-1 font-sans">
                    <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.amount}</span>
                    <span className="text-base font-extrabold text-slate-905 dark:text-white tracking-tight">
                      ₹{Number(selectedJournal.totalAmount.toFixed(2)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex">
                  <button 
                    onClick={() => setSelectedJournal(null)} 
                    className="flex-1 py-3 text-xs font-black tracking-wider uppercase bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl transition-all cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
