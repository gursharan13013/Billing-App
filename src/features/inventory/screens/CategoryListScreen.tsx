import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, X, Save, Layers, Trash2, Search, RotateCcw } from 'lucide-react';
import { Category } from '../../../core/types/';
import { billingService } from '../../../services/billingService';
import { motion, AnimatePresence } from 'motion/react';

interface CategoryListScreenProps {
  onBack: () => void;
}

const translations = {
  en: {
    title: 'Category Master',
    searchPlaceholder: 'Search Category...',
    noCategoriesFound: 'No categories found.',
    addCategory: 'Add Category',
    editCategory: 'Edit Category',
    categoryName: 'Category Name',
    save: 'Save Category',
    cancel: 'Cancel',
    deleteTitle: 'Delete Category?',
    deleteConfirm: 'Are you sure? This action cannot be undone.',
    deleteBtn: 'Delete',
    placeholderName: 'e.g. Electronics',
    loadDefaults: 'Tap to Load Business Categories',
    confirmReset: 'Warning: This will delete ALL existing categories and load the default list (Grocery, Dairy, etc.). Continue?'
  },
  hi: {
    title: 'श्रेणी मास्टर (Category)',
    searchPlaceholder: 'श्रेणी खोजें...',
    noCategoriesFound: 'कोई श्रेणी नहीं मिली।',
    addCategory: 'श्रेणी जोड़ें',
    editCategory: 'श्रेणी संपादित करें',
    categoryName: 'श्रेणी का नाम',
    save: 'श्रेणी सुरक्षित करें',
    cancel: 'रद्द करें',
    deleteTitle: 'श्रेणी हटाएं?',
    deleteConfirm: 'क्या आप निश्चित हैं? यह कार्य पूर्ववत नहीं किया जा सकता।',
    deleteBtn: 'हटाएं',
    placeholderName: 'जैसे: इलेक्ट्रॉनिक्स',
    loadDefaults: 'व्यावसायिक श्रेणियां लोड करने के लिए टैप करें',
    confirmReset: 'चेतावनी: यह सभी मौजूदा श्रेणियों को हटा देगा और डिफ़ॉल्ट सूची (किराना, डेयरी, आदि) लोड करेगा। जारी रखें?'
  }
};

export const CategoryListScreen: React.FC<CategoryListScreenProps> = ({ onBack }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Language check
  const isHi = localStorage.getItem('language') === 'hi';
  const t = translations[isHi ? 'hi' : 'en'];

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await billingService.getAllCategories();
    setCategories(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const category: Category = {
        id: editingId || Math.random().toString(36).substr(2, 9),
        name: name.trim()
    };
    await billingService.saveCategory(category);
    setIsModalOpen(false);
    loadData();
  };

  const confirmDelete = async () => {
      if (deleteId) {
          await billingService.deleteCategory(deleteId);
          setDeleteId(null);
          loadData();
      }
  };

  const handleReset = async () => {
      if (confirm(t.confirmReset)) {
          await billingService.resetCategories();
          loadData();
      }
  };

  const openModal = (cat?: Category) => {
      setEditingId(cat ? cat.id : null);
      setName(cat ? cat.name : '');
      setIsModalOpen(true);
  };

  const filteredCategories = categories.filter(c => 
    c.name && c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
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
              id="cat-back-btn"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)]">{t.title}</h1>
              <p className="text-[9px] font-black text-[var(--text-secondary)]/80 mt-0.5 uppercase tracking-widest">
                {isHi ? 'समूह वर्गीकरण' : 'Inventory Group Management'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleReset} 
              className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] active:scale-95 p-1.5 rounded-full transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer" 
              title={t.loadDefaults}
            >
              <RotateCcw size={21} />
            </button>
            <button 
              onClick={() => openModal()} 
              className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] active:scale-95 p-1.5 rounded-full transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              id="cat-add-btn"
              title={t.addCategory}
            >
              <Plus size={24} />
            </button>
          </div>
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

      {/* List content with motion layout */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 max-w-2xl mx-auto w-full custom-scrollbar">
        {filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)]/50">
            <Layers size={48} className="opacity-20 mb-2" />
            <p className="font-bold text-sm mb-1">{t.noCategoriesFound}</p>
            <button 
              onClick={handleReset} 
              className="mt-3 text-xs font-black text-[var(--brand-primary)] hover:underline flex items-center gap-1.5 cursor-pointer bg-[var(--brand-light)] px-3 py-1.5 rounded-full"
            >
              <RotateCcw size={13} /> {t.loadDefaults}
            </button>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid gap-3"
          >
            <AnimatePresence mode="popLayout">
              {filteredCategories.map(cat => (
                <motion.div 
                  key={cat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="bg-[var(--bg-card)] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs flex justify-between items-center transition-colors hover:shadow-2xs duration-150"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-[var(--brand-light)] flex items-center justify-center text-[var(--brand-primary)] font-bold border border-[var(--brand-primary)]/10 dark:border-indigo-900/40 shadow-4xs shrink-0">
                      <Layers size={18} />
                    </div>
                    <h3 className="font-extrabold text-sm tracking-wide text-[var(--text-main)] truncate">{cat.name}</h3>
                  </div>
                  
                  <div className="flex gap-1.5 shrink-0 ml-4">
                    <button 
                      onClick={() => openModal(cat)} 
                      className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-light)] bg-[var(--bg-app)] rounded-xl active:scale-95 transition-all duration-150 min-w-[36px] min-h-[36px] flex items-center justify-center border border-slate-200 dark:border-slate-800 cursor-pointer"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button 
                      onClick={() => setDeleteId(cat.id)} 
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

      {/* Add / Edit Category Modal */}
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
                <h3 className="text-base font-black text-[var(--text-main)]">{editingId ? t.editCategory : t.addCategory}</h3>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-light)] p-1.5 rounded-full transition-all duration-150 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]/80 mb-1.5 pl-1">{t.categoryName}</label>
                  <input 
                    type="text" 
                    required 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-semibold text-xs text-center" 
                    placeholder={t.placeholderName} 
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