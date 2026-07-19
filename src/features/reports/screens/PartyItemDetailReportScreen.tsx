import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Party, TransactionType, Invoice } from '../../../core/types/';
import { billingService } from '../../../services/billingService';

interface PartyItemDetailReportScreenProps {
  onBack: () => void;
  party: Party | null; // null means "All"
  type: TransactionType;
}

interface FlattenedRow {
  id: string;
  invoiceNo: string;
  date: string;
  itemName: string;
  qty: number;
  rate: number;
  tax: number;
  amount: number;
}

export const PartyItemDetailReportScreen: React.FC<PartyItemDetailReportScreenProps> = ({ onBack, party, type }) => {
  const [rows, setRows] = useState<FlattenedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const lang = (localStorage.getItem('language') || 'en') as 'en' | 'hi';
  const isHi = lang === 'hi';
  const t = {
    allParties: isHi ? 'सभी पार्टियां' : 'All Parties',
    to: isHi ? 'तक' : 'To',
    date: isHi ? 'तारीख' : 'Date',
    itemName: isHi ? 'सामग्री का नाम' : 'Item Name',
    qty: isHi ? 'मात्रा' : 'Qty',
    rate: isHi ? 'दर' : 'Rate',
    tax: isHi ? 'टैक्स' : 'Tax',
    amount: isHi ? 'राशि' : 'Amount',
    noRecords: isHi ? 'कोई रिकॉर्ड नहीं मिला।' : 'No records found.',
    total: isHi ? 'कुल' : 'Total'
  };

  useEffect(() => {
    // Default date range: current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setFromDate(firstDay.toISOString().split('T')[0]);
    setToDate(lastDay.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    loadData();
  }, [type, party]);

  const loadData = async () => {
    try {
      const invs = await billingService.getInvoices(type);
      
      const flatRows: FlattenedRow[] = [];
      invs.forEach(inv => {
          if (party && inv.partyId !== party.id) return;
          if (!inv.items) return;

          inv.items.forEach(invItem => {
              const baseAmount = invItem.qty * invItem.rate;
              const taxAmount = (baseAmount * (invItem.taxPercent || 0)) / 100;
              const totalAmount = baseAmount + taxAmount;
              
              flatRows.push({
                  id: `${inv.id}-${invItem.id || Math.random().toString()}`,
                  invoiceNo: inv.invoiceNo,
                  date: inv.date,
                  itemName: invItem.item.name,
                  qty: invItem.qty,
                  rate: invItem.rate,
                  tax: taxAmount,
                  amount: totalAmount
              });
          });
      });

      setRows(flatRows.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } finally {
      setLoading(false);
    }
  };

  // Filter based on custom date range
  const displayRows = rows.filter(row => {
     if (!fromDate || !toDate) return true;
     const d = new Date(row.date).getTime();
     const start = new Date(fromDate).getTime();
     const end = new Date(toDate).getTime();
     return d >= start && d <= end;
  });

  const totals = displayRows.reduce((acc, row) => {
      acc.qty += row.qty;
      acc.amount += row.amount;
      acc.tax += row.tax;
      return acc;
  }, { qty: 0, amount: 0, tax: 0 });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'DD/MM/YYYY';
    const d = new Date(dateString);
    const day = d.getDate();
    const month = d.toLocaleString(isHi ? 'hi-IN' : 'en-US', { month: 'short' }).toUpperCase();
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-app)] text-[var(--text-main)] pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Header */}
      <header className="bg-[var(--bg-card)] border-b border-[var(--border-ui)] text-[var(--text-main)] p-4 pt-[max(env(safe-area-inset-top),48px)] flex items-center gap-3 shadow-sm shrink-0">
        <button onClick={onBack} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors mr-2">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 overflow-hidden">
          <h1 className="text-lg font-black truncate tracking-tight">{party ? party.name : t.allParties}</h1>
        </div>
      </header>

      {/* Custom Date Range Filter */}
      <div className="flex justify-center items-center py-3 border-b border-[var(--border-ui)] shrink-0 gap-3 bg-[var(--bg-card)]">
          <div className="font-bold text-[var(--text-main)] bg-[var(--bg-app)] px-3 py-2 text-sm rounded-xl border border-[var(--border-ui)] relative cursor-pointer hover:bg-slate-100/50 transition-colors">
             <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
             {formatDate(fromDate)}
          </div>
          <span className="font-black text-[var(--text-secondary)] text-sm uppercase tracking-wider">{t.to}</span>
          <div className="font-bold text-[var(--text-main)] bg-[var(--bg-app)] px-3 py-2 text-sm rounded-xl border border-[var(--border-ui)] relative cursor-pointer hover:bg-slate-100/50 transition-colors">
             <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
             {formatDate(toDate)}
          </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar relative bg-[var(--bg-app)]">
         <table className="w-full min-w-[700px] text-left border-collapse">
            <thead className="sticky top-0 bg-[var(--bg-card)] text-[var(--text-main)] z-10 border-b border-[var(--border-ui)]">
                <tr>
                    <th className="p-3 text-sm font-black border-r border-[var(--border-ui)] min-w-[100px]">{t.date}</th>
                    <th className="p-3 text-sm font-black border-r border-[var(--border-ui)] min-w-[120px]">{t.itemName}</th>
                    <th className="p-3 text-sm font-black border-r border-[var(--border-ui)]">{t.qty}</th>
                    <th className="p-3 text-sm font-black border-r border-[var(--border-ui)]">{t.rate}</th>
                    <th className="p-3 text-sm font-black border-r border-[var(--border-ui)]">{t.tax}</th>
                    <th className="p-3 text-sm font-black">{t.amount}</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-ui)]">
                {displayRows.map((row, idx) => {
                    const rowDate = new Date(row.date);
                    const formattedRowDate = `${rowDate.getDate()}-${rowDate.getMonth() + 1}-${rowDate.getFullYear()}`;
                    return (
                        <tr key={row.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-ui)] font-semibold">{formattedRowDate}</td>
                            <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-ui)] font-semibold truncate max-w-[150px]">{row.itemName}</td>
                            <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-ui)] font-semibold">{row.qty}</td>
                            <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-ui)] font-semibold">₹{row.rate.toFixed(2)}</td>
                            <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-ui)] font-semibold">₹{row.tax.toFixed(2)}</td>
                            <td className="p-3 text-sm text-[var(--text-main)] font-semibold">₹{row.amount.toFixed(2)}</td>
                        </tr>
                    );
                })}
                {displayRows.length === 0 && !loading && (
                    <tr className="bg-[var(--bg-card)]">
                        <td colSpan={6} className="p-6 text-center text-[var(--text-secondary)] font-medium">{t.noRecords}</td>
                    </tr>
                )}
            </tbody>
            <tfoot className="sticky bottom-0 bg-[var(--brand-primary)] text-white z-10 font-black">
                <tr>
                    <td colSpan={2} className="p-3 text-sm border-r border-white/10 whitespace-nowrap">{t.total} : {displayRows.length}</td>
                    <td className="p-3 text-sm border-r border-white/10">{totals.qty}</td>
                    <td className="p-3 text-sm border-r border-white/10">₹{(totals.qty > 0 ? totals.amount / totals.qty : 0).toFixed(2)}</td>
                    <td className="p-3 text-sm border-r border-white/10">₹{totals.tax.toFixed(2)}</td>
                    <td className="p-3 text-sm">₹{totals.amount.toFixed(2)}</td>
                </tr>
            </tfoot>
         </table>
      </div>
    </div>
  );
};
