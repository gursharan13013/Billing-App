import React, { useState, useEffect } from 'react';
import { Languages, ChevronRight, ShieldCheck, Sun, Moon } from 'lucide-react';
import { Language } from '../../core/types/';
import { safeLocalStorage, safeSessionStorage } from '../../core/utils/storage';

interface LanguageScreenProps {
  onSelect: (lang: Language) => void;
  currentLanguage?: Language;
}

export const LanguageScreen: React.FC<LanguageScreenProps> = ({ onSelect, currentLanguage }) => {
  // Internal state using safe storage helpers
  const [selected, setSelected] = useState<Language>(() => {
    return (currentLanguage || (safeLocalStorage.getItem('appLanguage') as Language) || 'en');
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = safeLocalStorage.getItem('appTheme') || 'system';
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  // Track standard theme toggles
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    safeLocalStorage.setItem('appTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleProceed = () => {
    console.log("Language proceed trigger with:", selected);
    safeLocalStorage.setItem('appLanguage', selected);
    safeSessionStorage.setItem('language_selected', 'true');
    try {
      onSelect(selected);
    } catch (err) {
      console.error("onSelect callback parent execution failed:", err);
      // Fallback navigation if needed
    }
  };

  const isHi = selected === 'hi';

  return (
    <div 
      className={`relative min-h-screen w-full flex flex-col items-center justify-between p-5 overflow-x-hidden overflow-y-auto font-sans transition-all duration-700 ease-in-out select-none ${
        theme === 'dark'
          ? isHi
            ? 'bg-[#0b0805] text-amber-50/90' // Sunset Deep Saffron Dark
            : 'bg-[#030712] text-slate-100'   // Indigo Tech Deep Space Dark
          : isHi
            ? 'bg-gradient-to-tr from-[#fffdfa] via-[#fffaf2] to-[#fcf5e8] text-slate-850' // Warm Ivory Light
            : 'bg-gradient-to-tr from-slate-50 via-indigo-50/10 to-indigo-100/30 text-slate-800' // Indigo Minimal Light
      }`}
    >
      {/* Dynamic Background Glow Blobs */}
      <div className="absolute inset-x-0 top-0 h-96 overflow-hidden pointer-events-none z-0">
        <div 
          className={`absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[100px] opacity-[0.14] dark:opacity-[0.12] transition-colors duration-700 ${
            isHi ? 'bg-amber-500' : 'bg-indigo-650'
          }`}
        />
        <div 
          className={`absolute top-[40%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[120px] opacity-[0.1] dark:opacity-[0.08] transition-colors duration-700 ${
            isHi ? 'bg-orange-500' : 'bg-[#4f46e5]'
          }`}
        />
      </div>

      {/* Top Floating Action Bar with Theme Toggle */}
      <header className="w-full max-w-md flex items-center justify-end pt-3 z-10 self-center">
        <button
          id="lang-theme-toggle-btn"
          type="button"
          onClick={toggleTheme}
          className={`p-3 rounded-2xl border transition-all duration-300 flex items-center justify-center cursor-pointer shadow-3xs active:scale-95 hover:scale-105 ${
            theme === 'dark'
              ? 'bg-slate-900/60 border-slate-800 text-amber-400 hover:bg-slate-800/80'
              : 'bg-white border-slate-200 text-indigo-650 hover:bg-slate-50'
          }`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={15} className="stroke-[2.5px]" /> : <Moon size={15} className="stroke-[2.5px]" />}
        </button>
      </header>

      {/* Main Core Form Card Container */}
      <main className="my-auto w-full max-w-md z-10 py-6">
        <div 
          className={`w-full border p-6 sm:p-8 rounded-[2rem] transition-all duration-500 space-y-6 ${
            theme === 'dark'
              ? 'bg-[#091122]/80 border-slate-800/80 shadow-2xl backdrop-blur-md shadow-black/30'
              : 'bg-white border-slate-201 shadow-xl shadow-slate-100/50'
          }`}
        >
          {/* Branding Header Area */}
          <div className="text-center space-y-4">
            <div 
              className={`mx-auto p-4 rounded-2xl w-14 h-14 flex items-center justify-center shadow-md transition-all duration-550 ${
                isHi
                  ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-orange-500/10'
                  : 'bg-gradient-to-tr from-[#6366F1] to-indigo-600 text-white shadow-[#6366F1]/15'
              }`}
            >
              <ShieldCheck size={28} className="stroke-[2.5px] animate-pulse" />
            </div>

            <div className="pt-1">
              <span 
                className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border transition-all duration-550 inline-block shadow-4xs ${
                  theme === 'dark'
                    ? isHi
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/15'
                      : 'bg-[#111c30]/90 text-slate-300 border-slate-700/60'
                    : isHi
                      ? 'bg-amber-500/10 text-amber-800 border-amber-200/50'
                      : 'bg-slate-50 text-slate-650 border-slate-200/85'
                }`}
              >
                {isHi ? '🛡️ 100% सुरक्षित ऑफलाइन खाता' : '🛡️ 100% Offline Secured'}
              </span>
            </div>

            <div className="space-y-1">
              <h1 className={`text-2xl sm:text-3xl font-black tracking-tight uppercase font-sans ${
                theme === 'dark' ? 'text-slate-50' : 'text-slate-900'
              }`}>
                {isHi ? 'ईज़ी बिलिंग ' : 'Eazy Billing '} 
                <span className={`transition-colors duration-500 ${
                  isHi ? 'text-amber-500' : 'text-[#4f46e5]'
                }`}>
                  v2.0
                </span>
              </h1>
              <p className={`text-[10px] uppercase tracking-widest font-bold transition-colors duration-500 ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                {isHi ? 'देवनागरी और रोमन दोनों लेआउट उपलब्ध' : 'Devanagari & Roman Layouts Embedded'}
              </p>
            </div>
          </div>

          {/* Language Buttons Container */}
          <div className="space-y-4 pt-2">
            <div 
              className={`flex items-center gap-2 mb-1 pb-3 border-b transition-colors duration-500 ${
                isHi ? 'border-amber-500/15' : 'border-slate-100 dark:border-slate-850'
              }`}
            >
              <Languages size={15} className={`stroke-[2.5px] ${isHi ? 'text-amber-500' : 'text-[#4f46e5]'}`} />
              <span className={`font-black text-xs tracking-wider uppercase ${
                isHi ? 'text-amber-550' : 'text-[#4f46e5]'
              }`}>
                {isHi ? 'भाषा चुनें / Select Language' : 'Select App Language / भाषा चुनें'}
              </span>
            </div>
            
            <p className={`text-[11px] leading-relaxed transition-colors duration-500 font-bold ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {isHi
                ? 'चुनी हुई भाषा के अनुसार आपके बिल, रिपोर्ट, टैक्स प्रारूप और गिनती का प्रारूप तय किया जाएगा:'
                : 'Setup language decides formatting, translation templates, and numeric formats across Eazy Billing:'}
            </p>

            <div className="grid grid-cols-1 gap-3">
              {/* English Option */}
              <button
                id="lang-en-btn"
                type="button"
                onClick={() => setSelected('en')}
                className={`p-4 rounded-2xl text-left border transition-all duration-300 flex items-center justify-between cursor-pointer focus:outline-none ${
                  selected === 'en'
                    ? theme === 'dark'
                      ? 'bg-indigo-950/20 border-[#4f46e5] text-white shadow-md shadow-[#4f46e5]/10 font-bold scale-[1.01]'
                      : 'bg-indigo-50/50 border-[#4f46e5] text-slate-900 shadow-sm shadow-indigo-100 font-bold scale-[1.01]'
                    : theme === 'dark'
                      ? 'bg-slate-950/30 border-slate-800 text-slate-400 hover:bg-slate-900/45 hover:text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100/40 hover:text-slate-700'
                }`}
              >
                <div className="space-y-0.5">
                  <span className="text-sm font-black block">English</span>
                  <span className={`text-[10px] font-bold block transition-colors duration-300 ${
                    selected === 'en'
                      ? theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'
                      : theme === 'dark' ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    Roman layout for general trade and invoices
                  </span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                  selected === 'en' 
                    ? 'border-[#4f46e5] bg-[#4f46e5]'
                    : 'border-slate-400 dark:border-slate-600'
                }`}>
                  {selected === 'en' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
              
              {/* Hindi Option */}
              <button
                id="lang-hi-btn"
                type="button"
                onClick={() => setSelected('hi')}
                className={`p-4 rounded-2xl text-left border transition-all duration-300 flex items-center justify-between cursor-pointer focus:outline-none ${
                  selected === 'hi'
                    ? theme === 'dark'
                      ? 'bg-amber-950/15 border-amber-500 text-white shadow-md shadow-amber-500/10 font-bold scale-[1.01]'
                      : 'bg-amber-50/50 border-amber-500 text-slate-900 shadow-sm shadow-amber-100 font-bold scale-[1.01]'
                    : theme === 'dark'
                      ? 'bg-slate-950/30 border-slate-800 text-slate-400 hover:bg-slate-900/45 hover:text-slate-300'
                      : 'bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-slate-100/40 hover:text-slate-700'
                }`}
              >
                <div className="space-y-0.5">
                  <span className="text-sm font-black block">हिन्दी (Hindi)</span>
                  <span className={`text-[10px] font-bold block transition-colors duration-300 ${
                    selected === 'hi'
                      ? theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
                      : theme === 'dark' ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    देवनागरी लिपि और स्थानीय व्यापारिक शब्दावली
                  </span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                  selected === 'hi' 
                    ? 'border-amber-500 bg-amber-500'
                    : 'border-slate-400 dark:border-slate-600'
                }`}>
                  {selected === 'hi' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            </div>
          </div>

          {/* Continuance Trigger */}
          <div className="pt-2">
            <button
              id="proceed-setup-btn"
              type="button"
              onClick={handleProceed}
              className={`w-full font-black py-3.5 rounded-2xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-xs hover:-translate-y-0.5 cursor-pointer text-white focus:outline-none ${
                isHi
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-orange-500/10'
                  : 'bg-gradient-to-r from-[#4f46e5] to-indigo-650 shadow-indigo-600/10'
              }`}
            >
              <span className="font-sans font-black">
                {isHi ? 'दुकान सेटअप पर आगे बढ़ें' : 'Continue to Setup'}
              </span>
              <ChevronRight size={14} className="stroke-[3px]" />
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Footer Credits */}
      <footer className={`text-center text-[10px] pb-2 transition-colors duration-500 ${
        theme === 'dark' ? 'text-slate-600' : 'text-slate-450'
      }`}>
        Eazy Billing Client Core • v2.1.0 • Offline Ready
      </footer>
    </div>
  );
};
