import React, { useState, useEffect } from 'react';
import { ArrowLeft, Factory, Trash2, Calendar, Package } from 'lucide-react';
import { billingService } from '../services/billingService';
import { ManufacturingEntry } from '../core/types/';


interface ManufacturingReportScreenProps {
  onBack: () => void;
}

export const ManufacturingReportScreen: React.FC<ManufacturingReportScreenProps> = ({ onBack }) => {
  const [entries, setEntries] = useState<ManufacturingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setLoading(true);
    const data = await billingService.getAllManufacturingEntries();
    setEntries(data);
    setLoading(false);
  };

  const handleDeleteClick = (id: string) => {
      setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
      if (deleteConfirmId) {
          await billingService.deleteManufacturingEntry(deleteConfirmId);
          setDeleteConfirmId(null);
          loadEntries();
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-purple-700 text-white p-4 shadow-md flex items-center gap-3 shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack} className="active:scale-95 transition-transform"><ArrowLeft size={24} /></button>
        <div className="flex items-center gap-2">
            <Factory size={20} />
            <h1 className="text-xl font-bold">Manufacturing Report</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
              <div className="flex justify-center pt-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
          ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-20 text-slate-400">
                  <Package size={48} className="mb-3 opacity-50" />
                  <p className="text-lg font-medium">No manufacturing entries found</p>
                  <p className="text-sm mt-1">Produce items to see them here.</p>
              </div>
          ) : (
              <div className="space-y-4">
                  {entries.map(entry => (
                      <div key={entry.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                                  <Calendar size={14} /> {Date.fromLocalDateString(entry.date).toLocaleDateString('en-IN')}
                              </div>
                              <button 
                                  onClick={() => handleDeleteClick(entry.id)}
                                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-md transition-colors"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>
                          
                          <div className="p-4">
                              <div className="flex justify-between items-start mb-4">
                                  <div>
                                      <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">Produced</p>
                                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{entry.finishedItemName}</h3>
                                      <p className="text-sm text-slate-600 dark:text-slate-400">Qty: <span className="font-bold text-slate-800 dark:text-slate-200">{entry.finishedQuantity}</span></p>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Cost</p>
                                      <p className="text-lg font-bold text-slate-900 dark:text-white">₹{entry.totalCost.toLocaleString('en-IN')}</p>
                                  </div>
                              </div>

                              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Raw Materials Used</p>
                                  <div className="space-y-2">
                                      {entry.rawMaterials.map((rm, idx) => (
                                          <div key={idx} className="flex justify-between text-sm">
                                              <span className="text-slate-700 dark:text-slate-300">{rm.itemName} <span className="text-slate-400">x{rm.quantity}</span></span>
                                              <span className="text-slate-600 dark:text-slate-400">₹{(rm.quantity * rm.costPerUnit).toLocaleString('en-IN')}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                              
                              {entry.notes && (
                                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 italic">"{entry.notes}"</p>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-5">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Entry?</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Are you sure you want to delete this manufacturing entry? This will reverse the stock changes and cannot be undone.
                    </p>
                </div>
                <div className="flex border-t border-slate-200 dark:border-slate-800">
                    <button 
                        onClick={() => setDeleteConfirmId(null)}
                        className="flex-1 py-3 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 py-3 text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-l border-slate-200 dark:border-slate-800"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
