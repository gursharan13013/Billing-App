import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Download, Search, AlertTriangle, Package, TrendingUp } from 'lucide-react';
import { billingService } from '../../../services/billingService';
import { Item, Language } from '../../../core/types/';
import { motion } from 'motion/react';

interface StockSummaryScreenProps {
  onBack: () => void;
  language?: Language;
}

export const StockSummaryScreen: React.FC<StockSummaryScreenProps> = ({ onBack, language }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'LOW'>('ALL');

  const isHi = language === 'hi';

  // Dynamic Bilingual Localization Dictionary Data Object
  const t = {
    title: isHi ? 'स्टॉक सारांश' : 'STOCK SUMMARY',
    subtitle: isHi ? 'इन्वेंटरी मूल्यांकन और स्थिति' : 'Inventory Valuation & Status',
    totalVal: isHi ? 'कुल स्टॉक मूल्य' : 'Total Stock Value',
    lowStockItems: isHi ? 'कम स्टॉक आइटम' : 'Low Stock Items',
    searchPlaceholder: isHi ? 'आइटम खोजें...' : 'Search Item...',
    all: isHi ? 'सब' : 'All',
    low: isHi ? 'कम' : 'Low',
    itemDetails: isHi ? 'आइटम विवरण' : 'Item Details',
    stockQty: isHi ? 'स्टॉक मात्रा' : 'Stock Qty',
    value: isHi ? 'मूल्य' : 'Value',
    noItems: isHi ? 'कोई आइटम नहीं मिला' : 'No items found',
    rate: isHi ? 'दर' : 'Rate',
    lowStockLabel: isHi ? 'कम स्टॉक' : 'Low Stock',
    excel: isHi ? 'एक्सेल' : 'Excel'
  };

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    const data = await billingService.getAllItems();
    setItems(data);
    setLoading(false);
  };

  const totalValue = useMemo(() => {
    return items.reduce((sum, item) => sum + ((item.openingStock || 0) * (item.purchaseRate || 0)), 0);
  }, [items]);

  const lowStockCount = useMemo(() => {
    return items.filter(i => (i.openingStock || 0) <= 10).length;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      const matchesSearch = i.name && i.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      const matchesFilter = filter === 'LOW' ? (i.openingStock || 0) <= 10 : true;
      return matchesSearch && matchesFilter;
    });
  }, [items, searchQuery, filter]);

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

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', ease: [0.25, 1, 0.5, 1], duration: 0.35 }}
      style={{ willChange: 'transform' }}
      className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)] relative overflow-hidden transition-colors"
    >
      {/* Premium Top Header */}
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

        <button 
          onClick={downloadExcel}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 text-xs font-bold min-h-[44px] active:scale-95 shadow-sm"
        >
          <Download size={16} /> {t.excel}
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3.5 p-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
        <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 relative overflow-hidden flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.totalVal}</p>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">₹{Number(totalValue.toFixed(2)).toLocaleString('en-IN')}</h2>
          </div>
          <TrendingUp className="text-slate-300 dark:text-slate-650 opacity-40 shrink-0" size={32} />
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 relative overflow-hidden flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.lowStockItems}</p>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">{lowStockCount}</h2>
          </div>
          <AlertTriangle className="text-amber-500 opacity-40 shrink-0" size={32} />
        </div>
      </div>

      {/* Filters & Search */}
      <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800/60 flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder={t.searchPlaceholder} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-gray-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-indigo-500 focus-active-light dark:focus-active-dark min-h-[44px]"
          />
        </div>
        <div className="flex bg-slate-50 dark:bg-slate-950 rounded-xl p-1 border border-gray-200 dark:border-slate-800 shrink-0">
          <button 
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all min-h-[34px] ${filter === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
          >
            {t.all}
          </button>
          <button 
            onClick={() => setFilter('LOW')}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all min-h-[34px] ${filter === 'LOW' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
          >
            {t.low}
          </button>
        </div>
      </div>

      {/* List Header */}
      <div className="grid grid-cols-12 bg-slate-50 dark:bg-slate-950 p-3 text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-widest border-b border-gray-200 dark:border-slate-800">
        <div className="col-span-6 pl-2">{t.itemDetails}</div>
        <div className="col-span-3 text-center">{t.stockQty}</div>
        <div className="col-span-3 text-right pr-2">{t.value}</div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center pt-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-slate-400">
            <Package size={40} className="mb-2 opacity-50" />
            <p className="text-xs font-bold uppercase tracking-wider">{t.noItems}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {filteredItems.map(item => {
              const stock = item.openingStock || 0;
              const value = stock * (item.purchaseRate || 0);
              const isLow = stock <= 10;
              return (
                <div key={item.id} className="grid grid-cols-12 p-3.5 items-center hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                  <div className="col-span-6 pl-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span>{t.rate}: ₹{item.purchaseRate}</span>
                      {isLow && <span className="text-red-500 font-extrabold bg-red-500/10 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">{t.lowStockLabel}</span>}
                    </div>
                  </div>
                  <div className="col-span-3 text-center">
                    <p className={`text-sm font-bold ${isLow ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>{stock}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.unit}</p>
                  </div>
                  <div className="col-span-3 text-right pr-2">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">₹{Number(value.toFixed(2)).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};