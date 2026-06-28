import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Party, TransactionType, Invoice } from '../types';
import { billingService } from '../src/services/billingService';


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
    const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="bg-[#3b5998] text-white p-3 flex items-center shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack} className="mr-3 p-1 active:scale-95 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 overflow-hidden">
          <h1 className="text-lg font-medium truncate">{party ? party.name : 'All Parties'}</h1>
        </div>
      </header>

      {/* Custom Date Range Filter */}
      <div className="flex justify-center items-center py-3 border-b border-slate-200 shrink-0 gap-3 bg-white">
          <div className="font-semibold text-black bg-slate-200 px-3 py-2 text-sm relative">
             <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
             {formatDate(fromDate)}
          </div>
          <span className="font-bold text-black text-lg">To</span>
          <div className="font-semibold text-black bg-slate-200 px-3 py-2 text-sm relative">
             <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
             {formatDate(toDate)}
          </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar relative bg-white">
         <table className="w-full min-w-[700px] text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10 border-b border-slate-200">
                <tr>
                    <th className="p-3 text-[15px] font-bold text-black border-r border-slate-200 min-w-[100px]">Date</th>
                    <th className="p-3 text-[15px] font-bold text-black border-r border-slate-200 min-w-[120px]">Item Name</th>
                    <th className="p-3 text-[15px] font-bold text-black border-r border-slate-200">Qty</th>
                    <th className="p-3 text-[15px] font-bold text-black border-r border-slate-200">Rate</th>
                    <th className="p-3 text-[15px] font-bold text-black border-r border-slate-200">Tax</th>
                    <th className="p-3 text-[15px] font-bold text-black">Amount</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/20">
                {displayRows.map((row, idx) => {
                    const rowDate = new Date(row.date);
                    const formattedRowDate = `${rowDate.getDate()}-${rowDate.getMonth() + 1}-${rowDate.getFullYear()}`;
                    return (
                        <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-[#6EE76E]' : 'bg-[#5FE15F]'}`}>
                            <td className="p-3 text-[15px] text-black border-r border-white/30">{formattedRowDate}</td>
                            <td className="p-3 text-[15px] text-black border-r border-white/30 truncate max-w-[150px]">{row.itemName}</td>
                            <td className="p-3 text-[15px] text-black border-r border-white/30">{row.qty}</td>
                            <td className="p-3 text-[15px] text-black border-r border-white/30">{row.rate.toFixed(2)}</td>
                            <td className="p-3 text-[15px] text-black border-r border-white/30">{row.tax.toFixed(2)}</td>
                            <td className="p-3 text-[15px] text-black">{row.amount.toFixed(2)}</td>
                        </tr>
                    );
                })}
                {displayRows.length === 0 && !loading && (
                    <tr className="bg-white">
                        <td colSpan={6} className="p-6 text-center text-slate-500">No records found.</td>
                    </tr>
                )}
            </tbody>
            <tfoot className="sticky bottom-0 bg-[#3b5998] text-white z-10 font-bold">
                <tr>
                    <td colSpan={2} className="p-3 text-[15px] border-r border-[#3b5998]/20 whitespace-nowrap">Total : {displayRows.length}</td>
                    <td className="p-3 text-[15px] border-r border-[#3b5998]/20">{totals.qty}</td>
                    <td className="p-3 text-[15px] border-r border-[#3b5998]/20">{(totals.qty > 0 ? totals.amount / totals.qty : 0).toFixed(2)}</td>
                    <td className="p-3 text-[15px] border-r border-[#3b5998]/20">{totals.tax.toFixed(2)}</td>
                    <td className="p-3 text-[15px]">{totals.amount.toFixed(2)}</td>
                </tr>
            </tfoot>
         </table>
      </div>
    </div>
  );
};
