import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Search, Users, X } from 'lucide-react';
import { Party } from '../core/types/';
import { billingService, BroadcastGroup } from '../services/billingService';


interface CreateBroadcastScreenProps {
  onBack: () => void;
  onGroupCreated: (group: BroadcastGroup) => void;
}

export const CreateBroadcastScreen: React.FC<CreateBroadcastScreenProps> = ({ onBack, onGroupCreated }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [groupName, setGroupName] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    const data = await billingService.getAllParties();
    setParties(data);
  };

  const filteredParties = parties.filter(p => 
    p.name && p.name.toLowerCase().includes(searchText.trim().toLowerCase()) || 
    (p.mobile && p.mobile.includes(searchText))
  );

  const toggleParty = (id: string) => {
    setSelectedPartyIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (selectedPartyIds.length === 0) return;
    setStep(2);
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedPartyIds.length === 0) return;

    const newGroup: BroadcastGroup = {
      id: Date.now().toString(),
      name: groupName.trim(),
      memberPartyIds: selectedPartyIds,
      createdAt: new Date().toISOString()
    };

    await billingService.saveBroadcastGroup(newGroup);
    onGroupCreated(newGroup);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
      <div className="bg-[#008069] dark:bg-[#1f2c34] text-white p-4 flex items-center gap-4 shadow-md shrink-0">
        <button onClick={step === 1 ? onBack : () => setStep(1)} className="p-1 hover:bg-white/10 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-lg font-bold">New broadcast</h1>
          <p className="text-xs text-white/80">{selectedPartyIds.length} of {parties.length} selected</p>
        </div>
      </div>

      {step === 1 && (
        <>
          <div className="p-3 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-[#00a884]"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto w-full">
             <div className="p-6 text-center text-sm text-slate-500 border-b border-gray-100 dark:border-slate-800">
                 Only contacts with your number in their address book will receive your broadcast messages.
             </div>
             <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredParties.map(party => (
                  <label key={party.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                    <div className="relative flex items-center justify-center w-6 h-6">
                       <input 
                         type="checkbox" 
                         checked={selectedPartyIds.includes(party.id)}
                         onChange={() => toggleParty(party.id)}
                         className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-sm checked:bg-[#00a884] checked:border-[#00a884] cursor-pointer transition-all"
                       />
                       <Check size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white truncate">{party.name}</h4>
                      {party.mobile && <p className="text-sm text-slate-500 truncate">{party.mobile}</p>}
                    </div>
                  </label>
                ))}
             </div>
          </div>
          {selectedPartyIds.length > 0 && (
            <button onClick={handleNext} className="absolute bottom-6 right-6 w-14 h-14 bg-[#00a884] shadow-lg rounded-full flex items-center justify-center text-white hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all">
               <ArrowLeft size={24} className="rotate-180" />
            </button>
          )}
        </>
      )}

      {step === 2 && (
        <div className="flex-1 flex flex-col p-4 bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-right duration-200">
            <div className="flex items-center justify-center py-6">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mb-4">
                    <Users size={32} className="text-[#00a884]" />
                </div>
            </div>
            
            <div className="relative mt-4">
                <input 
                    type="text" 
                    placeholder="Broadcast list name..." 
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full text-lg border-b-2 border-[#00a884] bg-transparent py-2 pb-1 focus:outline-none focus:border-[#00a884] text-slate-900 dark:text-white px-2 placeholder-slate-400"
                    autoFocus
                />
            </div>
            <p className="text-xs text-slate-500 mt-2 px-2">Provide a broadcast list name.</p>

            <h3 className="font-bold text-slate-500 mt-8 mb-2 px-2 uppercase text-xs tracking-wider">Recipients: {selectedPartyIds.length}</h3>
            <div className="flex flex-wrap gap-2 px-2 max-h-[300px] overflow-y-auto pb-20">
                {parties.filter(p => selectedPartyIds.includes(p.id)).map(p => (
                    <div key={p.id} className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium border border-slate-200 dark:border-slate-700">
                        {p.name}
                        <button onClick={() => toggleParty(p.id)} className="text-slate-400 hover:text-red-500">
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <button 
                onClick={handleCreate} 
                disabled={!groupName.trim() || selectedPartyIds.length === 0}
                className="absolute bottom-6 right-6 w-14 h-14 bg-[#00a884] shadow-lg rounded-full flex items-center justify-center text-white hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
               <Check size={24} />
            </button>
        </div>
      )}
    </div>
  );
};
