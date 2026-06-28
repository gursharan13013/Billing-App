import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Users, X, Save, Search, Phone, MapPin, Tag, Trash2, FolderTree, Mail } from 'lucide-react';
import { Party, Category, UNIFIED_CATEGORIES, Language } from '../../core/types/';
import { billingService } from '../../services/billingService';
import { SwipeableRow } from '../../components/layout/SwipeableRow';
import { motion, AnimatePresence } from 'motion/react';

const labels = {
  en: {
    customerList: 'Customer List',
    ledgerList: 'Ledger List',
    customerSubtitle: 'CRM & DEBTORS REGISTRY',
    ledgerSubtitle: 'GENERAL LEDGER ACCOUNTS',
    searchPlaceholderCustomer: 'Search Customer Name, Mobile or Group...',
    searchPlaceholderLedger: 'Search Ledger Name or Group...',
    noCustomers: 'No customers found.',
    noLedgers: 'No ledgers found.',
    noLabel: 'No.',
    nameLabel: 'Name',
    deleteTitle: 'Delete Contact?',
    deleteConfirm: 'Are you sure? This action cannot be undone.',
    cancel: 'Cancel',
    delete: 'Delete',
    editCustomer: 'Edit Customer',
    editLedger: 'Edit Ledger',
    addCustomer: 'Add Customer',
    addLedger: 'Add Ledger',
    name: 'Name',
    namePlaceholder: 'e.g. Ramesh Kumar',
    save: 'Save',
    saveLedger: 'Save Ledger',
    mobile: 'Mobile No',
    mobilePlaceholder: '10-digit number',
    partyType: 'Party Type',
    category: 'Category',
    categoryPlaceholder: '- Select Category -',
    email: 'Email',
    emailPlaceholder: 'email@example.com',
    gstin: 'GSTIN',
    gstinPlaceholder: 'GST Number',
    pan: 'PAN',
    panPlaceholder: 'PAN Number',
    bankDetails: 'Bank Details',
    bankDetailsPlaceholder: 'A/C No, IFSC, Bank Name',
    address: 'Address',
    addressPlaceholder: 'Street Address',
    state: 'State',
    statePlaceholder: '- Select State -',
    city: 'City',
    cityPlaceholder: 'City',
    pincode: 'Pincode',
    pincodePlaceholder: 'Pincode',
    openingBalance: 'Opening Balance',
    debit: 'Debit',
    credit: 'Credit',
    gstRegistered: 'GST Registered',
    nonGst: 'Non-GST',
    selectGroup: 'Select Group',
    selectGroupPlaceholder: '- Select Group -',
    balance: 'Balance',
    groupLabel: 'Group'
  },
  hi: {
    customerList: 'ग्राहक सूची',
    ledgerList: 'लेजर सूची',
    customerSubtitle: 'सीआरएम और देनदार रजिस्ट्री',
    ledgerSubtitle: 'सामान्य बही खाता सूची',
    searchPlaceholderCustomer: 'ग्राहक का नाम, मोबाइल या ग्रुप खोजें...',
    searchPlaceholderLedger: 'लेजर का नाम या ग्रुप खोजें...',
    noCustomers: 'कोई ग्राहक नहीं मिला।',
    noLedgers: 'कोई लेजर नहीं मिला।',
    noLabel: 'क्र.',
    nameLabel: 'नाम',
    deleteTitle: 'संपर्क हटाएं?',
    deleteConfirm: 'क्या आप सुनिश्चित हैं? यह क्रिया वापस नहीं ली जा सकती।',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    editCustomer: 'ग्राहक संपादित करें',
    editLedger: 'लेजर संपादित करें',
    addCustomer: 'ग्राहक जोड़ें',
    addLedger: 'लेजर जोड़ें',
    name: 'नाम',
    namePlaceholder: 'उदा. रमेश कुमार',
    save: 'सुरक्षित करें',
    saveLedger: 'लेजर सुरक्षित करें',
    mobile: 'मोबाइल नंबर',
    mobilePlaceholder: '10-अंकों का नंबर',
    partyType: 'पार्टी का प्रकार',
    category: 'श्रेणी',
    categoryPlaceholder: '- श्रेणी चुनें -',
    email: 'ईमेल',
    emailPlaceholder: 'email@example.com',
    gstin: 'जीएसटीिन (GSTIN)',
    gstinPlaceholder: 'जीएसटी नंबर',
    pan: 'पैन (PAN)',
    panPlaceholder: 'पैन नंबर',
    bankDetails: 'बैंक विवरण',
    bankDetailsPlaceholder: 'खाता संख्या, आईएफएससी, बैंक का नाम',
    address: 'पता',
    addressPlaceholder: 'गली, मोहल्ला का पता',
    state: 'राज्य',
    statePlaceholder: '- राज्य चुनें -',
    city: 'शहर',
    cityPlaceholder: 'शहर',
    pincode: 'पिनकोड',
    pincodePlaceholder: 'पिनकोड',
    openingBalance: 'प्रारंभिक शेष',
    debit: 'डेबिट (नाम)',
    credit: 'क्रेडिट (जमा)',
    gstRegistered: 'जीएसटी पंजीकृत',
    nonGst: 'गैर-जीएसटी',
    selectGroup: 'खाता समूह चुनें',
    selectGroupPlaceholder: '- खाता समूह चुनें -',
    balance: 'शेष',
    groupLabel: 'ग्रुप'
  }
};

