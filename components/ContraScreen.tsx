import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, ArrowRightLeft, Search, X } from 'lucide-react';
import { Party, JournalVoucher } from '../types';
import { billingService } from '../src/services/billingService';


interface ContraScreenProps {
  onBack: () => void;
  initialDate?: Date;
}

export const ContraScreen: React.FC<ContraScreenProps> = ({ onBack, initialDate }) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState((initialDate || new Date()).toLocalDateString());
  const [narration, setNarration] = useState('');
  const [voucherNo, setVoucherNo] = useState('');

  const [allParties, setAllParties] = useState<Party[]>([]);
  const [sourceLedger, setSourceLedger] = useState<Party | null>(null);
  const [destLedger, setDestLedger] = useState<Party | null>(null);

  const [selectingFor, setSelectingFor] = useState<'source' | 'dest' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
      const loadLedgers = async () => {
          const parties = await billingService.getAllParties();
          setAllParties(parties);
          
          const cash = parties.find(p => p.name && p.name.toLowerCase().includes('cash') || p.accountGroup === "Cash-in-hand");
          const bank = parties.find(p => p.name && p.name.toLowerCase().includes('bank') || p.accountGroup === "Bank Accounts");
          
          if(cash) setSourceLedger(cash);
          if(bank) setDestLedger(bank);
      };
      loadLedgers();
      billingService.generateNextVoucherNo('Contra').then(setVoucherNo);
  }, []);

  const handleSave = async () => {
      if(!amount || !sourceLedger || !destLedger) {
          alert("Ensure Amount, Source Ledger and Destination Ledger are set.");
          return;
      }
      if(sourceLedger.id === destLedger.id) {
          alert("Source and Destination ledgers cannot be the same.");
          return;
      }

      const numAmount = parseFloat(amount);
      if(numAmount <= 0) return;

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
                  partyId: sourceLedger.id, // Credit Giver
                  partyName: sourceLedger.name,
                  debit: 0,
                  credit: numAmount
              },
              {
                  id: 'r2',
                  partyId: destLedger.id, // Debit Receiver
                  partyName: destLedger.name,
                  debit: numAmount,
                  credit: 0
              }
          ]
      };

      await billingService.saveJournalVoucher(journal);
      billingService.incrementVoucherSequence('Contra');
      onBack();
  };

  const toggleSides = () => {
      const temp = sourceLedger;
      setSourceLedger(destLedger);
      setDestLedger(temp);
  };

  const filteredParties = allParties.filter(p => 
      p.name && p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
      (p.accountGroup && p.accountGroup.toLowerCase().includes(searchQuery.trim().toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors pb-[max(env(safe-area-inset-bottom),0px)] relative">
      <header className="bg-teal-600 text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack}><ArrowLeft size={24} /></button>
        <div>
            <h1 className="text-xl font-bold">Contra Entry</h1>
            <p className="text-xs opacity-90">Cash & Bank Transfer</p>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          
          {/* Amount Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 block">Transfer Amount</label>
              <div className="flex justify-center items-center gap-1">
                  <span className="text-3xl font-light text-slate-400">₹</span>
                  <input 
                    type="number" 
                    autoFocus
                    placeholder="0" 
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="text-5xl font-bold text-slate-900 dark:text-white bg-transparent outline-none w-48 text-center placeholder-slate-300"
                  />
              </div>
          </div>

          {/* Flow Visualizer */}
          <div className="relative bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-6">
              {/* Source */}
              <div 
                className="flex justify-between items-center cursor-pointer p-2 -m-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all"
                onClick={() => setSelectingFor('source')}
              >
                  <div>
                      <p className="text-xs font-bold text-red-500 uppercase mb-1">From (Credit)</p>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                          {sourceLedger?.name || 'Select Ledger'}
                      </h3>
                      <p className="text-xs text-slate-500">Current Bal: ₹{Number((sourceLedger?.currentBalance || 0).toFixed(2)).toLocaleString('en-IN')}</p>
                  </div>
              </div>

              {/* Arrow Switcher */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <button 
                    onClick={toggleSides}
                    className="bg-teal-100 dark:bg-teal-900/50 p-3 rounded-full border-4 border-white dark:border-slate-900 shadow-sm group active:scale-95 transition-transform"
                  >
                      <ArrowRightLeft size={24} className="text-teal-600 dark:text-teal-400" />
                  </button>
              </div>

              {/* Destination */}
              <div 
                className="flex justify-between items-center text-right cursor-pointer p-2 -m-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all"
                onClick={() => setSelectingFor('dest')}
              >
                  <div className="ml-auto">
                      <p className="text-xs font-bold text-green-500 uppercase mb-1">To (Debit)</p>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                          {destLedger?.name || 'Select Ledger'}
                      </h3>
                      <p className="text-xs text-slate-500">Current Bal: ₹{Number((destLedger?.currentBalance || 0).toFixed(2)).toLocaleString('en-IN')}</p>
                  </div>
              </div>
          </div>

          {/* Details */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-lg font-bold outline-none text-slate-900 dark:text-white" />
              </div>
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Voucher No</label>
                  <input type="text" value={voucherNo} readOnly className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-lg font-bold text-slate-500" />
              </div>
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Narration</label>
                  <input type="text" value={narration} onChange={e => setNarration(e.target.value)} placeholder="Enter details..." className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-lg font-medium outline-none text-slate-900 dark:text-white" />
              </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={!amount || !sourceLedger || !destLedger}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg"
          >
              <Save size={24} /> Save Transfer
          </button>
      </div>

      {/* Ledger Selection Modal */}
      {selectingFor && (
        <div className="absolute inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col animate-in slide-in-from-bottom-4 duration-200">
            <div className="bg-teal-600 text-white p-4 pt-[max(env(safe-area-inset-top),48px)] flex items-center shadow-md">
                <button onClick={() => setSelectingFor(null)} className="p-2 -ml-2 rounded-full hover:bg-white/10">
                    <ArrowLeft size={24} />
                </button>
                <div className="ml-2">
                    <h2 className="text-lg font-bold">Select {selectingFor === 'source' ? 'Source (Credit)' : 'Destination (Debit)'} Ledger</h2>
                </div>
            </div>
            
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search ledgers..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        autoFocus
                        className="w-full pl-10 pr-10 py-3 bg-slate-100 dark:bg-slate-800 rounded-lg outline-none text-slate-900 dark:text-white"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-2">
                {filteredParties.map(party => (
                    <div 
                        key={party.id}
                        onClick={() => {
                            if(selectingFor === 'source') setSourceLedger(party);
                            else setDestLedger(party);
                            setSelectingFor(null);
                            setSearchQuery('');
                        }}
                        className="bg-white dark:bg-slate-900 p-4 mb-2 rounded-xl shadow-sm cursor-pointer active:scale-95 transition-all border border-slate-100 dark:border-slate-800"
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-white">{party.name}</h3>
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">₹{Number(party.currentBalance.toFixed(2)).toLocaleString('en-IN')}</span>
                        </div>
                        {party.accountGroup && (
                            <p className="text-xs text-slate-500 mt-1">{party.accountGroup}</p>
                        )}
                    </div>
                ))}
                {filteredParties.length === 0 && (
                    <div className="text-center p-8 text-slate-500">
                        No ledgers found.
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};