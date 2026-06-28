import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, X, Save, FileSpreadsheet, Trash2, Search, AlertCircle } from 'lucide-react';
import { HSNCode } from '../../core/types/';
import { billingService } from '../../services/billingService';
import { motion, AnimatePresence } from 'motion/react';

interface HSNListScreenProps {
  onBack: () => void;
}

const translations = {
  en: {
    title: 'HSN Master',
    searchPlaceholder: 'Search Code or Description...',
    noHsnFound: 'No HSN codes found.',
    addHsn: 'Add HSN Code',
    editHsn: 'Edit HSN Code',
    hsnCode: 'HSN Code',
    description: 'Description',
    taxRate: 'Tax Rate (%)',
    taxRateLabel: 'Tax Rate',
    save: 'Save HSN',
    cancel: 'Cancel',
    deleteTitle: 'Delete HSN?',
    deleteConfirm: 'Are you sure? This action cannot be undone.',
    deleteBtn: 'Delete',
    placeholderCode: 'e.g. 8471',
    placeholderDesc: 'e.g. Computers & laptops',
    placeholderRate: 'e.g. 18'
  },
  hi: {
    title: 'HSN मास्टर',
    searchPlaceholder: 'HSN कोड या विवरण खोजें...',
    noHsnFound: 'कोई HSN कोड नहीं मिला।',
    addHsn: 'HSN कोड जोड़ें',
    editHsn: 'HSN कोड संपादित करें',
    hsnCode: 'HSN कोड',
    description: 'विवरण',
    taxRate: 'टैक्स दर (%)',
    taxRateLabel: 'टैक्स दर',
    save: 'HSN सुरक्षित करें',
    cancel: 'रद्द करें',
    deleteTitle: 'HSN हटाएं?',
    deleteConfirm: 'क्या आप निश्चित हैं? यह कार्य पूर्ववत नहीं किया जा सकता।',
    deleteBtn: 'हटाएं',
    placeholderCode: 'जैसे: 8471',
    placeholderDesc: 'जैसे: कंप्यूटर और लैपटॉप',
    placeholderRate: 'जैसे: 18'
  }
};

