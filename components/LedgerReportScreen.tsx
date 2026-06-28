import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Calendar, Search, Download, Share2, Filter } from 'lucide-react';
import { billingService } from '../src/services/billingService';
import { Party, Invoice, PaymentRecord, JournalVoucher } from '../types';
import { PartySearch } from './PartySearch';


interface LedgerReportScreenProps {
  onBack: () => void;
}

interface TransactionRow {
    date: string; // YYYY-MM-DD
    dateObj: Date;
    particulars: string;
    vchType: string;
    vchNo: string;
    debit: number;
    credit: number;
    narration?: string;
}

export const LedgerReportScreen: React.FC<LedgerReportScreenProps> = ({ onBack }) => {
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocalDateString()); // Start of month
  const [endDate, setEndDate] = useState(new Date().toLocalDateString());
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);

  const [allParties, setAllParties] = useState<Party[]>([]);
  const [partySearchQuery, setPartySearchQuery] = useState('');

  useEffect(() => {
      if (!selectedParty) {
          billingService.getAllParties().then(parties => {
              // Sort parties by name or balance
              setAllParties(parties.sort((a,b) => a.name.localeCompare(b.name)));
          });
      }
  }, [selectedParty]);

  const filteredParties = useMemo(() => {
      const q = partySearchQuery.toLowerCase().trim();
      if (!q) return [];
      if (q === 'all' || q === 'ऑल') return allParties;
      return allParties.filter(p => p.name && p.name.toLowerCase().includes(q) || (p.mobile && p.mobile.includes(q)));
  }, [allParties, partySearchQuery]);

  useEffect(() => {
      if (selectedParty) {
          fetchLedgerData();
      } else {
          setTransactions([]);
          setOpeningBalance(0);
      }
  }, [selectedParty, startDate, endDate]);

  const fetchLedgerData = async () => {
      if (!selectedParty) return;
      setLoading(true);

      try {
          const [invoices, payments, journals] = await Promise.all([
              billingService.getInvoices('Sale'), // We need ALL types effectively, simplified fetching below
              billingService.getAllPayments('Payment'),
              billingService.getAllJournals()
          ]);

          // Fetch ALL invoices regardless of type to filter manually
          // Since getInvoices filters by type, let's fetch for this party specifically if possible or fetch all types
          const types = ['Sale', 'Purchase', 'Sale Return', 'Purchase Return'];
          let allInvoices: Invoice[] = [];
          for (const t of types) {
              const invs = await billingService.getInvoices(t as any);
              allInvoices = [...allInvoices, ...invs];
          }
          
          // Filter Payments (Both Receipt and Payment)
          const allPaymentsRec = await billingService.getAllPayments('Receipt');
          const allPaymentsPay = await billingService.getAllPayments('Payment');
          const allPayments = [...allPaymentsRec, ...allPaymentsPay];

          // 1. Process Transactions
          let rawRows: TransactionRow[] = [];

          // Invoices
          allInvoices.filter(i => i.partyId === selectedParty.id).forEach(inv => {
              const isSale = inv.type === 'Sale';
              const isPurchase = inv.type === 'Purchase';
              const isSaleReturn = inv.type === 'Sale Return';
              const isPurchaseReturn = inv.type === 'Purchase Return';

              let debit = 0;
              let credit = 0;
              let particulars = '';

              if (isSale) {
                  debit = inv.totalAmount;
                  particulars = 'Sales Account';
              } else if (isPurchase) {
                  credit = inv.totalAmount;
                  particulars = 'Purchase Account';
              } else if (isSaleReturn) {
                  credit = inv.totalAmount; // Credit Customer
                  particulars = 'Sale Return';
              } else if (isPurchaseReturn) {
                  debit = inv.totalAmount; // Debit Supplier
                  particulars = 'Purchase Return';
              }

              rawRows.push({
                  date: inv.date,
                  dateObj: Date.fromLocalDateString(inv.date),
                  particulars: particulars,
                  vchType: inv.type,
                  vchNo: inv.invoiceNo,
                  debit,
                  credit,
                  narration: `Items: ${inv.items?.length}`
              });
          });

          // Payments
          allPayments.filter(p => p.partyId === selectedParty.id).forEach(pay => {
              let debit = 0;
              let credit = 0;
              // Receipt: Party Giver (Cr)
              // Payment: Party Receiver (Dr)
              if (pay.type === 'Receipt') {
                  credit = pay.amount;
              } else {
                  debit = pay.amount;
              }

              rawRows.push({
                  date: pay.date,
                  dateObj: Date.fromLocalDateString(pay.date),
                  particulars: pay.mode === 'Cash' ? 'Cash Account' : pay.mode,
                  vchType: pay.type,
                  vchNo: pay.voucherNo,
                  debit,
                  credit,
                  narration: pay.remarks
              });
          });

          // Payments acting as Bank/Cash
          allPayments.filter(p => p.modeLedgerId === selectedParty.id).forEach(pay => {
              let debit = 0;
              let credit = 0;
              // Receipt: Money in Bank -> Bank Dr
              // Payment: Money out Bank -> Bank Cr
              if (pay.type === 'Receipt') {
                  debit = pay.amount;
              } else {
                  credit = pay.amount;
              }

              rawRows.push({
                  date: pay.date,
                  dateObj: Date.fromLocalDateString(pay.date),
                  particulars: pay.partyName,
                  vchType: pay.type,
                  vchNo: pay.voucherNo,
                  debit,
                  credit,
                  narration: pay.remarks
              });
          });

          // Journals
          journals.forEach(j => {
              const partyRow = j.rows.find(r => r.partyId === selectedParty.id);
              if (partyRow) {
                  // Find the OTHER side of the journal for Particulars (Simplified: assume 2 rows)
                  const otherRow = j.rows.find(r => r.partyId !== selectedParty.id);
                  const particulars = otherRow ? otherRow.partyName : 'General Account';

                  rawRows.push({
                      date: j.date,
                      dateObj: Date.fromLocalDateString(j.date),
                      particulars: particulars,
                      vchType: 'Journal',
                      vchNo: j.voucherNo,
                      debit: partyRow.debit,
                      credit: partyRow.credit,
                      narration: j.narration
                  });
              }
          });

          // Sort by Date ASC, then by Voucher No ASC
          rawRows.sort((a, b) => {
              const dateDiff = a.dateObj.getTime() - b.dateObj.getTime();
              if (dateDiff !== 0) return dateDiff;
              
              const numA = parseInt((a.vchNo || '').replace(/\D/g, '')) || 0;
              const numB = parseInt((b.vchNo || '').replace(/\D/g, '')) || 0;
              if (numA !== numB) return numA - numB;
              
              return (a.vchNo || '').localeCompare(b.vchNo || '');
          });

          // 2. Calculate Opening Balance
          // Logic: Master Closing Balance is known. 
          // Reverse calculation is safer: Current Balance - (Sum of All Transactions) = Master Opening Balance.
          // THEN: Opening Balance for Date Range = Master Opening + Transactions BEFORE Start Date.
          
          const totalDrAllTime = rawRows.reduce((sum, r) => sum + r.debit, 0);
          const totalCrAllTime = rawRows.reduce((sum, r) => sum + r.credit, 0);
          const netTransactionEffect = totalDrAllTime - totalCrAllTime; // +ve means Dr effect
          
          // Current Balance (Final)
          const currentBal = selectedParty.currentBalance;
          
          // Master Opening Balance (The balance before ANY transaction in system)
          const masterOpening = currentBal - netTransactionEffect;

          // Now filter rows by Date Range
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59); // Include full end day

          const previousRows = rawRows.filter(r => r.dateObj < start);
          const activeRows = rawRows.filter(r => r.dateObj >= start && r.dateObj <= end);

          const prevDr = previousRows.reduce((sum, r) => sum + r.debit, 0);
          const prevCr = previousRows.reduce((sum, r) => sum + r.credit, 0);
          
          const rangeOpening = masterOpening + (prevDr - prevCr);

          setOpeningBalance(rangeOpening);
          setTransactions(activeRows);

      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  // Calculate Running Totals
  let runningBalance = openingBalance;
  const totalDebit = transactions.reduce((sum, r) => sum + (r.debit || 0), 0);
  const totalCredit = transactions.reduce((sum, r) => sum + (r.credit || 0), 0);
  const closingBalance = openingBalance + totalDebit - totalCredit;

  const handleDownload = () => {
      if (!selectedParty || transactions.length === 0) {
          alert("No data to download.");
          return;
      }

      const headers = ['Date', 'Particulars', 'Vch Type', 'Vch No.', 'Debit', 'Credit', 'Balance'];
      
      let currentBal = openingBalance;
      
      const rows = transactions.map(t => {
          const debit = t.debit || 0;
          const credit = t.credit || 0;
          currentBal = currentBal + debit - credit;
          return [
              t.date,
              t.particulars,
              t.type,
              t.refNo,
              debit > 0 ? debit.toFixed(2) : '',
              credit > 0 ? credit.toFixed(2) : '',
              `${Math.abs(currentBal).toFixed(2)} ${currentBal >= 0 ? 'Dr' : 'Cr'}`
          ];
      });

      // Add opening and closing balance rows
      const openingRow = [startDate, 'Opening Balance', '', '', '', '', `${Math.abs(openingBalance).toFixed(2)} ${openingBalance >= 0 ? 'Dr' : 'Cr'}`];
      const closingRow = [endDate, 'Closing Balance', '', '', totalDebit.toFixed(2), totalCredit.toFixed(2), `${Math.abs(closingBalance).toFixed(2)} ${closingBalance >= 0 ? 'Dr' : 'Cr'}`];

      const csvContent = [
          headers.join(','),
          openingRow.map(cell => `"${cell}"`).join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
          closingRow.map(cell => `"${cell}"`).join(',')
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Ledger_${selectedParty.name}_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-3 flex justify-between items-center shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <div className="flex items-center gap-3">
            <button onClick={onBack}><ArrowLeft size={24} /></button>
            <div>
                <h1 className="text-xl font-bold">Ledger Report</h1>
                <p className="text-xs opacity-80">खाता बही</p>
            </div>
        </div>
        <div className="flex gap-3">
            <button onClick={handleDownload} className="p-2 hover:bg-white/10 rounded-full" title="Download CSV"><Download size={20} /></button>
            <button className="p-2 hover:bg-white/10 rounded-full" title="Share"><Share2 size={20} /></button>
        </div>
      </header>

      {/* Filters */}
      <div className={`p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-3 ${!selectedParty ? 'pb-0 border-b-0' : ''}`}>
          {/* Party Selector */}
          {!selectedParty ? (
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                     type="text"
                     placeholder="ग्राहक खोजें (नाम या मोबाइल)"
                     value={partySearchQuery}
                     onChange={e => setPartySearchQuery(e.target.value)}
                     className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                 />
              </div>
          ) : (
              <div className="flex justify-between items-center bg-blue-50 dark:bg-slate-800 p-2 rounded-lg border border-blue-200 dark:border-slate-700">
                  <div>
                      <h2 className="font-bold text-lg text-blue-900 dark:text-blue-100">{selectedParty.name}</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{selectedParty.city} {selectedParty.mobile ? `• ${selectedParty.mobile}` : ''}</p>
                  </div>
                  <button onClick={() => setSelectedParty(null)} className="text-xs text-red-500 font-bold px-3 py-1 bg-white dark:bg-slate-900 rounded border border-red-200">CHANGE</button>
              </div>
          )}

          {/* Date Range */}
          {selectedParty && (
              <div className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                      <span className="absolute top-1 left-2 text-[10px] text-slate-500 font-bold uppercase">From</span>
                      <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                        className="w-full pt-4 pb-1 px-2 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none"
                      />
                  </div>
                  <div className="flex-1 relative">
                      <span className="absolute top-1 left-2 text-[10px] text-slate-500 font-bold uppercase">To</span>
                      <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                        className="w-full pt-4 pb-1 px-2 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none"
                      />
                  </div>
              </div>
          )}
      </div>

      {/* Party List when none selected */}
      {!selectedParty && (
          <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 p-2">
              {partySearchQuery.trim() === '' ? null : filteredParties.length === 0 ? (
                  <div className="text-center p-10 text-slate-500">No parties found.</div>
              ) : (
                  <div className="space-y-2">
                      {filteredParties.map((party) => (
                          <div 
                              key={party.id}
                              onClick={() => setSelectedParty(party)}
                              className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center active:scale-[0.98] transition-transform cursor-pointer shadow-sm"
                          >
                              <div>
                                  <h3 className="font-bold text-slate-800 dark:text-slate-100">{party.name}</h3>
                                  {party.mobile && <p className="text-xs text-slate-500">{party.mobile}</p>}
                              </div>
                              <div className="text-right">
                                  <div className={`font-bold text-sm ${party.currentBalance > 0 ? 'text-green-600 dark:text-green-400' : party.currentBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600'}`}>
                                      ₹{Number(Math.abs(party.currentBalance).toFixed(2)).toLocaleString('en-IN')}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                      {party.currentBalance >= 0 ? 'Receivable' : 'Payable'}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* Report Table */}
      {selectedParty && (
          <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
              {loading ? (
                  <div className="p-10 text-center text-slate-500">Loading Ledger...</div>
              ) : (
                  <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-[#fdfebd] text-slate-900 sticky top-0 z-10 shadow-sm font-bold border-b-2 border-slate-300">
                          <tr>
                              <th className="p-2 border-r border-slate-300 w-24">Date<br/><span className="text-[10px] font-normal">तारीख</span></th>
                              <th className="p-2 border-r border-slate-300">Particulars<br/><span className="text-[10px] font-normal">विवरण</span></th>
                              <th className="p-2 border-r border-slate-300 w-16 text-center">Vch Type</th>
                              <th className="p-2 border-r border-slate-300 w-16 text-center">Vch No</th>
                              <th className="p-2 border-r border-slate-300 text-right w-24 bg-red-50">Debit<br/><span className="text-[10px] font-normal">नामे (Dr)</span></th>
                              <th className="p-2 text-right w-24 bg-green-50">Credit<br/><span className="text-[10px] font-normal">जमा (Cr)</span></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                          {/* Opening Balance Row */}
                          <tr className="bg-yellow-50 dark:bg-yellow-900/10 font-bold italic text-slate-600 dark:text-slate-300">
                              <td className="p-2 border-r border-slate-200 dark:border-slate-700"></td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-700">Opening Balance</td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-700" colSpan={2}></td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">
                                  {openingBalance > 0 ? `₹${Number(Math.abs(openingBalance).toFixed(2)).toLocaleString('en-IN')}` : ''}
                              </td>
                              <td className="p-2 text-right">
                                  {openingBalance < 0 ? `₹${Number(Math.abs(openingBalance).toFixed(2)).toLocaleString('en-IN')}` : ''}
                              </td>
                          </tr>

                          {/* Transactions */}
                          {transactions.map((row, idx) => {
                              // Update running balance for tooltip or checking (not displayed in row to save space on mobile, but standard ledger has it)
                              runningBalance += (row.debit - row.credit);
                              
                              return (
                                  <tr key={idx} className="hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors">
                                      <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-xs">
                                          {Date.fromLocalDateString(row.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short'})}
                                      </td>
                                      <td className="p-2 border-r border-slate-200 dark:border-slate-700">
                                          <div className="font-bold text-slate-800 dark:text-white">{row.particulars}</div>
                                          {row.narration && <div className="text-[10px] text-slate-500 italic">{row.narration}</div>}
                                      </td>
                                      <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center text-[10px] uppercase">{row.vchType.split(' ')[0]}</td>
                                      <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center text-xs">{row.vchNo}</td>
                                      <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-right text-slate-700 dark:text-slate-300 font-mono">
                                          {row.debit ? Number(row.debit.toFixed(2)).toLocaleString('en-IN') : ''}
                                      </td>
                                      <td className="p-2 text-right text-slate-700 dark:text-slate-300 font-mono">
                                          {row.credit ? Number(row.credit.toFixed(2)).toLocaleString('en-IN') : ''}
                                      </td>
                                  </tr>
                              );
                          })}

                          {/* Closing Balance Row */}
                          <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-600">
                              <td colSpan={4} className="p-2 text-right uppercase border-r border-slate-300 dark:border-slate-600">Total</td>
                              <td className="p-2 text-right border-r border-slate-300 dark:border-slate-600">₹{Number((Math.abs(openingBalance > 0 ? openingBalance : 0) + totalDebit).toFixed(2)).toLocaleString('en-IN')}</td>
                              <td className="p-2 text-right">₹{Number((Math.abs(openingBalance < 0 ? openingBalance : 0) + totalCredit).toFixed(2)).toLocaleString('en-IN')}</td>
                          </tr>
                      </tbody>
                      
                      <tfoot className="bg-blue-600 text-white font-bold text-sm sticky bottom-0">
                          <tr>
                              <td colSpan={4} className="p-3 text-right">Closing Balance (शेष राशि):</td>
                              <td colSpan={2} className="p-3 text-center text-lg">
                                  ₹{Number(Math.abs(closingBalance).toFixed(2)).toLocaleString('en-IN')} 
                                  <span className="text-xs ml-1 bg-white/20 px-1 rounded">
                                      {closingBalance >= 0 ? 'Dr (Receivable)' : 'Cr (Payable)'}
                                  </span>
                              </td>
                          </tr>
                      </tfoot>
                  </table>
              )}
          </div>
      )}
    </div>
  );
};
