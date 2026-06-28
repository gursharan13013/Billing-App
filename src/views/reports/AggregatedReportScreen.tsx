import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Download } from 'lucide-react';
import { TransactionType, Invoice } from '../../core/types/';
import { billingService } from '../../services/billingService';


interface AggregatedReportScreenProps {
  onBack: () => void;
  type: TransactionType;
  reportOption: 'By Party' | 'By Item' | 'By Party By Item' | 'Default';
  onNavigate?: (screen: any, params?: any) => void;
}

export const AggregatedReportScreen: React.FC<AggregatedReportScreenProps> = ({ onBack, type, reportOption, onNavigate }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'Today'|'Month'|'All'>('All');

  useEffect(() => {
    loadData();
  }, [type]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await billingService.getInvoices(type);
      setInvoices(data);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const aggregatedData = useMemo(() => {
    let filteredInvoices = invoices;
    
    // Date Filtering
    if (dateFilter !== 'All') {
      const today = new Date();
      filteredInvoices = filteredInvoices.filter(inv => {
        const invDate = Date.fromLocalDateString(inv.date);
        if (dateFilter === 'Today') {
          return invDate.toDateString() === today.toDateString();
        }
        if (dateFilter === 'Month') {
          return invDate.getMonth() === today.getMonth() && invDate.getFullYear() === today.getFullYear();
        }
        return true;
      });
    }

    const q = (searchQuery || '').toLowerCase();

    // Processing
    if (reportOption === 'By Party') {
      const partyMap = new Map<string, { partyName: string; qty: number; amount: number }>();
      
      filteredInvoices.forEach(inv => {
        const pName = inv.partyName || 'Unknown Party';
        const matchParty = pName.toLowerCase().includes(q);

        let invQty = 0;
        let invAmount = 0;

        if (inv.items && inv.items.length > 0) {
           inv.items.forEach(item => {
              const iName = (item.item ? item.item.name : (item as any).name) || 'Unknown Item';
              const matchItem = iName.toLowerCase().includes(q);
              
              if (q && !matchParty && !matchItem) return;

              invQty += item.qty;
              // using rate provided in the invoice items. 
              invAmount += (item.qty * item.rate);
           });
        } else {
           if (q && !matchParty) return;
           invAmount = inv.totalAmount; // fallback if no items but matches party
        }

        if (invQty === 0 && invAmount === 0 && q && !matchParty) {
            return; // nothing matched in this invoice
        }

        const existing = partyMap.get(pName) || { partyName: pName, qty: 0, amount: 0 };
        partyMap.set(pName, {
          partyName: pName,
          qty: existing.qty + invQty,
          amount: existing.amount + invAmount
        });
      });

      return Array.from(partyMap.values());

    } else if (reportOption === 'By Item') {
      const itemMap = new Map<string, { itemName: string; qty: number; amount: number }>();
      
      filteredInvoices.forEach(inv => {
        const matchParty = (inv.partyName || "").toLowerCase().includes(q);

        if (inv.items) {
          inv.items.forEach(item => {
            const itemName = (item.item ? item.item.name : (item as any).name) || 'Unknown Item';
            const matchItem = itemName.toLowerCase().includes(q);
            
            if (q && !matchParty && !matchItem) return;

            const existing = itemMap.get(itemName) || { itemName: itemName, qty: 0, amount: 0 };
            itemMap.set(itemName, {
              itemName: itemName,
              qty: existing.qty + item.qty,
              amount: existing.amount + (item.qty * item.rate) // Gross before tax for simplicity, or we can use net. Using gross here.
            });
          });
        }
      });
      
      return Array.from(itemMap.values());

    } else if (reportOption === 'By Party By Item') {
      const partyItemMap = new Map<string, { partyName: string; itemName: string; qty: number; amount: number }>();
      
      filteredInvoices.forEach(inv => {
        const partyName = inv.partyName || 'Unknown Party';
        const matchParty = partyName.toLowerCase().includes(q);

        if (inv.items) {
          inv.items.forEach(item => {
            const itemName = (item.item ? item.item.name : (item as any).name) || 'Unknown Item';
            const matchItem = itemName.toLowerCase().includes(q);

            if (q && !matchParty && !matchItem) return;

            const key = `${partyName} - ${itemName}`;
            const existing = partyItemMap.get(key) || { partyName: partyName, itemName: itemName, qty: 0, amount: 0 };
            partyItemMap.set(key, {
              partyName: partyName,
              itemName: itemName,
              qty: existing.qty + item.qty,
              amount: existing.amount + (item.qty * item.rate)
            });
          });
        }
      });
      
      return Array.from(partyItemMap.values());
    }
    
    return [];
  }, [invoices, reportOption, searchQuery, dateFilter]);

  const totalQty = aggregatedData.reduce((sum, row) => sum + row.qty, 0);
  const totalAmount = aggregatedData.reduce((sum, row) => sum + row.amount, 0);

  const exportCSV = () => {
      let headers = [];
      if (reportOption === 'By Party') headers = ['Party', 'Qty', 'Amount'];
      else if (reportOption === 'By Item') headers = ['Item', 'Qty', 'Amount'];
      else headers = ['Party', 'Item', 'Qty', 'Amount'];

      const rows = aggregatedData.map(row => {
         if (reportOption === 'By Party') return [row.partyName, row.qty.toString(), row.amount.toFixed(2)];
         else if (reportOption === 'By Item') return [row.itemName, row.qty.toString(), row.amount.toFixed(2)];
         else return [row.partyName, row.itemName, row.qty.toString(), row.amount.toFixed(2)];
      });
      
      const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_Report_${reportOption.replace(/ /g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-[#3b5998] text-white p-3 flex items-center shadow-md pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack} className="mr-3 p-1 active:scale-95 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{type} - {reportOption}</h1>
        </div>
        <button onClick={exportCSV} className="p-2 ml-2 hover:bg-white/10 rounded-full transition-colors active:scale-95" title="Export CSV">
            <Download size={20} />
        </button>
      </header>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-3 shadow-sm border-b border-slate-200 dark:border-slate-700">
         <div className="flex gap-2 mb-3">
             {['Today', 'Month', 'All'].map(f => (
                <button 
                  key={f}
                  onClick={() => setDateFilter(f as any)}
                  className={`flex-1 border text-xs font-bold py-1.5 rounded uppercase transition-colors ${
                      dateFilter === f 
                          ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-400' 
                          : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                    {f}
                </button>
             ))}
         </div>
         <div className="relative">
             <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
                 type="text"
                 placeholder="Search by Party or Item..."
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white placeholder-slate-400"
             />
         </div>
      </div>

      {/* Summary Chips */}
      <div className="px-3 py-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
          <div className="bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800/30 whitespace-nowrap">
              <span className="text-[10px] text-green-600 dark:text-green-400 uppercase font-bold block leading-tight">Total Qty</span>
              <span className="font-bold text-sm text-green-700 dark:text-green-300">{totalQty}</span>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800/30 whitespace-nowrap">
              <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold block leading-tight">Total Amount</span>
              <span className="font-bold text-sm text-blue-700 dark:text-blue-300">₹{totalAmount.toFixed(2)}</span>
          </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-3">
          {loading ? (
             <div className="flex justify-center items-center h-32">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
             </div>
          ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                          <thead className="text-[11px] uppercase bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                              <tr>
                                  {reportOption !== 'By Item' && <th className="p-3 border-r border-slate-200 dark:border-slate-700">Party</th>}
                                  {reportOption !== 'By Party' && <th className="p-3 border-r border-slate-200 dark:border-slate-700">Item</th>}
                                  <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-right w-24">Total Qty</th>
                                  <th className="p-3 text-right w-32">Total Amount</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {aggregatedData.map((row, idx) => (
                                  <tr 
                                      key={idx} 
                                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer active:bg-slate-100 dark:active:bg-slate-800"
                                      onClick={() => {
                                          if (onNavigate) {
                                              const searchStr = reportOption === 'By Party' ? row.partyName : (reportOption === 'By Item' ? row.itemName : row.partyName);
                                              onNavigate('businessReport', { tab: type, searchQuery: searchStr });
                                          }
                                      }}
                                  >
                                      {reportOption !== 'By Item' && (
                                          <td className="p-3 text-slate-800 dark:text-slate-200 font-medium border-r border-slate-200 dark:border-slate-700">
                                              {row.partyName}
                                          </td>
                                      )}
                                      {reportOption !== 'By Party' && (
                                          <td className="p-3 text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">
                                              {row.itemName}
                                          </td>
                                      )}
                                      <td className="p-3 text-right border-r border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                                          {row.qty}
                                      </td>
                                      <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-200">
                                          ₹{row.amount.toFixed(2)}
                                      </td>
                                  </tr>
                              ))}
                              {aggregatedData.length === 0 && (
                                  <tr>
                                      <td colSpan={10} className="p-8 text-center text-slate-500">
                                          No data found
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};
