import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit2, Ruler, X, Save, Search, AlertCircle, Trash2 } from 'lucide-react';
import { Unit } from '../types';
import { billingService } from '../src/services/billingService';


interface UnitListScreenProps {
  onBack: () => void;
}

export const UnitListScreen: React.FC<UnitListScreenProps> = ({ onBack }) => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [error, setError] = useState<string | null>(null);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
      if (!formData.name || !formData.code) return;

      const duplicate = units.find(u => 
        u.code.toLowerCase() === formData.code.trim().toLowerCase() && 
        u.id !== editingId
      );

      if (duplicate) {
        setError('Unit code already exists. Please use a unique code.');
        return;
      }

      const unit: Unit = {
          id: editingId || Math.random().toString(36).substr(2, 9),
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase()
      };

      await billingService.saveUnit(unit);
      setIsModalOpen(false);
      loadUnits();
  };

  const filteredUnits = units.filter(u => 
    u.name && u.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
    u.code.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white p-4 flex items-center justify-between shadow-lg shrink-0 z-20 border-b border-slate-200 dark:border-slate-800 pt-[max(env(safe-area-inset-top),48px)]">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="hover:bg-white/10 p-1 rounded-full transition-colors"><ArrowLeft size={24} /></button>
            <h1 className="text-xl font-bold tracking-wide">Unit Management</h1>
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
              placeholder="Search units (e.g. Kg, Pcs)..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-700 rounded-lg leading-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {loading ? (
            <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        ) : filteredUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-sm mb-3">
                    <Ruler size={32} className="opacity-50 text-blue-500" />
                </div>
                <p className="font-medium text-lg">{units.length === 0 ? "No units found." : "No matching units found."}</p>
            </div>
        ) : (
            <div className="grid gap-3">
                {filteredUnits.map(unit => (
                    <div key={unit.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex justify-between items-center group hover:border-blue-500 dark:hover:border-blue-700 transition-all active:scale-[0.99]">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-base shadow-inner border border-slate-200 dark:border-slate-700">
                                {unit.code.substring(0,2)}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{unit.name}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                        {unit.code}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => handleEdit(unit)}
                                className="p-2.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <Edit2 size={20} />
                            </button>
                            <button 
                                onClick={() => setDeleteId(unit.id)}
                                className="p-2.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <Trash2 size={20} />
                            </button>
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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Unit?</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">Are you sure? This action cannot be undone.</p>
                <div className="flex gap-3">
                    <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Cancel</button>
                    <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700">Delete</button>
                </div>
            </div>
        </div>
      )}

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center">
                      <h2 className="text-xl font-bold">{editingId ? 'Edit Unit' : 'Add New Unit'}</h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleSave} className="p-6 space-y-5">
                      {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-start gap-2 border border-red-200 dark:border-red-900/50">
                           <AlertCircle size={18} className="mt-0.5 shrink-0" />
                           <span>{error}</span>
                        </div>
                      )}
                      
                      <div>
                          <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Unit Full Name</label>
                          <input 
                              type="text" 
                              required
                              autoFocus
                              placeholder="e.g. Kilogram, Pieces, Liters"
                              className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                              value={formData.name}
                              onChange={e => setFormData({...formData, name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5">Unit Code</label>
                          <input 
                              type="text" 
                              required
                              placeholder="e.g. KG, PCS, LTR"
                              className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all uppercase tracking-wider font-semibold text-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                              value={formData.code}
                              onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                          />
                          <p className="text-sm text-slate-500 mt-1.5 ml-1">Short code used in invoices (Max 3-5 chars)</p>
                      </div>

                      <div className="pt-2">
                          <button 
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-md active:scale-[0.98] transition-all flex justify-center items-center gap-2 text-lg"
                          >
                              <Save size={20} />
                              {editingId ? 'Update Unit' : 'Save Unit'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};