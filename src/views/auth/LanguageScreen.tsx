import React, { useState, useEffect } from 'react';
import { Languages, ChevronRight, ShieldCheck, Sun, Moon } from 'lucide-react';
import { Language } from '../../core/types/';
import { Theme } from '../../App';
import { safeLocalStorage, safeSessionStorage } from '../../core/utils/storage';

interface LanguageScreenProps {
  onSelect: (lang: Language) => void;
  currentLanguage?: Language;
  currentTheme?: Theme;
  onThemeChange?: (theme: Theme) => void;
}

export const LanguageScreen: React.FC<LanguageScreenProps> = ({ 
  onSelect, 
  currentLanguage, 
  currentTheme = 'system', 
  onThemeChange 
}) => {
  // Internal state using safe storage helpers
  const [selected, setSelected] = useState<Language>(() => {
    return (currentLanguage || (safeLocalStorage.getItem('appLanguage') as Language) || 'en');
  });

  // Calculate active dark state based on system or explicit theme props
  const [isDark, setIsDark] = useState(() => {
    if (currentTheme === 'dark') return true;
    if (currentTheme === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Keep dark state in sync with changes to currentTheme
  useEffect(() => {
    if (currentTheme === 'dark') {
      setIsDark(true);
    } else if (currentTheme === 'light') {
      setIsDark(false);
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, [currentTheme]);

  // Listen to system prefers-color-scheme changes if theme is set to 'system'
  useEffect(() => {
    if (currentTheme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [currentTheme]);

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    if (onThemeChange) {
      onThemeChange(nextTheme);
    }
  };

  const handleProceed = () => {
    console.log("Language proceed trigger with:", selected);
    safeLocalStorage.setItem('appLanguage', selected);
    safeSessionStorage.setItem('language_selected', 'true');
    try {
      onSelect(selected);
    } catch (err) {
      console.error("onSelect callback parent execution failed:", err);
    }
  };

  const isHi = selected === 'hi';

  // Theme variable configurations synced exactly with the premium SplashScreen layout
  const canvasStyle = {
    background: isDark 
      ? 'linear-gradient(to bottom, #020617 0%, #0f172a 70%, #1e1b4b 100%)' // Cosmic gradient matching Splash Screen
      : 'linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 100%)',
    color: isDark ? '#F1F5F9' : '#0F172A'
  };

  const cardStyle = {
    backgroundColor: isDark ? 'rgba(9, 13, 22, 0.75)' : '#FFFFFF',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2E8F0',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)'
  };

  const headerBtnStyle = {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    color: isDark ? '#F59E0B' : '#4F46E5'
  };

  const subBadgeStyle = {
    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#FFFFFF',
    borderColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#E2E8F0',
    color: isDark ? '#818cf8' : '#4F46E5'
  };

  const optionEnStyle = {
    backgroundColor: selected === 'en' 
      ? (isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.05)') 
      : (isDark ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC'),
    borderColor: selected === 'en' ? '#6366F1' : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2E8F0'),
    color: isDark ? '#F1F5F9' : '#0F172A'
  };

  const optionHiStyle = {
    backgroundColor: selected === 'hi' 
      ? (isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.05)') 
      : (isDark ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC'),
    borderColor: selected === 'hi' ? '#F59E0B' : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2E8F0'),
    color: isDark ? '#F1F5F9' : '#0F172A'
  };

  const textSecondaryStyle = {
    color: isDark ? '#94A3B8' : '#475569'
  };

  const brandColor = isHi ? '#F59E0B' : '#6366F1';

  return (
    <div 
      style={canvasStyle}
      className="relative h-screen w-full flex flex-col justify-between p-5 md:p-8 overflow-hidden select-none font-sans transition-colors duration-200"
    >
      {/* Background glowing particles/radial pattern (matching splash) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', 
          backgroundSize: '16px 16px' 
        }} 
      />

      {/* Top Floating Action Bar with Theme Toggle */}
      <header className="w-full max-w-md mx-auto flex items-center justify-end z-10 shrink-0">
        <button
          id="lang-theme-toggle-btn"
          type="button"
          onClick={toggleTheme}
          style={headerBtnStyle}
          className="p-3 rounded-2xl border transition-all duration-300 flex items-center justify-center cursor-pointer shadow-3xs active:scale-95 hover:scale-105 min-w-[44px] min-h-[44px]"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={18} className="stroke-[2.5px]" /> : <Moon size={18} className="stroke-[2.5px]" />}
        </button>
      </header>

      {/* Centered Scrollable Core Form Container */}
      <div className="flex-1 w-full flex items-center justify-center overflow-y-auto my-3 py-2 z-10 scrollbar-none">
        <main className="w-full max-w-md">
          <div 
            style={cardStyle}
            className="w-full border p-6 sm:p-8 rounded-[2rem] transition-all duration-500 space-y-6 shadow-2xl"
          >
            {/* Branding Header Area */}
            <div className="text-center space-y-4">
              <div 
                className="mx-auto p-4 rounded-2xl w-14 h-14 flex items-center justify-center shadow-md transition-all duration-550 text-white"
                style={{
                  background: isHi
                    ? 'linear-gradient(to top right, #F59E0B, #F97316)'
                    : 'linear-gradient(to top right, #6366F1, #4F46E5)'
                }}
              >
                <ShieldCheck size={28} className="stroke-[2.5px] animate-pulse" />
              </div>

              <div className="pt-1">
                <span 
                  style={subBadgeStyle}
                  className="inline-block text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border transition-all duration-550 shadow-4xs"
                >
                  {isHi ? '🛡️ 100% सुरक्षित ऑफलाइन खाता' : '🛡️ 100% Offline Secured'}
                </span>
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase font-sans">
                  {isHi ? 'ईज़ी बिलिंग ' : 'Eazy Billing '} 
                  <span style={{ color: brandColor }} className="transition-colors duration-550 font-black">
                    v2.0
                  </span>
                </h1>
                <p 
                  style={textSecondaryStyle}
                  className="text-[10px] uppercase tracking-widest font-bold transition-colors duration-500"
                >
                  {isHi ? 'देवनागरी और रोमन दोनों लेआउट उपलब्ध' : 'Devanagari & Roman Layouts Embedded'}
                </p>
              </div>
            </div>

            {/* Language Buttons Container */}
            <div className="space-y-4 pt-1">
              <div 
                className="flex items-center gap-2 mb-1 pb-3 border-b transition-colors duration-500"
                style={{ borderColor: isHi ? 'rgba(245, 158, 11, 0.15)' : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2E8F0') }}
              >
                <Languages size={15} className="stroke-[2.5px]" style={{ color: brandColor }} />
                <span 
                  className="font-black text-xs tracking-wider uppercase font-sans"
                  style={{ color: brandColor }}
                >
                  {isHi ? 'भाषा चुनें / Select Language' : 'Select App Language / भाषा चुनें'}
                </span>
              </div>
              
              <p 
                style={textSecondaryStyle}
                className="text-[11px] leading-relaxed transition-colors duration-500 font-bold"
              >
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
                  style={optionEnStyle}
                  className={`p-4 rounded-2xl text-left border transition-all duration-300 flex items-center justify-between cursor-pointer focus:outline-none min-h-[44px] ${
                    selected === 'en' ? 'font-bold scale-[1.01] shadow-xs' : 'hover:scale-[1.005]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-sm font-black block">English</span>
                    <span 
                      className="text-[10px] font-semibold block transition-colors duration-300"
                      style={{ color: selected === 'en' ? '#6366F1' : (isDark ? '#64748B' : '#64748B') }}
                    >
                      Roman layout for general trade and invoices
                    </span>
                  </div>
                  <div 
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0"
                    style={{ borderColor: selected === 'en' ? '#6366F1' : '#94A3B8' }}
                  >
                    {selected === 'en' && <div className="w-2.5 h-2.5 rounded-full bg-white" style={{ backgroundColor: '#6366F1' }} />}
                  </div>
                </button>
                
                {/* Hindi Option */}
                <button
                  id="lang-hi-btn"
                  type="button"
                  onClick={() => setSelected('hi')}
                  style={optionHiStyle}
                  className={`p-4 rounded-2xl text-left border transition-all duration-300 flex items-center justify-between cursor-pointer focus:outline-none min-h-[44px] ${
                    selected === 'hi' ? 'font-bold scale-[1.01] shadow-xs' : 'hover:scale-[1.005]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-sm font-black block">हिन्दी (Hindi)</span>
                    <span 
                      className="text-[10px] font-semibold block transition-colors duration-300"
                      style={{ color: selected === 'hi' ? '#F59E0B' : (isDark ? '#64748B' : '#64748B') }}
                    >
                      देवनागरी लिपि और स्थानीय व्यापारिक शब्दावली
                    </span>
                  </div>
                  <div 
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0"
                    style={{ borderColor: selected === 'hi' ? '#F59E0B' : '#94A3B8' }}
                  >
                    {selected === 'hi' && <div className="w-2.5 h-2.5 rounded-full bg-white" style={{ backgroundColor: '#F59E0B' }} />}
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
                className="w-full font-black py-3.5 rounded-2xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-xs hover:-translate-y-0.5 cursor-pointer text-white focus:outline-none min-h-[44px]"
                style={{
                  background: isHi
                    ? 'linear-gradient(to right, #F59E0B, #F97316)'
                    : 'linear-gradient(to right, #6366F1, #4F46E5)',
                  boxShadow: isHi
                    ? '0 4px 12px rgba(245, 158, 11, 0.2)'
                    : '0 4px 12px rgba(99, 102, 241, 0.2)'
                }}
              >
                <span className="font-sans font-black">
                  {isHi ? 'दुकान सेटअप पर आगे बढ़ें' : 'Continue to Setup'}
                </span>
                <ChevronRight size={14} className="stroke-[3px]" />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Bottom Footer Credits */}
      <footer 
        style={textSecondaryStyle}
        className="text-center text-[10px] pb-2 transition-colors duration-500 shrink-0 w-full max-w-md mx-auto"
      >
        Eazy Billing Client Core • v2.1.0 • Offline Ready
      </footer>
    </div>
  );
};
