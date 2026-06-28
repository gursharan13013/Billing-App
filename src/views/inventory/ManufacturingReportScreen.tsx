import React, { useState, useEffect } from 'react';
import { ArrowLeft, Factory, Trash2, Calendar, Package } from 'lucide-react';
import { billingService } from '../../services/billingService';
import { ManufacturingEntry, Language } from '../../core/types/';
import { motion, AnimatePresence } from 'motion/react';

interface ManufacturingReportScreenProps {
  onBack: () => void;
  language?: Language;
}

export const ManufacturingReportScreen: React.FC<ManufacturingReportScreenProps> = ({ onBack, language }) => {
  const [entries, setEntries] = useState<ManufacturingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isHi = language === 'hi';

  // Dynamic Bilingual Localization Dictionary Data Object
  const t = {
    title: isHi ? 'मैन्युफैक्चरिंग रिपोर्ट' : 'Manufacturing Report',
    loading: isHi ? 'डेटा लोड हो रहा है...' : 'Loading Data...',
    noEntries: isHi ? 'कोई मैन्युफैक्चरिंग प्रविष्टि नहीं मिली' : 'No manufacturing entries found',
    noEntriesSub: isHi ? 'इन्हें यहाँ देखने के लिए आइटम बनाएं।' : 'Produce items to see them here.',
    produced: isHi ? 'उत्पादित माल' : 'Produced',
    totalCost: isHi ? 'कुल लागत' : 'Total Cost',
    rawUsed: isHi ? 'कच्चा माल प्रयुक्त' : 'Raw Materials Used',
    qty: isHi ? 'मात्रा' : 'Qty',
    deleteTitle: isHi ? 'प्रविष्टि हटाएं?' : 'Delete Entry?',
    deleteConfirmMsg: isHi ? 'क्या आप वाकई इस मैन्युफैक्चरिंग प्रविष्टि को हटाना चाहते हैं? इससे स्टॉक परिवर्तन उलट जाएंगे और इसे वापस नहीं लिया जा सकता।' : 'Are you sure you want to delete this manufacturing entry? This will reverse the stock changes and cannot be undone.',
    cancel: isHi ? 'रद्द करें' : 'Cancel',
    deleteButton: isHi ? 'हटाएं' : 'Delete'
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setLoading(true);
    const data = await billingService.getAllManufacturingEntries();
    setEntries(data);
    setLoading(false);
  };

  const handleDeleteClick = (id: string) => {
      setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
      if (deleteConfirmId) {
          await billingService.deleteManufacturingEntry(deleteConfirmId);
          setDeleteConfirmId(null);
          loadEntries();
      }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', ease: [0.25, 1, 0.5, 1], duration: 0.35 }}
      style={{ willChange: 'transform' }}
      className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)] relative overflow-hidden transition-colors font-sans"
    >
      {/* Premium Top Header */}
      <header className="bg-white dark:bg-slate-900 p-4 flex items-center justify-between shadow-sm shrink-0 border-b border-gray-200 dark:border-slate-800 pt-[max(env(safe-area-inset-top),48px)] transition-colors">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white p-2 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90"
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2.5">
            <Factory size={22} className="text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {t.title}
            </h1>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center pt-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-650"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-slate-400">
            <Package size={48} className="mb-3 opacity-50" />
            <p className="text-base font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">{t.noEntries}</p>
            <p className="text-xs text-slate-500 mt-1 font-bold">{t.noEntriesSub}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map(entry => (
              <div key={entry.id} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
                <div className="p-3.5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <Calendar size={14} className="text-indigo-500" /> {Date.fromLocalDateString ? Date.fromLocalDateString(entry.date).toLocaleDateString('en-IN') : entry.date}
                  </div>
                  <button 
                    onClick={() => handleDeleteClick(entry.id)}
                    className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-all min-w-[36px] min-h-[36px] flex items-center justify-center active:scale-90"
                    aria-label="Delete entry"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">{t.produced}</p>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{entry.finishedItemName}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.qty}: <span className="font-extrabold text-slate-800 dark:text-slate-200">{entry.finishedQuantity}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">{t.totalCost}</p>
                      <p className="text-base font-extrabold text-slate-900 dark:text-white">₹{entry.totalCost.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-3 border border-gray-100 dark:border-slate-850">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{t.rawUsed}</p>
                    <div className="space-y-1.5">
                      {entry.rawMaterials.map((rm, idx) => (
                        <div key={idx} className="flex justify-between text-xs font-medium">
                          <span className="text-slate-700 dark:text-slate-300">{rm.itemName} <span className="text-slate-400 font-bold">x{rm.quantity}</span></span>
                          <span className="text-slate-650 dark:text-slate-400 font-extrabold">₹{(rm.quantity * rm.costPerUnit).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {entry.notes && (
                    <p className="mt-3.5 text-xs text-slate-500 dark:text-slate-400 italic">"{entry.notes}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (Native styled custom elements) */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden p-5"
            >
              <div className="p-1 text-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t.deleteTitle}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed mb-6">
                  {t.deleteConfirmMsg}
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 text-slate-600 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors min-h-[44px] cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-rose-600 text-white font-bold hover:bg-rose-700 rounded-xl shadow-md transition-colors min-h-[44px] cursor-pointer"
                >
                  {t.deleteButton}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
