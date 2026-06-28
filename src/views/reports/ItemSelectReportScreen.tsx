import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { TransactionType, Item } from '../../core/types/';
import { billingService } from '../../services/billingService';


interface ItemSelectReportScreenProps {
  onBack: () => void;
  type: TransactionType;
  onSelect: (item: Item | null) => void; // null means 'All'
}

export const ItemSelectReportScreen: React.FC<ItemSelectReportScreenProps> = ({ onBack, type, onSelect }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [type]);

  const loadData = async () => {
    try {
      const allItems = await billingService.getAllItems();
      // Sort alphabetically
      allItems.sort((a,b) => a.name.localeCompare(b.name));
      setItems(allItems);
    } finally {
      setLoading(false);
    }
  };

  const filtered = items.filter(p => p.name && p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-900">
      <header className="bg-[#3b5998] text-white flex items-center shadow-md shrink-0 p-3 pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack} className="px-4 py-2 active:scale-95 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg">Item List</h1>
        </div>
      </header>
      
      <div className="px-3 py-2 bg-[#3b5998]">
         <input 
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/20 text-white placeholder-white/70 px-3 py-1.5 rounded focus:outline-none"
         />
      </div>

      <div className="flex-1 overflow-auto">
         <table className="w-full text-left">
            <thead className="border-b border-slate-200 dark:border-slate-800">
                <tr>
                    <th className="p-3 text-[15px] font-bold text-black dark:text-white w-16">No.</th>
                    <th className="p-3 text-[15px] font-bold text-black dark:text-white">Name</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                <tr onClick={() => onSelect(null)} className="active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer">
                    <td className="p-3 text-[15px] text-black dark:text-white">1</td>
                    <td className="p-3 text-[15px] text-black dark:text-white">All</td>
                </tr>
                {filtered.map((p, idx) => (
                    <tr key={p.id} onClick={() => onSelect(p)} className="active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer">
                        <td className="p-3 text-[15px] text-black dark:text-white">{idx + 2}</td>
                        <td className="p-3 text-[15px] text-black dark:text-white">{p.name}</td>
                    </tr>
                ))}
            </tbody>
         </table>
      </div>
    </div>
  );
};