interface PartyListScreenProps {
  onBack: () => void;
  initialMode?: 'customer' | 'ledger';
  language?: Language;
}

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
    "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", 
    "Lakshadweep", "Puducherry"
];

export const PartyListScreen: React.FC<PartyListScreenProps> = ({ onBack, initialMode, language }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountGroups, setAccountGroups] = useState<{ id: string; name: string }[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Party>>({});
  const [openingBalanceType, setOpeningBalanceType] = useState<'Dr' | 'Cr'>('Dr');

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const currentLanguage = language || (localStorage.getItem('language') as Language) || 'en';
  const t = labels[currentLanguage] || labels.en;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [partiesData, categoriesData, groupsData] = await Promise.all([
          billingService.getAllParties(),
          billingService.getAllCategories(),
          billingService.getAllAccountGroups(),
      ]);
      setParties(partiesData);
      setCategories(categoriesData);
      setAccountGroups(groupsData);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (party: Party) => {
    setEditingId(party.id);
    setFormData({ ...party, currentBalance: Math.abs(party.currentBalance || 0) });
    setOpeningBalanceType(party.currentBalance >= 0 ? 'Dr' : 'Cr');
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
      if (deleteId) {
          await billingService.deleteParty(deleteId);
          setDeleteId(null);
          loadData();
      }
  };

  const handleAddNew = () => {
      setEditingId(null);
      setFormData({ 
          name: '', 
          mobile: '', 
          type: 'Customer',
          accountGroup: accountGroups[0]?.name || '', // Default
          currentBalance: 0,
          gstin: '',
          pan: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          email: '',
          category: '',
          isGstRegistered: false,
          bankDetails: ''
      });
      setOpeningBalanceType('Dr');
      setIsModalOpen(true);
  };

  const handleAccountGroupChange = (groupName: string) => {
      setFormData(prev => ({
          ...prev,
          accountGroup: groupName,
          type: 'Customer' 
      }));
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name) return;
      
      const absBalance = Math.abs(Number(formData.currentBalance) || 0);
      const finalBalance = openingBalanceType === 'Dr' ? absBalance : -absBalance;

      const party: Party = {
          id: editingId || Math.random().toString(36).substr(2, 9),
          name: formData.name,
          mobile: formData.mobile || '',
          type: formData.type as 'Customer' | 'Supplier',
          accountGroup: formData.accountGroup || 'Sundry Debtors',
          currentBalance: finalBalance,
          gstin: formData.gstin,
          pan: formData.pan,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          email: formData.email,
          category: formData.category,
          isGstRegistered: formData.isGstRegistered ?? !!formData.gstin,
          bankDetails: formData.bankDetails
      };

      await billingService.saveParty(party);
      setIsModalOpen(false);
      loadData();
  };

  const filteredParties = parties.filter(p => 
    (p.name && p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) || 
    (p.mobile && p.mobile.includes(searchQuery)) ||
    (p.accountGroup && p.accountGroup.toLowerCase().includes(searchQuery.trim().toLowerCase()))
  );

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', ease: [0.25, 1, 0.5, 1], duration: 0.35 }}
      style={{ willChange: 'transform' }}
      className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-main)] transition-colors pb-[max(env(safe-area-inset-bottom),0px)] relative overflow-hidden"
    >
      {/* Premium Top Header */}
      <header className="bg-[var(--bg-card)] p-4 flex items-center justify-between shadow-sm shrink-0 border-b border-[var(--border-ui)] pt-[max(env(safe-area-inset-top),48px)] transition-colors">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-secondary)] hover:text-[var(--text-main)] p-2 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-main)] leading-tight">
              {initialMode === 'customer' ? t.customerList : t.ledgerList}
            </h1>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] tracking-widest mt-0.5 opacity-80 uppercase">
              {initialMode === 'customer' ? t.customerSubtitle : t.ledgerSubtitle}
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleAddNew} 
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white p-2 rounded-lg transition-all flex items-center justify-center min-w-[44px] min-h-[44px] active:scale-95 shadow-sm cursor-pointer"
        >
          <Plus size={22} />
        </button>
      </header>

      {/* Search Input Bar */}
      <div className="p-4 pb-0 z-10">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-[var(--text-secondary)]/50" />
          </div>
          <input
            type="text"
            placeholder={initialMode === 'customer' ? t.searchPlaceholderCustomer : t.searchPlaceholderLedger}
            className="block w-full h-12 pl-11 pr-3.5 border border-[var(--border-ui)] rounded-lg bg-[var(--bg-card)] text-[var(--text-main)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus-active-light dark:focus-active-dark transition-all text-sm shadow-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Parties List Body */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--brand-primary)] border-t-transparent"></div>
          </div>
        ) : filteredParties.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)]">
            <Users size={48} className="opacity-20 mb-2 text-[var(--brand-primary)]" />
            <p className="font-medium text-xs uppercase tracking-wider">{initialMode === 'customer' ? t.noCustomers : t.noLedgers}</p>
          </div>
        ) : (
          <div className="grid gap-3.5 max-w-6xl mx-auto w-full">
            <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-2.5">
              <span className="w-12">{t.noLabel}</span>
              <span className="flex-1">{t.nameLabel}</span>
            </div>

            {filteredParties.map((party, index) => (
              <SwipeableRow 
                key={party.id}
                onEdit={() => handleEdit(party)}
                onDelete={() => setDeleteId(party.id)}
              >
                <div 
                  onClick={() => handleEdit(party)} 
                  className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-ui)] shadow-sm flex items-start gap-4 transition-all duration-200 hover:scale-[1.01] group cursor-pointer w-full"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Letter Initial Avatar box matching the screenshot list rows */}
                    <div className="w-10 h-10 rounded-lg bg-[var(--brand-light)] text-[var(--brand-primary)] flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                      {party.name ? party.name.trim().charAt(0) : 'P'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[var(--text-main)] text-base leading-tight transition-colors group-hover:text-[var(--brand-primary)]">
                        {party.name}
                      </h3>
                      
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {party.accountGroup && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <FolderTree size={10} className="opacity-70 shrink-0" />
                            <span className="uppercase text-[8px] opacity-75 mr-0.5 shrink-0">{t.groupLabel}:</span>
                            <span className="truncate max-w-[120px] sm:max-w-none">{party.accountGroup}</span>
                          </span>
                        )}

                        {party.mobile && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Phone size={10} className="opacity-70 shrink-0" />
                            <span>{party.mobile}</span>
                          </span>
                        )}

                        {party.gstin && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Tag size={10} className="opacity-70 shrink-0" />
                            <span className="uppercase text-[8px] opacity-75 mr-0.5 shrink-0">{t.gstin}:</span>
                            <span className="font-mono">{party.gstin}</span>
                          </span>
                        )}

                        {party.category && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            <Tag size={10} className="opacity-70 shrink-0" />
                            <span>{party.category}</span>
                          </span>
                        )}

                        {(party.city || party.state) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                            <MapPin size={10} className="opacity-70 shrink-0" />
                            <span className="truncate max-w-[100px] sm:max-w-none">{[party.city, party.state].filter(Boolean).join(', ')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-2 ml-2">
                    <div>
                      <div className={`font-bold text-base tracking-tight ${
                        party.currentBalance > 0 
                          ? 'text-[var(--money-in)]' 
                          : party.currentBalance < 0 
                          ? 'text-[var(--money-out)]' 
                          : 'text-[var(--text-secondary)]'
                      }`}>
                        ₹{Math.abs(party.currentBalance || 0).toFixed(2)}
                        <span className="text-[10px] font-bold ml-1 uppercase opacity-90">
                          {party.currentBalance > 0 ? 'Dr' : party.currentBalance < 0 ? 'Cr' : ''}
                        </span>
                      </div>
                      <div className="text-[9px] uppercase text-[var(--text-secondary)] font-bold tracking-wider whitespace-nowrap opacity-80 mt-0.5">
                        {t.balance}
                      </div>
                    </div>
                    
                    {/* Compact actions mirroring editing details */}
                    <div className="flex gap-1.5 pt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(party); }} 
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-light)] bg-[var(--bg-app)] rounded-lg transition-all active:scale-90 border border-[var(--border-ui)] min-w-[32px] min-h-[32px] flex items-center justify-center" 
                        title={initialMode === 'customer' ? t.editCustomer : t.editLedger}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteId(party.id); }} 
                        className="p-1.5 text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-500/10 bg-[var(--bg-app)] rounded-lg transition-all active:scale-90 border border-[var(--border-ui)] min-w-[32px] min-h-[32px] flex items-center justify-center" 
                        title={t.delete}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </SwipeableRow>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-[var(--bg-card)] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-[var(--border-ui)]"
            >
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-900/50">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">{t.deleteTitle}</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6 font-medium leading-relaxed px-2">{t.deleteConfirm}</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl font-bold bg-[var(--bg-app)] text-[var(--text-secondary)] hover:bg-[var(--border-ui)]/10 transition-colors min-h-[44px]">{t.cancel}</button>
                <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-colors min-h-[44px]">{t.delete}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Sliding Form Container Drawer Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', ease: [0.25, 1, 0.5, 1], duration: 0.35 }}
              className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-2xl bg-[var(--bg-app)] text-[var(--text-main)] flex flex-col shadow-2xl overflow-hidden border border-[var(--border-ui)] pb-[max(env(safe-area-inset-bottom),0px)]"
            >
              {/* Modal Header */}
              <div className="bg-[var(--bg-card)] p-4 sm:p-5 border-b border-[var(--border-ui)] flex justify-between items-center shadow-sm shrink-0">
                <h2 className="text-lg font-bold text-[var(--text-main)] tracking-tight">
                  {editingId ? (initialMode === 'customer' ? t.editCustomer : t.editLedger) : (initialMode === 'customer' ? t.addCustomer : t.addLedger)}
                </h2>
                <div className="flex gap-2">
                  {editingId && (
                    <button type="button" onClick={() => setDeleteId(editingId)} className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center" title={t.delete}>
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-[var(--text-secondary)] hover:bg-[var(--border-ui)]/10 p-2 rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center">
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              {/* Modal Form */}
              <form id="ledgerForm" onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
                {/* Registration Type Toggle */}
                {initialMode === 'customer' && (
                  <div className="flex bg-[var(--bg-card)] p-1 rounded-xl shadow-inner border border-[var(--border-ui)]">
                    <button
                      type="button"
                      className={`flex-1 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${!formData.isGstRegistered ? 'bg-[var(--brand-primary)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--border-ui)]/10'}`}
                      onClick={() => setFormData({...formData, isGstRegistered: false, gstin: ''})}
                    >
                      {t.nonGst}
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${formData.isGstRegistered ? 'bg-[var(--brand-primary)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'}`}
                      onClick={() => setFormData({...formData, isGstRegistered: true})}
                    >
                      {t.gstRegistered}
                    </button>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Tag size={13} className="text-[var(--brand-primary)] shrink-0" />
                    {t.name} *
                  </label>
                  <input 
                    type="text" 
                    required 
                    className="w-full border border-[var(--border-ui)] bg-[var(--bg-card)] text-[var(--text-main)] rounded-xl p-3.5 focus:outline-none focus-active-light dark:focus-active-dark outline-none text-base font-bold placeholder-[var(--text-secondary)]/30 transition-all shadow-sm min-h-[44px]" 
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder={t.namePlaceholder} 
                  />
                </div>

                {/* Under Group Dropdown */}
                <div className="bg-[var(--brand-light)] p-4 rounded-xl border border-[var(--brand-primary)]/15 shadow-sm transition-all duration-300">
                  <label className="block text-[10px] font-bold tracking-wider text-[var(--brand-primary)] uppercase mb-2 flex items-center gap-1.5">
                    <FolderTree size={15} className="shrink-0" /> {t.selectGroup}
                  </label>
                  <select 
                    value={formData.accountGroup || ''} 
                    onChange={(e) => handleAccountGroupChange(e.target.value)} 
                    className="w-full bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-ui)] rounded-lg p-2.5 outline-none text-sm font-bold focus:border-[var(--brand-primary)] transition-all cursor-pointer min-h-[44px]"
                  >
                    <option value="">{t.selectGroupPlaceholder}</option>
                    {accountGroups.map(g => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {initialMode === 'customer' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Phone size={13} className="text-[var(--brand-primary)] shrink-0" />
                          {t.mobile}
                        </label>
                        <input type="tel" className="w-full border border-[var(--border-ui)] bg-[var(--bg-card)] text-[var(--text-main)] rounded-xl p-3.5 focus:outline-none focus-active-light dark:focus-active-dark outline-none text-base font-bold placeholder-[var(--text-secondary)]/30 transition-all shadow-sm min-h-[44px]" value={formData.mobile || ''} onChange={e => setFormData({...formData, mobile: e.target.value})} placeholder={t.mobilePlaceholder} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Users size={13} className="text-[var(--brand-primary)] shrink-0" />
                          {t.partyType}
                        </label>
                        <select disabled className="w-full border border-[var(--border-ui)] bg-[var(--bg-app)] text-[var(--text-secondary)]/75 rounded-xl p-3.5 outline-none text-base font-bold cursor-not-allowed shadow-sm min-h-[44px]" value={formData.type || 'Customer'} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                          <option value="Customer">Customer</option>
                          <option value="Supplier">Supplier</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Tag size={13} className="text-[var(--brand-primary)] shrink-0" />
                          {t.category}
                        </label>
                        <select 
                          className="w-full border border-[var(--border-ui)] bg-[var(--bg-card)] text-[var(--text-main)] rounded-xl p-3.5 focus:outline-none focus-active-light dark:focus-active-dark outline-none text-sm font-bold transition-all shadow-sm min-h-[44px]"
                          value={formData.category || ''}
                          onChange={e => setFormData({...formData, category: e.target.value})}
                        >
                          <option value="">{t.categoryPlaceholder}</option>
                          {UNIFIED_CATEGORIES.map((cat, idx) => (
                            <option key={idx} value={cat.en}>
                              {cat.en} ({cat.hi})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Mail size={13} className="text-[var(--brand-primary)] shrink-0" />
                          {t.email}
                        </label>
                        <input type="email" className="w-full border border-[var(--border-ui)] bg-[var(--bg-card)] text-[var(--text-main)] rounded-xl p-3.5 focus:outline-none focus-active-light dark:focus-active-dark outline-none text-base font-bold placeholder-[var(--text-secondary)]/30 transition-all shadow-sm min-h-[44px]" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder={t.emailPlaceholder} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {formData.isGstRegistered && (
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
                            <Tag size={13} className="text-[var(--brand-primary)] shrink-0" />
                            {t.gstin}
                          </label>
                          <input type="text" className="w-full border border-[var(--border-ui)] bg-[var(--bg-card)] text-[var(--text-main)] rounded-xl p-3.5 focus:outline-none focus-active-light dark:focus-active-dark outline-none uppercase text-base font-bold placeholder-[var(--text-secondary)]/30 transition-all shadow-sm min-h-[44px]" value={formData.gstin || ''} onChange={e => setFormData({...formData, gstin: e.target.value})} placeholder={t.gstinPlaceholder} />
                        </div>
                      )}
                      <div className={`${formData.isGstRegistered ? '' : 'sm:col-span-2'} space-y-1.5`}>
                        <label className="block text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Tag size={13} className="text-[var(--brand-primary)] shrink-0" />
                          {t.pan}
                        </label>
                        <input type="text" className="w-full border border-[var(--border-ui)] bg-[var(--bg-card)] text-[var(--text-main)] rounded-xl p-3.5 focus:outline-none focus-active-light dark:focus-active-dark outline-none uppercase text-base font-bold placeholder-[var(--text-secondary)]/30 transition-all shadow-sm min-h-[44px]" value={formData.pan || ''} onChange={e => setFormData({...formData, pan: e.target.value})} placeholder={t.panPlaceholder} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
                        <FolderTree size={13} className="text-[var(--brand-primary)] shrink-0" />
                        {t.bankDetails}
                      </label>
                      <textarea rows={2} className="w-full border border-[var(--border-ui)] bg-[var(--bg-card)] text-[var(--text-main)] rounded-xl p-3 focus:outline-none focus-active-light dark:focus-active-dark outline-none text-sm font-bold placeholder-[var(--text-secondary)]/30 transition-all shadow-sm" value={formData.bankDetails || ''} onChange={e => setFormData({...formData, bankDetails: e.target.value})} placeholder={t.bankDetailsPlaceholder} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
                        <MapPin size={13} className="text-[var(--brand-primary)] shrink-0" />
                        {t.address}
                      </label>
                      <textarea rows={2} className="w-full border border-[var(--border-ui)] bg-[var(--bg-card)] text-[var(--text-main)] rounded-xl p-3 focus:outline-none focus-active-light dark:focus-active-dark outline-none text-sm font-bold placeholder-[var(--text-secondary)]/30 transition-all shadow-sm" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder={t.addressPlaceholder} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
                          <MapPin size={13} className="text-[var(--brand-primary)] shrink-0" />
                          {t.state}
                        </label>
                        <select value={formData.state || ''} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full border border-[var(--border-ui)] bg-[var(--bg-card)] text-[var(--text-main)] rounded-xl p-3.5 focus:outline-none focus-active-light dark:focus-active-dark outline-none text-sm font-bold transition-all shadow-sm min-h-[44px]">
                          <option value="">{t.statePlaceholder}</option>
                          {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
                          <MapPin size={13} className="text-[var(--brand-primary)] shrink-0" />
                          {t.city}
                        </label>
                        <input type="text" className="w-full border border-[var(--border-ui)] bg-[var(--bg-card)] text-[var(--text-main)] rounded-xl p-3.5 focus:outline-none focus-active-light dark:focus-active-dark outline-none text-base font-bold placeholder-[var(--text-secondary)]/30 transition-all shadow-sm min-h-[44px]" value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} placeholder={t.cityPlaceholder} />
                      </div>
                    </div>
                  </>
                )}

                <div className={`grid grid-cols-1 ${initialMode === 'customer' ? 'sm:grid-cols-2' : ''} gap-5`}>
                  {initialMode === 'customer' && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
                        <MapPin size={13} className="text-[var(--brand-primary)] shrink-0" />
                        {t.pincode}
                      </label>
                      <input type="number" className="w-full border border-[var(--border-ui)] bg-[var(--bg-card)] text-[var(--text-main)] rounded-xl p-3.5 focus:outline-none focus-active-light dark:focus-active-dark outline-none text-base font-bold placeholder-[var(--text-secondary)]/30 transition-all shadow-sm min-h-[44px]" value={formData.pincode || ''} onChange={e => setFormData({...formData, pincode: e.target.value})} placeholder={t.pincodePlaceholder} />
                    </div>
                  )}
                  
                  <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] p-4 rounded-2xl shadow-sm transition-all duration-300">
                    <label className="block text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)] mb-3 text-center">
                      {t.openingBalance}
                    </label>
                    
                    <div className="flex bg-[var(--bg-app)] p-1 rounded-xl border border-[var(--border-ui)] max-w-xs mx-auto mb-4">
                      <button
                        type="button"
                        className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${openingBalanceType === 'Dr' ? 'bg-emerald-600 text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'}`}
                        onClick={() => setOpeningBalanceType('Dr')}
                      >
                        {t.debit}
                      </button>
                      <button
                        type="button"
                        className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${openingBalanceType === 'Cr' ? 'bg-red-600 text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'}`}
                        onClick={() => setOpeningBalanceType('Cr')}
                      >
                        {t.credit}
                      </button>
                    </div>

                    <div className="relative max-w-xs mx-auto">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <span className="text-[var(--text-secondary)]/50 font-bold text-lg">₹</span>
                      </div>
                      <input 
                        type="number" 
                        className="w-full pl-8 pr-3.5 border border-[var(--border-ui)] bg-[var(--bg-app)] text-[var(--text-main)] rounded-xl p-3 outline-none text-lg font-black placeholder-[var(--text-secondary)]/30 text-center focus:border-[var(--brand-primary)] transition-all min-h-[44px]" 
                        value={formData.currentBalance || ''} 
                        onChange={e => setFormData({...formData, currentBalance: Number(e.target.value)})} 
                        placeholder="0" 
                      />
                    </div>
                  </div>
                </div>
              </form>
              
              {/* Save Footer Button */}
              <div className="p-4 sm:p-5 bg-[var(--bg-card)] border-t border-[var(--border-ui)] shadow-sm shrink-0">
                <button type="submit" form="ledgerForm" className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white font-bold py-3.5 rounded-xl shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.98] flex justify-center items-center gap-2 text-base min-h-[48px] uppercase tracking-wider">
                  <Save size={20} /> <span>{initialMode === 'customer' ? t.save : t.saveLedger}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
