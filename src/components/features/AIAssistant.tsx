import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Bot, X, Sparkles, ShoppingCart, ArrowRight } from 'lucide-react';
import { aiService, AICommandResult } from '../../services/aiService';
import { billingService } from '../../services/billingService';
import { TransactionType, Item } from '../../core/types/';
import { DraggableFAB } from '../shared/DraggableFAB';


interface AIAssistantProps {
    onNavigate: (type: TransactionType, party?: any, prefilledItems?: any[]) => void;
    defaultPosition?: (width: number, height: number) => { x: number; y: number };
    persistPosition?: boolean;
    language?: 'en' | 'hi';
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ 
    onNavigate,
    defaultPosition = (w, h) => ({ x: w - 72, y: h - 120 }),
    persistPosition = true,
    language = 'en'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string, data?: any}[]>([]);
    
    // Web Speech API
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-IN'; // Set speech recognition language based on active language

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInputText(transcript);
                handleSend(transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
                if (event.error === 'not-allowed') {
                    setMessages(prev => [...prev, { role: 'ai', text: language === 'hi' ? "माइक्रोफ़ोन एक्सेस अस्वीकृत। कृपया अनुमति दें।" : "Microphone access denied. Please allow permissions." }]);
                } else if (event.error === 'no-speech') {
                    // Ignore no-speech, just stop listening state
                } else {
                    setMessages(prev => [...prev, { role: 'ai', text: language === 'hi' ? "वॉयस इनपुट विफल रहा। कृपया टाइप करने का प्रयास करें।" : "Voice input failed. Please try typing." }]);
                }
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, [language]);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert(language === 'hi' ? "इस ब्राउज़र में वॉयस इनपुट समर्थित नहीं है। कृपया क्रोम/एज का उपयोग करें।" : "Voice input is not supported in this browser. Please use Chrome/Edge.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            setMessages([]); // Clear context on new voice command for simplicity
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error("Failed to start speech recognition", e);
                setIsListening(false);
            }
        }
    };

    const handleSend = async (textOverride?: string) => {
        const text = textOverride || inputText;
        if (!text.trim()) return;

        // Add User Message
        setMessages(prev => [...prev, { role: 'user', text }]);
        setInputText('');
        setIsLoading(true);

        try {
            const result: AICommandResult = await aiService.processCommand(text);
            console.log("AI Result:", result);
            
            if (result.action === 'ADVICE') {
                setMessages(prev => [...prev, { role: 'ai', text: result.advice || (language === 'hi' ? "कोई सलाह उपलब्ध नहीं है।" : "No advice available.") }]);
            } else if (result.action === 'TRANSACTION') {
                const txTypeDisplay = language === 'hi' 
                    ? (result.transactionType === 'Sale' ? 'बिक्री बिल' : result.transactionType === 'Purchase' ? 'खरीद बिल' : result.transactionType)
                    : result.transactionType;
                setMessages(prev => [...prev, { 
                    role: 'ai', 
                    text: language === 'hi' 
                        ? `मैंने ${result.partyName} के लिए ${txTypeDisplay} तैयार किया है।` 
                        : `I've prepared a ${result.transactionType} for ${result.partyName}.`,
                    data: result
                }]);
            } else {
                setMessages(prev => [...prev, { role: 'ai', text: language === 'hi' ? "मैं समझ नहीं पाया। बोलें 'रमेश के लिए बिल बनाएं' या 'स्टॉक चेक करें'।" : "I didn't catch that. Try saying 'Create a bill for Ramesh' or 'Check stock'." }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: language === 'hi' ? 'कुछ गलत हो गया। कृपया अपना इंटरनेट कनेक्शन चेक करें।' : "Something went wrong. Please check your connection." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const executeTransaction = async (data: any) => {
        // 1. Find Party
        let party = await billingService.getPartyByName(data.partyName);
        if (!party) {
            const newPartyId = Math.random().toString(36).substr(2, 9);
            const newParty = {
                id: newPartyId,
                name: data.partyName,
                mobile: '',
                type: data.transactionType.includes('Sale') ? 'Customer' : 'Supplier',
                currentBalance: 0,
                accountGroup: data.transactionType.includes('Sale') ? 'Sundry Debtors' : 'Sundry Creditors'
            };
            await billingService.saveParty(newParty as any);
            party = newParty as any;
        }

        // 2. Find Items
        const allItems = await billingService.getAllItems();
        const mappedItems = data.items.map((aiItem: any) => {
            // Fuzzy match item name
            const found = allItems.find(i => i.name && i.name.toLowerCase().includes(aiItem.itemName.toLowerCase()));
            
            return {
                id: Math.random().toString(36).substr(2, 9),
                item: found || { id: 'temp', name: aiItem.itemName, saleRate: 0 }, // Fallback temp item
                qty: aiItem.qty || 1,
                rate: found ? (data.transactionType.includes('Purchase') ? found.purchaseRate : found.saleRate) : 0,
                mrp: found ? found.mrp : 0,
                taxType: 'Excluded',
                taxPercent: found ? found.taxPercent : 0,
                discountPercent: 0
            };
        });

        // 3. Navigate to Invoice Screen with Pre-filled Data
        onNavigate(data.transactionType, party, mappedItems);
        setIsOpen(false);
        setMessages([]);
    };

    if (!isOpen) {
        return (
            <DraggableFAB
                id="ai_assistant_btn"
                defaultPosition={defaultPosition}
                persistPosition={persistPosition}
                onClick={() => setIsOpen(true)}
            >
                <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)] flex items-center justify-center text-white animate-bounce-slow border-2 border-white dark:border-slate-800 cursor-pointer">
                    <Sparkles size={28} className="animate-pulse" />
                </div>
            </DraggableFAB>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none pb-[70px]">
            {/* REMOVED BACKDROP DIV to allow interaction with background app */}

            <div className="w-[95%] max-w-sm bg-white dark:bg-slate-900 h-[400px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 border border-slate-200 dark:border-slate-800 pointer-events-auto relative z-50">
                {/* Header - Compact */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-2">
                        <Bot size={20} />
                        <div>
                            <h2 className="font-bold text-sm">{language === 'hi' ? 'स्मार्ट सहायक' : 'Smart Assistant'}</h2>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full cursor-pointer"><X size={20} /></button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 dark:bg-slate-950/50">
                    {messages.length === 0 && (
                        <div className="text-center text-slate-400 mt-8">
                            <Sparkles size={32} className="mx-auto mb-3 opacity-50 text-indigo-400" />
                            <p className="font-medium text-sm">{language === 'hi' ? 'मैं आपकी क्या मदद कर सकता हूँ?' : 'How can I help?'}</p>
                            <p className="text-xs mt-1">
                                {language === 'hi' ? '"रमेश के लिए बिल बनाएं"' : '"Create bill for Ramesh"'}
                            </p>
                        </div>
                    )}
                    
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] rounded-xl p-3 text-sm font-medium ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-bl-none shadow-sm border border-slate-100 dark:border-slate-700'}`}>
                                <p className="leading-relaxed">{msg.text}</p>
                                {msg.data && (
                                    <div className="mt-3 bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                        <div className="flex gap-2 items-center mb-1">
                                            <ShoppingCart size={16} className="text-indigo-600 dark:text-indigo-400" />
                                            <span className="font-bold text-indigo-900 dark:text-indigo-200 text-sm">
                                                {language === 'hi' 
                                                    ? (msg.data.transactionType === 'Sale' ? 'सेल / बिक्री' : msg.data.transactionType === 'Purchase' ? 'परचेस / खरीद' : msg.data.transactionType)
                                                    : msg.data.transactionType}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                                            {language === 'hi' ? 'के लिए' : 'For'}: <b>{msg.data.partyName}</b>
                                        </div>
                                        <button 
                                            onClick={() => executeTransaction(msg.data)}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                                        >
                                            {language === 'hi' ? 'अभी बनाएं' : 'Create Now'} <ArrowRight size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl rounded-bl-none shadow-sm">
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <button 
                        onClick={toggleListening}
                        className={`p-3 rounded-full transition-all cursor-pointer ${isListening ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                    >
                        <Mic size={20} />
                    </button>
                    <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={language === 'hi' ? 'टाइप करें या बोलें...' : 'Type or Speak...'}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                        autoFocus
                    />
                    <button 
                        onClick={() => handleSend()}
                        disabled={!inputText.trim()}
                        className="p-3 bg-indigo-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};