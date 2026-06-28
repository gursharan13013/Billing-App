import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, X, Save, Layers, Trash2, Search, RotateCcw } from 'lucide-react';
import { AccountGroup } from '../types';
import { billingService } from '../src/services/billingService';


interface AccountGroupListScreenProps {
  onBack: () => void;
}

export const AccountGroupListScreen: React.FC<AccountGroupListScreenProps> = ({ onBack }) => {
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const handleReset = async () => {
      if (confirm('Warning: This will delete ALL existing Account Groups and load the default list. Continue?')) {
          await billingService.resetAccountGroups();
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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white p-4 flex items-center justify-between shadow-lg shrink-0 border-b border-white/10 dark:border-slate-800 pt-[max(env(safe-area-inset-top),48px)]">
        <div className="flex items-center gap-3">
            <button onClick={onBack}><ArrowLeft size={24} /></button>
            <h1 className="text-xl font-bold">Group List</h1>
        </div>
        <div className="flex gap-3">
            <button onClick={handleReset} className="hover:bg-white/10 p-1 rounded-full transition-colors" title="Load Defaults">
                <RotateCcw size={22} />
            </button>
            <button onClick={() => openModal()} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                <Plus size={24} />
            </button>
        </div>
      </header>

      <div className="p-4 pb-0 z-10">
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search Groups..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-700 rounded-lg leading-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
         {filteredGroups.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                 <Layers size={48} className="opacity-20 mb-2" />
                 <p className="font-medium">No account groups found.</p>
                 <button onClick={handleReset} className="mt-4 text-blue-500 underline text-sm">
                     Tap to Load Default Groups
                 </button>
             </div>
         ) : (
             <div className="grid gap-3">
                 <div className="flex items-center text-sm font-bold text-slate-500 px-2">
                     <span className="w-12">No.</span>
                     <span className="flex-1">Name</span>
                 </div>
                {filteredGroups.map((group, index) => (
                    <div key={group.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex justify-between items-center transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                            <span className="text-slate-500 font-medium w-6">{index + 1}</span>
                            <h3 className="font-bold text-slate-900 dark:text-white">{group.name}</h3>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => openModal(group)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 transition-colors"><Edit2 size={16} /></button>
                             <button onClick={() => setDeleteId(group.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 transition-colors"><Trash2 size={16} /></button>
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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Group?</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">Are you sure? This action cannot be undone.</p>
                <div className="flex gap-3">
                    <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Cancel</button>
                    <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700">Delete</button>
                </div>
            </div>
        </div>
      )}

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold text-slate-900 dark:text-white">{editingId ? 'Edit Group' : 'Add Group'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleSave} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Group Name</label>
                          <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500" placeholder="e.g. Bank Account" />
                      </div>
                      <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors">Save</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
