import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Search, AlertTriangle, Package, TrendingUp } from 'lucide-react';
import { billingService } from '../src/services/billingService';
import { Item } from '../types';


interface StockSummaryScreenProps {
  onBack: () => void;
}

export const StockSummaryScreen: React.FC<StockSummaryScreenProps> = ({ onBack }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'LOW'>('ALL');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    const data = await billingService.getAllItems();
    setItems(data);
    setLoading(false);
  };

  const calculateTotalValue = () => {
    return items.reduce((sum, item) => sum + ((item.openingStock || 0) * (item.purchaseRate || 0)), 0);
  };

  const getLowStockItems = () => {
    return items.filter(i => (i.openingStock || 0) <= 10); // Threshold 10
  };

  const filteredItems = items.filter(i => {
    const matchesSearch = i.name && i.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchesFilter = filter === 'LOW' ? (i.openingStock || 0) <= 10 : true;
    return matchesSearch && matchesFilter;
  });

  const downloadExcel = () => {
    const headers = ['Item Name', 'Code', 'Current Stock', 'Unit', 'Purchase Rate', 'Stock Value', 'Status'];
    const rows = filteredItems.map(item => {
        const stock = item.openingStock || 0;
        const status = stock <= 10 ? 'Low Stock' : 'Adequate';
        return [
            `"${item.name}"`,
            `"${item.code || ''}"`,
            stock,
            `"${item.unit || ''}"`,
            item.purchaseRate || 0,
            stock * (item.purchaseRate || 0),
            status
        ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Stock_Summary_${new Date().toLocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalValue = calculateTotalValue();
  const lowStockCount = getLowStockItems().length;

  return (
     <div className="flex flex-col h-full bg-slate-50 pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Header */}
      <header className="bg-slate-800 text-white pt-4 pb-2 px-4 shadow-md z-10 pt-[max(env(safe-area-inset-top),48px)]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
             <button onClick={onBack}><ArrowLeft size={24} /></button>
             <div>
                 <h1 className="text-xl font-bold leading-none">STOCK SUMMARY</h1>
                 <p className="text-xs text-slate-300 mt-1">Inventory Valuation & Status</p>
             </div>
          </div>
          <button onClick={downloadExcel} className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold">
             <Download size={18} /> Excel
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-white border-b border-gray-200">
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 relative overflow-hidden">
              <div className="relative z-10">
                  <p className="text-xs font-bold text-blue-500 uppercase">Total Stock Value</p>
                  <h2 className="text-xl font-extrabold text-blue-700 mt-1">₹{Number(totalValue.toFixed(2)).toLocaleString('en-IN')}</h2>
              </div>
              <TrendingUp className="absolute right-2 bottom-2 text-blue-200" size={40} />
          </div>
          <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 relative overflow-hidden">
              <div className="relative z-10">
                  <p className="text-xs font-bold text-orange-500 uppercase">Low Stock Items</p>
                  <h2 className="text-xl font-extrabold text-orange-700 mt-1">{lowStockCount}</h2>
              </div>
              <AlertTriangle className="absolute right-2 bottom-2 text-orange-200" size={40} />
          </div>
      </div>

      {/* Filters & Search */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex gap-3">
          <div className="flex-1 relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input 
                type="text" 
                placeholder="Search Item..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
             />
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filter === 'ALL' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
              >
                  All
              </button>
              <button 
                onClick={() => setFilter('LOW')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filter === 'LOW' ? 'bg-red-100 text-red-600 shadow-sm' : 'text-gray-500'}`}
              >
                  Low
              </button>
          </div>
      </div>

      {/* List Header */}
      <div className="grid grid-cols-12 bg-gray-100 p-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
         <div className="col-span-6 pl-2">Item Details</div>
         <div className="col-span-3 text-center">Stock Qty</div>
         <div className="col-span-3 text-right pr-2">Value</div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
          {loading ? (
             <div className="flex justify-center pt-10">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
             </div>
          ) : filteredItems.length === 0 ? (
             <div className="flex flex-col items-center justify-center pt-20 text-gray-400">
                 <Package size={40} className="mb-2 opacity-50" />
                 <p className="text-sm">No items found</p>
             </div>
          ) : (
             <div className="divide-y divide-gray-100 bg-white">
                 {filteredItems.map(item => {
                     const stock = item.openingStock || 0;
                     const value = stock * (item.purchaseRate || 0);
                     const isLow = stock <= 10;
                     return (
                         <div key={item.id} className="grid grid-cols-12 p-3 items-center hover:bg-gray-50">
                             <div className="col-span-6 pl-2">
                                 <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                                 <div className="flex gap-2 text-[10px] text-gray-400 mt-0.5">
                                    <span>Rate: ₹{item.purchaseRate}</span>
                                    {isLow && <span className="text-red-500 font-bold bg-red-50 px-1 rounded">Low Stock</span>}
                                 </div>
                             </div>
                             <div className="col-span-3 text-center">
                                 <p className={`text-sm font-bold ${isLow ? 'text-red-600' : 'text-gray-700'}`}>{stock}</p>
                                 <p className="text-[10px] text-gray-400">{item.unit}</p>
                             </div>
                             <div className="col-span-3 text-right pr-2">
                                 <p className="text-sm font-bold text-gray-800">₹{Number(value.toFixed(2)).toLocaleString('en-IN')}</p>
                             </div>
                         </div>
                     );
                 })}
             </div>
          )}
      </div>
     </div>
  );
};