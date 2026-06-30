import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, X, Save, Layers, Trash2, Search, RotateCcw } from 'lucide-react';
import { AccountGroup, Language } from '../../../core/types/';
import { billingService } from '../../../services/billingService';

const labels = {
  en: {
    groupList: 'Group List',
    searchPlaceholder: 'Search Groups...',
    noGroups: 'No account groups found.',
    tapToLoadDefaults: 'Tap to Load Default Groups',
    noLabel: 'No.',
    nameLabel: 'Name',
    deleteGroupTitle: 'Delete Group?',
    deleteGroupConfirm: 'Are you sure? This action cannot be undone.',
    cancel: 'Cancel',
    delete: 'Delete',
    editGroup: 'Edit Group',
    addGroup: 'Add Group',
    groupName: 'Group Name',
    groupNamePlaceholder: 'e.g. Bank Account',
    save: 'Save',
    loadDefaultsTitle: 'Load Defaults',
    resetWarning: 'Warning: This will delete ALL existing Account Groups and load the default list. Continue?'
  },
  hi: {
    groupList: 'ग्रुप लिस्ट',
    searchPlaceholder: 'ग्रुप खोजें...',
    noGroups: 'कोई एकाउंट ग्रुप नहीं मिले।',
    tapToLoadDefaults: 'डिफ़ॉल्ट ग्रुप लोड करने के लिए टैप करें',
    noLabel: 'क्र.',
    nameLabel: 'नाम',
    deleteGroupTitle: 'ग्रुप हटाएं?',
    deleteGroupConfirm: 'क्या आप सुनिश्चित हैं? यह क्रिया वापस नहीं ली जा सकती।',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    editGroup: 'ग्रुप संपादित करें',
    addGroup: 'ग्रुप जोड़ें',
    groupName: 'ग्रुप का नाम',
    groupNamePlaceholder: 'उदा. बैंक खाता',
    save: 'सुरक्षित करें',
    loadDefaultsTitle: 'डिफ़ॉल्ट लोड करें',
    resetWarning: 'चेतावनी: यह सभी मौजूदा एकाउंट ग्रुप्स को हटा देगा और डिफ़ॉल्ट सूची लोड करेगा। जारी रखें?'
  }
};

interface AccountGroupListScreenProps {
  onBack: () => void;
  language?: Language;
}

