import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Plus, Trash2, AlertCircle, X, Search, ArrowRightLeft, BookOpen, CheckCircle2, Coins, Landmark, Calendar, FileText } from 'lucide-react';
import { Party, JournalRow, JournalVoucher } from '../../../core/types/';
import { billingService } from '../../../services/billingService';
import { motion, AnimatePresence } from 'motion/react';

interface JournalEntryScreenProps {
  onBack: () => void;
  initialDate?: Date;
}

// Local interface extending JournalRow to track UI state (Dr/Cr selection)
interface JournalRowUI extends JournalRow {
  rowType: 'Dr' | 'Cr'; 
}

const translations = {
  en: {
    journalEntry: 'Journal Entry',
    journalVoucher: 'Journal Voucher',
    voucherNo: 'Voucher No',
    dateLabel: 'Date',
    narrationLabel: 'Narration / Remarks',
    narrationPlaceholder: 'Enter details about this entry (e.g. Being goods purchased)...',
    typeHeader: 'Type',
    particularsHeader: 'Particulars (Ledger)',
    debitHeader: 'Debit (₹)',
    creditHeader: 'Credit (₹)',
    addLedgerBtn: 'Add Another Ledger',
    totalLabel: 'Total',
    totalDebit: 'Total Debit',
    totalCredit: 'Total Credit',
    saveEntryBtn: 'Save Entry',
    balanceFirstBtn: 'Balance Amount First',
    mismatchError: 'Mismatch / Unbalanced!',
    differenceLabel: 'Difference: ',
    requiredFieldsMissing: 'Required Fields Missing',
    fieldsMissingMsg: 'Ensure all rows have a ledger and an amount set.',
    mismatchTitle: 'Unbalanced Transaction',
    mismatchMsg: (diff: string) => `Debit and Credit totals must be equal. Difference: ₹${diff}`,
    successTitle: 'Journal Saved',
    successMessage: (no: string) => `Journal Voucher ${no} saved successfully.`,
    cancelBtn: 'Cancel',
    okButton: 'OK',
    searchPlaceholder: 'Search Cash, Bank, or custom accounts...',
    noAccountsFound: 'No accounts found.',
    selectLedger: 'Select Ledger',
    minRowsRequired: 'Minimum 2 rows required for double entry.',
    receiverTag: 'Receiver Account',
    giverTag: 'Giver Account',
    currentBal: 'Bal: ₹',
  },
  hi: {
    journalEntry: 'जर्नल एंट्री (Journal)',
    journalVoucher: 'जर्नल वाउचर',
    voucherNo: 'वाउचर कोड',
    dateLabel: 'प्रविष्टि तिथि',
    narrationLabel: 'विवरण / नरेशन',
    narrationPlaceholder: 'इस प्रविष्टि के बारे में विवरण लिखें...',
    typeHeader: 'प्रकार',
    particularsHeader: 'विवरण (लेजर खाता)',
    debitHeader: 'डेबिट (Dr - ₹)',
    creditHeader: 'क्रेडिट (Cr - ₹)',
    addLedgerBtn: 'अन्य खाता जोड़ें +',
    totalLabel: 'कुल योग',
    totalDebit: 'कुल डेबिट',
    totalCredit: 'कुल क्रेडिट',
    saveEntryBtn: 'प्रविष्टि सुरक्षित करें',
    balanceFirstBtn: 'पहले अंतर संतुलित करें',
    mismatchError: 'अंतर असमान है!',
    differenceLabel: 'शेष अंतर: ',
    requiredFieldsMissing: 'अधूरी जानकारी',
    fieldsMissingMsg: 'कृपया सुनिश्चित करें कि प्रत्येक पंक्ति में खाता और राशि तय है।',
    mismatchTitle: 'असंतुलित प्रविष्टि',
    mismatchMsg: (diff: string) => `डेबिट और क्रेडिट योग समान होना चाहिए। अंतर: ₹${diff}`,
    successTitle: 'जर्नल प्रविष्टि सहेजी गई',
    successMessage: (no: string) => `जर्नल वाउचर संख्या ${no} सफलतापूर्वक सुरक्षित किया गया।`,
    cancelBtn: 'रद्द करें',
    okButton: 'ठीक है',
    searchPlaceholder: 'लेजर खाता खोजें...',
    noAccountsFound: 'कोई लेजर खाता नहीं मिला।',
    selectLedger: 'खाता चुनें',
    minRowsRequired: 'दोहरा लेखा के लिए न्यूनतम 2 पंक्तियाँ आवश्यक हैं।',
    receiverTag: 'पाने वाला खाता (Receiver)',
    giverTag: 'देने वाला खाता (Giver)',
    currentBal: 'शेष: ₹',
  }
};

