import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Party, TransactionType } from '../../../core/types/';
import { billingService } from '../../../services/billingService';

interface PartySelectReportScreenProps {
  onBack: () => void;
  type: TransactionType;
  onSelect: (party: Party | null) => void; // null means 'All'
}

export const PartySelectReportScreen: React.FC<PartySelectReportScreenProps> = ({ onBack, type, onSelect }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const lang = (localStorage.getItem('language') || 'en') as 'en' | 'hi';
  const isHi = lang === 'hi';
  const t = {
    customerList: isHi ? 'ग्राहक सूची' : 'Customer List',
    supplierList: isHi ? 'आपूर्तिकर्ता सूची' : 'Supplier List',
    search: isHi ? 'खोजें...' : 'Search...',
    no: isHi ? 'क्र.सं.' : 'No.',
    name: isHi ? 'नाम' : 'Name',
    all: isHi ? 'सभी' : 'All',
    cash: isHi ? 'नकद' : 'Cash'
  };

  useEffect(() => {
    loadData();
  }, [type]);

  const loadData = async () => {
    try {
      const allParties = await billingService.getAllParties();
      let relevantParties = allParties;
      if (type.includes('Sale')) {
          relevantParties = allParties.filter(p => p.type === 'Customer');
      } else if (type.includes('Purchase')) {
          relevantParties = allParties.filter(p => p.type === 'Supplier');
      }
      // Sort alphabetically
      relevantParties.sort((a,b) => a.name.localeCompare(b.name));
      setParties(relevantParties);
    } finally {
      setLoading(false);
    }
  };

  const filtered = parties.filter(p => p.name && p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-app)] text-[var(--text-main)] pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-[var(--bg-card)] border-b border-[var(--border-ui)] text-[var(--text-main)] flex items-center shadow-sm shrink-0 p-3 pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors mr-2">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black tracking-tight">{type.includes('Sale') ? t.customerList : t.supplierList}</h1>
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
                <tr onClick={() => onSelect({ id: 'cash', name: 'Cash', mobile: '', type: 'Customer' })} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                    <td className="p-3 text-sm text-[var(--text-main)] font-semibold border-r border-[var(--border-ui)]">2</td>
                    <td className="p-3 text-sm text-[var(--text-main)] font-semibold">{t.cash}</td>
                </tr>
                {filtered.map((p, idx) => (
                    <tr key={p.id} onClick={() => onSelect(p)} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                        <td className="p-3 text-sm text-[var(--text-main)] font-semibold border-r border-[var(--border-ui)]">{idx + 3}</td>
                        <td className="p-3 text-sm text-[var(--text-main)] font-semibold">{p.name}</td>
                    </tr>
                ))}
            </tbody>
         </table>
      </div>
    </div>
  );
};
