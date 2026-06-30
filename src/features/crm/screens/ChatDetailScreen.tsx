import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  ArrowLeft, MoreVertical, Video, Phone, Smile, Paperclip, Mic, Send, 
  Camera, FileText, Image, Headphones, MapPin, User, 
  Play, Download, X, Copy, Forward, PhoneIncoming, Trash2, Repeat, CheckCheck
} from 'lucide-react';
import { Party } from '../../../core/types/';
import { billingService, ChatMessage } from '../../../services/billingService';
import { sendCloudMessage, deleteCloudMessages, shareItemsWithClient } from '../../../services/firebaseService';


interface ChatDetailScreenProps {
  party: Party;
  onBack: () => void;
}

export const ChatDetailScreen: React.FC<ChatDetailScreenProps> = ({ party, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeCall, setActiveCall] = useState<{type: 'voice' | 'video', status: 'calling' | 'connected'} | null>(null);
  const [isSendingAsCustomer, setIsSendingAsCustomer] = useState(false);
  const [isSharingItems, setIsSharingItems] = useState(false);
  
  const handleQuickShareItems = async (msg: ChatMessage) => {
      if (!party.mobile) {
          alert('This customer does not have a mobile number.');
          return;
      }
      try {
          const allItems = await billingService.getAllItems();
          if (allItems.length === 0) {
              alert('No items available to share. Please add items in Item Master first.');
              return;
          }
          setIsSharingItems(true);
          const success = await shareItemsWithClient(allItems, party.mobile);
          if (success) {
              setToastMessage(`Successfully shared ${allItems.length} items with ${party.name}`);
              setTimeout(() => setToastMessage(''), 3000);
              const updatedMsg = { ...msg, itemsShared: true };
              await billingService.saveMessage(updatedMsg);
          } else {
              alert('Failed to share items. Please try again or check your connection.');
          }
      } catch (error: any) {
          console.error("Failed to share items:", error);
          alert(`Error: ${error.message || 'Failed to share items.'}`);
      } finally {
          setIsSharingItems(false);
      }
  };
  
  // Audio Recording State
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Selection State
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const endRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<any>(null);
  const urlCacheRef = useRef<Map<string, string>>(new Map());
  
  // Hidden Input Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [rawMessages, setRawMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
     let mounted = true;
     const load = async () => {
         const msgs = await billingService.getMessages(party.id);
         if (mounted) setRawMessages(msgs || []);
     };
     load();
     const interval = setInterval(load, 2000); // Simulate live query by polling
     return () => {
         mounted = false;
         clearInterval(interval);
     }
  }, [party.id]);

  useEffect(() => {
    if (!rawMessages) return;

    let hasUnread = false;
    const messagesWithUrls = rawMessages.map(msg => {
        if (!msg.isSent && !msg.isRead) {
            msg.isRead = true;
            hasUnread = true;
            billingService.saveMessage(msg); // Update in Dexie DB
        }
        if (msg.fileData) {
            let url = urlCacheRef.current.get(msg.id);
            if (!url) {
                url = URL.createObjectURL(msg.fileData);
                urlCacheRef.current.set(msg.id, url);
            }
            return { ...msg, contentUrl: url };
        }
        return msg;
    });
    setMessages(messagesWithUrls);
  }, [rawMessages]);

  useEffect(() => {
    return () => {
        urlCacheRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const prevMessagesLength = useRef(0);

  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (activeCall) {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeCall]);

  const handleSend = async () => {
    if (!inputText.trim() && !isRecording) return;
    
    if (isRecording) {
        stopRecordingAndSend();
        return;
    }

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      partyId: party.id,
      text: inputText,
      isSent: !isSendingAsCustomer,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setShowAttachments(false);

    try {
      if (!isSendingAsCustomer && party.mobile) {
          await sendCloudMessage(newMessage, party.mobile);
      } else {
          await billingService.saveMessage(newMessage);
      }
    } catch (error: any) {
      console.error("Failed to save message:", error);
      alert("Failed to send: " + (error.message || "Unknown error"));
    }
  };

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          audioChunksRef.current = [];
          
          recorder.ondataavailable = (e) => {
              if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          
          recorder.onstop = async () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              try {
                  const durationStr = `0:${recordingDuration.toString().padStart(2, '0')}`;
                  const url = URL.createObjectURL(audioBlob);
                  
                  const newMessage: ChatMessage = {
                      id: Date.now().toString(),
                      partyId: party.id,
                      text: 'Voice Message',
                      isSent: !isSendingAsCustomer,
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      type: 'audio',
                      contentUrl: url,
                      fileData: audioBlob,
                      fileSize: durationStr
                  };
                  
                  urlCacheRef.current.set(newMessage.id, url);
                  setMessages(prev => [...prev, newMessage]);
                  
                  if (!isSendingAsCustomer && party.mobile) {
                      await sendCloudMessage(newMessage, party.mobile);
                  } else {
                      await billingService.saveMessage(newMessage);
                  }
              } catch (error: any) {
                  console.error("Failed to process audio:", error);
                  alert(`Failed to send audio: ${error.message}`);
              }
              
              stream.getTracks().forEach(track => track.stop());
              setRecordingDuration(0);
          };
          
          recorder.start();
          setMediaRecorder(recorder);
          setIsRecording(true);
          setRecordingDuration(0);
          
          recordingTimerRef.current = setInterval(() => {
              setRecordingDuration(prev => prev + 1);
          }, 1000);
          
      } catch (err) {
          console.error("Microphone access denied", err);
          alert("Microphone access is required to record audio.");
          setIsRecording(false);
      }
  };

  const stopRecordingAndSend = () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
      }
      if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
      }
      setIsRecording(false);
      setMediaRecorder(null);
  };

  const cancelRecording = () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          // Prevent the onstop event from saving the message
          mediaRecorder.onstop = () => {
              mediaRecorder.stream.getTracks().forEach(track => track.stop());
          };
          mediaRecorder.stop();
      }
      if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
      }
      setIsRecording(false);
      setMediaRecorder(null);
      setRecordingDuration(0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  // --- Selection Logic ---

  const handleMessageInteractionStart = (id: string) => {
      longPressTimer.current = setTimeout(() => {
          toggleSelection(id);
      }, 500); // 500ms long press to select
  };

  const handleMessageInteractionEnd = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };

  const toggleSelection = (id: string) => {
      setSelectedMessageIds(prev => {
          if (prev.includes(id)) {
              return prev.filter(mid => mid !== id);
          } else {
              return [...prev, id];
          }
      });
  };

  const handleMessageClick = (id: string) => {
      if (selectedMessageIds.length > 0) {
          toggleSelection(id);
      }
  };

  const cancelSelection = () => {
      setSelectedMessageIds([]);
  };

  const handleDeleteSelected = () => {
      setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
      // Find cloud IDs if any exist
      const msgsToDelete = messages.filter(msg => selectedMessageIds.includes(msg.id));
      const cloudIds = msgsToDelete.map((m: any) => m.cloudId).filter(Boolean) as string[];

      // Delete locally
      await billingService.deleteMessages(selectedMessageIds);

      // Delete from cloud
      if (cloudIds.length > 0) {
          await deleteCloudMessages(cloudIds);
      }

      setMessages(prev => prev.filter(msg => !selectedMessageIds.includes(msg.id)));
      setSelectedMessageIds([]);
      setShowDeleteConfirm(false);
  };

  // --- Download Logic ---
  const handleDownload = (url: string, fileName: string) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- Attachment Handlers ---

  const handleAttachmentClick = (type: string) => {
      switch (type) {
          case 'Document':
              fileInputRef.current?.click();
              break;
          case 'Camera':
              cameraInputRef.current?.click();
              break;
          case 'Gallery':
              galleryInputRef.current?.click();
              break;
          case 'Audio':
              audioInputRef.current?.click();
              break;
          case 'Location':
              sendLocation();
              break;
          case 'Contact':
              sendContact();
              break;
      }
      setShowAttachments(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio' | 'document') => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
          let blob: Blob = new Blob([file], { type: file.type });
          const url = URL.createObjectURL(blob);
          
          if (type === 'image' && file.size > 500000) { // Compress images > 500KB
              blob = await new Promise<Blob>((resolve) => {
                  const img = new window.Image();
                  img.onload = () => {
                      const canvas = document.createElement('canvas');
                      let { width, height } = img;
                      const MAX_SIZE = 1000;
                      if (width > height && width > MAX_SIZE) {
                          height *= MAX_SIZE / width; width = MAX_SIZE;
                      } else if (height > MAX_SIZE) {
                          width *= MAX_SIZE / height; height = MAX_SIZE;
                      }
                      canvas.width = width; canvas.height = height;
                      const ctx = canvas.getContext('2d');
                      ctx?.drawImage(img, 0, 0, width, height);
                      canvas.toBlob((b) => resolve(b || blob), 'image/jpeg', 0.7);
                  };
                  img.onerror = () => resolve(blob);
                  img.src = url;
              });
          }

          const newMessage: ChatMessage = {
              id: Date.now().toString(),
              partyId: party.id,
              text: type === 'document' ? '' : file.name,
              isSent: !isSendingAsCustomer,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: type,
              contentUrl: url,
              fileData: blob,
              fileName: file.name,
              fileSize: blob.size > 1024 * 1024 ? `${(blob.size / (1024 * 1024)).toFixed(1)} MB` : `${(blob.size / 1024).toFixed(0)} KB`
          };
          urlCacheRef.current.set(newMessage.id, url);
          setMessages(prev => [...prev, newMessage]);
          e.target.value = '';
          
          if (!isSendingAsCustomer && party.mobile) {
              await sendCloudMessage(newMessage, party.mobile);
          } else {
              await billingService.saveMessage(newMessage);
          }
      } catch (error: any) {
          console.error("Failed to process file:", error);
          alert(`Failed to attach file: ${error.message || 'Unknown error'}`);
      }
  };

  const sendLocation = async () => {
      const newMessage: ChatMessage = {
          id: Date.now().toString(),
          partyId: party.id,
          text: 'Live Location',
          isSent: !isSendingAsCustomer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'location'
      };
      setMessages(prev => [...prev, newMessage]);
      try {
        if (!isSendingAsCustomer && party.mobile) {
            await sendCloudMessage(newMessage, party.mobile);
        } else {
            await billingService.saveMessage(newMessage);
        }
      } catch (error: any) {
        console.error("Failed to save location message:", error);
        alert(`Failed to send location: ${error.message}`);
      }
  };

  const sendContact = async () => {
      const newMessage: ChatMessage = {
          id: Date.now().toString(),
          partyId: party.id,
          text: 'QuickBill Support',
          isSent: !isSendingAsCustomer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'contact',
          contentUrl: '+91 98765 43210'
      };
      setMessages(prev => [...prev, newMessage]);
      try {
        if (!isSendingAsCustomer && party.mobile) {
            await sendCloudMessage(newMessage, party.mobile);
        } else {
            await billingService.saveMessage(newMessage);
        }
      } catch (error: any) {
        console.error("Failed to save contact message:", error);
        alert(`Failed to send contact: ${error.message}`);
      }
  };

  const startCall = (type: 'voice' | 'video') => {
      setActiveCall({ type, status: 'calling' });
      setTimeout(() => {
          setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
      }, 2000);
  };

  const endCall = async () => {
      setActiveCall(null);
      const newMessage: ChatMessage = {
          id: Date.now().toString(),
          partyId: party.id,
          text: `${activeCall?.type === 'video' ? 'Video' : 'Voice'} call ended`,
          isSent: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'text'
      };
      setMessages(prev => [...prev, newMessage]);
      try {
        if (party.mobile) {
            await sendCloudMessage(newMessage, party.mobile);
        } else {
            await billingService.saveMessage(newMessage);
        }
      } catch (error) {
        console.error("Failed to save message:", error);
      }
  };

  const renderMessageContent = (msg: ChatMessage) => {
      switch (msg.type) {
          case 'image':
              return (
                  <div className="rounded-lg overflow-hidden mb-1">
                      <img src={msg.contentUrl} alt="Sent" className="max-w-[240px] max-h-[300px] object-cover" />
                  </div>
              );
          case 'video':
              return (
                  <div className="rounded-lg overflow-hidden mb-1 relative bg-black flex items-center justify-center h-[200px] w-[240px]">
                      <video src={msg.contentUrl} controls className="w-full h-full object-contain" />
                  </div>
              );
          case 'audio':
              return (
                  <div className="flex flex-col gap-1 min-w-[200px] py-1">
                      <audio controls src={msg.contentUrl} className="w-full h-10" />
                      {msg.text && msg.text !== 'Voice Message' && <span className="text-xs opacity-70 px-1">{msg.text}</span>}
                  </div>
              );
          case 'document':
              return (
                  <div 
                    className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg min-w-[220px] cursor-pointer group hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    onClick={(e) => {
                        if (selectedMessageIds.length === 0 && msg.contentUrl) {
                            e.stopPropagation();
                            handleDownload(msg.contentUrl, msg.fileName || 'document');
                        }
                    }}
                  >
                      <div className="text-red-500"><FileText size={32} /></div>
                      <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-slate-700 dark:text-slate-200">{msg.fileName || 'Document'}</p>
                          <p className="text-xs opacity-60 text-slate-500 dark:text-slate-400">{msg.fileSize} • {msg.fileName?.split('.').pop()?.toUpperCase() || 'FILE'}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                        <Download size={18} className="opacity-70 text-slate-600 dark:text-slate-300" />
                      </div>
                  </div>
              );
          case 'location':
              return (
                  <div className="rounded-lg overflow-hidden bg-amber-100 dark:bg-amber-900/30">
                      <div className="h-32 bg-slate-200 dark:bg-slate-700 relative flex items-center justify-center">
                          <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px'}}></div>
                          <MapPin size={32} className="text-red-600 drop-shadow-md z-10" fill="currentColor" />
                      </div>
                      <div className="p-2">
                          <p className="font-bold text-sm">Live Location</p>
                          <p className="text-xs opacity-70">Shared via QuickBill</p>
                      </div>
                  </div>
              );
          case 'contact':
              return (
                  <div className={`flex items-center gap-3 p-3 rounded-lg min-w-[240px] ${!msg.isSent ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm' : 'bg-[#d9fdd3] dark:bg-[#005c4b]'}`}>
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                          <User size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="font-bold text-[15px] truncate text-slate-900 dark:text-white">{msg.text}</p>
                          <p className="text-xs opacity-70 truncate">{msg.contentUrl}</p>
                      </div>
                      {!msg.isSent && (
                          <div className="flex items-center gap-2 shrink-0">
                              {!msg.itemsShared ? (
                                  <>
                                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 rounded-md font-semibold border border-amber-200 dark:border-amber-800/50">
                                          Pending
                                      </span>
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); handleQuickShareItems(msg); }}
                                          disabled={isSharingItems}
                                          className="p-2 ml-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-700 rounded-full transition-colors flex shrink-0"
                                          title="Send Item List"
                                      >
                                          {isSharingItems ? <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : <Send size={20} className="-mt-0.5 ml-0.5" />}
                                      </button>
                                  </>
                              ) : (
                                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#d9fdd3] text-[#005c4b] dark:bg-[#005c4b]/30 dark:text-[#d9fdd3] rounded-md font-semibold border border-[#d9fdd3] dark:border-[#005c4b]/50 flex items-center gap-1">
                                      <CheckCheck size={14} /> Sent
                                  </span>
                              )}
                          </div>
                      )}
                  </div>
              );
          default:
              return <p className="pb-4 leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>;
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#efeae2] dark:bg-[#0b141a] relative text-slate-900 dark:text-white transition-colors pb-[max(env(safe-area-inset-bottom),0px)]" onClick={() => showAttachments && setShowAttachments(false)}>
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={(e) => handleFileSelect(e, 'document')} />
      <input type="file" ref={galleryInputRef} className="hidden" accept="image/*,video/*" onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const isVideo = file.type.startsWith('video') || file.name.match(/\.(mp4|webm|ogg|mov|mkv)$/i);
          handleFileSelect(e, isVideo ? 'video' : 'image');
      }} />
      <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={(e) => handleFileSelect(e, 'audio')} />
      <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileSelect(e, 'image')} />

      {activeCall && (
          <div className="absolute inset-0 z-50 bg-[#0b141a] flex flex-col items-center pt-20 text-white animate-in slide-in-from-bottom duration-300">
              <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center mb-6 border-4 border-slate-600">
                  <span className="text-4xl font-bold">{party.name.charAt(0)}</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">{party.name}</h2>
              <p className="text-emerald-400 mb-20 font-medium">{activeCall.status === 'calling' ? 'Calling...' : 'Connected'}</p>
              
              <div className="mt-auto pb-16 flex gap-8 items-center">
                  <button className="p-4 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"><Video size={24} /></button>
                  <button className="p-4 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"><Mic size={24} /></button>
                  <button onClick={endCall} className="p-5 bg-red-600 rounded-full hover:bg-red-700 transition-transform hover:scale-110 shadow-lg shadow-red-900/50">
                      <PhoneIncoming size={32} className="rotate-[135deg]" />
                  </button>
              </div>
          </div>
      )}

      {/* Header */}
      <header className="bg-[#008069] dark:bg-[#1f2c34] text-white p-2 flex items-center gap-2 shadow-sm z-20 border-b border-white/10 dark:border-slate-800 transition-colors min-h-[60px] pt-[max(env(safe-area-inset-top),48px)]">
        {selectedMessageIds.length > 0 ? (
            <div className="flex-1 flex items-center justify-between animate-in fade-in duration-200">
                <div className="flex items-center gap-4">
                    <button onClick={cancelSelection} className="p-1 hover:bg-white/10 rounded-full"><ArrowLeft size={24} /></button>
                    <span className="font-bold text-lg">{selectedMessageIds.length}</span>
                </div>
                <div className="flex items-center gap-4 px-2">
                    <button className="hover:bg-white/10 p-2 rounded-full"><Forward size={22} className="-scale-x-100" /></button>
                    <button onClick={handleDeleteSelected} className="hover:bg-white/10 p-2 rounded-full"><Trash2 size={22} /></button>
                    <button className="hover:bg-white/10 p-2 rounded-full"><Copy size={22} /></button>
                </div>
            </div>
        ) : (
            <>
                <button onClick={onBack} className="flex items-center rounded-full p-1 hover:bg-white/10">
                <ArrowLeft size={24} />
                <div className="w-9 h-9 ml-1 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden flex items-center justify-center border border-slate-300 dark:border-slate-500">
                    <span className="text-slate-700 dark:text-white font-bold text-sm">{party.name.charAt(0)}</span>
                </div>
                </button>
                <div className="flex-1 cursor-pointer min-w-0">
                    <h1 className="text-[17px] font-medium truncate text-white leading-tight">{party.name}</h1>
                    <p className="text-[13px] truncate text-white/80 leading-tight">last seen today at 7:35 am</p>
                </div>
                <div className="flex items-center gap-4 px-2 text-white">
                    <button onClick={() => startCall('video')}><Video size={22} className="cursor-pointer" /></button>
                    <button onClick={() => startCall('voice')}><Phone size={20} className="cursor-pointer" /></button>
                    <button onClick={() => {
                        setIsSendingAsCustomer(!isSendingAsCustomer);
                        setToastMessage(`Switched! Now sending as: ${!isSendingAsCustomer ? 'Customer' : 'You'}`);
                        setTimeout(() => setToastMessage(''), 3000);
                    }}><MoreVertical size={22} className="cursor-pointer" /></button>
                </div>
            </>
        )}
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 relative bg-[#efeae2] dark:bg-[#0b141a]">
         <div className="absolute inset-0 z-0 opacity-40 dark:opacity-5 pointer-events-none bg-repeat" style={{
             backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
             backgroundSize: "400px"
         }}></div>

         <div className="flex justify-center mb-4 relative z-10">
             <span className="bg-white dark:bg-[#1f2c34] text-slate-600 dark:text-slate-300 font-medium text-xs px-2 py-1 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">Today</span>
         </div>

         {messages.map((msg) => {
             const isSelected = selectedMessageIds.includes(msg.id);
             return (
                <div 
                    key={msg.id} 
                    className={`flex w-full relative z-10 ${msg.isSent ? 'justify-end' : 'justify-start'} ${isSelected ? 'bg-blue-200/30 -mx-4 px-4 py-1' : 'py-1'}`}
                    onMouseDown={() => handleMessageInteractionStart(msg.id)}
                    onMouseUp={handleMessageInteractionEnd}
                    onMouseLeave={handleMessageInteractionEnd}
                    onTouchStart={() => handleMessageInteractionStart(msg.id)}
                    onTouchEnd={handleMessageInteractionEnd}
                    onTouchMove={handleMessageInteractionEnd}
                    onClick={() => handleMessageClick(msg.id)}
                >
                    <div 
                        className={`relative max-w-[85%] sm:max-w-[70%] px-2 pt-1.5 pb-1 rounded-lg shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] text-[15px] leading-snug select-none transition-colors ${
                            msg.isSent 
                            ? `${isSelected ? 'bg-[#bbfeb3] dark:bg-[#007a63]' : 'bg-[#d9fdd3] dark:bg-[#005c4b]'} text-slate-900 dark:text-white rounded-tr-none` 
                            : `${isSelected ? 'bg-[#f0f0f0] dark:bg-[#2a3942]' : 'bg-white dark:bg-[#1f2c34]'} text-slate-900 dark:text-white rounded-tl-none`
                        }`}
                    >
                        <div className="flex flex-wrap items-end gap-2">
                            <span className="break-words max-w-full">{renderMessageContent(msg)}</span>
                            <div className="flex items-center gap-1 ml-auto shrink-0 float-right mt-1">
                                <span className={`text-[11px] ${msg.isSent ? 'text-slate-500 dark:text-green-200' : 'text-slate-400'}`}>{msg.time}</span>
                                {msg.isSent && <span className="text-[#53bdeb]"><CheckCheck size={14} /></span>}
                            </div>
                        </div>
                    </div>
                </div>
             );
         })}
         <div ref={endRef} />
      </div>

      {!selectedMessageIds.length && (
          <div className="p-2 flex items-end gap-2 z-20 pb-4 md:pb-2 bg-transparent transition-colors">
            <div className="flex-1 bg-white dark:bg-[#1f2c34] rounded-[24px] flex items-end p-1 shadow-sm min-h-[48px] overflow-hidden">
                {isRecording ? (
                    <div className="flex-1 flex items-center gap-3 px-3 text-red-500 animate-pulse">
                        <Mic size={20} fill="currentColor" />
                        <span className="font-bold">Recording {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}...</span>
                        <button onClick={cancelRecording} className="text-slate-500 text-sm ml-auto font-normal hover:text-red-500">Cancel</button>
                    </div>
                ) : (
                    <>
                        <button className="p-2.5 text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"><Smile size={24} /></button>
                        <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyPress} placeholder="Message" className="flex-1 bg-transparent outline-none text-[17px] text-slate-900 dark:text-white placeholder:text-slate-500 px-1 py-2.5 font-normal min-w-0" />
                        <button className={`p-2.5 hover:text-slate-600 dark:hover:text-slate-200 rotate-45 transition-transform shrink-0 ${showAttachments ? 'text-slate-600 dark:text-slate-200' : 'text-slate-500'}`} onClick={(e) => { e.stopPropagation(); setShowAttachments(!showAttachments); }}>
                            {showAttachments ? <X size={24} className="-rotate-45" /> : <Paperclip size={22} />}
                        </button>
                        {!inputText && (
                            <button className="p-2.5 text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0" onClick={() => cameraInputRef.current?.click()}><Camera size={22} /></button>
                        )}
                    </>
                )}
            </div>
            <button onClick={() => { if (inputText) { handleSend(); } else if (isRecording) { stopRecordingAndSend(); } else { startRecording(); } }} className={`w-[48px] h-[48px] rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-all shrink-0 ${isRecording ? 'bg-red-500 scale-110' : 'bg-[#00a884]'}`}>
                {inputText || isRecording ? <Send size={20} className={isRecording ? "" : "ml-1"} /> : <Mic size={24} />}
            </button>
          </div>
      )}
      
      {showAttachments && !selectedMessageIds.length && (
          <div className="absolute bottom-16 left-2 right-2 bg-transparent z-30 flex justify-center">
              <div className="bg-white dark:bg-[#1f2c34] rounded-xl shadow-xl p-6 mb-2 grid grid-cols-3 gap-6 animate-in slide-in-from-bottom-5 duration-200 border border-gray-200 dark:border-slate-700 w-full max-w-sm">
                  <button onClick={() => handleAttachmentClick('Document')} className="flex flex-col items-center gap-2 group"><div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md active:scale-95 transition-transform group-hover:bg-indigo-700"><FileText size={24} /></div><span className="text-xs text-slate-600 dark:text-slate-300 font-bold">Document</span></button>
                  <button onClick={() => handleAttachmentClick('Camera')} className="flex flex-col items-center gap-2 group"><div className="w-14 h-14 rounded-full bg-pink-600 flex items-center justify-center text-white shadow-md active:scale-95 transition-transform group-hover:bg-pink-700"><Camera size={24} /></div><span className="text-xs text-slate-600 dark:text-slate-300 font-bold">Camera</span></button>
                  <button onClick={() => handleAttachmentClick('Gallery')} className="flex flex-col items-center gap-2 group"><div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-md active:scale-95 transition-transform group-hover:bg-purple-700"><Image size={24} /></div><span className="text-xs text-slate-600 dark:text-slate-300 font-bold">Gallery</span></button>
                  <button onClick={() => handleAttachmentClick('Audio')} className="flex flex-col items-center gap-2 group"><div className="w-14 h-14 rounded-full bg-orange-600 flex items-center justify-center text-white shadow-md active:scale-95 transition-transform group-hover:bg-orange-700"><Headphones size={24} /></div><span className="text-xs text-slate-600 dark:text-slate-300 font-bold">Audio</span></button>
                  <button onClick={() => handleAttachmentClick('Location')} className="flex flex-col items-center gap-2 group"><div className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center text-white shadow-md active:scale-95 transition-transform group-hover:bg-green-700"><MapPin size={24} /></div><span className="text-xs text-slate-600 dark:text-slate-300 font-bold">Location</span></button>
                  <button onClick={() => handleAttachmentClick('Contact')} className="flex flex-col items-center gap-2 group"><div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md active:scale-95 transition-transform group-hover:bg-blue-700"><User size={24} /></div><span className="text-xs text-slate-600 dark:text-slate-300 font-bold">Contact</span></button>
              </div>
          </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
          <div className="absolute inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full shadow-xl">
                  <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">Delete Messages</h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-6">Are you sure you want to delete {selectedMessageIds.length} message(s)?</p>
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">Cancel</button>
                      <button onClick={confirmDelete} className="px-4 py-2 bg-red-500 text-white rounded font-medium hover:bg-red-600 transition-colors">Delete</button>
                  </div>
              </div>
          </div>
      )}

      {/* Custom Toast Notification */}
      {toastMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg z-[100] text-sm animate-in slide-in-from-top-4 fade-in duration-300">
              {toastMessage}
          </div>
      )}
    </div>
  );
};