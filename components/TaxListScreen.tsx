import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, X, Save, Percent, Trash2 } from 'lucide-react';
import { TaxRate } from '../types';
import { billingService } from '../src/services/billingService';


interface TaxListScreenProps {
  onBack: () => void;
}

export const TaxListScreen: React.FC<TaxListScreenProps> = ({ onBack }) => {
  const [taxes, setTaxes] = useState<TaxRate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', rate: 0 });

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await billingService.getAllTaxes();
    setTaxes(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const tax: TaxRate = {
        id: editingId || Math.random().toString(36).substr(2, 9),
        name: formData.name,
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

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white p-4 flex items-center justify-between shadow-lg shrink-0 border-b border-white/10 dark:border-slate-800 pt-[max(env(safe-area-inset-top),48px)]">
        <div className="flex items-center gap-3">
            <button onClick={onBack}><ArrowLeft size={24} /></button>
            <h1 className="text-xl font-bold">Tax Master</h1>
        </div>
        <button onClick={() => openModal()} className="hover:bg-white/10 p-1 rounded-full transition-colors">
            <Plus size={24} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
         <div className="grid gap-3">
            {taxes.map(tax => (
                <div key={tax.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex justify-between items-center transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-900/50">
                            <Percent size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">{tax.name}</h3>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Rate: {tax.rate}%</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => openModal(tax)} className="p-2 text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 transition-colors"><Edit2 size={16} /></button>
                         <button onClick={() => setDeleteId(tax.id)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 transition-colors"><Trash2 size={16} /></button>
                    </div>
                </div>
            ))}
         </div>
      </div>

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-900/50">
                    <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Tax?</h3>
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
                      <h3 className="font-bold text-slate-900 dark:text-white">{editingId ? 'Edit Tax' : 'Add Tax'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleSave} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Tax Name</label>
                          <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500" placeholder="e.g. GST 5%" />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Rate (%)</label>
                          <input type="number" required value={formData.rate} onChange={e => setFormData({...formData, rate: parseFloat(e.target.value)})} className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500" placeholder="5" />
                      </div>
                      <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors">Save</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};