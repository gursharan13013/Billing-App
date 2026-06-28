import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Download, Upload, Search, Filter } from 'lucide-react';
import { billingService } from '../../services/billingService';
import { UnifiedTransaction, Language } from '../../core/types/';
import { motion } from 'motion/react';

interface MasterDataTableScreenProps {
  onBack: () => void;
  language?: Language;
}

export const MasterDataTableScreen: React.FC<MasterDataTableScreenProps> = ({ onBack, language }) => {
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [filteredData, setFilteredData] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');

  const isHi = language === 'hi';

  const t = {
    title: isHi ? 'मास्टर डेटा तालिका (Day Book)' : 'Master Data Table',
    subtitle: isHi ? 'सभी प्रविष्टियां (डे बुक)' : 'All Entries (Day Book)',
    import: isHi ? 'आयात' : 'Import',
    export: isHi ? 'निर्यात' : 'Export Excel',
    searchPlaceholder: isHi ? 'प्रविष्टि खोजें...' : 'Search Entry...',
    date: isHi ? 'तारीख' : 'Date',
    particulars: isHi ? 'विवरण' : 'Particulars',
    vchType: isHi ? 'वाउचर प्रकार' : 'Vch Type',
    vchNo: isHi ? 'वाउचर नंबर' : 'Vch No',
    amount: isHi ? 'राशि' : 'Amount',
    totalEntries: isHi ? 'कुल प्रविष्टियां' : 'Total Entries',
    loading: isHi ? 'प्रविष्टियां लोड हो रही हैं...' : 'Loading entries...',
    noData: isHi ? 'निर्यात करने के लिए कोई डेटा नहीं है।' : 'No data to export.',
    importPlaceholder: isHi ? 'बैकअप रिस्टोर के लिए इम्पोर्ट।' : 'Import feature allows you to restore backed up JSON data. Currently, for CSV import, complex mapping is required.',
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
      filterTransactions();
  }, [searchQuery, transactions, filterType]);

  const loadData = async () => {
    setLoading(true);
    const data = await billingService.getUnifiedTransactions();
    setTransactions(data);
    setLoading(false);
  };

  const filterTransactions = () => {
      let filtered = transactions;

      if (filterType !== 'All') {
          filtered = filtered.filter(tRow => tRow.type === filterType);
      }

      if (searchQuery) {
          const lower = searchQuery.trim().toLowerCase();
          filtered = filtered.filter(tRow => 
              tRow.partyName.toLowerCase().includes(lower) || 
              tRow.voucherNo.toLowerCase().includes(lower) ||
              tRow.amount.toString().includes(lower)
          );
      }

      setFilteredData(filtered);
  };

  const exportToExcel = () => {
      if (filteredData.length === 0) {
          alert(t.noData);
          return;
      }

      const headers = ['Date', 'Voucher No', 'Type', 'Party Name', 'Amount', 'Description'];
      const rows = filteredData.map(tRow => [
          tRow.date,
          tRow.voucherNo,
          tRow.type,
          `"${tRow.partyName}"`,
          tRow.amount,
          `"${tRow.description}"`
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
          + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Master_Data_Entry_${new Date().toLocalDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      alert(t.importPlaceholder);
  };

  const uniqueTypes = ['All', ...Array.from(new Set(transactions.map(tRow => tRow.type)))];

  const getTranslatedType = (type: string) => {
    if (!isHi) return type;
    if (type === 'All') return 'सब';
    return type;
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
        <div className="flex gap-2">
            <label className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 px-3.5 py-2.5 rounded-lg cursor-pointer flex items-center gap-2 text-xs font-bold transition-all min-h-[44px]">
                <Upload size={16} />
                <span className="hidden sm:inline">{t.import}</span>
                <input type="file" accept=".csv,.json" onChange={handleImport} className="hidden" />
            </label>
            <button 
                onClick={exportToExcel}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2.5 rounded-lg flex items-center gap-2 text-xs font-bold transition-all min-h-[44px] active:scale-95"
            >
                <Download size={16} />
                <span className="hidden sm:inline">{t.export}</span>
            </button>
        </div>
      </header>

      {/* Filters & Day Book search controls */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 space-y-3.5 shrink-0 transition-colors">
          <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder={t.searchPlaceholder} 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl text-sm font-bold outline-none focus:border-indigo-500 min-h-[44px]"
              />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              <Filter size={16} className="text-slate-400 shrink-0" />
              {uniqueTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer min-h-[32px] ${
                        filterType === type 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                      {getTranslatedType(type)}
                  </button>
              ))}
          </div>
      </div>

      {/* Day Book Table View Card Structure */}
      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 p-4">
        <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden h-full flex flex-col bg-white dark:bg-slate-900">
          {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs font-bold uppercase tracking-wider gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span>{t.loading}</span>
              </div>
          ) : (
              <div className="min-w-full inline-block align-middle flex-1 overflow-auto custom-scrollbar">
                  <table className="min-w-[650px] w-full text-left text-xs whitespace-nowrap border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider sticky top-0 shadow-xs z-10 border-b border-gray-200 dark:border-slate-800">
                          <tr>
                              <th className="p-3.5 border-r border-gray-200 dark:border-slate-800 w-24">{t.date}</th>
                              <th className="p-3.5 border-r border-gray-200 dark:border-slate-800">{t.particulars}</th>
                              <th className="p-3.5 border-r border-gray-200 dark:border-slate-800 w-24 text-center">{t.vchType}</th>
                              <th className="p-3.5 border-r border-gray-200 dark:border-slate-800 w-24 text-center">{t.vchNo}</th>
                              <th className="p-3.5 text-right w-32">{t.amount}</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                          {filteredData.map((row, idx) => (
                              <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                  <td className="p-3.5 border-r border-gray-100 dark:border-slate-800 font-mono text-[10px] text-slate-500 dark:text-slate-400">{row.date}</td>
                                  <td className="p-3.5 border-r border-gray-100 dark:border-slate-800">
                                      <div className="font-bold text-slate-950 dark:text-white">{row.partyName}</div>
                                      <div className="text-[10px] text-slate-450 dark:text-slate-550 truncate max-w-[280px] font-semibold mt-0.5" title={row.description}>{row.description}</div>
                                  </td>
                                  <td className="p-3.5 border-r border-gray-100 dark:border-slate-800 text-center">
                                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                                          row.type.includes('Sale') ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                          row.type.includes('Purchase') ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                                          row.type.includes('Payment') ? 'bg-red-500/10 text-rose-600 border-red-500/20' :
                                          row.type.includes('Receipt') ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                          'bg-slate-500/10 text-slate-600 border-slate-500/20'
                                      }`}>
                                          {row.type}
                                      </span>
                                  </td>
                                  <td className="p-3.5 border-r border-gray-100 dark:border-slate-800 text-center font-bold text-xs">{row.voucherNo}</td>
                                  <td className="p-3.5 text-right font-extrabold font-mono text-slate-900 dark:text-white">
                                      ₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          )}
        </div>
      </div>
      
      {/* Footer entries Counter */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 text-center text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
          {t.totalEntries}: <span className="text-slate-900 dark:text-white font-extrabold">{filteredData.length}</span>
      </div>
    </motion.div>
  );
};
