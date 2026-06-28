import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Trash2 } from 'lucide-react';
import { JournalVoucher, Language } from '../types';
import { billingService } from '../src/services/billingService';


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
      amount: language === 'hi' ? 'राशि' : 'Amount',
      noNarration: language === 'hi' ? 'कोई विवरण नहीं' : 'No Narration'
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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Header */}
      <header className="bg-slate-800 text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack}><ArrowLeft size={24} /></button>
        <div>
            <h1 className="text-xl font-bold">{t.journalVouchers}</h1>
            <p className="text-xs opacity-80">{todayDate}</p>
        </div>
        <div className="ml-auto flex gap-4">
            <Plus size={24} onClick={onCreateNew} className="cursor-pointer" />
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 flex border-b border-gray-200 dark:border-slate-800">
          <button 
            onClick={() => setFilterPeriod('Today')}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 ${filterPeriod === 'Today' ? 'border-slate-800 text-slate-800 dark:border-white dark:text-white' : 'border-transparent text-gray-500'}`}
          >
              {t.today}
          </button>
          <button 
            onClick={() => setFilterPeriod('Month')}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 ${filterPeriod === 'Month' ? 'border-slate-800 text-slate-800 dark:border-white dark:text-white' : 'border-transparent text-gray-500'}`}
          >
              {currentMonth}
          </button>
          <button 
            onClick={() => setFilterPeriod('Year')}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 ${filterPeriod === 'Year' ? 'border-slate-800 text-slate-800 dark:border-white dark:text-white' : 'border-transparent text-gray-500'}`}
          >
              {currentYear}
          </button>
      </div>

      <div className="p-4 pb-0 z-10">
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search Voucher No or Narration..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-700 rounded-lg leading-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pt-4">
          {loading ? (
              <div className="p-10 text-center text-gray-500">{t.loading}</div>
          ) : filteredJournals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <h2 className="text-2xl font-bold italic mb-2">{t.noResult}</h2>
              </div>
          ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredJournals.map(journal => (
                      <div key={journal.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors relative group cursor-pointer" onClick={() => alert(`${t.details}:\n${journal.narration}\n${t.amount}: ${journal.totalAmount}`)}>
                          <div className="flex justify-between items-start">
                              <div>
                                  <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-800 dark:text-white">{journal.voucherNo}</span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">{journal.date} • {journal.narration || t.noNarration}</p>
                              </div>
                              <div className="text-right">
                                  <span className="font-bold text-slate-800 dark:text-white">
                                      ₹{Number(journal.totalAmount.toFixed(2)).toLocaleString('en-IN')}
                                  </span>
                                  <button onClick={(e) => { e.stopPropagation(); setDeleteId(journal.id); }} className="block ml-auto mt-2 text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6">
          <button 
            onClick={onCreateNew}
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg transition-transform active:scale-95"
          >
              <Plus size={28} />
          </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-900/50">
                    <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t.deleteTitle}</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">{t.deleteMsg}</p>
                <div className="flex gap-3">
                    <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{t.cancel}</button>
                    <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700">{t.delete}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};