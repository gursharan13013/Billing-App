import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Ruler, X, Save, Search, AlertCircle, Trash2 } from 'lucide-react';
import { Unit, Language } from '../../../core/types/';
import { billingService } from '../../../services/billingService';
import { motion, AnimatePresence } from 'motion/react';

interface UnitListScreenProps {
  onBack: () => void;
  currentLanguage?: Language;
}

const LOCALIZATION = {
  en: {
    unitManagement: "Unit Management",
    searchPlaceholder: "Search units (e.g. Kg, Pcs, Box)...",
    noUnitsFound: "No units found.",
    noMatchingUnits: "No matching units found.",
    editUnit: "Edit Unit Details",
    addNewUnit: "Create New Unit",
    unitFullName: "Unit Full Name",
    unitFullNamePlaceholder: "e.g. Kilograms, Pieces, Liters",
    unitCode: "Unit short code (capitalized)",
    unitCodePlaceholder: "e.g. KG, PCS, LTR",
    unitCodeHelp: "Short identifier used in printed invoices (Max 3-5 chars)",
    unitCodeDuplicate: "Unit code already exists. Please use a unique code.",
    deleteUnitTitle: "Delete Unit Account?",
    deleteUnitMsg: "Are you sure? This will remove the selected unit. This action cannot be reversed.",
    cancel: "Cancel",
    delete: "Delete Forever",
    save: "Create Unit",
    update: "Save Changes"
  },
  hi: {
    unitManagement: "यूनिट प्रबंधन",
    searchPlaceholder: "यूनिट खोजें (उदा. Kg, Pcs)...",
    noUnitsFound: "कोई मापन इकाई नहीं मिली।",
    noMatchingUnits: "कोई मेल खाती हुई इकाई नहीं मिली।",
    editUnit: "इकाई विवरण संपादित करें",
    addNewUnit: "नई इकाई जोड़ें",
    unitFullName: "इकाई का पूरा नाम",
    unitFullNamePlaceholder: "उदा. किलोग्राम, पीस, लीटर",
    unitCode: "इकाई शॉर्ट कोड (कैपिटल)",
    unitCodePlaceholder: "उदा. KG, PCS, LTR",
    unitCodeHelp: "इनवॉइस प्रिंटिंग में प्रयुक्त होने वाला शॉर्ट कोड (अधिकतम 3-5 वर्ण)",
    unitCodeDuplicate: "यह कोड पहले से उपलब्ध है। कृपया कोई अन्य कोड चुनें।",
    deleteUnitTitle: "क्या मापन इकाई हटाना चाहते हैं?",
    deleteUnitMsg: "क्या आप निश्चित हैं? इस क्रिया को करने के बाद डेटा वापस नहीं लाया जा सकेगा।",
    cancel: "रद्द करें",
    delete: "स्थायी रूप से हटाएं",
    save: "इकाई सहेजें",
    update: "बदलाव सुरक्षित करें"
  }
};

