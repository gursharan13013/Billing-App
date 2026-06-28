import React, { useState, useEffect, useRef } from 'react';
import { Search, User, X } from 'lucide-react';
import { Party } from '../../core/types/';
import { billingService } from '../../services/billingService';
import { searchPartiesOnline } from '../../services/firebaseService';


interface PartySearchProps {
  selectedParty: Party | null;
  onSelect: (party: Party | null) => void;
}

export const PartySearch: React.FC<PartySearchProps> = ({ selectedParty, onSelect }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Party[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchParties = async () => {
      if (query.trim().length === 0) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const results = await billingService.searchParties(query);
        
        // CEO CONTROL - Live Customer Search
        if (query.trim().length === 10) {
            const onlineResults = await searchPartiesOnline(query);
            if (onlineResults.length > 0) {
                // Filter out if already in local results
                const localMobiles = results.map(r => r.mobile?.replace(/\D/g, ''));
                const filteredOnline = onlineResults.filter(o => !localMobiles.includes(o.mobile?.replace(/\D/g, '')));
                setSuggestions([...results, ...filteredOnline]);
            } else {
                setSuggestions(results);
            }
        } else {
            setSuggestions(results);
        }
        
        setIsOpen(true);
      } catch (error) {
        console.error("Failed to search parties", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchParties, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = async (party: Party) => {
    // If it's an online result, import it locally first
    if (!party.isLocal) {
        setLoading(true);
        try {
            const imported = await billingService.importGlobalParty(party);
            onSelect(imported);
        } catch (e) {
            console.error("Failed to import global party", e);
            onSelect(party); // Fallback to using the object as is
        } finally {
            setLoading(false);
        }
    } else {
        onSelect(party);
    }
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
    // Focus back on input after clearing
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  if (selectedParty) {
    return (
      <div className="bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-lg p-3 flex justify-between items-center shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
            <User size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-white">{selectedParty.name}</h3>
            <p className="text-sm text-blue-700 dark:text-slate-400">
              {selectedParty.mobile} <span className="mx-1">•</span> Bal: ₹{Number(selectedParty.currentBalance.toFixed(2)).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
        <button 
          onClick={handleClear}
          className="p-2 hover:bg-blue-100 dark:hover:bg-slate-700 rounded-full text-blue-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          title="Change Party"
        >
          <X size={20} />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative h-[36px]">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        </div>
        <input
          ref={inputRef}
          type="text"
          className="block w-full pl-10 pr-3 h-[36px] border border-gray-300 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:placeholder-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150 ease-in-out shadow-sm"
          placeholder="ग्राहक खोजें (नाम या मोबाइल)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
              if(suggestions.length > 0) setIsOpen(true);
          }}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-[100] top-full left-0 right-0 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xl max-h-48 rounded-b-lg py-0 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm mt-0 border-t-0">
          {suggestions.map((party) => (
            <div
              key={party.id}
              className="cursor-pointer select-none relative py-3 pl-3 pr-9 hover:bg-blue-50 dark:hover:bg-slate-700 border-b last:border-0 border-gray-100 dark:border-slate-700 transition-colors bg-white dark:bg-slate-800"
              onClick={() => handleSelect(party)}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900 dark:text-white block truncate text-base">{party.name}</span>
                <span className="text-slate-500 dark:text-slate-400 text-xs font-bold">₹{Number(party.currentBalance.toFixed(2)).toLocaleString('en-IN')}</span>
              </div>
              <span className="text-slate-500 dark:text-slate-500 text-xs block font-medium mt-0.5">{party.mobile}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};