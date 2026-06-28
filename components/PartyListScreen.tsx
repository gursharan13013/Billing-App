
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Users, X, Save, Search, Phone, MapPin, Tag, Trash2, FolderTree } from 'lucide-react';
import { Party, Category, UNIFIED_CATEGORIES } from '../types';
import { billingService } from '../src/services/billingService';


interface PartyListScreenProps {
  onBack: () => void;
  initialMode?: 'customer' | 'ledger';
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

export const PartyListScreen: React.FC<PartyListScreenProps> = ({ onBack, initialMode }) => {
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
          // We default to Customer for simplicity if unknown, 
          // or user can change it manually. It doesn't break Ledger view.
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
    p.name && p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
    p.mobile.includes(searchQuery) ||
    (p.accountGroup && p.accountGroup.toLowerCase().includes(searchQuery.trim().toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white p-4 flex items-center justify-between shadow-lg shrink-0 z-20 border-b border-slate-800 pt-[max(env(safe-area-inset-top),48px)]">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="hover:bg-white/10 p-1 rounded-full transition-colors"><ArrowLeft size={24} /></button>
            <h1 className="text-xl font-medium tracking-wide">{initialMode === 'customer' ? 'Customer List' : 'Ledger List'}</h1>
        </div>
        <button onClick={handleAddNew} className="hover:bg-white/10 p-1 rounded-full transition-colors">
            <Plus size={24} />
        </button>
      </header>

      <div className="p-4 pb-0 z-10">
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder={initialMode === 'customer' ? 'Search Customer Name or Group...' : 'Search Ledger Name or Group...'}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-700 rounded-lg leading-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-0 pb-24">
        {loading ? (
            <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        ) : filteredParties.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Users size={48} className="opacity-20 mb-2" />
                <p>{initialMode === 'customer' ? 'No customers found.' : 'No ledgers found.'}</p>
            </div>
        ) : (
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                 <div className="flex items-center text-sm font-bold text-slate-900 dark:text-slate-100 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80">
                     <span className="w-12">No.</span>
                     <span className="flex-1">Name</span>
                 </div>
                {filteredParties.map((party, index) => (
                    <div key={party.id} onClick={() => handleEdit(party)} className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                        <div className="flex items-center gap-4 flex-1">
                            <span className="text-slate-600 dark:text-slate-400 w-8">{index + 1}</span>
                            <h3 className="text-slate-900 dark:text-white text-[17px] font-medium">{party.name}</h3>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-900/50">
                    <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{initialMode === 'customer' ? 'Delete Customer?' : 'Delete Ledger?'}</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">Are you sure? This action cannot be undone.</p>
                <div className="flex gap-2">
                    <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm">Cancel</button>
                    <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-lg font-bold bg-red-600 text-white hover:bg-red-700 text-sm">Delete</button>
                </div>
            </div>
        </div>
      )}

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-900 animate-in slide-in-from-bottom-2 duration-200 pb-[max(env(safe-area-inset-bottom),0px)]">
              <div className="bg-white dark:bg-slate-900 p-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center shadow-sm shrink-0">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingId ? (initialMode === 'customer' ? 'Edit Customer' : 'Edit Ledger') : (initialMode === 'customer' ? 'Add New Customer' : 'Add New Ledger')}</h2>
                  <div className="flex gap-2">
                      {editingId && (
                          <button type="button" onClick={() => setDeleteId(editingId)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-full transition-colors"><Trash2 size={24} /></button>
                      )}
                      <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 p-2 rounded-full transition-colors"><X size={24} /></button>
                  </div>
              </div>
              
              <form id="ledgerForm" onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 pb-24">
                      {/* Registration Type Toggle */}
                      {initialMode === 'customer' && (
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${!formData.isGstRegistered ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                          onClick={() => setFormData({...formData, isGstRegistered: false, gstin: ''})}
                        >
                          Non-GST (नो जीएसटी)
                        </button>
                        <button
                          type="button"
                          className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${formData.isGstRegistered ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                          onClick={() => setFormData({...formData, isGstRegistered: true})}
                        >
                          GST Registered (जीएसटी)
                        </button>
                      </div>
                      )}

                      <div>
                          <label className="block text-sm font-bold text-slate-900 dark:text-slate-300 uppercase mb-1">{initialMode === 'customer' ? 'Customer Name *' : 'Ledger Name *'}</label>
                          <input type="text" required className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-lg text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={initialMode === 'customer' ? "e.g. Ramesh Kumar" : "e.g. Ramesh Kumar or HDFC Bank"} />
                      </div>

                      {/* Under Group Dropdown (Crucial for Accounting) */}
                      <div className="bg-blue-50 dark:bg-slate-800 p-3 rounded-lg border border-blue-200 dark:border-slate-700">
                          <label className="block text-sm font-bold text-blue-800 dark:text-blue-400 uppercase mb-1 flex items-center gap-1">
                              <FolderTree size={16} /> Select Group (खाता समूह)
                          </label>
                          <select 
                            value={formData.accountGroup} 
                            onChange={(e) => handleAccountGroupChange(e.target.value)} 
                            className="w-full bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-600 rounded-lg p-2.5 outline-none text-base text-slate-900 dark:text-white font-bold"
                          >
                              <option value="">- Select Group -</option>
                              {accountGroups.map(g => (
                                  <option key={g.id} value={g.name}>{g.name}</option>
                              ))}
                          </select>
                      </div>

                      {initialMode === 'customer' && (
                        <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-bold text-slate-900 dark:text-slate-300 uppercase mb-1">Mobile No</label>
                             <input type="tel" className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none text-lg text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} placeholder="10-digit number" />
                        </div>
                        <div>
                             <label className="block text-sm font-bold text-slate-900 dark:text-slate-300 uppercase mb-1">Party Type</label>
                             {/* Disabled because it's driven by Group, but visible */}
                             <select disabled className="w-full border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-900 rounded-lg p-3 outline-none text-lg text-slate-500 dark:text-slate-400 font-medium cursor-not-allowed" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                                 <option value="Customer">Customer</option>
                                 <option value="Supplier">Supplier</option>
                             </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-bold text-slate-900 dark:text-slate-300 uppercase mb-1">Category</label>
                              <select 
                                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none text-lg text-slate-900 dark:text-white font-medium"
                                  value={formData.category || ''}
                                  onChange={e => setFormData({...formData, category: e.target.value})}
                              >
                                  <option value="">- Select Category -</option>
                                  {UNIFIED_CATEGORIES.map((cat, idx) => (
                                      <option key={idx} value={cat.en}>
                                          {cat.en} ({cat.hi})
                                      </option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-900 dark:text-slate-300 uppercase mb-1">Email</label>
                              <input type="email" className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none text-lg text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {formData.isGstRegistered && (
                            <div>
                                <label className="block text-sm font-bold text-slate-900 dark:text-slate-300 uppercase mb-1">GSTIN</label>
                                <input type="text" className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none uppercase text-lg text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500" value={formData.gstin || ''} onChange={e => setFormData({...formData, gstin: e.target.value})} placeholder="GST Number" />
                            </div>
                        )}
                        <div className={formData.isGstRegistered ? '' : 'col-span-2'}>
                            <label className="block text-sm font-bold text-slate-900 dark:text-slate-300 uppercase mb-1">PAN</label>
                            <input type="text" className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none uppercase text-lg text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500" value={formData.pan || ''} onChange={e => setFormData({...formData, pan: e.target.value})} placeholder="PAN Number" />
                        </div>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-900 dark:text-slate-300 uppercase mb-1">Bank Details</label>
                          <textarea rows={2} className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none text-base text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500" value={formData.bankDetails || ''} onChange={e => setFormData({...formData, bankDetails: e.target.value})} placeholder="A/C No, IFSC, Bank Name" />
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-900 dark:text-slate-300 uppercase mb-1">Address</label>
                          <textarea rows={2} className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none text-base text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Street Address" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-sm font-bold text-slate-900 dark:text-slate-300 uppercase mb-1">State</label>
                             <select value={formData.state || ''} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none text-lg text-slate-900 dark:text-white font-medium">
                                <option value="">- Select State -</option>
                                {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                             </select>
                         </div>
                         <div>
                             <label className="block text-sm font-bold text-slate-900 dark:text-slate-300 uppercase mb-1">City</label>
                             <input type="text" className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none text-lg text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500" value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="City" />
                         </div>
                      </div>
                        </>
                      )}

                      <div className={`grid ${initialMode === 'customer' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                         {initialMode === 'customer' && (
                         <div>
                             <label className="block text-sm font-bold text-slate-900 dark:text-slate-300 uppercase mb-1">Pincode</label>
                             <input type="number" className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none text-lg text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500" value={formData.pincode || ''} onChange={e => setFormData({...formData, pincode: e.target.value})} placeholder="Pincode" />
                         </div>
                         )}
                          <div>
                             <label className="block text-sm font-bold text-slate-900 dark:text-slate-300 uppercase mb-2 text-center">Opening Balance</label>
                             <div className="flex justify-center gap-6 mb-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <div className="relative flex items-center justify-center">
                                    <input type="radio" className="peer sr-only" name="balanceType" value="Dr" checked={openingBalanceType === 'Dr'} onChange={() => setOpeningBalanceType('Dr')} />
                                    <div className="w-5 h-5 rounded-full border-2 border-red-500 peer-checked:border-red-600 peer-checked:bg-red-600 transition-colors"></div>
                                    <div className="absolute w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                                  </div>
                                  <span className="font-bold text-slate-700 dark:text-slate-300">Debit</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <div className="relative flex items-center justify-center">
                                    <input type="radio" className="peer sr-only" name="balanceType" value="Cr" checked={openingBalanceType === 'Cr'} onChange={() => setOpeningBalanceType('Cr')} />
                                    <div className="w-5 h-5 rounded-full border-2 border-slate-400 peer-checked:border-slate-500 peer-checked:bg-white transition-colors"></div>
                                    <div className="absolute w-2.5 h-2.5 rounded-full bg-slate-500 opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                                  </div>
                                  <span className="font-bold text-slate-700 dark:text-slate-300">Credit</span>
                                </label>
                             </div>
                             <div className="flex gap-2">
                                <input type="number" className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none text-lg text-slate-900 dark:text-white font-bold placeholder-slate-400 dark:placeholder-slate-500 text-center" value={formData.currentBalance || ''} onChange={e => setFormData({...formData, currentBalance: Number(e.target.value)})} placeholder="0" />
                             </div>
                          </div>
                      </div>
                  </form>
                  {/* Fixed bottom footer for the Ledger popup */}
                  <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] pb-[max(1rem,env(safe-area-inset-bottom))]">
                      <button type="submit" form="ledgerForm" className="w-full bg-blue-600 text-white font-bold py-3 sm:py-2.5 rounded-xl shadow-md transition-colors active:scale-95 hover:bg-blue-700 flex justify-center items-center gap-2 text-lg">
                          <Save size={24} /> Save Ledger
                      </button>
                  </div>
          </div>
      )}
    </div>
  );
};
