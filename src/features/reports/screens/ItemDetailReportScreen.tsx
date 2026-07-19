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

  const lang = (localStorage.getItem('language') || 'en') as 'en' | 'hi';
  const isHi = lang === 'hi';
  const t = {
    allItems: isHi ? 'सभी सामग्रियां' : 'All Items',
    today: isHi ? 'आज' : 'Today',
    billNo: isHi ? 'बिल नंबर' : 'Bill No.',
    name: isHi ? 'नाम' : 'Name',
    itemName: isHi ? 'सामग्री का नाम' : 'Item Name',
    qty: isHi ? 'मात्रा' : 'Qty',
    unit: isHi ? 'इकाई' : 'Unit',
    amount: isHi ? 'राशि' : 'Amount',
    noRecords: (filter: string) => isHi ? `${filter} के लिए कोई रिकॉर्ड नहीं मिला` : `No records found for ${filter}`,
    total: isHi ? 'कुल' : 'Total'
  };

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

  const currentMonthName = new Date().toLocaleString(isHi ? 'hi-IN' : 'en-US', { month: 'long' });

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
    <div className="flex flex-col h-screen bg-[var(--bg-app)] text-[var(--text-main)] pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Header */}
      <header className="bg-[var(--bg-card)] border-b border-[var(--border-ui)] text-[var(--text-main)] p-4 pt-[max(env(safe-area-inset-top),48px)] flex items-center gap-3 shadow-sm shrink-0">
        <button onClick={onBack} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 overflow-hidden">
          <h1 className="text-lg font-black truncate tracking-tight">{item ? item.name : t.allItems}</h1>
        </div>
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <Calendar size={22} />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex p-2 gap-2 border-b border-[var(--border-ui)] shrink-0 bg-[var(--bg-card)]">
          <button 
             onClick={() => setDateFilter('Today')}
             className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${dateFilter === 'Today' ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'bg-[var(--bg-app)] text-[var(--text-secondary)] border border-[var(--border-ui)]'}`}
          >
             {t.today}
          </button>
          <button 
             onClick={() => setDateFilter('Month')}
             className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${dateFilter === 'Month' ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'bg-[var(--bg-app)] text-[var(--text-secondary)] border border-[var(--border-ui)]'}`}
          >
             {currentMonthName}
          </button>
          <button 
             onClick={() => setDateFilter('Year')}
             className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${dateFilter === 'Year' ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'bg-[var(--bg-app)] text-[var(--text-secondary)] border border-[var(--border-ui)]'}`}
          >
             {currentYearNum}
          </button>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar relative bg-[var(--bg-app)]">
         <table className="w-full min-w-[700px] text-left border-collapse">
            <thead className="sticky top-0 bg-[var(--bg-card)] text-[var(--text-main)] z-10 border-b border-[var(--border-ui)]">
                <tr>
                    <th className="p-3 text-sm font-black border-r border-[var(--border-ui)]">{t.billNo}</th>
                    <th className="p-3 text-sm font-black border-r border-[var(--border-ui)]">{t.name}</th>
                    <th className="p-3 text-sm font-black border-r border-[var(--border-ui)]">{t.itemName}</th>
                    <th className="p-3 text-sm font-black border-r border-[var(--border-ui)]">{t.qty}</th>
                    <th className="p-3 text-sm font-black border-r border-[var(--border-ui)]">{t.unit}</th>
                    <th className="p-3 text-sm font-black">{t.amount}</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-ui)]">
                {displayRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-ui)] font-semibold">{row.invoiceNo}</td>
                        <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-ui)] font-semibold truncate max-w-[120px]">{row.partyName}</td>
                        <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-ui)] font-semibold truncate max-w-[120px]">{row.itemName}</td>
                        <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-ui)] font-semibold">{row.qty}</td>
                        <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-ui)] font-semibold uppercase">{row.unit}</td>
                        <td className="p-3 text-sm text-[var(--text-main)] font-semibold">₹{row.amount.toFixed(2)}</td>
                    </tr>
                ))}
                {displayRows.length === 0 && !loading && (
                    <tr className="bg-[var(--bg-card)]">
                        <td colSpan={6} className="p-6 text-center text-[var(--text-secondary)] font-medium">{t.noRecords(dateFilter)}</td>
                    </tr>
                )}
            </tbody>
            <tfoot className="sticky bottom-0 bg-[var(--brand-primary)] text-white z-10 font-black">
                <tr>
                    <td colSpan={3} className="p-3 text-sm border-r border-white/10 whitespace-nowrap">{t.total} : {displayRows.length}</td>
                    <td className="p-3 text-sm border-r border-white/10">{totals.qty}</td>
                    <td className="p-3 text-sm border-r border-white/10"></td>
                    <td className="p-3 text-sm">₹{totals.amount.toFixed(2)}</td>
                </tr>
            </tfoot>
         </table>
      </div>
    </div>
  );
};
