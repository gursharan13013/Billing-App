
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Upload, Search, FileText, Filter } from 'lucide-react';
import { billingService } from '../../services/billingService';
import { UnifiedTransaction } from '../../core/types/';


interface MasterDataTableScreenProps {
  onBack: () => void;
}

export const MasterDataTableScreen: React.FC<MasterDataTableScreenProps> = ({ onBack }) => {
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [filteredData, setFilteredData] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');

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

      // Type Filter
      if (filterType !== 'All') {
          filtered = filtered.filter(t => t.type === filterType);
      }

      // Search
      if (searchQuery) {
          const lower = searchQuery.trim().toLowerCase();
          filtered = filtered.filter(t => 
              t.partyName.toLowerCase().includes(lower) || 
              t.voucherNo.toLowerCase().includes(lower) ||
              t.amount.toString().includes(lower)
          );
      }

      setFilteredData(filtered);
  };

  const exportToExcel = () => {
      if (filteredData.length === 0) return alert("No data to export");

      const headers = ['Date', 'Voucher No', 'Type', 'Party Name', 'Amount', 'Description'];
      const rows = filteredData.map(t => [
          t.date,
          t.voucherNo,
          t.type,
          `"${t.partyName}"`, // Escape commas
          t.amount,
          `"${t.description}"`
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

      alert("Import feature allows you to restore backed up JSON data. Currently, for CSV import, complex mapping is required. (This is a placeholder for future implementation).");
      // Basic read logic can be added here if JSON structure matches exactly
  };

  const uniqueTypes = ['All', ...Array.from(new Set(transactions.map(t => t.type)))];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Header */}
      <header className="bg-slate-800 text-white p-4 flex items-center justify-between shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <div className="flex items-center gap-3">
            <button onClick={onBack}><ArrowLeft size={24} /></button>
            <div>
                <h1 className="text-xl font-bold">Master Data Table</h1>
                <p className="text-xs opacity-80">All Entries (Day Book)</p>
            </div>
        </div>
        <div className="flex gap-2">
            <label className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2 text-sm font-bold shadow-sm transition-colors">
                <Upload size={18} />
                <span className="hidden sm:inline">Import</span>
                <input type="file" accept=".csv,.json" onChange={handleImport} className="hidden" />
            </label>
            <button 
                onClick={exportToExcel}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm transition-colors"
            >
                <Download size={18} />
                <span className="hidden sm:inline">Export Excel</span>
            </button>
        </div>
      </header>

      {/* Filters */}
      <div className="p-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search Entry..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
              />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <Filter size={18} className="text-slate-500" />
              {uniqueTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                        filterType === type 
                        ? 'bg-slate-800 text-white border-slate-800' 
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                      {type}
                  </button>
              ))}
          </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
          {loading ? (
              <div className="flex justify-center items-center h-full text-slate-500">Loading entries...</div>
          ) : (
              <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 shadow-sm z-10">
                      <tr>
                          <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-24">Date</th>
                          <th className="p-3 border-b border-slate-200 dark:border-slate-700">Particulars</th>
                          <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-24">Vch Type</th>
                          <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-24">Vch No</th>
                          <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-right w-32">Amount</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredData.map((row, idx) => (
                          <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                              <td className="p-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{row.date}</td>
                              <td className="p-3">
                                  <div className="font-bold text-slate-800 dark:text-white">{row.partyName}</div>
                                  <div className="text-xs text-slate-500 truncate max-w-[200px]">{row.description}</div>
                              </td>
                              <td className="p-3">
                                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                                      row.type.includes('Sale') ? 'bg-green-50 text-green-700 border-green-200' :
                                      row.type.includes('Purchase') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      row.type.includes('Payment') ? 'bg-red-50 text-red-700 border-red-200' :
                                      row.type.includes('Receipt') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      'bg-gray-50 text-gray-700 border-gray-200'
                                  }`}>
                                      {row.type}
                                  </span>
                              </td>
                              <td className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400">{row.voucherNo}</td>
                              <td className="p-3 text-right font-bold font-mono text-slate-900 dark:text-white">
                                  ₹{row.amount.toLocaleString('en-IN')}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}
      </div>
      
      {/* Footer Count */}
      <div className="p-2 bg-slate-100 dark:bg-slate-800 text-center text-xs font-bold text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
          Total Entries: {filteredData.length}
      </div>
    </div>
  );
};
