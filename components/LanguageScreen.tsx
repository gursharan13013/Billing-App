import React, { useState } from 'react';
import { Languages, ChevronRight, ShieldCheck } from 'lucide-react';
import { Language } from '../types';

interface LanguageScreenProps {
  onSelect: (lang: Language) => void;
  currentLanguage?: Language;
}

export const LanguageScreen: React.FC<LanguageScreenProps> = ({ onSelect, currentLanguage }) => {
  const [selected, setSelected] = useState<Language>(() => currentLanguage || (localStorage.getItem('appLanguage') as Language) || 'en');

  const handleProceed = () => {
    localStorage.setItem('appLanguage', selected);
    sessionStorage.setItem('language_selected', 'true');
    onSelect(selected);
  };

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-white p-4 overflow-y-auto animate-in fade-in duration-500 font-sans">
      <div className="w-full max-w-md bg-slate-900/65 border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-2xl space-y-5 backdrop-blur-md">
        {/* Branding Header Area */}
        <div className="text-center">
          <div className="mx-auto bg-gradient-to-tr from-brand-primary/80 to-brand-primary p-3.5 rounded-2xl w-14 h-14 flex items-center justify-center shadow-lg shadow-brand-primary/20 mb-3">
            <ShieldCheck size={32} className="text-white animate-pulse" />
          </div>
          <span className="text-[10px] bg-slate-850/90 text-slate-300 font-bold px-3.5 py-1 rounded-full uppercase tracking-widest border border-slate-800 shadow-sm inline-block">
            🛡️ 100% Offline Secured
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3 text-slate-105 uppercase">
            Eazy Billing <span className="text-brand-primary">v2.0</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">Devanagari & Roman Layouts Embedded</p>
        </div>

        {/* Language Buttons Container */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2 text-brand-primary mb-2 border-b border-slate-800/80 pb-2.5">
            <Languages size={18} className="text-brand-primary" />
            <span className="font-bold text-xs tracking-wider uppercase text-brand-primary">Select App Language / भाषा चुनें</span>
          </div>
          
          <p className="text-xs text-slate-400 leading-relaxed font-sans pb-1">
            Setup language decides formatting, translation templates, and numeric formats across Eazy Billing:
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            {/* English Option */}
            <button
              id="lang-en-btn"
              onClick={() => setSelected('en')}
              className={`p-3.5 rounded-xl text-left border transition-all flex items-center justify-between cursor-pointer ${
                selected === 'en'
                  ? 'bg-brand-primary/10 border-brand-primary text-white shadow-lg shadow-brand-primary/10 font-bold scale-[1.01]'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-850/60'
              }`}
            >
              <div className="space-y-0.5">
                <span className="text-lg font-bold block">English</span>
                <span className="text-[10px] text-slate-400 font-medium font-sans">Roman layout for general trade</span>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                selected === 'en' ? 'border-brand-primary bg-brand-primary' : 'border-slate-600'
              }`}>
                {selected === 'en' && <div className="w-2.5 h-2.5 rounded-full bg-white animate-scale-up" />}
              </div>
            </button>
            
            {/* Hindi Option */}
            <button
              id="lang-hi-btn"
              onClick={() => setSelected('hi')}
              className={`p-3.5 rounded-xl text-left border transition-all flex items-center justify-between cursor-pointer ${
                selected === 'hi'
                  ? 'bg-brand-primary/10 border-brand-primary text-white shadow-lg shadow-brand-primary/10 font-bold scale-[1.01]'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-850/60'
              }`}
            >
              <div className="space-y-0.5">
                <span className="text-lg font-bold block">हिन्दी (Hindi)</span>
                <span className="text-[10px] text-slate-400 font-medium font-sans">देवनागरी लिपि और स्थानीय शब्दावली</span>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                selected === 'hi' ? 'border-brand-primary bg-brand-primary' : 'border-slate-600'
              }`}>
                {selected === 'hi' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
              </div>
            </button>
          </div>
        </div>

        {/* Continuance Trigger */}
        <div className="pt-2">
          <button
            id="proceed-setup-btn"
            onClick={handleProceed}
            className="w-full bg-brand-primary hover:bg-opacity-95 text-white font-black py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-sm hover:-translate-y-0.5 cursor-pointer"
          >
            {selected === 'hi' ? 'दुकान सेटअप पर आगे बढ़ें' : 'Continue to Setup'}
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
