import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, X, Save, Percent, Trash2, Search, RotateCcw } from 'lucide-react';
import { TaxRate } from '../../../core/types/';
import { billingService } from '../../../services/billingService';
import { motion, AnimatePresence } from 'motion/react';

interface TaxListScreenProps {
  onBack: () => void;
}

const translations = {
  en: {
    title: 'Tax Master',
    subtitle: 'Duties & Taxes Configuration',
    searchPlaceholder: 'Search Tax Rates...',
    noTaxesFound: 'No taxes found.',
    addTax: 'Add Tax Rate',
    editTax: 'Edit Tax Rate',
    taxName: 'Tax Name',
    taxRate: 'Rate (%)',
    save: 'Save Tax',
    cancel: 'Cancel',
    deleteTitle: 'Delete Tax?',
    deleteConfirm: 'Are you sure? This action cannot be undone.',
    deleteBtn: 'Delete',
    placeholderName: 'e.g. GST 18%',
    placeholderRate: 'e.g. 18'
  },
  hi: {
    title: 'कर मास्टर (Tax Master)',
    subtitle: 'शुल्क एवं कर कॉन्फ़िगरेशन',
    searchPlaceholder: 'कर दरें खोजें...',
    noTaxesFound: 'कोई कर नहीं मिला।',
    addTax: 'कर दर जोड़ें',
    editTax: 'कर दर संपादित करें',
    taxName: 'कर का नाम',
    taxRate: 'दर (%)',
    save: 'कर सुरक्षित करें',
    cancel: 'रद्द करें',
    deleteTitle: 'कर हटाएं?',
    deleteConfirm: 'क्या आप निश्चित हैं? यह कार्य पूर्ववत नहीं किया जा सकता।',
    deleteBtn: 'हटाएं',
    placeholderName: 'जैसे: जीएसटी 18%',
    placeholderRate: 'जैसे: 18'
  }
};

