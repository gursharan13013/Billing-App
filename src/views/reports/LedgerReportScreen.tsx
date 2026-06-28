import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Calendar, Search, Download, Share2 } from 'lucide-react';
import { billingService } from '../../services/billingService';
import { Party, Invoice, PaymentRecord, Language } from '../../core/types/';
import { motion } from 'motion/react';

interface LedgerReportScreenProps {
  onBack: () => void;
  language?: Language;
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

export const LedgerReportScreen: React.FC<LedgerReportScreenProps> = ({ onBack, language }) => {
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocalDateString()); // Start of month
  const [endDate, setEndDate] = useState(new Date().toLocalDateString());
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);

  const [allParties, setAllParties] = useState<Party[]>([]);
  const [partySearchQuery, setPartySearchQuery] = useState('');

  const isHi = language === 'hi';

  const t = {
    title: isHi ? 'खाता बही (Ledger)' : 'Ledger Report',
    subtitle: isHi ? 'ग्राहक एवं आपूर्तिकर्ता विवरण' : 'Party & Supplier Statement',
    searchPlaceholder: isHi ? 'ग्राहक या आपूर्तिकर्ता खोजें...' : 'Search customer or supplier...',
    from: isHi ? 'से' : 'From',
    to: isHi ? 'तक' : 'To',
    changeParty: isHi ? 'बदलें' : 'CHANGE',
    noParties: isHi ? 'कोई खाता नहीं मिला।' : 'No parties found.',
    receivable: isHi ? 'प्राप्य (Receivable)' : 'Receivable',
    payable: isHi ? 'देय (Payable)' : 'Payable',
    loading: isHi ? 'बही खाता लोड हो रहा है...' : 'Loading Ledger...',
    dateCol: isHi ? 'तारीख' : 'Date',
    particularsCol: isHi ? 'विवरण' : 'Particulars',
    vchTypeCol: isHi ? 'प्रकार' : 'Vch Type',
    vchNoCol: isHi ? 'नंबर' : 'Vch No',
    debitCol: isHi ? 'नामे (Dr)' : 'Debit (Dr)',
    creditCol: isHi ? 'जमा (Cr)' : 'Credit (Cr)',
    openingBalance: isHi ? 'प्रारंभिक शेष (Opening Balance)' : 'Opening Balance',
    closingBalance: isHi ? 'अंतिम शेष (Closing Balance)' : 'Closing Balance',
    total: isHi ? 'कुल' : 'Total',
    downloadError: isHi ? 'डाउनलोड के लिए कोई डेटा नहीं है।' : 'No data to download.',
    shareError: isHi ? 'साझा करने के लिए कोई डेटा नहीं है।' : 'No data to share.'
  };

  useEffect(() => {
      if (!selectedParty) {
          billingService.getAllParties().then(parties => {
              setAllParties(parties.sort((a,b) => a.name.localeCompare(b.name)));
          });
      }
  }, [selectedParty]);

  const filteredParties = useMemo(() => {
      const q = partySearchQuery.toLowerCase().trim();
      if (!q) return [];
      return allParties.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.mobile && p.mobile.includes(q)));
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
          const types = ['Sale', 'Purchase', 'Sale Return', 'Purchase Return'];
          let allInvoices: Invoice[] = [];
          for (const typeStr of types) {
              const invs = await billingService.getInvoices(typeStr as any);
              allInvoices = [...allInvoices, ...invs];
          }
          
          const allPaymentsRec = await billingService.getAllPayments('Receipt');
          const allPaymentsPay = await billingService.getAllPayments('Payment');
          const allPayments = [...allPaymentsRec, ...allPaymentsPay];
          const journals = await billingService.getAllJournals();

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
                  particulars = isHi ? 'बिक्री खाता' : 'Sales Account';
              } else if (isPurchase) {
                  credit = inv.totalAmount;
                  particulars = isHi ? 'खरीद खाता' : 'Purchase Account';
              } else if (isSaleReturn) {
                  credit = inv.totalAmount;
                  particulars = isHi ? 'बिक्री वापसी' : 'Sale Return';
              } else if (isPurchaseReturn) {
                  debit = inv.totalAmount;
                  particulars = isHi ? 'खरीद वापसी' : 'Purchase Return';
              }

              rawRows.push({
                  date: inv.date,
                  dateObj: Date.fromLocalDateString(inv.date),
                  particulars: particulars,
                  vchType: inv.type,
                  vchNo: inv.invoiceNo,
                  debit,
                  credit,
                  narration: isHi ? `सामग्री: ${inv.items?.length}` : `Items: ${inv.items?.length}`
              });
          });

          // Payments
          allPayments.filter(p => p.partyId === selectedParty.id).forEach(pay => {
              let debit = 0;
              let credit = 0;
              if (pay.type === 'Receipt') {
                  credit = pay.amount;
              } else {
                  debit = pay.amount;
              }

              rawRows.push({
                  date: pay.date,
                  dateObj: Date.fromLocalDateString(pay.date),
                  particulars: pay.mode === 'Cash' ? (isHi ? 'नकद खाता' : 'Cash Account') : pay.mode,
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
                  const otherRow = j.rows.find(r => r.partyId !== selectedParty.id);
                  const particulars = otherRow ? otherRow.partyName : (isHi ? 'सामान्य खाता' : 'General Account');

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

          rawRows.sort((a, b) => {
              const dateDiff = a.dateObj.getTime() - b.dateObj.getTime();
              if (dateDiff !== 0) return dateDiff;
              
              const numA = parseInt((a.vchNo || '').replace(/\D/g, '')) || 0;
              const numB = parseInt((b.vchNo || '').replace(/\D/g, '')) || 0;
              if (numA !== numB) return numA - numB;
              
              return (a.vchNo || '').localeCompare(b.vchNo || '');
          });

          const totalDrAllTime = rawRows.reduce((sum, r) => sum + r.debit, 0);
          const totalCrAllTime = rawRows.reduce((sum, r) => sum + r.credit, 0);
          const netTransactionEffect = totalDrAllTime - totalCrAllTime;
          
          const currentBal = selectedParty.currentBalance;
          const masterOpening = currentBal - netTransactionEffect;

          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59);

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

  let runningBalance = openingBalance;
  const totalDebit = transactions.reduce((sum, r) => sum + (r.debit || 0), 0);
  const totalCredit = transactions.reduce((sum, r) => sum + (r.credit || 0), 0);
  const closingBalance = openingBalance + totalDebit - totalCredit;

  const handleDownload = () => {
      if (!selectedParty || transactions.length === 0) {
          alert(t.downloadError);
          return;
      }

      const headers = ['Date', 'Particulars', 'Vch Type', 'Vch No.', 'Debit', 'Credit', 'Balance'];
      let currentBal = openingBalance;
      
      const rows = transactions.map(tRow => {
          const debit = tRow.debit || 0;
          const credit = tRow.credit || 0;
          currentBal = currentBal + debit - credit;
          return [
              tRow.date,
              tRow.particulars,
              tRow.vchType,
              tRow.vchNo,
              debit > 0 ? debit.toFixed(2) : '',
              credit > 0 ? credit.toFixed(2) : '',
              `${Math.abs(currentBal).toFixed(2)} ${currentBal >= 0 ? 'Dr' : 'Cr'}`
          ];
      });

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
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', ease: [0.25, 1, 0.5, 1], duration: 0.35 }}
      style={{ willChange: 'transform' }}
      className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)] relative overflow-hidden transition-colors font-sans"
    >
      {/* Premium Header */}
      <header className="bg-white dark:bg-slate-900 p-4 flex items-center justify-between shadow-sm shrink-0 border-b border-gray-200 dark:border-slate-800 pt-[max(env(safe-area-inset-top),48px)] transition-colors">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white p-2 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90"
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {t.title}
            </h1>
            <p className="text-[10px] font-bold text-slate-500 tracking-widest mt-0.5 opacity-80 uppercase leading-none">
              {t.subtitle}
            </p>
          </div>
        </div>
        {selectedParty && (
          <button 
            onClick={handleDownload}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 text-xs font-bold min-h-[44px] active:scale-95 shadow-sm"
          >
            <Download size={16} /> {isHi ? 'एक्सपोर्ट' : 'Export'}
          </button>
        )}
      </header>

      {/* Filters and Selection Area */}
      <div className={`p-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 space-y-3.5 ${!selectedParty ? 'pb-2 border-b-0' : ''}`}>
          {/* Party Search/Selector input cards */}
          {!selectedParty ? (
              <div className="relative">
                 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                     type="text"
                     placeholder={t.searchPlaceholder}
                     value={partySearchQuery}
                     onChange={e => setPartySearchQuery(e.target.value)}
                     className="w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-sm font-bold min-h-[44px]"
                 />
              </div>
          ) : (
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 transition-colors">
                  <div>
                      <h2 className="font-extrabold text-base text-slate-900 dark:text-white">{selectedParty.name}</h2>
                      <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wide mt-0.5">{selectedParty.city} {selectedParty.mobile ? `• ${selectedParty.mobile}` : ''}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedParty(null)} 
                    className="text-xs font-bold px-3 py-2 bg-white dark:bg-slate-900 text-rose-500 border border-gray-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-lg active:scale-95 cursor-pointer"
                  >
                    {t.changeParty}
                  </button>
              </div>
          )}

          {/* Date Range controls */}
          {selectedParty && (
              <div className="flex gap-3 items-center">
                  <div className="flex-1 relative">
                      <span className="absolute top-1 left-2.5 text-[8px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">{t.from}</span>
                      <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                        className="w-full pt-4 pb-1.5 px-2.5 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-850 rounded-lg text-xs font-bold outline-none"
                      />
                  </div>
                  <div className="flex-1 relative">
                      <span className="absolute top-1 left-2.5 text-[8px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">{t.to}</span>
                      <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                        className="w-full pt-4 pb-1.5 px-2.5 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-850 rounded-lg text-xs font-bold outline-none"
                      />
                  </div>
              </div>
          )}
      </div>

      {/* Party list when none is chosen */}
      {!selectedParty && (
          <div className="flex-1 overflow-auto p-4 space-y-3 custom-scrollbar">
              {partySearchQuery.trim() === '' ? null : filteredParties.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-bold uppercase tracking-wider text-xs">{t.noParties}</div>
              ) : (
                  <div className="space-y-2.5">
                      {filteredParties.map((party) => (
                          <div 
                              key={party.id}
                              onClick={() => setSelectedParty(party)}
                              className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 flex justify-between items-center active:scale-[0.98] transition-all cursor-pointer shadow-xs hover:border-indigo-500"
                          >
                              <div>
                                  <h3 className="font-extrabold text-slate-950 dark:text-white text-sm">{party.name}</h3>
                                  {party.mobile && <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 mt-0.5">{party.mobile}</p>}
                              </div>
                              <div className="text-right">
                                  <div className={`font-extrabold text-sm ${party.currentBalance > 0 ? 'text-emerald-600 dark:text-emerald-400' : party.currentBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600'}`}>
                                      ₹{Number(Math.abs(party.currentBalance).toFixed(2)).toLocaleString('en-IN')}
                                  </div>
                                  <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5">
                                      {party.currentBalance >= 0 ? t.receivable : t.payable}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* Structured Ledger Table Report */}
      {selectedParty && (
          <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 flex flex-col relative custom-scrollbar">
              {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs font-bold uppercase tracking-wider gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span>{t.loading}</span>
                  </div>
              ) : (
                  <div className="min-w-full inline-block align-middle flex-1">
                      <div className="overflow-x-auto w-full">
                          <table className="min-w-[700px] w-full text-left text-xs whitespace-nowrap border-collapse">
                              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-gray-200 dark:border-slate-800 shadow-xs">
                                  <tr>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800 w-24">{t.dateCol}</th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800">{t.particularsCol}</th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800 w-20 text-center">{t.vchTypeCol}</th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800 w-20 text-center">{t.vchNoCol}</th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800 text-right w-28 bg-rose-500/5">{t.debitCol}</th>
                                      <th className="p-3 text-right w-28 bg-emerald-500/5">{t.creditCol}</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                                  {/* Opening Balance Row */}
                                  <tr className="bg-amber-500/5 dark:bg-amber-500/10 font-bold italic text-slate-655 dark:text-slate-300">
                                      <td className="p-3 border-r border-gray-100 dark:border-slate-800"></td>
                                      <td className="p-3 border-r border-gray-100 dark:border-slate-800 font-extrabold text-amber-600 dark:text-amber-400">{t.openingBalance}</td>
                                      <td className="p-3 border-r border-gray-100 dark:border-slate-800" colSpan={2}></td>
                                      <td className="p-3 border-r border-gray-100 dark:border-slate-800 text-right font-extrabold font-mono">
                                          {openingBalance > 0 ? `₹${Number(Math.abs(openingBalance).toFixed(2)).toLocaleString('en-IN')}` : ''}
                                      </td>
                                      <td className="p-3 text-right font-extrabold font-mono">
                                          {openingBalance < 0 ? `₹${Number(Math.abs(openingBalance).toFixed(2)).toLocaleString('en-IN')}` : ''}
                                      </td>
                                  </tr>

                                  {/* Transaction list mapping */}
                                  {transactions.map((row, idx) => {
                                      runningBalance += (row.debit - row.credit);
                                      return (
                                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                              <td className="p-3 border-r border-gray-100 dark:border-slate-800 font-mono">
                                                  {row.date}
                                              </td>
                                              <td className="p-3 border-r border-gray-100 dark:border-slate-800">
                                                  <div className="font-bold text-slate-950 dark:text-white">{row.particulars}</div>
                                                  {row.narration && <div className="text-[10px] text-slate-450 dark:text-slate-550 italic font-semibold mt-0.5">{row.narration}</div>}
                                              </td>
                                              <td className="p-3 border-r border-gray-100 dark:border-slate-800 text-center font-bold text-[10px] uppercase tracking-wider text-slate-500">
                                                  {row.vchType}
                                              </td>
                                              <td className="p-3 border-r border-gray-100 dark:border-slate-800 text-center font-bold">{row.vchNo}</td>
                                              <td className="p-3 border-r border-gray-100 dark:border-slate-800 text-right text-rose-600 dark:text-rose-400 font-extrabold font-mono">
                                                  {row.debit ? `₹${Number(row.debit.toFixed(2)).toLocaleString('en-IN')}` : ''}
                                              </td>
                                              <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-extrabold font-mono">
                                                  {row.credit ? `₹${Number(row.credit.toFixed(2)).toLocaleString('en-IN')}` : ''}
                                              </td>
                                          </tr>
                                      );
                                  })}

                                  {/* Summary Total Row */}
                                  <tr className="bg-slate-50 dark:bg-slate-950 font-extrabold border-t border-gray-200 dark:border-slate-800">
                                      <td colSpan={4} className="p-3 text-right uppercase border-r border-gray-200 dark:border-slate-850 tracking-wider text-slate-500 font-bold">{t.total}</td>
                                      <td className="p-3 text-right border-r border-gray-200 dark:border-slate-850 text-slate-900 dark:text-white font-extrabold font-mono">₹{Number((Math.abs(openingBalance > 0 ? openingBalance : 0) + totalDebit).toFixed(2)).toLocaleString('en-IN')}</td>
                                      <td className="p-3 text-right text-slate-900 dark:text-white font-extrabold font-mono">₹{Number((Math.abs(openingBalance < 0 ? openingBalance : 0) + totalCredit).toFixed(2)).toLocaleString('en-IN')}</td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
              
              {/* Table Footer with final Closing balances details */}
              {!loading && (
                  <div className="sticky bottom-0 z-20 bg-indigo-600 text-white font-extrabold text-sm p-4 flex justify-between items-center shadow-lg border-t border-indigo-700">
                      <span className="uppercase tracking-wider text-xs">{t.closingBalance}</span>
                      <div className="flex items-center gap-2">
                          <span className="text-base font-black">₹{Number(Math.abs(closingBalance).toFixed(2)).toLocaleString('en-IN')}</span>
                          <span className="text-[10px] font-extrabold uppercase bg-white/20 px-2 py-0.5 rounded-full">
                              {closingBalance >= 0 ? t.receivable : t.payable}
                          </span>
                      </div>
                  </div>
              )}
          </div>
      )}
    </motion.div>
  );
};