export const JournalEntryScreen: React.FC<JournalEntryScreenProps> = ({ onBack, initialDate }) => {
  const currentLanguage = (localStorage.getItem('language') || 'en') as 'en' | 'hi';
  const t = translations[currentLanguage];

  // Safe formatting to YYYY-MM-DD
  const [date, setDate] = useState(() => {
    const d = initialDate || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
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
  const [activeTab, setActiveTab] = useState<'all' | 'cash' | 'bank'>('all');

  // Popup feedback configuration
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type: 'error' | 'success';
    onConfirm?: () => void;
  } | null>(null);

  // Refs for auto-focus
  const amountInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    const loadParties = async () => {
        const data = await billingService.getAllParties();
        setParties(data);
    };
    loadParties();
    billingService.generateNextVoucherNo('Journal').then(setVoucherNo);
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
          }, 120);
          
          setActiveRowId(null);
      }
  };

  const addRow = () => {
      const nextType = totalDebit > totalCredit ? 'Cr' : 'Dr';
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
          setAlertConfig({
            title: t.requiredFieldsMissing,
            message: t.minRowsRequired,
            type: 'error'
          });
      }
  };

  const handleSave = async () => {
      if (!isBalanced) {
          setAlertConfig({
            title: t.mismatchTitle,
            message: t.mismatchMsg(diff.toFixed(2)),
            type: 'error'
          });
          return;
      }
      
      const invalidRows = rows.filter(r => !r.partyId || (r.debit === 0 && r.credit === 0));
      if (invalidRows.length > 0) {
          setAlertConfig({
            title: t.requiredFieldsMissing,
            message: t.fieldsMissingMsg,
            type: 'error'
          });
          return;
      }

      const journal: JournalVoucher = {
          id: Math.random().toString(36).substr(2, 9),
          voucherNo,
          date,
          narration: narration || `Journal Entry: ${voucherNo}`,
          rows: rows.map(({ rowType, ...rest }) => rest), // Remove UI specific 'rowType' before saving
          totalAmount: totalDebit
      };

      try {
        await billingService.saveJournalVoucher(journal);
        await billingService.incrementVoucherSequence('Journal');

        setAlertConfig({
          title: t.successTitle,
          message: t.successMessage(voucherNo),
          type: 'success',
          onConfirm: () => {
            onBack();
          }
        });
      } catch (err) {
        console.error("Failed to save Journal Voucher", err);
        setAlertConfig({
          title: "Error Saving",
          message: "Failed to record journal transaction. Please try again.",
          type: 'error'
        });
      }
  };

  // Safe checks for ledger icons
  const getLedgerIcon = (party: Party) => {
    const name = (party.name || '').toLowerCase();
    const group = (party.accountGroup || '').toLowerCase();
    if (name.includes('cash') || group.includes('cash')) {
      return <Coins className="text-amber-500 shrink-0" size={16} />;
    }
    return <Landmark className="text-cyan-500 shrink-0" size={16} />;
  };

  // Filter parties by search and tabs
  const filteredParties = parties.filter(p => {
    const matchesQuery = p.name && p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
                         (p.accountGroup && p.accountGroup.toLowerCase().includes(searchQuery.trim().toLowerCase()));
    
    if (!matchesQuery) return false;

    const group = (p.accountGroup || '').toLowerCase();
    const name = (p.name || '').toLowerCase();

    if (activeTab === 'cash') {
      return group.includes('cash') || name.includes('cash');
    }
    if (activeTab === 'bank') {
      return group.includes('bank') || name.includes('bank');
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors pb-[max(env(safe-area-inset-bottom),0px)] relative font-sans select-none">
      
      {/* Premium Header Design */}
      <header className="bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-slate-900 dark:to-slate-950 text-white p-4 flex items-center justify-between shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)] border-b border-emerald-500/10 dark:border-slate-800 transition-all relative overflow-hidden">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            type="button" 
            className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight leading-tight">{t.journalEntry}</h1>
            <p className="text-[10px] opacity-85 font-semibold tracking-wider uppercase font-mono mt-0.5">{t.journalVoucher}</p>
          </div>
        </div>
        <div className="bg-white/10 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-white/10 dark:border-slate-700">
          <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider block font-sans">{t.voucherNo}</span>
          <span className="text-xs font-black font-mono tracking-widest block text-emerald-200">{voucherNo || '---'}</span>
        </div>
      </header>

      {/* Date and Basic Settings Card */}
      <div className="px-4 pt-2 shrink-0">
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5 mb-1.5">
              <Calendar size={11} className="text-emerald-500" />
              {t.dateLabel}
            </span>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="w-full bg-slate-100/10 dark:bg-slate-900/30 border border-slate-205/20 dark:border-slate-850/30 rounded-xl py-2 px-3 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-155 outline-none focus:border-emerald-500/35 transition-all cursor-pointer"
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5 mb-1.5">
              <FileText size={11} className="text-emerald-500" />
              {t.voucherNo}
            </span>
            <input 
              type="text" 
              value={voucherNo} 
              readOnly
              className="w-full bg-slate-100/5 dark:bg-slate-900/15 border border-slate-205/10 dark:border-slate-850/15 rounded-xl py-2 px-3 text-xs sm:text-sm font-bold text-slate-550 dark:text-slate-455 outline-none select-none font-mono tracking-wider cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Grid Headers */}
      <div className="grid grid-cols-12 gap-2 border-b border-slate-200/15 dark:border-slate-900 px-4 py-2 mt-4 text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
          <div className="col-span-2 text-center">{t.typeHeader}</div>
          <div className="col-span-10 flex gap-2 pl-2">
            <span className="flex-1 text-left">{t.particularsHeader}</span>
            <span className="w-24 text-right pr-6">{t.debitHeader}</span>
            <span className="w-24 text-right pr-4">{t.creditHeader}</span>
          </div>
      </div>

      {/* Rows Container */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {rows.map((row, index) => {
              const isDr = row.rowType === 'Dr';
              return (
                <motion.div 
                  key={row.id} 
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`grid grid-cols-12 gap-2 items-center p-3 rounded-2xl border transition-all ${
                      isDr 
                      ? 'bg-emerald-500/[0.015] dark:bg-emerald-500/[0.02] border-emerald-500/10 dark:border-emerald-500/5' 
                      : 'bg-rose-500/[0.015] dark:bg-rose-500/[0.02] border-rose-500/10 dark:border-rose-500/5'
                  }`}
                >
                    {/* Dr/Cr Action Toggle */}
                    <div className="col-span-2 flex justify-center">
                        <button 
                            type="button"
                            onClick={() => toggleRowType(row.id)}
                            className={`w-full font-extrabold py-2 rounded-xl text-xs shadow-3xs border transition-all uppercase flex items-center justify-center gap-1 active:scale-95 cursor-pointer ${
                                isDr 
                                ? 'bg-emerald-500 text-white border-emerald-600/30 hover:bg-emerald-600' 
                                : 'bg-rose-500 text-white border-rose-600/30 hover:bg-rose-600'
                            }`}
                        >
                            <span>{row.rowType}</span> 
                            <ArrowRightLeft size={10} className="opacity-75 stroke-[2.5px]" />
                        </button>
                    </div>

                    <div className="col-span-10 flex gap-2 items-center min-w-0">
                        {/* Particular Ledger Selector */}
                        <div className="flex-1 min-w-0">
                            <div 
                                onClick={() => openPartySelector(row.id)}
                                className={`p-2 rounded-xl cursor-pointer truncate text-xs sm:text-sm font-bold bg-slate-100/10 dark:bg-slate-900/15 shadow-3xs transition-all flex items-center gap-1.5 h-[36px] border ${
                                    row.partyName 
                                    ? 'border-slate-205/20 dark:border-slate-800/15 text-slate-800 dark:text-slate-105 hover:border-emerald-500/30' 
                                    : 'border-dashed border-slate-300/35 dark:border-slate-800/20 text-slate-400 dark:text-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
                                }`}
                            >
                                {row.partyId && parties.find(p => p.id === row.partyId) ? (
                                  getLedgerIcon(parties.find(p => p.id === row.partyId)!)
                                ) : null}
                                <span className="truncate">
                                  {row.partyName || (isDr ? t.receiverTag : t.giverTag)}
                                </span>
                            </div>
                        </div>

                        {/* Debit Column Field */}
                        <div className="w-24">
                            <input 
                                ref={isDr ? (el) => amountInputRefs.current[row.id] = el : null}
                                type="number" 
                                placeholder={isDr ? "0.00" : ""}
                                value={row.debit || ''}
                                disabled={!isDr}
                                onChange={e => handleAmountChange(row.id, e.target.value)}
                                className={`w-full p-2 rounded-xl text-right text-xs sm:text-sm font-black outline-none tracking-tight transition-all h-[36px] border ${
                                    isDr 
                                    ? 'bg-slate-100/15 dark:bg-slate-950/25 border-emerald-500/10 focus:border-emerald-500 text-slate-900 dark:text-white shadow-3xs hover:border-emerald-500/30' 
                                    : 'bg-slate-100/30 dark:bg-slate-950/20 border-transparent text-transparent select-none cursor-not-allowed'
                                }`}
                            />
                        </div>

                        {/* Credit Column Field */}
                        <div className="w-24">
                            <input 
                                ref={!isDr ? (el) => amountInputRefs.current[row.id] = el : null}
                                type="number" 
                                placeholder={!isDr ? "0.00" : ""}
                                value={row.credit || ''}
                                disabled={isDr}
                                onChange={e => handleAmountChange(row.id, e.target.value)}
                                className={`w-full p-2 rounded-xl text-right text-xs sm:text-sm font-black outline-none tracking-tight transition-all h-[36px] border ${
                                    !isDr 
                                    ? 'bg-slate-100/15 dark:bg-slate-950/25 border-rose-500/10 focus:border-rose-500 text-slate-900 dark:text-white shadow-3xs hover:border-rose-500/30' 
                                    : 'bg-slate-100/30 dark:bg-slate-950/20 border-transparent text-transparent select-none cursor-not-allowed'
                                }`}
                            />
                        </div>

                        {/* Delete Row button */}
                        <div className="shrink-0">
                            <button 
                              type="button"
                              onClick={() => removeRow(row.id)} 
                              className="text-slate-450 hover:text-rose-600 dark:hover:bg-rose-950/20 p-2 rounded-xl transition-all cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                </motion.div>
              );
          })}
          
          {/* Add Another Ledger row button */}
          <button 
            type="button"
            onClick={addRow}
            className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-extrabold text-xs tracking-wider uppercase px-4 py-3 bg-slate-100/10 dark:bg-slate-900/10 rounded-2xl w-full justify-center border border-dashed border-slate-205/30 dark:border-slate-800/20 transition-all hover:bg-slate-50/50 dark:hover:bg-slate-900/50 cursor-pointer active:scale-[0.99] hover:border-emerald-500/20 hover:text-emerald-500"
          >
              <Plus size={15} className="stroke-[2.5px]" /> 
              <span>{t.addLedgerBtn}</span>
          </button>
      </div>

      {/* Styled Footer Card System with Narration, balanced visualizers and final Action button */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-850 p-4 shadow-xl z-20 shrink-0 space-y-4">
          
          {/* Total calculations panel */}
          <div className="flex justify-between items-center text-xs bg-slate-50/80 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-200/40 dark:border-slate-900/40">
              <span className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">{t.totalLabel}</span>
              <div className="flex gap-4 sm:gap-6">
                  <div className="flex flex-col items-end">
                      <span className="text-[9px] text-emerald-500 font-black uppercase tracking-wider">{t.totalDebit}</span>
                      <span className="text-base font-black text-slate-900 dark:text-white font-mono leading-tight font-sans">₹{totalDebit.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-[1px] bg-slate-200 dark:bg-slate-800 h-7 self-center"></div>
                  <div className="flex flex-col items-end">
                      <span className="text-[9px] text-rose-500 font-black uppercase tracking-wider">{t.totalCredit}</span>
                      <span className="text-base font-black text-slate-900 dark:text-white font-mono leading-tight font-sans">₹{totalCredit.toLocaleString('en-IN')}</span>
                  </div>
              </div>
          </div>
          
          {/* Narration Details input field */}
          <div>
            <span className="text-[9px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-1 block select-none">{t.narrationLabel}</span>
            <input 
              type="text" 
              placeholder={t.narrationPlaceholder} 
              value={narration}
              onChange={e => setNarration(e.target.value)}
              className="w-full bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-850 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-slate-800 dark:text-slate-150 font-bold outline-none focus:border-emerald-500/35 transition-all shadow-3xs"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
              {/* Balanced / Mismatch Cues */}
              {!isBalanced && (
                  <div className="flex items-center gap-2 text-rose-500 dark:text-rose-400 text-xs font-black bg-rose-50/40 dark:bg-rose-950/15 p-3 rounded-2xl border border-rose-100/50 dark:border-rose-900/20 shrink-0">
                      <AlertCircle size={16} className="shrink-0 animate-pulse" />
                      <div className="leading-tight">
                          <p className="uppercase tracking-wider text-[10px] text-rose-600">{t.mismatchError}</p>
                          <p className="font-mono mt-0.5">{t.differenceLabel}₹{diff.toLocaleString('en-IN')}</p>
                      </div>
                  </div>
              )}
              
              <button 
                type="button"
                onClick={handleSave}
                disabled={!isBalanced}
                className={`flex-1 py-3.5 rounded-2xl font-extrabold text-white text-xs tracking-widest uppercase flex justify-center items-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer shrink-0 ${
                  isBalanced 
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 hover:brightness-105 shadow-emerald-500/10' 
                  : 'bg-slate-350 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50 shadow-none'
                }`}
              >
                  <Save size={15} className="stroke-[2.5px]" /> 
                  <span>{isBalanced ? t.saveEntryBtn : t.balanceFirstBtn}</span>
              </button>
          </div>
      </div>

      {/* Slide Up Ledger Selector Modal Overlay */}
      <AnimatePresence>
        {showPartySelector && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="absolute inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-slate-900 dark:to-slate-950 text-white p-4 pt-[max(env(safe-area-inset-top),48px)] flex items-center shadow-md justify-between shrink-0 border-b border-emerald-500/10 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setShowPartySelector(false);
                    setSearchQuery('');
                  }} 
                  type="button" 
                  className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h2 className="text-base font-extrabold tracking-tight leading-tight">{t.selectLedger}</h2>
                  <p className="text-[10px] opacity-85 font-semibold tracking-wider font-mono uppercase">
                    {activeRowId && rows.find(r => r.id === activeRowId)?.rowType === 'Dr' ? t.receiverTag : t.giverTag}
                  </p>
                </div>
              </div>
            </div>

            {/* Account Search input & dynamic filtering group tabs */}
            <div className="p-4 bg-white dark:bg-slate-950 border-b border-slate-205 dark:border-slate-800 sticky top-0 z-10 shrink-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs sm:text-sm shadow-3xs focus:border-emerald-500/30 transition-all font-sans"
                  autoFocus
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')} 
                    type="button" 
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-605 rounded-full p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Quick Segregation Tabs */}
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/40 dark:border-slate-850/60">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 text-[10px] sm:text-xs font-extrabold py-2 rounded-lg transition-all cursor-pointer uppercase tracking-wider ${
                    activeTab === 'all'
                      ? 'bg-emerald-500 dark:bg-emerald-600 text-white shadow-3xs'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  {currentLanguage === 'en' ? 'All' : 'सभी'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cash')}
                  className={`flex-1 text-[10px] sm:text-xs font-extrabold py-2 rounded-lg transition-all cursor-pointer uppercase tracking-wider ${
                    activeTab === 'cash'
                      ? 'bg-emerald-500 dark:bg-emerald-600 text-white shadow-3xs'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  {currentLanguage === 'en' ? 'Cash' : 'कैश'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bank')}
                  className={`flex-1 text-[10px] sm:text-xs font-extrabold py-2 rounded-lg transition-all cursor-pointer uppercase tracking-wider ${
                    activeTab === 'bank'
                      ? 'bg-emerald-500 dark:bg-emerald-600 text-white shadow-3xs'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  {currentLanguage === 'en' ? 'Bank' : 'बैंक'}
                </button>
              </div>
            </div>

            {/* List details of matching accounts */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredParties.map((party, idx) => (
                <motion.div 
                  key={party.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12, delay: Math.min(idx * 0.02, 0.2) }}
                  onClick={() => handleSelectParty(party)}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-3xs cursor-pointer active:scale-[0.98] transition-all border border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/30 flex flex-col"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm sm:text-base truncate flex items-center gap-2">
                        {getLedgerIcon(party)}
                        <span>{party.name}</span>
                      </h3>
                      {party.accountGroup && (
                        <span className="inline-block text-[9px] font-black tracking-widest uppercase bg-slate-100 dark:bg-slate-850 border border-slate-200/40 dark:border-slate-800/60 text-slate-505 dark:text-slate-400 px-2 py-0.5 rounded-md mt-1.5 font-sans">
                          {party.accountGroup}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs sm:text-sm font-black font-mono block ${party.currentBalance < 0 ? 'text-rose-500' : party.currentBalance > 0 ? 'text-emerald-500' : 'text-slate-500'}`}>
                        {t.currentBal}{Number(Math.abs(party.currentBalance || 0).toFixed(2)).toLocaleString('en-IN')} {party.currentBalance < 0 ? 'Dr' : 'Cr'}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 block">{party.type || 'Ledger'}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {filteredParties.length === 0 && (
                <div className="text-center p-8 text-slate-400 dark:text-slate-600 font-bold text-base">
                  {t.noAccountsFound}
                </div>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Styled Alert feedback modals */}
      <AnimatePresence>
        {alertConfig && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-3xs animate-fade-in"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-150 dark:border-slate-800 text-center relative z-10"
            >
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto mb-4">
                {alertConfig.type === 'success' ? (
                  <CheckCircle2 className="text-emerald-500 dark:text-emerald-400 stroke-[2.5px]" size={24} />
                ) : (
                  <AlertCircle className="text-rose-500 dark:text-rose-400 stroke-[2.5px]" size={24} />
                )}
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
                {alertConfig.title}
              </h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                {alertConfig.message}
              </p>
              <button 
                type="button"
                onClick={() => {
                  if (alertConfig.onConfirm) alertConfig.onConfirm();
                  setAlertConfig(null);
                }}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 hover:brightness-105 active:scale-95 text-white rounded-2xl font-extrabold text-xs tracking-widest transition-all shadow-md uppercase cursor-pointer text-center block"
              >
                {t.okButton}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