export const TaxListScreen: React.FC<TaxListScreenProps> = ({ onBack }) => {
  const [taxes, setTaxes] = useState<TaxRate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', rate: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Language check
  const isHi = localStorage.getItem('language') === 'hi';
  const t = translations[isHi ? 'hi' : 'en'];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await billingService.getAllTaxes();
    setTaxes(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    const tax: TaxRate = {
        id: editingId || Math.random().toString(36).substr(2, 9),
        name: formData.name.trim(),
        rate: Number(formData.rate)
    };
    await billingService.saveTax(tax);
    setIsModalOpen(false);
    loadData();
  };

  const confirmDelete = async () => {
      if (deleteId) {
          await billingService.deleteTax(deleteId);
          setDeleteId(null);
          loadData();
      }
  };

  const openModal = (tax?: TaxRate) => {
      setEditingId(tax ? tax.id : null);
      setFormData(tax ? { name: tax.name, rate: tax.rate } : { name: '', rate: 0 });
      setIsModalOpen(true);
  };

  const filteredTaxes = taxes.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.rate.toString().includes(searchQuery)
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-main)] transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Premium layout Header */}
      <header className="bg-[var(--bg-card)] text-[var(--text-main)] p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0 z-20 transition-colors pt-[max(env(safe-area-inset-top),48px)]">
        <div className="flex items-center gap-3 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] active:scale-95 p-1.5 rounded-full transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Go back"
              id="tax-back-btn"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)]">{t.title}</h1>
              <p className="text-[9px] font-black text-[var(--text-secondary)]/80 mt-0.5 uppercase tracking-widest">
                {t.subtitle}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => openModal()} 
            className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] active:scale-95 p-1.5 rounded-full transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            id="tax-add-btn"
            title={t.addTax}
          >
            <Plus size={24} />
          </button>
        </div>
      </header>

      {/* Modern Search Field - Fully Responsive Wrapper */}
      <div className="p-4 pb-0 z-10 max-w-2xl mx-auto w-full">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-[var(--text-secondary)]/50" />
          </div>
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            className="block w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl leading-5 bg-[var(--bg-card)] text-[var(--text-main)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all shadow-3xs text-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List content with responsive width centering & motion layout */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 max-w-2xl mx-auto w-full custom-scrollbar">
        {filteredTaxes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)]/50">
            <Percent size={48} className="opacity-20 mb-2" />
            <p className="font-bold text-sm mb-1">{t.noTaxesFound}</p>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid gap-3"
          >
            <AnimatePresence mode="popLayout">
              {filteredTaxes.map(tax => (
                <motion.div 
                  key={tax.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="bg-[var(--bg-card)] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs flex justify-between items-center transition-colors hover:shadow-2xs duration-150"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-[var(--brand-light)] flex items-center justify-center text-[var(--brand-primary)] font-bold border border-[var(--brand-primary)]/10 dark:border-indigo-900/40 shadow-4xs shrink-0">
                      <Percent size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate text-sm leading-snug">{tax.name}</h3>
                      <p className="text-[11px] font-semibold text-[var(--text-secondary)] mt-0.5">
                        {t.taxRate}: {tax.rate}%
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 shrink-0 ml-4">
                    <button 
                      onClick={() => openModal(tax)} 
                      className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-light)] bg-[var(--bg-app)] rounded-xl active:scale-95 transition-all duration-150 min-w-[36px] min-h-[36px] flex items-center justify-center border border-slate-200 dark:border-slate-800 cursor-pointer"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button 
                      onClick={() => setDeleteId(tax.id)} 
                      className="p-2 text-[var(--text-secondary)] hover:text-[var(--money-out)] hover:bg-red-500/10 bg-[var(--bg-app)] rounded-xl active:scale-95 transition-all duration-150 min-w-[36px] min-h-[36px] flex items-center justify-center border border-slate-200 dark:border-slate-800 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Delete Modal Confirmation dialog */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-3xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-[var(--bg-card)] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-slate-200 dark:border-slate-800"
            >
              <div className="w-14 h-14 bg-red-500/10 text-[var(--money-out)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20 shadow-4xs">
                <Trash2 size={26} />
              </div>
              <h3 className="text-base font-black text-[var(--text-main)] mb-1.5">{t.deleteTitle}</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6 font-semibold leading-relaxed px-2">
                {t.deleteConfirm}
              </p>
              <div className="flex gap-2.5">
                <button 
                  type="button"
                  onClick={() => setDeleteId(null)} 
                  className="flex-1 py-3 bg-[var(--bg-app)] hover:bg-slate-100 dark:hover:bg-slate-800/50 text-[var(--text-secondary)] font-black text-xs tracking-wider uppercase rounded-2xl transition-all shadow-4xs active:scale-[0.97] cursor-pointer text-center border border-slate-200 dark:border-slate-800"
                >
                  {t.cancel}
                </button>
                <button 
                  type="button"
                  onClick={confirmDelete} 
                  className="flex-1 py-3 bg-[var(--money-out)] hover:bg-red-600 text-white font-black text-xs tracking-wider uppercase rounded-2xl transition-all shadow-4xs hover:shadow-2xs active:scale-[0.97] cursor-pointer"
                >
                  {t.deleteBtn}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Form Dialog Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-3xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-[var(--bg-card)] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-4 bg-[var(--bg-app)] border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-base font-black text-[var(--text-main)]">{editingId ? t.editTax : t.addTax}</h3>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] p-1.5 rounded-full active:scale-95 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">{t.taxName}</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-semibold text-xs text-center" 
                    placeholder={t.placeholderName} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">{t.taxRate}</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required 
                    value={formData.rate || ''} 
                    onChange={e => setFormData({...formData, rate: e.target.value ? parseFloat(e.target.value) : 0})} 
                    className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-bold text-xs text-center" 
                    placeholder={t.placeholderRate} 
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full h-12 bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white font-black text-xs tracking-wider uppercase rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer mt-2"
                >
                  {t.save}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
