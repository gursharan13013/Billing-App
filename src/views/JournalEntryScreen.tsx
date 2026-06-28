import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Plus, Trash2, AlertCircle, X, Search, ArrowRightLeft } from 'lucide-react';
import { Party, JournalRow, JournalVoucher } from '../core/types/';
import { billingService } from '../services/billingService';


interface JournalEntryScreenProps {
  onBack: () => void;
  initialDate?: Date;
}

// Local interface extending JournalRow to track UI state (Dr/Cr selection)
interface JournalRowUI extends JournalRow {
  rowType: 'Dr' | 'Cr'; 
}

export const JournalEntryScreen: React.FC<JournalEntryScreenProps> = ({ onBack, initialDate }) => {
  // Use global date if provided
  const [date, setDate] = useState((initialDate || new Date()).toLocalDateString());
  const [narration, setNarration] = useState('');
  
  // Initial State: One Dr and One Cr (Standard double entry)
  const [rows, setRows] = useState<JournalRowUI[]>([
      { id: '1', partyId: '', partyName: '', debit: 0, credit: 0, rowType: 'Dr' },
      { id: '2', partyId: '', partyName: '', debit: 0, credit: 0, rowType: 'Cr' }
  ]);
  const [voucherNo, setVoucherNo] = useState('');

  // Party Selection Modal State
  const [showPartySelector, setShowPartySelector] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Refs for auto-focus
  const amountInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
      const loadParties = async () => {
          const data = await billingService.getAllParties();
          setParties(data);
      };
      loadParties();
      setVoucherNo(`JV-${Math.floor(1000 + Math.random() * 9000)}`);
  }, []);

  const totalDebit = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
  const totalCredit = rows.reduce((sum, row) => sum + (Number(row.credit) || 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit > 0 && diff < 0.01;

  // Toggle Dr/Cr for a row
  const toggleRowType = (id: string) => {
      setRows(prev => prev.map(row => {
          if (row.id === id) {
              const newType = row.rowType === 'Dr' ? 'Cr' : 'Dr';
              // Swap values when toggling type to preserve amount but move column
              return { 
                  ...row, 
                  rowType: newType,
                  debit: newType === 'Dr' ? (row.credit || row.debit) : 0,
                  credit: newType === 'Cr' ? (row.debit || row.credit) : 0
              };
          }
          return row;
      }));
  };

  const handleAmountChange = (id: string, value: string) => {
      const numValue = parseFloat(value) || 0;
      
      setRows(prev => {
          // 1. Update the modified row
          const updatedRows = prev.map(row => {
              if (row.id === id) {
                  return { 
                      ...row, 
                      debit: row.rowType === 'Dr' ? numValue : 0,
                      credit: row.rowType === 'Cr' ? numValue : 0
                  };
              }
              return row;
          });

          // 2. AUTO-FILL LOGIC: If we have exactly 2 rows (Simple Entry),
          // copy the amount to the second row automatically.
          if (updatedRows.length === 2) {
              const changedIndex = prev.findIndex(r => r.id === id);
              const otherIndex = changedIndex === 0 ? 1 : 0; // The other row

              // Only auto-fill if we are editing the first row, or simply keep them in sync
              // Let's keep them in sync regardless of which one is edited for 2-row entries
              const sourceAmount = updatedRows[changedIndex].rowType === 'Dr' 
                  ? updatedRows[changedIndex].debit 
                  : updatedRows[changedIndex].credit;

              if (updatedRows[otherIndex].rowType === 'Dr') {
                  updatedRows[otherIndex].debit = sourceAmount;
                  updatedRows[otherIndex].credit = 0;
              } else {
                  updatedRows[otherIndex].credit = sourceAmount;
                  updatedRows[otherIndex].debit = 0;
              }
          }

          return updatedRows;
      });
  };

  const openPartySelector = (rowId: string) => {
      setActiveRowId(rowId);
      setSearchQuery('');
      setShowPartySelector(true);
  };

  const handleSelectParty = (party: Party) => {
      if (activeRowId) {
          setRows(prev => prev.map(row => 
              row.id === activeRowId ? { ...row, partyId: party.id, partyName: party.name } : row
          ));
          setShowPartySelector(false);
          
          // Auto-focus the correct amount field after selecting party
          setTimeout(() => {
              if (amountInputRefs.current[activeRowId]) {
                  amountInputRefs.current[activeRowId]?.focus();
                  amountInputRefs.current[activeRowId]?.select();
              }
          }, 100);
          
          setActiveRowId(null);
      }
  };

  const addRow = () => {
      // Smartly guess the next row type (if current is unbalanced, add the opposite)
      const nextType = totalDebit > totalCredit ? 'Cr' : 'Dr';
      // Auto-fill the difference
      const autoAmount = diff > 0 ? diff : 0;

      setRows(prev => [...prev, { 
          id: Math.random().toString(36).substr(2, 9), 
          partyId: '', 
          partyName: '', 
          debit: nextType === 'Dr' ? autoAmount : 0, 
          credit: nextType === 'Cr' ? autoAmount : 0,
          rowType: nextType
      }]);
  };

  const removeRow = (id: string) => {
      if (rows.length > 2) {
          setRows(prev => prev.filter(r => r.id !== id));
      } else {
          alert("Minimum 2 rows required for double entry.");
      }
  };

  const handleSave = async () => {
      if (!isBalanced) {
          alert(`Entry is not balanced. Difference: ₹${diff}`);
          return;
      }
      
      const invalidRows = rows.filter(r => !r.partyId || (r.debit === 0 && r.credit === 0));
      if (invalidRows.length > 0) {
          alert("Please select Ledger and Amount for all rows.");
          return;
      }

      const journal: JournalVoucher = {
          id: Math.random().toString(36).substr(2, 9),
          voucherNo,
          date,
          narration,
          rows: rows.map(({ rowType, ...rest }) => rest), // Remove UI specific 'rowType' before saving
          totalAmount: totalDebit
      };

      await billingService.saveJournalVoucher(journal);
      onBack();
  };

  const filteredParties = parties.filter(p => p.name && p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-slate-800 text-white p-3 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack}><ArrowLeft size={24} /></button>
        <div>
            <h1 className="text-xl font-bold">Journal Entry</h1>
            <p className="text-xs opacity-80">{voucherNo}</p>
        </div>
      </header>

      {/* Header Info */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex gap-4 shadow-sm">
          <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm font-bold shadow-sm"
              />
          </div>
          <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Voucher #</label>
              <input 
                type="text" 
                value={voucherNo} 
                readOnly
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm font-bold text-slate-600 dark:text-slate-400"
              />
          </div>
      </div>

      {/* Rows Header */}
      <div className="grid grid-cols-12 gap-2 bg-slate-200 dark:bg-slate-800 p-2 text-[10px] sm:text-xs font-extrabold uppercase text-slate-600 dark:text-slate-400 tracking-wider">
          <div className="col-span-2 text-center">Type</div>
          <div className="col-span-5 pl-1">Particulars (Ledger)</div>
          <div className="col-span-2 text-right">Debit (₹)</div>
          <div className="col-span-2 text-right">Credit (₹)</div>
          <div className="col-span-1"></div>
      </div>

      {/* Rows List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {rows.map((row, index) => {
              const isDr = row.rowType === 'Dr';
              return (
                <div 
                    key={row.id} 
                    className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg shadow-sm border transition-all ${
                        isDr 
                        ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' 
                        : 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
                    }`}
                >
                    {/* Dr/Cr Toggle */}
                    <div className="col-span-2 flex justify-center">
                        <button 
                            onClick={() => toggleRowType(row.id)}
                            className={`w-full font-bold py-1.5 rounded text-sm shadow-sm border transition-colors flex items-center justify-center gap-1 ${
                                isDr 
                                ? 'bg-green-600 text-white border-green-700 hover:bg-green-700' 
                                : 'bg-red-600 text-white border-red-700 hover:bg-red-700'
                            }`}
                        >
                            {row.rowType} <ArrowRightLeft size={12} className="opacity-50" />
                        </button>
                    </div>

                    {/* Ledger Selector */}
                    <div className="col-span-5">
                        <div 
                            onClick={() => openPartySelector(row.id)}
                            className={`p-2 border rounded cursor-pointer truncate text-sm font-semibold bg-white dark:bg-slate-800 shadow-sm transition-all hover:border-blue-400 ${
                                row.partyName 
                                ? 'border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white' 
                                : 'border-dashed border-slate-400 text-slate-400'
                            }`}
                        >
                            {row.partyName || (isDr ? "Pani Wala (Receiver)" : "Dene Wala (Giver)")}
                        </div>
                    </div>

                    {/* Debit Input */}
                    <div className="col-span-2">
                        <input 
                            ref={isDr ? (el) => amountInputRefs.current[row.id] = el : null}
                            type="number" 
                            value={row.debit || ''}
                            placeholder={isDr ? "0" : ""}
                            disabled={!isDr} // LOCK THIS FIELD IF CR
                            onChange={e => handleAmountChange(row.id, e.target.value)}
                            className={`w-full p-2 border rounded text-right text-sm font-bold outline-none transition-all ${
                                isDr 
                                ? 'bg-white dark:bg-slate-800 border-green-400 ring-2 ring-green-100 dark:ring-green-900 focus:ring-green-300 text-slate-900 dark:text-white' 
                                : 'bg-slate-100 dark:bg-slate-900 border-transparent text-transparent cursor-not-allowed'
                            }`}
                        />
                    </div>

                    {/* Credit Input */}
                    <div className="col-span-2">
                        <input 
                            ref={!isDr ? (el) => amountInputRefs.current[row.id] = el : null}
                            type="number" 
                            value={row.credit || ''}
                            placeholder={!isDr ? "0" : ""}
                            disabled={isDr} // LOCK THIS FIELD IF DR
                            onChange={e => handleAmountChange(row.id, e.target.value)}
                            className={`w-full p-2 border rounded text-right text-sm font-bold outline-none transition-all ${
                                !isDr 
                                ? 'bg-white dark:bg-slate-800 border-red-400 ring-2 ring-red-100 dark:ring-red-900 focus:ring-red-300 text-slate-900 dark:text-white' 
                                : 'bg-slate-100 dark:bg-slate-900 border-transparent text-transparent cursor-not-allowed'
                            }`}
                        />
                    </div>

                    {/* Remove Action */}
                    <div className="col-span-1 flex justify-center">
                        <button onClick={() => removeRow(row.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><Trash2 size={18} /></button>
                    </div>
                </div>
              );
          })}
          
          <button 
            onClick={addRow}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold text-sm px-4 py-3 hover:bg-white dark:hover:bg-slate-800 rounded-lg w-full justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 transition-all hover:border-slate-400"
          >
              <Plus size={18} /> Add Another Ledger
          </button>
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
          
          {/* Totals Row */}
          <div className="flex justify-between items-center mb-4 text-sm bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
              <span className="text-slate-500 font-bold uppercase tracking-wider">Total</span>
              <div className="flex gap-4 sm:gap-8">
                  <div className="flex flex-col items-end">
                      <span className="text-[10px] text-green-600 font-bold uppercase">Total Debit</span>
                      <span className="text-lg font-extrabold text-slate-800 dark:text-white">₹{totalDebit.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-[1px] bg-slate-300 dark:bg-slate-600 h-8"></div>
                  <div className="flex flex-col items-end">
                      <span className="text-[10px] text-red-600 font-bold uppercase">Total Credit</span>
                      <span className="text-lg font-extrabold text-slate-800 dark:text-white">₹{totalCredit.toLocaleString('en-IN')}</span>
                  </div>
              </div>
          </div>
          
          <div className="mb-4">
              <input 
                type="text" 
                placeholder="Narration / Remarks (e.g. Being cash paid to Ram)..." 
                value={narration}
                onChange={e => setNarration(e.target.value)}
                className="w-full border-b-2 border-slate-200 dark:border-slate-700 bg-transparent py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 transition-colors placeholder:text-slate-400 font-medium"
              />
          </div>

          <div className="flex gap-4 items-center">
              {!isBalanced && (
                  <div className="flex-1 flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30 animate-pulse">
                      <AlertCircle size={20} />
                      <div>
                          <p>Mismatch!</p>
                          <p>Difference: ₹{diff.toLocaleString('en-IN')}</p>
                      </div>
                  </div>
              )}
              <button 
                onClick={handleSave}
                disabled={!isBalanced}
                className={`flex-1 py-3.5 rounded-xl font-bold text-white flex justify-center items-center gap-2 shadow-lg transition-all active:scale-[0.98] ${isBalanced ? 'bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700' : 'bg-slate-400 cursor-not-allowed opacity-70'}`}
              >
                  <Save size={20} /> {isBalanced ? 'Save Entry' : 'Balance Amount First'}
              </button>
          </div>
      </div>

      {/* Ledger Selector Modal */}
      {showPartySelector && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPartySelector(false)}></div>
              <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md h-[80vh] sm:h-[600px] sm:rounded-xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 shadow-2xl">
                  <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-950">
                      <Search className="text-gray-400" size={20} />
                      <input 
                        type="text" 
                        autoFocus
                        placeholder="Search Ledger..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="flex-1 outline-none text-lg bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
                      />
                      <button onClick={() => setShowPartySelector(false)} className="bg-slate-200 dark:bg-slate-800 rounded-full p-1"><X size={20} className="text-gray-500" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                      {filteredParties.length === 0 ? (
                          <div className="p-8 text-center text-slate-400">No ledgers found.</div>
                      ) : (
                        filteredParties.map(p => (
                            <div 
                                key={p.id} 
                                onClick={() => handleSelectParty(p)}
                                className="p-4 border-b border-gray-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer flex justify-between items-center group transition-colors"
                            >
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400">{p.name}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5 font-medium">{p.type} • {p.city || 'Local'}</p>
                                </div>
                                <div className={`text-xs font-bold px-2 py-1 rounded ${p.currentBalance >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                    ₹{Number(Math.abs(p.currentBalance).toFixed(2)).toLocaleString('en-IN')} {p.currentBalance >= 0 ? 'Cr' : 'Dr'}
                                </div>
                            </div>
                        ))
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};