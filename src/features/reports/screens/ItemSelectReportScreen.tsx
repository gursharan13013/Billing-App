import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { TransactionType, Item } from '../../../core/types/';
import { billingService } from '../../../services/billingService';

interface ItemSelectReportScreenProps {
  onBack: () => void;
  type: TransactionType;
  onSelect: (item: Item | null) => void; // null means 'All'
}

export const ItemSelectReportScreen: React.FC<ItemSelectReportScreenProps> = ({ onBack, type, onSelect }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const lang = (localStorage.getItem('language') || 'en') as 'en' | 'hi';
  const isHi = lang === 'hi';
  const t = {
    itemList: isHi ? 'सामग्री सूची' : 'Item List',
    search: isHi ? 'खोजें...' : 'Search...',
    no: isHi ? 'क्र.सं.' : 'No.',
    name: isHi ? 'नाम' : 'Name',
    all: isHi ? 'सभी' : 'All'
  };

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
    <div className="flex flex-col h-screen bg-[var(--bg-app)] text-[var(--text-main)] pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-[var(--bg-card)] border-b border-[var(--border-ui)] text-[var(--text-main)] flex items-center shadow-sm shrink-0 p-3 pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors mr-2">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black tracking-tight">{t.itemList}</h1>
        </div>
      </header>
      
      <div className="px-3 py-2 bg-[var(--bg-card)] border-b border-[var(--border-ui)] flex items-center relative">
         <Search size={18} className="absolute left-6 text-[var(--text-secondary)] pointer-events-none" />
         <input 
            type="text"
            placeholder={t.search}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-app)] text-[var(--text-main)] placeholder-[var(--text-secondary)] pl-10 pr-4 py-2 border border-[var(--border-ui)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 font-semibold"
         />
      </div>

      <div className="flex-1 overflow-auto bg-[var(--bg-app)]">
         <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[var(--bg-card)] text-[var(--text-main)] z-10 border-b border-[var(--border-ui)]">
                <tr>
                    <th className="p-3 text-sm font-black w-16 border-r border-[var(--border-ui)]">{t.no}</th>
                    <th className="p-3 text-sm font-black">{t.name}</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-ui)]">
                <tr onClick={() => onSelect(null)} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                    <td className="p-3 text-sm text-[var(--text-main)] font-semibold border-r border-[var(--border-ui)]">1</td>
                    <td className="p-3 text-sm text-[var(--text-main)] font-semibold">{t.all}</td>
                </tr>
                {filtered.map((p, idx) => (
                    <tr key={p.id} onClick={() => onSelect(p)} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                        <td className="p-3 text-sm text-[var(--text-main)] font-semibold border-r border-[var(--border-ui)]">{idx + 2}</td>
                        <td className="p-3 text-sm text-[var(--text-main)] font-semibold">{p.name}</td>
                    </tr>
                ))}
            </tbody>
         </table>
      </div>
    </div>
  );
};
