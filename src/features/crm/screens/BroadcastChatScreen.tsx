import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, MoreVertical, Send, Paperclip, Camera, Megaphone, Users
} from 'lucide-react';
import { BroadcastGroup, billingService, ChatMessage } from '../../../services/billingService';
import { sendCloudMessage } from '../../../services/firebaseService';


interface BroadcastChatScreenProps {
  broadcastGroup: BroadcastGroup;
  onBack: () => void;
}

export const BroadcastChatScreen: React.FC<BroadcastChatScreenProps> = ({ broadcastGroup, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const longPressTimer = useRef<any>(null);

  const prevMessagesLength = useRef(0);

  useEffect(() => {
    loadMessages();
  }, [broadcastGroup.id]);

  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  const loadMessages = async () => {
    const msgs = await billingService.getMessages('broadcast_' + broadcastGroup.id);
    setMessages(msgs || []);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;
    setIsSending(true);

    const txt = inputText.trim();
    setInputText('');

    try {
        const myProfile = await billingService.getCompanyProfile();
        const parties = await billingService.getAllParties();
        const activeMembers = parties.filter(p => broadcastGroup.memberPartyIds.includes(p.id) && p.mobile);

        // 1. Create a local representation of multiple sends in the broadcast group thread
        const broadcastMsg: ChatMessage = {
            id: Date.now().toString(),
            partyId: 'broadcast_' + broadcastGroup.id,
            text: txt,
            isSent: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text' as const
        };
        await billingService.saveMessage(broadcastMsg);
        setMessages(prev => [...prev, broadcastMsg]);

        // 2. Send the message individually to all members who have a mobile number
        if (myProfile.mobile) {
            for (const member of activeMembers) {
                try {
                    const memberMsg: ChatMessage = {
                        id: Date.now().toString() + Math.random().toString(),
                        partyId: member.id,
                        text: txt,
                        isSent: true,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        type: 'text' as const
                    };
                    await billingService.saveMessage({...memberMsg}); // add it locally
                    await sendCloudMessage(memberMsg, member.mobile);
                } catch (err) {
                    console.error("Failed to send broadcast to", member.mobile, err);
                }
            }
        }
    } catch (err) {
        console.error("Broadcast failed:", err);
      } finally {
        setIsSending(false);
    }
  };

  const handleMessageInteractionStart = (id: string) => {
      longPressTimer.current = setTimeout(() => {
          toggleSelection(id);
      }, 500);
  };

  const handleMessageInteractionEnd = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };

  const toggleSelection = (id: string) => {
      setSelectedMessageIds(prev => prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]);
  };

  const handleMessageClick = (id: string) => {
      if (selectedMessageIds.length > 0) {
          toggleSelection(id);
      }
  };

  const confirmDelete = async () => {
      // Local broadcast messages don't have a single cloudId because they represent messages sent to many users
      // Deleting them here only deletes the local record in the broadcast timeline
      await billingService.deleteMessages(selectedMessageIds);
      setMessages(prev => prev.filter(msg => !selectedMessageIds.includes(msg.id)));
      setSelectedMessageIds([]);
      setShowDeleteConfirm(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#efeae2] dark:bg-[#0b141a]" onClick={() => { if(selectedMessageIds.length > 0) setSelectedMessageIds([]); }}>
      {/* Header */}
      {selectedMessageIds.length > 0 ? (
          <div 
              className="bg-[#008069] dark:bg-[#202c33] text-white p-3 flex items-center shadow-md z-10 shrink-0 h-[64px]"
              onClick={e => e.stopPropagation()}
          >
              <button onClick={() => setSelectedMessageIds([])} className="p-1 hover:bg-white/10 rounded-full">
                  <ArrowLeft size={24} />
              </button>
              <h1 className="text-xl font-bold flex-1 ml-4">{selectedMessageIds.length}</h1>
              <button 
                  onClick={() => setShowDeleteConfirm(true)} 
                  className="p-2 hover:bg-white/10 rounded-full"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </button>
          </div>
      ) : (
          <div className="bg-[#008069] dark:bg-[#202c33] text-white p-3 flex items-center shadow-md z-10 shrink-0">
            <button onClick={onBack} className="p-1.5 -ml-1.5 mr-1 rounded-full hover:bg-white/10 shrink-0">
              <ArrowLeft size={24} />
            </button>
            <div className="relative w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center shrink-0 mr-3 border border-slate-400">
               <Megaphone size={20} className="text-slate-100" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <h2 className="font-bold text-white truncate text-lg leading-tight">{broadcastGroup.name}</h2>
              <p className="text-white/80 text-xs truncate leading-tight">
                {broadcastGroup.memberPartyIds.length} recipients
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button className="p-2 rounded-full hover:bg-white/10"><Users size={22} /></button>
              <button className="p-2 justify-center rounded-full hover:bg-white/10"><MoreVertical size={22} /></button>
            </div>
          </div>
      )}

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 relative group" 
        style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', opacity: 0.9, backgroundSize: 'contain', backgroundRepeat: 'repeat' }}
      >
        <div className="text-center my-4">
           <span className="bg-[#ffeecd] dark:bg-[#182229] text-amber-900 dark:text-amber-200/80 text-xs px-4 py-1.5 rounded-lg shadow-sm font-medium">
              You created a broadcast list with {broadcastGroup.memberPartyIds.length} recipients
           </span>
        </div>
        <div className="text-center my-4">
           <div className="bg-[#ffeecd] dark:bg-[#182229] max-w-sm mx-auto text-amber-900 dark:text-amber-200/80 text-xs px-4 py-2 rounded-lg shadow-sm font-medium text-center flex flex-col gap-1 items-center">
              <Megaphone size={20} className="mb-1 opacity-70" />
              <p>Only contacts with +91xxx numbers will receive your messages.</p>
           </div>
        </div>

        {messages.map((msg, index) => {
            const isSelected = selectedMessageIds.includes(msg.id);
            return (
                <div key={msg.id} className="flex justify-end mb-2 relative">
                    <div 
                        onMouseDown={() => handleMessageInteractionStart(msg.id)}
                        onMouseUp={handleMessageInteractionEnd}
                        onTouchStart={() => handleMessageInteractionStart(msg.id)}
                        onTouchEnd={handleMessageInteractionEnd}
                        onClick={() => handleMessageClick(msg.id)}
                        className={`max-w-[75%] rounded-lg p-2 relative shadow-sm text-[15px] cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500' : 'bg-[#d9fdd3] dark:bg-[#005c4b]'} text-slate-900 dark:text-slate-100 rounded-tr-none`}
                    >
                        <div className="break-words">{msg.text}</div>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[11px] text-emerald-800 dark:text-emerald-200/70">
                        <span>{msg.time}</span>
                        <Megaphone size={12} className="opacity-70" />
                        </div>
                    </div>
                </div>
            );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-2 bg-[#f0f2f5] dark:bg-[#202c33] shrink-0 border-t border-gray-200 dark:border-slate-800">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-[24px] flex items-end min-h-[48px] shadow-sm relative">
            <button className="p-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 self-end">
                <Paperclip size={24} />
            </button>
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Message..."
              className="flex-1 max-h-32 bg-transparent resize-none py-3 px-2 focus:outline-none text-slate-900 dark:text-slate-100 placeholder-slate-500 text-[16px] leading-[22px]"
              rows={1}
            />
            <button className="p-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 self-end">
                <Camera size={24} />
            </button>
          </div>
          
          <button 
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className={`w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center min-w-[48px] shrink-0 text-white shadow-sm transition-transform active:scale-95 ${!inputText.trim() || isSending ? 'opacity-50' : ''}`}
          >
            {isSending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} className="ml-1" />}
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in fade-in zoom-in duration-200">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-900/50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete {selectedMessageIds.length} message(s)?</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">This will delete the messages from your device.</p>
                <div className="flex gap-3">
                    <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Cancel</button>
                    <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg">Delete</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
