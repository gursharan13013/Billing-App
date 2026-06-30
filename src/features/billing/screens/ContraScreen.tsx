import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, ArrowRightLeft, Search, X, CheckCircle2, AlertCircle, Coins, Landmark } from 'lucide-react';
import { Party, JournalVoucher } from '../../../core/types/';
import { billingService } from '../../../services/billingService';
import { motion, AnimatePresence } from 'motion/react';

interface ContraScreenProps {
  onBack: () => void;
  initialDate?: Date;
}

const translations = {
  en: {
    contraEntry: 'Contra Entry',
    cashBankTransfer: 'Cash & Bank Transfer',
    transferAmount: 'Transfer Amount',
    fromCreditLedger: 'From (Credit Account)',
    toDebitLedger: 'To (Debit Account)',
    selectSource: 'Select Source Ledger',
    selectDest: 'Select Destination Ledger',
    transferDate: 'Transfer Date',
    voucherNo: 'Voucher No',
    narrationPlaceholder: 'Enter details about this transfer...',
    narrationLabel: 'Narration / Remarks',
    saveTransfer: 'SAVE TRANSFER',
    successTitle: 'Transfer Complete',
    successMessage: (amt: string) => `Contra transaction of ₹${amt} saved successfully.`,
    requiredFieldsMissing: 'Required Fields Missing',
    fieldsMissingMsg: 'Ensure Amount, Source Ledger and Destination Ledger are set.',
    invalidTransfer: 'Invalid Transfer',
    sameLedgerMsg: 'Source and Destination ledgers cannot be the same.',
    invalidAmount: 'Invalid Amount',
    amountGreaterZero: 'Amount must be greater than zero.',
    searchPlaceholder: 'Search Cash, Bank, or custom accounts...',
    noAccountsFound: 'No accounts found matching search query.',
    tabAll: 'All Accounts',
    tabCash: 'Cash-in-hand',
    tabBank: 'Bank Accounts',
    currentBal: 'Current Bal: ',
    okButton: 'OK',
    cancel: 'Cancel',
    voucherCode: 'Voucher Code',
    selectLedger: 'Select Ledger'
  },
  hi: {
    contraEntry: 'कॉन्ट्रा एंट्री (Contra)',
    cashBankTransfer: 'नकद और बैंक ट्रांसफर (Cash & Bank)',
    transferAmount: 'स्थानांतरण राशि (Amount)',
    fromCreditLedger: 'द्वारा (From - क्रेडिट)',
    toDebitLedger: 'को (To - डेबिट)',
    selectSource: 'स्रोत खाता चुनें',
    selectDest: 'गंतव्य खाता चुनें',
    transferDate: 'स्थानांतरण तिथि',
    voucherNo: 'वाउचर कोड',
    narrationPlaceholder: 'इस ट्रांसफर के बारे में कोई टिप्पणी लिखें...',
    narrationLabel: 'विवरण / नरेशन',
    saveTransfer: 'ट्रांसफर रिकॉर्ड करें',
    successTitle: 'सफलतापूर्वक ट्रांसफर',
    successMessage: (amt: string) => `₹${amt} का कॉन्ट्रा लेनदेन सफलतापूर्वक सहेजा गया।`,
    requiredFieldsMissing: 'जानकारी अधूरी है',
    fieldsMissingMsg: 'कृपया ट्रांसफर राशि, स्रोत खाता और गंतव्य खाते का चयन करें।',
    invalidTransfer: 'अमान्य ट्रांसफर',
    sameLedgerMsg: 'स्रोत और गंतव्य खाते समान नहीं हो सकते हैं।',
    invalidAmount: 'अमान्य राशि',
    amountGreaterZero: 'स्थानांतरण राशि शून्य से अधिक होनी चाहिए।',
    searchPlaceholder: 'कैश, बैंक या लेजर अकाउंट खोजें...',
    noAccountsFound: 'कोई मिलान खाता नहीं मिला।',
    tabAll: 'सभी खाते',
    tabCash: 'कैश लेजर',
    tabBank: 'बैंक लेजर',
    currentBal: 'वर्तमान शेष: ',
    okButton: 'ठीक है',
    cancel: 'रद्द करें',
    voucherCode: 'वाउचर संख्या',
    selectLedger: 'खाता चुनें'
  }
};