export const HSNListScreen: React.FC<HSNListScreenProps> = ({ onBack }) => {
  const [hsnList, setHsnList] = useState<HSNCode[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ code: '', description: '', taxRate: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  // Language check
  const isHi = localStorage.getItem('language') === 'hi';
  const t = translations[isHi ? 'hi' : 'en'];

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await billingService.getAllHSN();
    setHsnList(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code) return;
    const hsn: HSNCode = {
        id: editingId || Math.random().toString(36).substr(2, 9),
        code: formData.code.trim(),
        description: formData.description.trim(),
        taxRate: Number(formData.taxRate)
    };
    await billingService.saveHSN(hsn);
    setIsModalOpen(false);
    loadData();
  };

  const confirmDelete = async () => {
      if (deleteId) {
          await billingService.deleteHSN(deleteId);
          setDeleteId(null);
          loadData();
      }
  };

  const openModal = (item?: HSNCode) => {
      setEditingId(item ? item.id : null);
      setFormData(item ? { code: item.code, description: item.description || '', taxRate: item.taxRate || 0 } : { code: '', description: '', taxRate: 0 });
      setIsModalOpen(true);
  };

  const filteredHSN = hsnList.filter(h => 
    h.code.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
    (h.description && h.description.toLowerCase().includes(searchQuery.trim().toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-main)] transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Dynamic Header matching premium layouts */}
      <header className="bg-[var(--bg-card)] text-[var(--text-main)] p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0 z-20 transition-colors pt-[max(env(safe-area-inset-top),48px)]">
        <div className="flex items-center gap-3 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] active:scale-95 p-1.5 rounded-full transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Go back"
              id="hsn-back-btn"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)]">{t.title}</h1>
              <p className="text-[9px] font-black text-[var(--text-secondary)]/80 mt-0.5 uppercase tracking-widest">
                {isHi ? 'वर्गीकरण प्रणाली' : 'Ledger Tax Classification'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => openModal()} 
            className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] active:scale-95 p-1.5 rounded-full transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            id="hsn-add-btn"
            title={t.addHsn}
          >
            <Plus size={24} />
          </button>
        </div>
      </header>

      {/* Modern Search Field */}
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

      {/* Main List Area with slide-in animation */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 max-w-2xl mx-auto w-full custom-scrollbar">
        {filteredHSN.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)]/50">
            <FileSpreadsheet size={48} className="opacity-20 mb-2" />
            <p className="font-bold text-sm">{t.noHsnFound}</p>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid gap-3"
          >
            <AnimatePresence mode="popLayout">
              {filteredHSN.map(item => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="bg-[var(--bg-card)] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs flex justify-between items-center transition-colors hover:shadow-2xs duration-150"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-[var(--brand-light)] flex items-center justify-center text-[var(--brand-primary)] font-bold border border-[var(--brand-primary)]/10 dark:border-indigo-900/40 shadow-4xs shrink-0">
                      <FileSpreadsheet size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm tracking-wide text-[var(--text-main)] truncate">{item.code}</h3>
                      <div className="text-[11px] font-bold text-[var(--text-secondary)]/80 mt-0.5 truncate">{item.description || '—'}</div>
                    </div>
                  </div>
                  
                  <div className="text-right mr-4 shrink-0">
                    <div className="font-black text-sm text-[var(--brand-primary)] tracking-tight">{item.taxRate}%</div>
                    <div className="text-[9px] font-black text-[var(--text-secondary)]/70 uppercase tracking-wider mt-0.5">{t.taxRateLabel}</div>
                  </div>
                  
                  <div className="flex gap-1.5 shrink-0">
                    <button 
                      onClick={() => openModal(item)} 
                      className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-light)] bg-[var(--bg-app)] rounded-xl active:scale-95 transition-all duration-150 min-w-[36px] min-h-[36px] flex items-center justify-center border border-slate-200 dark:border-slate-800 cursor-pointer"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button 
                      onClick={() => setDeleteId(item.id)} 
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs select-none">
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
              <h3 className="text-lg font-black text-[var(--text-main)] mb-1">{t.deleteTitle}</h3>
              <p className="text-xs font-bold text-[var(--text-secondary)]/80 mb-6 px-2 leading-relaxed">
                {t.deleteConfirm}
              </p>
              <div className="flex gap-3">
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
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs tracking-wider uppercase rounded-2xl transition-all shadow-md active:scale-[0.97] cursor-pointer text-center"
                >
                  {t.deleteBtn}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Input Sheet Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs select-none">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-[var(--bg-card)] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-4 bg-[var(--bg-app)] border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-base font-black text-[var(--text-main)]">{editingId ? t.editHsn : t.addHsn}</h3>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-light)] p-1.5 rounded-full transition-all duration-150 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]/80 mb-1.5 pl-1">{t.hsnCode}</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value})} 
                    className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-bold text-xs text-center uppercase tracking-wider" 
                    placeholder={t.placeholderCode} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]/80 mb-1.5 pl-1">{t.description}</label>
                  <input 
                    type="text" 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-semibold text-xs text-center" 
                    placeholder={t.placeholderDesc} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]/80 mb-1.5 pl-1">{t.taxRate}</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.taxRate || ''} 
                    onChange={e => setFormData({...formData, taxRate: e.target.value ? parseFloat(e.target.value) : 0})} 
                    className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-bold text-xs text-center" 
                    placeholder={t.placeholderRate} 
                  />
                </div>
                
                <div className="pt-2">
                  <button 
                    type="submit" 
                    className="w-full py-3.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white font-black text-xs tracking-wider uppercase rounded-2xl transition-all shadow-md active:scale-[0.98] cursor-pointer text-center"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};