export const UnitListScreen: React.FC<UnitListScreenProps> = ({ onBack, currentLanguage }) => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Focus State Tracker for dynamic aura glow
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [error, setError] = useState<string | null>(null);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const activeLanguage = currentLanguage || (localStorage.getItem('appLanguage') as Language) || 'en';
  const t = LOCALIZATION[activeLanguage];

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      setLoading(true);
      const data = await billingService.getAllUnits();
      setUnits(data);
    } catch (error) {
      console.error("Failed to load units", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (unit: Unit) => {
    setError(null);
    setEditingId(unit.id);
    setFormData({ name: unit.name, code: unit.code });
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await billingService.deleteUnit(deleteId);
      setDeleteId(null);
      loadUnits();
    }
  };

  const handleAddNew = () => {
    setError(null);
    setEditingId(null);
    setFormData({ name: '', code: '' });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) return;

    const duplicate = units.find(u => 
      u.code.toLowerCase() === formData.code.trim().toLowerCase() && 
      u.id !== editingId
    );

    if (duplicate) {
      setError(t.unitCodeDuplicate);
      return;
    }

    const unit: Unit = {
      id: editingId || Math.random().toString(36).substring(2, 11),
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase()
    };

    await billingService.saveUnit(unit);
    setIsModalOpen(false);
    loadUnits();
  };

  const filteredUnits = units.filter(u => 
    (u.name && u.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) || 
    u.code.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-main)] transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* HEADER SECTION */}
      <header className="bg-[var(--bg-card)] text-[var(--text-main)] p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pt-[max(env(safe-area-inset-top),48px)] transition-colors shrink-0">
        <div className="flex items-center gap-3 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] active:scale-95 p-1.5 rounded-full transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Go back"
              id="unit-back-btn"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)]" id="unit-header-title">{t.unitManagement}</h1>
              <p className="text-[9px] font-black text-[var(--text-secondary)]/80 mt-0.5 uppercase tracking-widest">
                {activeLanguage === 'hi' ? 'मापन इकाई प्रबंधन' : 'Product Metric Units'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleAddNew} 
            className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] active:scale-95 p-1.5 rounded-full transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            title={t.addNewUnit}
            id="unit-add-new-btn"
          >
            <Plus size={24} />
          </button>
        </div>
      </header>

      {/* SEARCH BAR SECTION */}
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
            id="unit-search-input"
          />
        </div>
      </div>

      {/* LIST CONTENT SECTION */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 max-w-2xl mx-auto w-full custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[var(--brand-primary)]"></div>
            <span className="text-xs text-[var(--text-secondary)]">Loading master units...</span>
          </div>
        ) : filteredUnits.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-64 text-center text-[var(--text-secondary)]"
            id="unit-empty-state"
          >
            <div className="bg-[var(--bg-card)] p-5 rounded-full shadow-sm mb-4 border border-slate-200 dark:border-slate-800">
              <Ruler size={36} className="text-[var(--brand-primary)] opacity-80" />
            </div>
            <p className="font-semibold text-lg text-[var(--text-main)]">
              {units.length === 0 ? t.noUnitsFound : t.noMatchingUnits}
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-3" id="unit-grid-container">
            <AnimatePresence mode="popLayout">
              {filteredUnits.map((unit, idx) => (
                <motion.div 
                  key={unit.id} 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15, delay: Math.min(0.15, idx * 0.03) }}
                  className="bg-[var(--bg-card)] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs flex justify-between items-center group transition-all duration-200 hover:shadow-2xs"
                  id={`unit-card-${unit.id}`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-light)] border border-indigo-600/10 dark:border-indigo-500/20 text-[var(--brand-primary)] font-extrabold text-sm flex items-center justify-center shrink-0">
                      {unit.code.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base md:text-lg tracking-tight">{unit.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-[var(--brand-primary)] font-extrabold uppercase tracking-wider bg-[var(--brand-light)] px-2 py-0.5 rounded border border-indigo-600/20 dark:border-indigo-500/30">
                          {unit.code}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-4 relative z-10">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(unit);
                      }}
                      className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-light)] bg-[var(--bg-app)] rounded-xl active:scale-95 transition-all duration-150 min-w-[36px] min-h-[36px] flex items-center justify-center border border-slate-200 dark:border-slate-800 cursor-pointer"
                      title={t.editUnit}
                      id={`unit-edit-btn-${unit.id}`}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(unit.id);
                      }}
                      className="p-2 text-[var(--text-secondary)] hover:text-[var(--money-out)] hover:bg-red-500/10 bg-[var(--bg-app)] rounded-xl active:scale-95 transition-all duration-150 min-w-[36px] min-h-[36px] flex items-center justify-center border border-slate-200 dark:border-slate-800 cursor-pointer"
                      title={t.delete}
                      id={`unit-delete-btn-${unit.id}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-3xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-[var(--bg-card)] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-slate-200 dark:border-slate-800"
              id="unit-delete-modal"
            >
              <div className="w-14 h-14 bg-red-500/10 text-[var(--money-out)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20 shadow-4xs">
                <Trash2 size={26} />
              </div>
              <h3 className="text-base font-black text-[var(--text-main)] mb-1.5" id="unit-delete-modal-title">{t.deleteUnitTitle}</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6 font-semibold leading-relaxed px-2">
                {t.deleteUnitMsg}
              </p>
              <div className="flex gap-2.5">
                <button 
                  type="button"
                  onClick={() => setDeleteId(null)} 
                  className="flex-1 py-3 bg-[var(--bg-app)] hover:bg-slate-100 dark:hover:bg-slate-800/50 text-[var(--text-secondary)] font-black text-xs tracking-wider uppercase rounded-2xl transition-all shadow-4xs active:scale-[0.97] cursor-pointer text-center border border-slate-200 dark:border-slate-800"
                  id="unit-delete-cancel-btn"
                >
                  {t.cancel}
                </button>
                <button 
                  type="button"
                  onClick={confirmDelete} 
                  className="flex-1 py-3 bg-[var(--money-out)] hover:bg-red-600 text-white font-black text-xs tracking-wider uppercase rounded-2xl transition-all shadow-4xs hover:shadow-2xs active:scale-[0.97] cursor-pointer"
                  id="unit-delete-confirm-btn"
                >
                  {t.delete}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-3xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-[var(--bg-card)] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800"
              id="unit-form-modal"
            >
              <div className="p-4 bg-[var(--bg-app)] border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-base font-black text-[var(--text-main)]" id="unit-form-modal-title">{editingId ? t.editUnit : t.addNewUnit}</h3>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] p-1.5 rounded-full active:scale-95 transition-all cursor-pointer"
                  id="unit-form-modal-close"
                >
                  <X size={18} />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-5 space-y-4">
                {error && (
                  <div className="bg-red-500/10 text-[var(--money-out)] p-4 rounded-2xl text-xs flex items-start gap-2.5 border border-red-500/20 font-semibold" id="unit-form-error">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider" id="unit-name-label">{t.unitFullName}</label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    placeholder={t.unitFullNamePlaceholder}
                    className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-semibold text-xs text-center"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    id="unit-name-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider" id="unit-code-label">{t.unitCode}</label>
                  <input 
                    type="text" 
                    required
                    placeholder={t.unitCodePlaceholder}
                    className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-bold text-xs text-center uppercase tracking-wider"
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    id="unit-code-input"
                  />
                  <p className="text-[10px] font-black text-[var(--text-secondary)]/60 mt-1.5 text-center block uppercase tracking-wider">{t.unitCodeHelp}</p>
                </div>

                <button 
                  type="submit"
                  className="w-full h-12 bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white font-black text-xs tracking-wider uppercase rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer mt-2"
                  id="unit-form-submit-btn"
                >
                  {editingId ? t.update : t.save}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