export const ContraScreen: React.FC<ContraScreenProps> = ({ onBack, initialDate }) => {
  const currentLanguage = (localStorage.getItem('language') || 'en') as 'en' | 'hi';
  const t = translations[currentLanguage];

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => {
    const d = initialDate || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [narration, setNarration] = useState('');
  const [voucherNo, setVoucherNo] = useState('');

  const [allParties, setAllParties] = useState<Party[]>([]);
  const [sourceLedger, setSourceLedger] = useState<Party | null>(null);
  const [destLedger, setDestLedger] = useState<Party | null>(null);

  const [selectingFor, setSelectingFor] = useState<'source' | 'dest' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'cash' | 'bank'>('all');

  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type: 'error' | 'success';
    onConfirm?: () => void;
  } | null>(null);

  useEffect(() => {
    const loadLedgers = async () => {
      const parties = await billingService.getAllParties();
      setAllParties(parties);
      
      // Auto-assign default pairs (Cash -> Bank or vice versa)
      const cash = parties.find(p => p.name && (p.name.toLowerCase().includes('cash') || p.accountGroup === "Cash-in-hand"));
      const bank = parties.find(p => p.name && (p.name.toLowerCase().includes('bank') || p.accountGroup === "Bank Accounts"));
      
      if (cash) setSourceLedger(cash);
      if (bank) setDestLedger(bank);
    };
    loadLedgers();
    billingService.generateNextVoucherNo('Contra').then(setVoucherNo);
  }, []);

  const handleSave = async () => {
    if (!amount || !sourceLedger || !destLedger) {
      setAlertConfig({
        title: t.requiredFieldsMissing,
        message: t.fieldsMissingMsg,
        type: 'error'
      });
      return;
    }
    if (sourceLedger.id === destLedger.id) {
      setAlertConfig({
        title: t.invalidTransfer,
        message: t.sameLedgerMsg,
        type: 'error'
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setAlertConfig({
        title: t.invalidAmount,
        message: t.amountGreaterZero,
        type: 'error'
      });
      return;
    }

    const journal: JournalVoucher = {
      id: Math.random().toString(36).substr(2, 9),
      voucherNo,
      date,
      narration: narration || `Contra Transfer: ${sourceLedger.name} to ${destLedger.name}`,
      totalAmount: numAmount,
      type: 'Contra',
      rows: [
        {
          id: 'r1',
          partyId: sourceLedger.id, // Credit Account
          partyName: sourceLedger.name,
          debit: 0,
          credit: numAmount
        },
        {
          id: 'r2',
          partyId: destLedger.id, // Debit Account
          partyName: destLedger.name,
          debit: numAmount,
          credit: 0
        }
      ]
    };

    try {
      await billingService.saveJournalVoucher(journal);
      await billingService.incrementVoucherSequence('Contra');

      setAlertConfig({
        title: t.successTitle,
        message: t.successMessage(numAmount.toFixed(2)),
        type: 'success',
        onConfirm: () => {
          onBack();
        }
      });
    } catch (e) {
      console.error("Failed to save Contra Voucher", e);
      setAlertConfig({
        title: t.invalidTransfer,
        message: "Failed to save transfer. Please try again.",
        type: 'error'
      });
    }
  };

  const toggleSides = () => {
    const temp = sourceLedger;
    setSourceLedger(destLedger);
    setDestLedger(temp);
  };

  // Safe checks for ledger icons
  const getLedgerIcon = (party: Party) => {
    const name = (party.name || '').toLowerCase();
    const group = (party.accountGroup || '').toLowerCase();
    if (name.includes('cash') || group.includes('cash')) {
      return <Coins className="text-amber-500" size={18} />;
    }
    return <Landmark className="text-blue-500" size={18} />;
  };

  // Filtering + Group Tab segregation
  const filteredParties = allParties.filter(p => {
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
      
      {/* Pristine Modern Header (Matching standard Cash/Contra entries) */}
      <header className="bg-gradient-to-r from-orange-500 to-orange-600 dark:from-slate-900 dark:to-slate-950 text-white p-4 flex items-center justify-between shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)] border-b border-orange-500/10 dark:border-slate-800 transition-all relative overflow-hidden">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            type="button" 
            className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight leading-tight">{t.contraEntry}</h1>
            <p className="text-[10px] opacity-85 font-semibold tracking-wider uppercase font-mono mt-0.5">{t.cashBankTransfer}</p>
          </div>
        </div>
        <div className="bg-white/10 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-white/10 dark:border-slate-700">
          <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider block font-sans">{t.voucherCode}</span>
          <span className="text-xs font-black font-mono tracking-widest block text-orange-200">{voucherNo || '---'}</span>
        </div>
      </header>

      {/* Primary Layout Form Container */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        
        {/* Step 1: Transfer Amount Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 text-center hover:shadow-sm transition-all">
          <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 block select-none">{t.transferAmount}</label>
          <div className="flex justify-center items-center gap-1.5 matches-payment">
            <span className="text-3xl font-extrabold text-slate-400 dark:text-slate-500">₹</span>
            <input 
              type="number" 
              placeholder="0.00" 
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="text-4xl font-black text-slate-900 dark:text-white bg-transparent outline-none w-64 text-center placeholder-slate-200 dark:placeholder-slate-800 tracking-tight font-sans transition-colors"
            />
          </div>
        </div>

        {/* Step 2: Double-Ledger Flow Visualizer */}
        <div className="relative bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col gap-6">
          
          {/* Top segment: Source (Credit Account) */}
          <div 
            onClick={() => {
              setSelectingFor('source');
              setActiveTab('all');
            }}
            className="flex justify-between items-center cursor-pointer p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 hover:bg-slate-100/65 dark:hover:bg-slate-800/40 active:scale-[0.98] transition-all duration-150"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shrink-0"></span>
                {t.fromCreditLedger}
              </p>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white truncate flex items-center gap-2">
                {sourceLedger ? getLedgerIcon(sourceLedger) : null}
                <span>{sourceLedger?.name || t.selectSource}</span>
              </h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1.5">
                {t.currentBal}
                <span className="font-mono text-slate-800 dark:text-slate-350">
                  ₹{Number((sourceLedger?.currentBalance || 0).toFixed(2)).toLocaleString('en-IN')}
                </span>
              </p>
            </div>
          </div>

          {/* Central Interchange Swap Link button */}
          <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <button 
              type="button"
              onClick={toggleSides}
              className="bg-orange-500 dark:bg-orange-600 p-3.5 rounded-full border-4 border-white dark:border-slate-900 shadow-md hover:scale-110 active:scale-90 transition-all cursor-pointer flex items-center justify-center text-white"
            >
              <ArrowRightLeft size={16} className="stroke-[2.5px]" />
            </button>
          </div>

          {/* Bottom segment: Destination (Debit Account) */}
          <div 
            onClick={() => {
              setSelectingFor('dest');
              setActiveTab('all');
            }}
            className="flex justify-between items-center cursor-pointer p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 hover:bg-slate-100/65 dark:hover:bg-slate-800/40 active:scale-[0.98] transition-all duration-150"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
                {t.toDebitLedger}
              </p>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white truncate flex items-center gap-2">
                {destLedger ? getLedgerIcon(destLedger) : null}
                <span>{destLedger?.name || t.selectDest}</span>
              </h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1.5">
                {t.currentBal}
                <span className="font-mono text-slate-800 dark:text-slate-350">
                  ₹{Number((destLedger?.currentBalance || 0).toFixed(2)).toLocaleString('en-IN')}
                </span>
              </p>
            </div>
          </div>

        </div>

        {/* Step 3: Transaction Parameters Form (Date, Voucher, narration) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <div>
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block select-none">{t.transferDate}</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-slate-800 dark:text-slate-150 font-bold outline-none focus:border-orange-500/30 dark:focus:border-orange-500/20 transition-all shadow-3xs hover:bg-slate-50 dark:hover:bg-slate-950/80 cursor-pointer" 
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block select-none">{t.narrationLabel}</label>
            <input 
              type="text" 
              value={narration} 
              onChange={e => setNarration(e.target.value)} 
              placeholder={t.narrationPlaceholder} 
              className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-slate-800 dark:text-slate-150 font-bold outline-none focus:border-orange-500/30 dark:focus:border-orange-500/20 transition-all shadow-3xs hover:bg-slate-50 dark:hover:bg-slate-950/80" 
            />
          </div>
        </div>

        {/* Action Button: Save Transfer */}
        <button 
          type="button"
          onClick={handleSave}
          disabled={!amount || !sourceLedger || !destLedger}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 disabled:opacity-50 hover:shadow-md active:scale-[0.98] hover:brightness-105 active:brightness-95 transition-all text-white font-extrabold text-sm tracking-widest py-3.5 rounded-2xl flex items-center justify-center gap-2 uppercase cursor-pointer shadow-sm"
        >
          <Save size={16} className="stroke-[2.5px]" />
          <span>{t.saveTransfer}</span>
        </button>

      </div>

      {/* Ledger Options Selection Sub-Panel */}
      <AnimatePresence>
        {selectingFor && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            // We use fixed context which behaves beautifully on non-transitioning screens, 
            // inside absolute portal so it covers only EazyBilling's active view and respects layout nicely.
            className="absolute inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 dark:from-slate-900 dark:to-slate-950 text-white p-4 pt-[max(env(safe-area-inset-top),48px)] flex items-center shadow-md justify-between shrink-0 border-b border-orange-500/10 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setSelectingFor(null);
                    setSearchQuery('');
                  }} 
                  type="button" 
                  className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h2 className="text-base font-extrabold tracking-tight leading-tight">
                    {selectingFor === 'source' ? t.fromCreditLedger : t.toDebitLedger}
                  </h2>
                  <p className="text-[10px] opacity-85 font-semibold tracking-wider font-mono uppercase">{t.selectLedger}</p>
                </div>
              </div>
            </div>

            {/* Account Search Bar & Tabs filter */}
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10 shrink-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-xs sm:text-sm shadow-3xs focus:border-orange-500/30 dark:focus:border-orange-500/20 transition-all font-sans"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')} 
                    type="button" 
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 rounded-full p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Segmented Group Tabs for quick lookups */}
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/40 dark:border-slate-850/60">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 text-[10px] sm:text-xs font-extrabold py-2 rounded-lg transition-all ${
                    activeTab === 'all'
                      ? 'bg-orange-500 dark:bg-orange-600 text-white shadow-3xs'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  {t.tabAll}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cash')}
                  className={`flex-1 text-[10px] sm:text-xs font-extrabold py-2 rounded-lg transition-all ${
                    activeTab === 'cash'
                      ? 'bg-orange-500 dark:bg-orange-600 text-white shadow-3xs'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  {t.tabCash}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bank')}
                  className={`flex-1 text-[10px] sm:text-xs font-extrabold py-2 rounded-lg transition-all ${
                    activeTab === 'bank'
                      ? 'bg-orange-500 dark:bg-orange-600 text-white shadow-3xs'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  {t.tabBank}
                </button>
              </div>
            </div>

            {/* List of matching accounts */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredParties.map((party, idx) => (
                <motion.div 
                  key={party.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12, delay: Math.min(idx * 0.02, 0.2) }}
                  onClick={() => {
                    if (selectingFor === 'source') setSourceLedger(party);
                    else setDestLedger(party);
                    setSelectingFor(null);
                    setSearchQuery('');
                  }}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-3xs cursor-pointer active:scale-[0.98] transition-all border border-slate-200 dark:border-slate-800/80 hover:border-orange-500/30 dark:hover:border-orange-500/20 flex flex-col"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm sm:text-base truncate flex items-center gap-2">
                        {getLedgerIcon(party)}
                        <span>{party.name}</span>
                      </h3>
                      {party.accountGroup && (
                        <span className="inline-block text-[9px] font-black tracking-widest uppercase bg-slate-100 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-750/30 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md mt-1.5 font-sans">
                          {party.accountGroup}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs sm:text-sm font-black font-mono block ${party.currentBalance < 0 ? 'text-rose-500' : party.currentBalance > 0 ? 'text-emerald-500' : 'text-slate-500'}`}>
                        ₹{Number((party.currentBalance || 0).toFixed(2)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {filteredParties.length === 0 && (
                <div className="text-center p-8 text-slate-400 dark:text-slate-600 font-bold text-sm">
                  {t.noAccountsFound}
                </div>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Fully styled Alert dialog / check modals */}
      <AnimatePresence>
        {alertConfig && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-3xs"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-150 dark:border-slate-800 text-center relative z-10"
            >
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/40 rounded-full flex items-center justify-center mx-auto mb-4">
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
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 hover:brightness-105 active:scale-95 text-white rounded-2xl font-extrabold text-xs tracking-widest transition-all shadow-md uppercase cursor-pointer text-center block"
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
