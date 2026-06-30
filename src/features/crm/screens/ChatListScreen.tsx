
import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Search, MoreVertical, Camera, MessageSquarePlus, Phone, Video, Pen, 
  Link as LinkIcon, PhoneIncoming, PhoneOutgoing, PhoneMissed, ArrowLeft, 
  X, Eye, Key, Lock, Bell, CircleDashed, Globe, HelpCircle, 
  Users, MessageSquare, Smartphone, FileText, Sun, 
  Image, UserCheck, BarChart3, PieChart, Clock, Info, Tag, Download, Loader2,
  User, Plus, ArrowRight, Trash2, CheckCircle2, ChevronRight, SlidersHorizontal, Megaphone
} from 'lucide-react';
import { billingService, ChatMessage, BroadcastGroup } from '../../../services/billingService';
import { sqliteService } from '../../../services/sqliteService';
import { Party, UNIFIED_CATEGORIES } from '../../../core/types/';


interface ChatListScreenProps {
  onBack: () => void;
  onSelectChat: (party: Party) => void;
  onCreateBroadcast: () => void;
  onSelectBroadcast: (group: BroadcastGroup) => void;
  onOpenNearbyShops?: () => void;
}

type Tab = 'chats' | 'broadcasts' | 'status' | 'calls';
type ViewState = 'main' | 'new_group' | 'settings_home' | 'settings_account' | 'settings_privacy' | 'settings_avatar' | 'settings_chats' | 'settings_notifications' | 'settings_storage' | 'settings_help' | 'settings_profile';

interface StatusUpdate {
    id: string;
    type: 'image' | 'text';
    content: string;
    bgColor?: string;
    time: string;
    timestamp: number;
    viewers: number;
}

const STATUS_COLORS = ['#ff7e67', '#8a62cc', '#34b7f1', '#607d8b', '#e91e63', '#009688', '#ff9800'];

