import React, { useState, useEffect } from 'react';
import { Database, Calendar, ChevronRight } from 'lucide-react';

interface FY {
    id: string;
    label: string;
}

interface FinancialYearScreenProps {
    onSelect: (fyId: string) => void;
    language?: 'en' | 'hi';
}

export const FinancialYearScreen: React.FC<FinancialYearScreenProps> = ({ onSelect, language }) => {
    const [availableFYs, setAvailableFYs] = useState<FY[]>([]);
    const [selected, setSelected] = useState<string>('BillingDB');

    useEffect(() => {
        const storedFYs = localStorage.getItem('availableFYs');
        const currentActive = localStorage.getItem('activeFY') || 'BillingDB';
        setSelected(currentActive);

        if (storedFYs) {
            setAvailableFYs(JSON.parse(storedFYs));
        } else {
            // Default initialization
            const defaultFY = [{ id: 'BillingDB', label: 'Current FY' }];
            localStorage.setItem('availableFYs', JSON.stringify(defaultFY));
            setAvailableFYs(defaultFY);
        }
    }, []);

    const appLang = language || (localStorage.getItem('appLanguage') || 'en');

    const handleProceed = () => {
        onSelect(selected);
    };

    return (
        <div className="relative h-full w-full flex flex-col justify-between bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-white p-6 animate-in fade-in duration-550 font-sans">
            {/* Branding Header Area */}
            <div className="text-center mt-10">
                <div className="mx-auto bg-gradient-to-tr from-brand-primary/80 to-brand-primary p-4 rounded-3xl w-16 h-16 flex items-center justify-center shadow-lg shadow-brand-primary/20 mb-4 animate-bounce-slow">
                    <Database size={36} className="text-white" />
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-3.5 py-1 rounded-full uppercase tracking-widest border border-slate-700/60 shadow-sm">
                    ⚡ Active Session
                </span>
                <h1 className="text-3xl font-extrabold tracking-tight mt-4 text-slate-100 uppercase animate-pulse">
                    Eazy Billing <span className="text-brand-primary">v2.0</span>
                </h1>
                <p className="text-slate-400 text-xs mt-1">
                    {appLang === 'hi' ? 'वित्तीय वर्ष का चयन करें' : 'Select Financial Year'}
                </p>
            </div>

            {/* Financial Year Buttons Container */}
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-xl my-4 space-y-4 flex-1 flex flex-col justify-center max-h-[360px]">
                <div className="flex items-center gap-2 text-brand-primary mb-1 border-b border-slate-800 pb-3 shrink-0">
                    <Calendar size={20} className="text-brand-primary" />
                    <h2 className="font-bold text-xs tracking-wider uppercase text-brand-primary">
                        {appLang === 'hi' ? 'उपलब्ध वित्तीय वर्ष' : 'Available Sessions'}
                    </h2>
                </div>
                
                <p className="text-xs text-slate-400 leading-relaxed shrink-0">
                    {appLang === 'hi' 
                        ? 'चुना हुआ वित्तीय वर्ष ही आपके लेनदेन प्रविष्टियों, डेटा विश्लेषण और रिपोर्ट के लिए सक्रीय किया जाएगा:' 
                        : 'Every financial session serves as a partition to separate bookkeeping, balances, and ledger invoices:'}
                </p>

                <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-1 flex-1 py-1">
                    {availableFYs.map((fy) => {
                        const isSelected = selected === fy.id;
                        return (
                            <button
                                key={fy.id}
                                id={`fy-btn-${fy.id}`}
                                onClick={() => setSelected(fy.id)}
                                className={`p-4 rounded-xl text-left border transition-all flex items-center justify-between w-full ${
                                    isSelected
                                        ? 'bg-brand-primary/10 border-brand-primary text-white shadow-lg shadow-brand-primary/10'
                                        : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-850'
                                    }`}
                            >
                                <div className="space-y-0.5">
                                    <span className="text-base font-bold block">{fy.label}</span>
                                    <span className="text-[10px] text-slate-400 font-medium font-sans">
                                        {fy.id === 'BillingDB' 
                                            ? (appLang === 'hi' ? 'डिफ़ॉल्ट सक्रिय बहीखाता सत्र' : 'Default active accounting workspace')
                                            : (appLang === 'hi' ? `${fy.label} सत्र का डेटाबेस` : `Partition for ${fy.label} active data`)}
                                    </span>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                                    isSelected ? 'border-brand-primary bg-brand-primary' : 'border-slate-600'
                                }`}>
                                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white animate-scale-up" />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Continuance Trigger */}
            <div className="mb-6 shrink-0">
                <button
                    id="proceed-fy-btn"
                    onClick={handleProceed}
                    className="w-full bg-brand-primary hover:bg-opacity-90 text-white font-black py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-sm hover:-translate-y-0.5"
                >
                    {appLang === 'hi' ? 'चयन करें और आगे बढ़ें' : 'Select & Continue'}
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};