export const AccountGroupListScreen: React.FC<AccountGroupListScreenProps> = ({ onBack, language }) => {
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Reset state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const currentLanguage = language || (localStorage.getItem('language') as Language) || 'en';
  const t = labels[currentLanguage] || labels.en;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await billingService.getAllAccountGroups();
    setAccountGroups(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const group: AccountGroup = {
        id: editingId || Math.random().toString(36).substr(2, 9),
        name: name
    };
    await billingService.saveAccountGroup(group);
    setIsModalOpen(false);
    loadData();
  };

  const confirmDelete = async () => {
      if (deleteId) {
          await billingService.deleteAccountGroup(deleteId);
          setDeleteId(null);
          loadData();
      }
  };

  const openModal = (group?: AccountGroup) => {
      setEditingId(group ? group.id : null);
      setName(group ? group.name : '');
      setIsModalOpen(true);
  };

  const filteredGroups = accountGroups.filter(c => 
    c.name && c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-main)] transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-[var(--bg-card)] text-[var(--text-main)] p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0 z-20 pt-[max(env(safe-area-inset-top),48px)] transition-colors">
        <div className="flex items-center gap-3 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] active:scale-95 p-1.5 rounded-full transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)]">
                {t.groupList}
              </h1>
              <p className="text-[9px] font-black text-[var(--text-secondary)]/80 mt-0.5 uppercase tracking-widest">
                {currentLanguage === 'hi' ? 'खाता समूह प्रबंधन' : 'Financial Account Categories'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowResetConfirm(true)} 
              className="hover:bg-amber-500/10 text-[var(--text-secondary)] hover:text-amber-500 active:scale-95 p-1.5 rounded-full transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer" 
              title={t.loadDefaultsTitle}
            >
              <RotateCcw size={22} />
            </button>
            <button 
              onClick={() => openModal()} 
              className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] active:scale-95 p-1.5 rounded-full transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 pb-0 z-10 flex gap-2 items-center max-w-2xl mx-auto w-full">
        <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-[var(--text-secondary)]/50" />
            </div>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              className="block w-full h-12 pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-card)] text-[var(--text-main)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all shadow-3xs text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 max-w-2xl mx-auto w-full custom-scrollbar">
         {filteredGroups.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)]">
                 <Layers size={48} className="opacity-20 mb-2" />
                 <p className="font-semibold text-sm">{t.noGroups}</p>
                 <button 
                     onClick={() => setShowResetConfirm(true)} 
                     className="mt-4 px-4 py-2 bg-[var(--brand-light)] hover:bg-[var(--brand-primary)] hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border border-[var(--brand-primary)]/20 active:scale-95"
                 >
                     {t.tapToLoadDefaults}
                 </button>
             </div>
         ) : (
             <div className="grid gap-3">
                 <div className="flex items-center text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]/70 px-2.5">
                     <span className="w-12 text-center">{t.noLabel}</span>
                     <span className="flex-1">{t.nameLabel}</span>
                 </div>
                {filteredGroups.map((group, index) => (
                    <div 
                        key={group.id} 
                        className="bg-[var(--bg-card)] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs flex justify-between items-center transition-all duration-150 hover:border-[var(--brand-primary)]/80 hover:shadow-2xs group"
                    >
                        <div className="flex items-center gap-3 flex-1">
                            <span className="text-[var(--text-secondary)]/60 font-mono text-xs w-12 text-center font-bold bg-[var(--bg-app)] py-1.5 rounded-lg border border-slate-100 dark:border-slate-800/40">{index + 1}</span>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight group-hover:text-[var(--brand-primary)] transition-colors">{group.name}</h3>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                             <button 
                                 onClick={() => openModal(group)} 
                                 className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-light)] bg-[var(--bg-app)] rounded-xl border border-slate-200 dark:border-slate-800 transition-all duration-150 active:scale-95 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer" 
                                 title={t.editGroup}
                             >
                                 <Edit2 size={15} />
                             </button>
                             <button 
                                 onClick={() => setDeleteId(group.id)} 
                                 className="p-2 text-[var(--text-secondary)] hover:text-[var(--money-out)] hover:bg-red-500/10 bg-[var(--bg-app)] rounded-xl border border-slate-200 dark:border-slate-800 transition-all duration-150 active:scale-95 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer" 
                                 title={t.delete}
                             >
                                 <Trash2 size={15} />
                             </button>
                        </div>
                    </div>
                ))}
             </div>
         )}
      </div>

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-3xs">
            <div className="bg-[var(--bg-card)] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
                <div className="w-14 h-14 bg-red-500/10 text-[var(--money-out)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20 shadow-4xs">
                    <Trash2 size={26} />
                </div>
                <h3 className="text-base font-black text-[var(--text-main)] mb-1.5">{t.deleteGroupTitle}</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-6 font-semibold leading-relaxed px-2">{t.deleteGroupConfirm}</p>
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
                        {t.delete}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-3xs">
            <div className="bg-[var(--bg-card)] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
                <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20 shadow-4xs">
                    <RotateCcw size={26} />
                </div>
                <h3 className="text-base font-black text-[var(--text-main)] mb-1.5">{t.loadDefaultsTitle}</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-6 font-semibold leading-relaxed px-2">{t.resetWarning}</p>
                <div className="flex gap-2.5">
                    <button 
                        type="button"
                        onClick={() => setShowResetConfirm(false)} 
                        className="flex-1 py-3 bg-[var(--bg-app)] hover:bg-slate-100 dark:hover:bg-slate-800/50 text-[var(--text-secondary)] font-black text-xs tracking-wider uppercase rounded-2xl transition-all shadow-4xs active:scale-[0.97] cursor-pointer text-center border border-slate-200 dark:border-slate-800"
                    >
                        {t.cancel}
                    </button>
                    <button 
                        type="button"
                        onClick={async () => {
                            await billingService.resetAccountGroups();
                            setShowResetConfirm(false);
                            loadData();
                        }} 
                        className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs tracking-wider uppercase rounded-2xl transition-all shadow-4xs hover:shadow-2xs active:scale-[0.97] cursor-pointer"
                    >
                        {currentLanguage === 'hi' ? 'लोड करें' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-3xs">
              <div className="bg-[var(--bg-card)] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-4 bg-[var(--bg-app)] border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="text-base font-black text-[var(--text-main)]">{editingId ? t.editGroup : t.addGroup}</h3>
                      <button 
                          onClick={() => setIsModalOpen(false)} 
                          className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] p-1.5 rounded-full active:scale-95 transition-all cursor-pointer"
                      >
                          <X size={18} />
                      </button>
                  </div>
                  <form onSubmit={handleSave} className="p-5 space-y-4">
                      <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">{t.groupName}</label>
                          <input 
                            type="text" 
                            required 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-semibold text-xs text-center" 
                            placeholder={t.groupNamePlaceholder} 
                          />
                      </div>
                      <button 
                        type="submit" 
                        className="w-full h-12 bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white font-black text-xs tracking-wider uppercase rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer mt-2 flex justify-center items-center gap-2"
                      >
                        <Save size={16} /> {t.save}
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