export const ChatListScreen: React.FC<ChatListScreenProps> = ({ onBack, onSelectChat, onCreateBroadcast, onSelectBroadcast, onOpenNearbyShops }) => {
  const [allParties, setAllParties] = useState<Party[]>([]); // Results from search (Local + Global)
  const [localParties, setLocalParties] = useState<Party[]>([]); // Just local for default view
  const [broadcastGroups, setBroadcastGroups] = useState<BroadcastGroup[]>([]);
  const [activeChatIds, setActiveChatIds] = useState<string[]>([]); 
  const [loading, setLoading] = useState(true);
  const [lastMessages, setLastMessages] = useState<Record<string, ChatMessage>>({});
  
  // Navigation State
  const [currentView, setCurrentView] = useState<ViewState>('main');
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  
  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchRadius, setSearchRadius] = useState<number>(5000); // Distance Slider
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
      const fetchMessages = async () => {
          const msgs = await sqliteService.getAllMessages();
          const messagesMap: Record<string, ChatMessage> = {};
          const unreads: Record<string, number> = {};

          const parseId = (id: string) => (id && typeof id === 'string' && id.length > 15 && id.includes('0.')) ? Number(id.replace('0.', '.')) : Number(id);
          msgs.sort((a, b) => parseId(a.id) - parseId(b.id));

          msgs.forEach(msg => {
              messagesMap[msg.partyId] = msg;
              if (!msg.isSent && !msg.isRead) {
                  unreads[msg.partyId] = (unreads[msg.partyId] || 0) + 1;
              }
          });
          setLastMessages(messagesMap);
          setUnreadCounts(unreads);
      };
      
      fetchMessages();
      // Setup a periodic refresh to simulate live query
      const interval = setInterval(fetchMessages, 2000);
      return () => clearInterval(interval);
  }, []);

  const filteredCategories = React.useMemo(() => {
      if (!searchText) return [];
      return UNIFIED_CATEGORIES.filter(c =>
          c.en.toLowerCase().includes(searchText.trim().toLowerCase()) ||
          c.hi.includes(searchText)
      );
  }, [searchText]);

  // Saving State for Global Parties
  const [savingPartyId, setSavingPartyId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Status State
  const [myStatuses, setMyStatuses] = useState<StatusUpdate[]>([]);
  const [statusIndex, setStatusIndex] = useState(0);
  const [isViewingStatus, setIsViewingStatus] = useState(false);
  const [statusProgress, setStatusProgress] = useState(0);
  const statusInputRef = useRef<HTMLInputElement>(null);
  const [isComposingTextStatus, setIsComposingTextStatus] = useState(false);
  const [textStatusContent, setTextStatusContent] = useState('');
  const [textStatusBg, setTextStatusBg] = useState(STATUS_COLORS[0]);

  // --- SELECTION & DELETE STATE ---
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const longPressTimer = useRef<any>(null);

  useEffect(() => {
    loadLocalChats();
  }, []);

  useEffect(() => {
      sqliteService.getSetting('my_statuses').then(val => {
         if (val) {
             const limit = Date.now() - 24 * 60 * 60 * 1000;
             const valid = val.filter((s: StatusUpdate) => s.timestamp > limit);
             setMyStatuses(valid);
         }
      });
  }, []);

  const saveStatusArray = (arr: StatusUpdate[]) => {
      setMyStatuses(arr);
      sqliteService.saveSetting('my_statuses', arr);
  };

  // Status Progress Timer
  useEffect(() => {
      let interval: any;
      if (isViewingStatus) {
          setStatusProgress(0);
          interval = setInterval(() => {
              setStatusProgress(prev => {
                  if (prev >= 100) {
                      if (statusIndex < myStatuses.length - 1) {
                          setStatusIndex(idx => idx + 1);
                          return 0;
                      }
                      clearInterval(interval);
                      setIsViewingStatus(false);
                      return 100;
                  }
                  return prev + 1;
              });
          }, 30);
      } else {
          setStatusProgress(0);
          setStatusIndex(0);
      }
      return () => clearInterval(interval);
  }, [isViewingStatus, statusIndex, myStatuses.length]);

  const loadLocalChats = async () => {
    setLoading(true);
    const data = await billingService.getAllParties();
    setLocalParties(data);
    
    // Load Broadcast Groups
    const bGroups = await billingService.getBroadcastGroups();
    setBroadcastGroups(bGroups);
    
    if (data.length > 0 && activeChatIds.length === 0) {
        setActiveChatIds([data[0].id]); 
    }
    
    setLoading(false);
  };

  useEffect(() => {
      const performSearch = async () => {
          if (isSearching && searchText) {
              const isCategoryMatch = UNIFIED_CATEGORIES.some(c => c.en.toLowerCase() === searchText.trim().toLowerCase());
              
              if (isCategoryMatch) {
                  setLoading(true);
                  const results = await billingService.searchParties(searchText);
                  setAllParties(results);
                  setLoading(false);
              } else {
                  setAllParties([]);
              }
          } else {
              setAllParties([]);
          }
      };

      const timer = setTimeout(performSearch, 200);
      return () => clearTimeout(timer);
  }, [searchText, isSearching]);

  const basePartiesToDisplay = isSearching && allParties.length > 0
    ? allParties
    : localParties.filter(p => p.category && p.category.trim() !== '');

  const partiesToDisplay = [...basePartiesToDisplay].sort((a, b) => {
    const msgA = lastMessages[a.id];
    const msgB = lastMessages[b.id];
    const timeA = msgA ? Number(msgA.id) : 0;
    const timeB = msgB ? Number(msgB.id) : 0;
    return timeB - timeA;
  });

  // --- Selection Logic ---
  const handleTouchStart = (id: string) => {
      if (isSearching) return;
      longPressTimer.current = setTimeout(() => {
          setSelectedChatIds(prev => [...prev, id]);
      }, 500); 
  };

  const handleTouchEnd = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
      }
  };

  const toggleSelection = (id: string, isBroadcast: boolean = false) => {
      const targetId = isBroadcast ? `broadcast_${id}` : id;
      setSelectedChatIds(prev => 
          prev.includes(targetId) ? prev.filter(pid => pid !== targetId) : [...prev, targetId]
      );
  };

  const handleDeleteChats = () => {
      const normalChatIds = selectedChatIds.filter(id => !id.startsWith('broadcast_'));
      const broadcastIds = selectedChatIds.filter(id => id.startsWith('broadcast_')).map(id => id.replace('broadcast_', ''));
      
      setActiveChatIds(prev => prev.filter(id => !normalChatIds.includes(id)));
      
      broadcastIds.forEach(async (id) => {
         await billingService.deleteBroadcastGroup(id);
      });
      
      setBroadcastGroups(prev => prev.filter(bg => !broadcastIds.includes(bg.id)));
      setSelectedChatIds([]);
      setShowDeleteModal(false);
  };

  const handlePartyClick = (party: Party) => {
      if (selectedChatIds.length > 0) {
          toggleSelection(party.id);
          return;
      }

      if (party.isLocal === false) {
          saveAndOpenChat(party);
          return;
      }

      if (!activeChatIds.includes(party.id)) {
          setActiveChatIds(prev => [party.id, ...prev]);
      }
      
      setIsSearching(false);
      setSearchText('');
      onSelectChat(party);
  };

  const handleCategorySelect = async (categoryName: string) => {
      setSearchText(categoryName);
      setLoading(true);
      const results = await billingService.searchParties(categoryName);
      setAllParties(results);
      setLoading(false);
  };

  const saveAndOpenChat = async (party: Party) => {
      if (savingPartyId) return; 
      setSavingPartyId(party.id);

      try {
          await new Promise(resolve => setTimeout(resolve, 800));
          const newLocalParty = await billingService.importGlobalParty(party);
          const updatedLocalData = await billingService.getAllParties();
          setLocalParties(updatedLocalData);
          setActiveChatIds(prev => [newLocalParty.id, ...prev.filter(id => id !== newLocalParty.id)]);
          setIsSearching(false);
          setSearchText('');
          alert(`Success! "${party.name}" saved to contacts.`);
      } catch (e) {
          console.error("Error saving party:", e);
          alert("Failed to save party.");
      } finally {
          setSavingPartyId(null);
      }
  };

  const handleDownloadClick = (e: React.MouseEvent, party: Party) => {
      e.stopPropagation();
      saveAndOpenChat(party);
  };

  // Status Handlers
  const handleStatusClick = () => {
      if (myStatuses.length > 0) {
          setIsViewingStatus(true);
          setStatusIndex(0);
      } else {
          statusInputRef.current?.click();
      }
  };

  const handleStatusUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const base64 = event.target?.result as string;
              const newStatus: StatusUpdate = {
                  id: Date.now().toString(),
                  type: 'image',
                  content: base64,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  timestamp: Date.now(),
                  viewers: 0
              };
              saveStatusArray([...myStatuses, newStatus]);
          };
          reader.readAsDataURL(file);
      }
      e.target.value = '';
  };

  const submitTextStatus = () => {
      if (!textStatusContent.trim()) return;
      const newStatus: StatusUpdate = {
          id: Date.now().toString(),
          type: 'text',
          content: textStatusContent,
          bgColor: textStatusBg,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now(),
          viewers: 0
      };
      saveStatusArray([...myStatuses, newStatus]);
      setIsComposingTextStatus(false);
      setTextStatusContent('');
  };

  const getRandomTime = () => {
    const hours = Math.floor(Math.random() * 12) + 1;
    const mins = Math.floor(Math.random() * 60).toString().padStart(2, '0');
    const ampm = Math.random() > 0.5 ? 'AM' : 'PM';
    return `${hours}:${mins} ${ampm}`;
  };

  const getRandomMessage = (name: string) => {
    const msgs = [
      `Hello ${name}, invoice sent.`,
      "Payment received, thanks!",
      "When is the next delivery?",
      "Call me when you are free.",
      "Ok, done.",
      "Please check the bill amount."
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  };

  // --- Render Components ---
  const renderSettingsHome = () => (
      <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21] animate-in slide-in-from-right duration-200 pb-[max(env(safe-area-inset-bottom),0px)]">
          <header className="bg-[#008069] dark:bg-[#1f2c34] text-white p-3 flex items-center gap-3 shadow-sm z-10 min-h-[60px] pt-[max(env(safe-area-inset-top),48px)]">
              <button onClick={() => setCurrentView('main')} className="p-1 rounded-full hover:bg-white/10">
                  <ArrowLeft size={24} />
              </button>
              <h1 className="text-xl font-bold">Settings</h1>
          </header>
          {/* Settings Items would go here */}
      </div>
  );

  const renderChats = () => (
    <div className="divide-y divide-gray-100 dark:divide-slate-800">
      {partiesToDisplay.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center text-slate-500 gap-2">
              <span className="text-lg font-medium">{isSearching ? 'No contacts found' : 'No chats yet'}</span>
              {!isSearching && <p className="text-sm text-center">Tap the search icon to find contacts and start chatting.</p>}
          </div>
      ) : (
        partiesToDisplay.map((party, index) => {
            const isSelected = selectedChatIds.includes(party.id);
            return (
                <div 
                key={party.id} 
                onMouseDown={() => handleTouchStart(party.id)}
                onMouseUp={handleTouchEnd}
                onTouchStart={() => handleTouchStart(party.id)}
                onTouchEnd={handleTouchEnd}
                onClick={() => handlePartyClick(party)}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700'}`}
                >
                <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 border border-slate-300 dark:border-slate-600">
                        <span className="text-slate-600 dark:text-slate-300 font-bold text-lg">{party.name.charAt(0)}</span>
                    </div>
                    {isSelected && (
                        <div className="absolute bottom-0 right-0 bg-[#008069] rounded-full p-0.5 border-2 border-white dark:border-[#111b21] animate-in zoom-in duration-200">
                            <CheckCircle2 size={12} className="text-white" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                        {isSearching ? (
                            <>
                                {party.name.split(new RegExp(`(${searchText})`, 'gi')).map((part, i) => 
                                    part.toLowerCase() === searchText.trim().toLowerCase() ? <span key={i} className="text-[#008069] dark:text-[#00a884]">{part}</span> : part
                                )}
                            </>
                        ) : party.name}
                    </h3>
                    <span className={`text-xs ${unreadCounts[party.id] > 0 ? 'text-[#008069] dark:text-[#00a884] font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                        {lastMessages[party.id] ? lastMessages[party.id].time : ''}
                    </span>
                    </div>
                    <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 overflow-hidden flex-1">
                        <p className={`text-sm ${unreadCounts[party.id] > 0 ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-600 dark:text-slate-400 font-medium'} truncate`}>
                            {isSearching ? party.mobile : (lastMessages[party.id] ? (lastMessages[party.id].type === 'text' ? lastMessages[party.id].text : `[${lastMessages[party.id].type.toUpperCase()}]`) : 'No messages yet')}
                        </p>
                    </div>

                    {!isSearching && unreadCounts[party.id] > 0 && (
                        <div className="bg-[#008069] dark:bg-[#00a884] min-w-[20px] h-[20px] rounded-full flex items-center justify-center ml-2 px-1">
                            <span className="text-white text-[11px] font-bold">{unreadCounts[party.id]}</span>
                        </div>
                    )}
                    
                    {party.isLocal === false && (
                        <button 
                            onClick={(e) => handleDownloadClick(e, party)}
                            disabled={savingPartyId === party.id}
                            className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 ml-2 shadow-sm border border-blue-200 dark:border-blue-800 shrink-0 hover:bg-blue-200 transition-colors z-20"
                        >
                            {savingPartyId === party.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        </button>
                    )}
                    </div>
                </div>
                </div>
            );
        })
      )}
    </div>
  );

  const renderBroadcasts = () => (
    <div className="divide-y divide-gray-100 dark:divide-slate-800">
      {broadcastGroups.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center text-slate-500 gap-2">
              <span className="text-lg font-medium">No Broadcasts yet</span>
              <p className="text-sm text-center">Create a broadcast list to message multiple customers at once.</p>
          </div>
      ) : (
        broadcastGroups.map((group) => {
            const lastMsg = lastMessages['broadcast_' + group.id];
            const isSelected = selectedChatIds.includes('broadcast_' + group.id);
            return (
                <div 
                key={group.id} 
                onMouseDown={() => handleTouchStart('broadcast_' + group.id)}
                onMouseUp={handleTouchEnd}
                onTouchStart={() => handleTouchStart('broadcast_' + group.id)}
                onTouchEnd={handleTouchEnd}
                onClick={() => {
                    if (selectedChatIds.length > 0) {
                        toggleSelection(group.id, true);
                    } else {
                        onSelectBroadcast(group);
                    }
                }}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700'}`}
                >
                <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center overflow-hidden shrink-0 border border-blue-200 dark:border-blue-800">
                        <Megaphone size={24} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    {isSelected && (
                        <div className="absolute bottom-0 right-0 bg-[#008069] rounded-full p-0.5 border-2 border-white dark:border-[#111b21] animate-in zoom-in duration-200">
                            <CheckCircle2 size={12} className="text-white" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                        {group.name}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {lastMsg ? lastMsg.time : ''}
                    </span>
                    </div>
                    <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 overflow-hidden flex-1">
                        <Users size={14} className="text-slate-400" />
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium truncate ml-1">
                            {group.memberPartyIds.length} recipients • {lastMsg ? (lastMsg.type === 'text' ? lastMsg.text : `[${lastMsg.type.toUpperCase()}]`) : 'No messages yet'}
                        </p>
                    </div>
                    </div>
                </div>
                </div>
            );
        })
      )}
    </div>
  );

  const renderStatus = () => (
      <div className="divide-y divide-gray-100 dark:divide-slate-800">
          <div className="p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={handleStatusClick}>
               <div className="relative">
                   <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-300 dark:border-slate-600 flex items-center justify-center">
                       {myStatuses.length > 0 ? (
                           myStatuses[myStatuses.length - 1].type === 'image' ? (
                               <img src={myStatuses[myStatuses.length - 1].content} alt="My Status" className="w-full h-full object-cover" />
                           ) : (
                               <div className="w-full h-full flex items-center justify-center p-1 text-white text-[8px] font-bold overflow-hidden text-center" style={{backgroundColor: myStatuses[myStatuses.length - 1].bgColor}}>
                                   {myStatuses[myStatuses.length - 1].content}
                               </div>
                           )
                       ) : (
                           <User size={24} className="text-slate-400" />
                       )}
                   </div>
                   {myStatuses.length === 0 && (
                       <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-[#111b21] flex items-center justify-center text-white">
                           <Plus size={12} strokeWidth={3} />
                       </div>
                   )}
               </div>
               <div className="flex-1">
                   <h3 className="font-bold text-slate-900 dark:text-white">My status</h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400">{myStatuses.length > 0 ? myStatuses[myStatuses.length - 1].time : 'Tap to add status update'}</p>
               </div>
          </div>
      </div>
  );

  const renderCalls = () => (
      <div>
          <div className="p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
              <div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-sm">
                  <LinkIcon size={24} className="-rotate-45" />
              </div>
              <div className="flex-1">
                  <h3 className="font-bold text-slate-900 dark:text-white">Create call link</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Share a link for your WhatsApp call</p>
              </div>
          </div>
          <div className="p-4 text-center text-slate-500 text-sm mt-4">
              Your personal calls are end-to-end encrypted
          </div>
      </div>
  );

  const renderFAB = () => {
      switch(activeTab) {
          case 'chats': return <button onClick={() => { setIsSearching(true); setSearchText(''); }} className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 w-14 h-14 bg-emerald-600 rounded-2xl text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform z-20 hover:bg-emerald-700 border border-slate-700"><MessageSquarePlus size={24} fill="white" /></button>;
          case 'broadcasts': return <button onClick={onCreateBroadcast} className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 w-14 h-14 bg-emerald-600 rounded-2xl text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform z-20 hover:bg-emerald-700 border border-slate-700"><Megaphone size={24} fill="white" /></button>;
          case 'status': return <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 flex flex-col gap-4 items-end z-20"><button onClick={() => setIsComposingTextStatus(true)} className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 shadow-md flex items-center justify-center active:scale-95 transition-transform hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700"><Pen size={18} /></button><button onClick={() => statusInputRef.current?.click()} className="w-14 h-14 bg-emerald-600 rounded-2xl text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform hover:bg-emerald-700 border border-slate-700"><Camera size={24} /></button></div>;
          case 'calls': return <button className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 w-14 h-14 bg-emerald-600 rounded-2xl text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform z-20 hover:bg-emerald-700 border border-slate-700"><PhoneIncoming size={24} /><div className="absolute -top-1 -right-1 bg-white dark:bg-slate-900 rounded-full text-emerald-600"><span className="text-xs font-bold">+</span></div></button>;
      }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111b21] text-slate-900 dark:text-white transition-colors relative pb-[max(env(safe-area-inset-bottom),0px)]" onClick={() => { if(isMenuOpen) setIsMenuOpen(false); if(selectedChatIds.length > 0) setSelectedChatIds([]); }}>
      
      {/* Hidden Status Input */}
      <input type="file" ref={statusInputRef} className="hidden" accept="image/*" onChange={handleStatusUpload} />

      {/* Header */}
      {isSearching ? (
          <div className="flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
             <div className="bg-[#283593] text-white p-4 pt-[max(env(safe-area-inset-top),48px)] flex items-center gap-3 shadow-md shrink-0 sticky top-0 z-20">
                 <button onClick={() => { setIsSearching(false); setSearchText(''); setAllParties([]); }} className="text-white">
                     <ArrowLeft size={24} />
                 </button>
                 <h1 className="text-xl font-bold">Search Category</h1>
             </div>
             
             <div className="p-4 bg-white dark:bg-[#111b21] border-b border-gray-200 dark:border-slate-800 shadow-sm">
                 {/* Distance Slider */}
                 <div className="mb-6">
                     <div className="flex justify-between items-end mb-2">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                             SEARCH DISTANCE (RANGE)
                         </label>
                         <span className="text-base font-bold text-[#283593]">{searchRadius} KM</span>
                     </div>
                     <div className="relative w-full h-6 flex items-center">
                         <input 
                             type="range" 
                             min="1" 
                             max="10000" 
                             step="10"
                             value={searchRadius} 
                             onChange={(e) => setSearchRadius(Number(e.target.value))}
                             className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#283593]"
                         />
                     </div>
                     <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                         <span>1 KM</span>
                         <span>10,000 KM</span>
                     </div>
                 </div>

                 {/* Search Input */}
                 <div className="relative mb-4">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <Search className="h-5 w-5 text-gray-400" />
                     </div>
                     <input 
                         type="text" 
                         value={searchText}
                         onChange={(e) => {
                             setSearchText(e.target.value);
                             setShowSuggestions(true);
                         }}
                         onFocus={() => setShowSuggestions(true)}
                         className="w-full border border-blue-300 dark:border-slate-700 rounded-lg p-3 pl-10 text-base text-black dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#283593] transition-all font-medium"
                         placeholder="Search Category (e.g. Dairy, Grocery)"
                     />
                     {/* Suggestions */}
                     {showSuggestions && searchText && filteredCategories.length > 0 && (
                         <div className="absolute z-10 w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 shadow-xl mt-1 max-h-60 overflow-y-auto rounded-md">
                             {filteredCategories.map((cat, idx) => (
                                 <div 
                                     key={idx} 
                                     className="p-3 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer text-black dark:text-white font-medium border-b border-gray-100 dark:border-slate-700 flex justify-between items-center"
                                     onClick={() => {
                                         setSearchText(cat.en);
                                         setShowSuggestions(false);
                                     }}
                                 >
                                     <span>{cat.hi} - {cat.en}</span>
                                     <ChevronRight size={16} className="text-gray-400" />
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>

                 {/* Search Button */}
                 <button 
                   onClick={() => {
                       setShowSuggestions(false);
                   }}
                   disabled={loading}
                   className={`w-full bg-[#283593] text-white py-3.5 rounded-lg text-base font-bold shadow-md hover:bg-opacity-90 active:scale-[0.98] transition-all uppercase tracking-wide disabled:opacity-70 disabled:cursor-not-allowed`}
                 >
                     {loading ? (
                         <div className="flex items-center justify-center gap-2">
                             <Loader2 className="w-5 h-5 animate-spin" />
                             <span>SEARCHING...</span>
                         </div>
                     ) : (
                         "SEARCH"
                     )}
                 </button>
             </div>
          </div>
      ) : selectedChatIds.length > 0 ? (
            <div className="px-4 pb-3 pt-[max(env(safe-area-inset-top),48px)] flex justify-between items-center min-h-[60px] bg-[#008069] dark:bg-[#1f2c34] text-white" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedChatIds([])} className="p-1 rounded-full hover:bg-white/10"><ArrowLeft size={24} /></button>
                    <span className="font-bold text-xl">{selectedChatIds.length}</span>
                </div>
                <button onClick={() => setShowDeleteModal(true)} className="p-2 hover:bg-white/10 rounded-full"><Trash2 size={24} /></button>
            </div>
      ) : (
             <div className="bg-[#008069] dark:bg-[#1f2c34] text-white pt-[max(env(safe-area-inset-top),48px)] pb-0 shadow-md z-10 transition-colors border-b border-white/10 dark:border-slate-800 relative">
                 <div className="px-4 pb-3 flex justify-between items-center min-h-[60px]">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-1 rounded-full hover:bg-white/10"><ArrowLeft size={24} /></button>
                        <h1 className="text-xl font-bold tracking-wide">QuickBill Chat</h1>
                    </div>
                    <div className="flex items-center gap-5 text-white">
                        <button onClick={() => statusInputRef.current?.click()}><Camera size={22} /></button>
                        <button onClick={() => onOpenNearbyShops ? onOpenNearbyShops() : setIsSearching(true)}><Search size={22} /></button>
                        <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}><MoreVertical size={22} /></button>
                            {isMenuOpen && (
                                <div className="absolute top-10 right-0 w-48 bg-white dark:bg-[#233138] text-slate-800 dark:text-slate-100 rounded-lg shadow-xl py-2 z-50 origin-top-right animate-in fade-in zoom-in-95 duration-100">
                                    <button onClick={() => { setIsMenuOpen(false); setCurrentView('settings_home'); }} className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 text-base">Settings</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex text-[#b8e0da] dark:text-slate-400 font-bold text-sm uppercase">
                    <div className="w-10 flex items-center justify-center pb-3 border-b-4 border-transparent"><div className="opacity-60"><Camera size={20} /></div></div>
                    <button onClick={() => setActiveTab('chats')} className={`flex-1 text-center pb-3 border-b-4 transition-colors ${activeTab === 'chats' ? 'border-white dark:border-[#00a884] text-white dark:text-[#00a884]' : 'border-transparent hover:text-white dark:hover:text-slate-300'}`}>Chats</button>
                    <button onClick={() => setActiveTab('broadcasts')} className={`flex-1 text-center pb-3 border-b-4 transition-colors ${activeTab === 'broadcasts' ? 'border-white dark:border-[#00a884] text-white dark:text-[#00a884]' : 'border-transparent hover:text-white dark:hover:text-slate-300'}`}>Broadcasts</button>
                    <button onClick={() => setActiveTab('status')} className={`flex-1 text-center pb-3 border-b-4 transition-colors ${activeTab === 'status' ? 'border-white dark:border-[#00a884] text-white dark:text-[#00a884]' : 'border-transparent hover:text-white dark:hover:text-slate-300'}`}>Status</button>
                </div>
            </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-[#111b21] transition-colors">
        {loading ? <div className="p-4 text-center text-slate-500 font-medium">Loading...</div> : (
           <>
             {isSearching && allParties.length === 0 ? (
                 <div className="p-4">
                      <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">
                          {searchText ? 'Search Results' : 'Business Types'}
                      </h2>
                      <div className="space-y-1">
                          {filteredCategories.length === 0 ? (
                              <div className="p-8 text-center text-gray-400">No categories found</div>
                          ) : (
                              filteredCategories.map((cat, idx) => (
                                  <button 
                                      key={idx} 
                                      onClick={() => handleCategorySelect(cat.en)}
                                      className="w-full text-left p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 active:bg-blue-50 dark:active:bg-slate-800 transition-all flex justify-between items-center group"
                                  >
                                      <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                                          {cat.en} - {cat.hi}
                                      </p>
                                      <ChevronRight size={18} className="text-gray-300 dark:text-slate-600 group-hover:text-blue-500" />
                                  </button>
                              ))
                          )}
                      </div>
                 </div>
             ) : (
                 <>
                    {activeTab === 'chats' && renderChats()}
                    {activeTab === 'broadcasts' && renderBroadcasts()}
                    {activeTab === 'status' && !isSearching && renderStatus()}
                    {activeTab === 'calls' && !isSearching && renderCalls()}
                 </>
             )}
           </>
        )}
      </div>

      {!isSearching && selectedChatIds.length === 0 && renderFAB()}

      {/* STATUS VIEWER OVERLAY */}
      {isViewingStatus && myStatuses.length > 0 && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col justify-center items-center pb-[max(env(safe-area-inset-bottom),0px)]">
              <div className="absolute top-0 left-0 right-0 p-2 z-10 flex flex-col gap-3 pt-4">
                  {/* Progress Bars */}
                  <div className="flex gap-1 mx-2">
                      {myStatuses.map((_, idx) => (
                          <div key={idx} className="h-1 bg-gray-600 rounded-full overflow-hidden flex-1">
                              <div 
                                  className="h-full bg-white transition-all duration-100 ease-linear" 
                                  style={{ width: idx < statusIndex ? '100%' : idx === statusIndex ? `${statusProgress}%` : '0%' }}
                              />
                          </div>
                      ))}
                  </div>
                  
                  {/* Header */}
                  <div className="flex items-center gap-3 px-2">
                      <ArrowLeft className="text-white cursor-pointer hover:bg-white/10 rounded-full p-1 w-9 h-9" onClick={() => setIsViewingStatus(false)} />
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 border border-slate-600 flex items-center justify-center">
                           {myStatuses[statusIndex].type === 'image' ? (
                               <img src={myStatuses[statusIndex].content} className="w-full h-full object-cover" alt="Profile" />
                           ) : (
                               <div className="w-full h-full" style={{backgroundColor: myStatuses[statusIndex].bgColor}}></div>
                           )}
                      </div>
                      <div>
                          <h3 className="text-white font-bold text-sm">My Status</h3>
                          <p className="text-white/70 text-xs">{myStatuses[statusIndex].time}</p>
                      </div>
                  </div>
              </div>

              {/* Status Content */}
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: myStatuses[statusIndex].type === 'text' ? myStatuses[statusIndex].bgColor : 'black' }}
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    if (x > rect.width / 2) {
                        if (statusIndex < myStatuses.length - 1) {
                            setStatusIndex(statusIndex + 1);
                            setStatusProgress(0);
                        } else {
                            setIsViewingStatus(false);
                        }
                    } else {
                        if (statusIndex > 0) {
                            setStatusIndex(statusIndex - 1);
                            setStatusProgress(0);
                        }
                    }
                }}
              >
                  {myStatuses[statusIndex].type === 'image' ? (
                      <img src={myStatuses[statusIndex].content} className="w-full max-h-screen object-contain" alt="Status Content" />
                  ) : (
                      <div className="text-white text-3xl font-bold px-8 text-center leading-snug break-words max-w-full font-sans">
                           {myStatuses[statusIndex].content}
                      </div>
                  )}
              </div>
              
              {/* Footer View Count */}
              <div className="absolute bottom-10 flex flex-col items-center text-white cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors z-10 pointer-events-none">
                  <Eye size={24} />
                  <span className="text-sm mt-1 font-medium">{myStatuses[statusIndex].viewers} views</span>
              </div>
          </div>
      )}

      {/* TEXT STATUS EDITOR */}
      {isComposingTextStatus && (
          <div className="fixed inset-0 z-50 flex flex-col pb-[max(env(safe-area-inset-bottom),0px)] transition-colors duration-300" style={{ backgroundColor: textStatusBg }}>
              <div className="p-4 flex justify-between items-center z-10">
                  <button onClick={() => setIsComposingTextStatus(false)} className="p-2 text-white hover:bg-black/10 rounded-full"><X size={28} /></button>
                  <button 
                      onClick={() => {
                          const currentIndex = STATUS_COLORS.indexOf(textStatusBg);
                          setTextStatusBg(STATUS_COLORS[(currentIndex + 1) % STATUS_COLORS.length]);
                      }} 
                      className="p-2 text-white hover:bg-black/10 rounded-full"
                  >
                      <Pen size={24} />
                  </button>
              </div>
              <div className="flex-1 flex items-center justify-center p-8">
                  <textarea
                      autoFocus
                      value={textStatusContent}
                      onChange={(e) => setTextStatusContent(e.target.value)}
                      placeholder="Type a status"
                      className="w-full bg-transparent text-white text-center text-4xl outline-none resize-none placeholder-white/60 min-h-[150px]"
                  />
              </div>
              <div className="p-4 flex justify-end z-10 bg-black/10">
                  <button 
                      onClick={submitTextStatus}
                      disabled={!textStatusContent.trim()}
                      className="w-14 h-14 bg-emerald-500 rounded-full text-white shadow-lg flex items-center justify-center active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                      <CheckCircle2 size={24} />
                  </button>
              </div>
          </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in fade-in zoom-in duration-200">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-900/50">
                    <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete {selectedChatIds.length} Chat(s)?</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">Messages in this chat will be permanently removed.</p>
                <div className="flex gap-3">
                    <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Cancel</button>
                    <button onClick={handleDeleteChats} className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg">Delete</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
