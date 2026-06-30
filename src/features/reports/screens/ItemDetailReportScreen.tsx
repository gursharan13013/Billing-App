import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Item, TransactionType, Invoice } from '../../../core/types/';
import { billingService } from '../../../services/billingService';


interface ItemDetailReportScreenProps {
  onBack: () => void;
  item: Item | null; // null means "All"
  type: TransactionType;
}

interface FlattenedRow {
  id: string;
  invoiceNo: string;
  partyName: string;
  date: string;
  itemName: string;
  qty: number;
  unit: string;
  amount: number;
}

export const ItemDetailReportScreen: React.FC<ItemDetailReportScreenProps> = ({ onBack, item, type }) => {
  const [rows, setRows] = useState<FlattenedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'Today' | 'Month' | 'Year'>('Month');

  useEffect(() => {
    loadData();
  }, [type, item]);

  const loadData = async () => {
    try {
      const invs = await billingService.getInvoices(type);
      
      const flatRows: FlattenedRow[] = [];
      invs.forEach(inv => {
          if (!inv.items) return;
          inv.items.forEach(invItem => {
              if (item && invItem.item.id !== item.id) return;
              
              const amount = invItem.qty * invItem.rate; // Assuming amount is qty * rate
              
              flatRows.push({
                  id: `${inv.id}-${invItem.id || Math.random().toString()}`,
                  invoiceNo: inv.invoiceNo,
                  partyName: inv.partyName,
                  date: inv.date,
                  itemName: invItem.item.name,
                  qty: invItem.qty,
                  unit: invItem.item.unit || '',
                  amount: amount
              });
          });
      });

      setRows(flatRows.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toDateString();
  const currentMonthNum = new Date().getMonth();
  const currentYearNum = new Date().getFullYear();

  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });

  // Filter based on dateFilter
  const displayRows = rows.filter(row => {
     const d = new Date(row.date);
     if (dateFilter === 'Today') return d.toDateString() === todayStr;
     if (dateFilter === 'Month') return d.getMonth() === currentMonthNum && d.getFullYear() === currentYearNum;
     if (dateFilter === 'Year') return d.getFullYear() === currentYearNum;
     return true;
  });

  const totals = displayRows.reduce((acc, row) => {
      acc.qty += row.qty;
      acc.amount += row.amount;
      return acc;
  }, { qty: 0, amount: 0 });

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="bg-[#3b5998] text-white p-3 flex items-center shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack} className="mr-3 p-1 active:scale-95 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 overflow-hidden">
          <h1 className="text-lg font-medium truncate">{item ? item.name : 'All Items'}</h1>
        </div>
        <button className="p-2 active:scale-95">
          <Calendar size={22} />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex p-2 gap-2 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
          <button 
             onClick={() => setDateFilter('Today')}
             className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${dateFilter === 'Today' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
          >
             Today
          </button>
          <button 
             onClick={() => setDateFilter('Month')}
             className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${dateFilter === 'Month' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
          >
             {currentMonthName}
          </button>
          <button 
             onClick={() => setDateFilter('Year')}
             className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${dateFilter === 'Year' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
          >
             {currentYearNum}
          </button>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar relative bg-white">
         <table className="w-full min-w-[700px] text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10 border-b border-slate-200">
                <tr>
                    <th className="p-3 text-[15px] font-bold text-black border-r border-slate-200">Bill No.</th>
                    <th className="p-3 text-[15px] font-bold text-black border-r border-slate-200">Name</th>
                    <th className="p-3 text-[15px] font-bold text-black border-r border-slate-200">Item Name</th>
                    <th className="p-3 text-[15px] font-bold text-black border-r border-slate-200">Qty</th>
                    <th className="p-3 text-[15px] font-bold text-black border-r border-slate-200">Unit</th>
                    <th className="p-3 text-[15px] font-bold text-black">Amount</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/20">
                {displayRows.map((row, idx) => (
                    <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-[#6EE76E]' : 'bg-[#5FE15F]'}`}>
                        <td className="p-3 text-[15px] text-black border-r border-white/30">{row.invoiceNo}</td>
                        <td className="p-3 text-[15px] text-black border-r border-white/30 truncate max-w-[120px]">{row.partyName}</td>
                        <td className="p-3 text-[15px] text-black border-r border-white/30 truncate max-w-[120px]">{row.itemName}</td>
                        <td className="p-3 text-[15px] text-black border-r border-white/30">{row.qty}</td>
                        <td className="p-3 text-[15px] text-black border-r border-white/30 uppercase">{row.unit}</td>
                        <td className="p-3 text-[15px] text-black">{row.amount.toFixed(2)}</td>
                    </tr>
                ))}
                {displayRows.length === 0 && !loading && (
                    <tr className="bg-white">
                        <td colSpan={6} className="p-6 text-center text-slate-500">No records found for {dateFilter}</td>
                    </tr>
                )}
            </tbody>
            <tfoot className="sticky bottom-0 bg-[#3b5998] text-white z-10 font-bold">
                <tr>
                    <td colSpan={3} className="p-3 text-[15px] border-r border-[#3b5998]/20 whitespace-nowrap">Total : {displayRows.length}</td>
                    <td className="p-3 text-[15px] border-r border-[#3b5998]/20">{totals.qty}</td>
                    <td className="p-3 text-[15px] border-r border-[#3b5998]/20"></td>
                    <td className="p-3 text-[15px]">{totals.amount.toFixed(2)}</td>
                </tr>
            </tfoot>
         </table>
      </div>
    </div>
  );
};
