import React, { useState, useEffect } from 'react';
import { Shield, Users, ChevronRight, Activity, Sun, Moon, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Language } from '../../../core/types/';
import { Theme } from '../../../App';
import { safeLocalStorage } from '../../../core/utils/storage';

interface RoleSelectionScreenProps {
  onSelect: (role: 'admin' | 'staff') => void;
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
  onBack?: () => void;
  currentTheme?: Theme;
  onThemeChange?: (theme: Theme) => void;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({ 
  onSelect, 
  language,
  onLanguageChange,
  onBack,
  currentTheme = 'system',
  onThemeChange
}) => {
  const { switchRole } = useAuth();
  const [selected, setSelected] = useState<'admin' | 'staff'>('admin');
  const isHi = language === 'hi';

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
    try {
      safeLocalStorage.setItem('locked_role', selected);
      safeLocalStorage.setItem('onboarding_role_selected', 'true');
    } catch (err) {
      console.warn("Storage write protected during role selection:", err);
    }
    
    try {
      switchRole(selected);
    } catch (err) {
      console.error("switchRole failed:", err);
    }
    
    onSelect(selected);
  };

  // Inline styling synced with SplashScreen
  const canvasStyle = {
    background: isDark 
      ? 'linear-gradient(to bottom, var(--bg-app) 0%, #020617 100%)'
      : 'linear-gradient(to bottom, var(--bg-app) 0%, #EFEBE4 100%)',
    color: 'var(--text-main)'
  };

  const cardStyle = {
    backgroundColor: 'var(--bg-card)',
    borderColor: 'var(--border-ui)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)'
  };

  const headerBtnStyle = {
    backgroundColor: 'var(--bg-card)',
    borderColor: 'var(--border-ui)',
    color: isDark ? '#F59E0B' : 'var(--brand-primary)'
  };

  const subBadgeStyle = {
    backgroundColor: 'var(--brand-light)',
    borderColor: 'var(--border-ui)',
    color: isDark ? '#818cf8' : 'var(--brand-primary)'
  };

  const optionAdminStyle = {
    backgroundColor: selected === 'admin' 
      ? 'var(--brand-light)' 
      : 'var(--bg-card)',
    borderColor: selected === 'admin' ? 'var(--brand-primary)' : 'var(--border-ui)',
    color: 'var(--text-main)'
  };

  const optionStaffStyle = {
    backgroundColor: selected === 'staff' 
      ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.05)') 
      : 'var(--bg-card)',
    borderColor: selected === 'staff' ? '#10B981' : 'var(--border-ui)',
    color: 'var(--text-main)'
  };

  const textSecondaryStyle = {
    color: 'var(--text-secondary)'
  };

  const brandColor = selected === 'admin' ? '#6366F1' : '#10B981';

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

      {/* Top action bar for Back/Language Toggle/Theme Toggle */}
      <div className="w-full max-w-sm mx-auto flex items-center justify-between z-10 shrink-0">
        {onBack ? (
          <button
            onClick={onBack}
            style={headerBtnStyle}
            className="flex items-center gap-1.5 text-[11px] font-bold py-2 px-3.5 rounded-full border shadow-3xs cursor-pointer active:scale-95 hover:scale-105 min-h-[44px]"
          >
            <ArrowLeft size={14} /> {isHi ? 'भाषा बदलें' : 'Language'}
          </button>
        ) : <div />}

        <div className="flex gap-2 items-center">
          {onLanguageChange && (
            <button
              onClick={() => onLanguageChange(isHi ? 'en' : 'hi')}
              style={headerBtnStyle}
              className="flex items-center gap-1.5 text-[11px] font-black py-2 px-4 rounded-full border shadow-3xs cursor-pointer active:scale-95 hover:scale-105 min-h-[44px] uppercase tracking-wider font-sans"
            >
              🌐 {isHi ? 'English' : 'हिन्दी'}
            </button>
          )}

          <button
            id="role-theme-toggle-btn"
            type="button"
            onClick={toggleTheme}
            style={headerBtnStyle}
            className="p-3 rounded-full border transition-all duration-300 flex items-center justify-center cursor-pointer shadow-3xs active:scale-95 hover:scale-105 min-w-[44px] min-h-[44px]"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} className="stroke-[2.5px]" /> : <Moon size={18} className="stroke-[2.5px]" />}
          </button>
        </div>
      </div>

      {/* Centered Scrollable Core Form Container */}
      <div className="flex-1 w-full flex items-center justify-center overflow-y-auto my-3 py-2 z-10 scrollbar-none">
        <main className="w-full max-w-sm">
          <div 
            style={cardStyle}
            className="w-full border p-5 sm:p-6 rounded-[2rem] transition-all duration-500 space-y-6 shadow-2xl"
          >
            {/* Header Section */}
            <div className="text-center">
              <div 
                className="mx-auto p-[1.5px] rounded-2xl w-14 h-14 flex items-center justify-center shadow-lg mb-4 text-white"
                style={{
                  background: selected === 'admin'
                    ? 'linear-gradient(to top right, #6366F1, #4F46E5)'
                    : 'linear-gradient(to top right, #10B981, #059669)'
                }}
              >
                <div className="w-full h-full bg-[#0a0f1d] dark:bg-[#0a0f1d] rounded-2xl flex items-center justify-center">
                  <Activity size={24} style={{ color: brandColor }} />
                </div>
              </div>
              
              <div className="mb-1">
                <span 
                  style={subBadgeStyle}
                  className="text-[9px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest border shadow-4xs inline-block"
                >
                  {isHi ? 'भूमिका परिभाषा सेटअप' : 'Setup Role Definition'}
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-black mt-3 uppercase tracking-tight">
                {isHi ? 'अपनी ' : 'Select Your '}<span style={{ color: brandColor }}>{isHi ? 'भूमिका चुनें' : 'Role'}</span>
              </h1>
              <p 
                style={textSecondaryStyle}
                className="text-xs mt-1.5 leading-relaxed max-w-sm mx-auto font-semibold"
              >
                {isHi 
                  ? 'मेन्यू और सिस्टम सीमाओं को कस्टमाइज़ करने के लिए अपनी लॉगिन प्रोफ़ाइल चुनें।' 
                  : 'Choose your login partition profile to customize menus, system tools, and limits.'}
              </p>
            </div>

            {/* Large Interactive Cards */}
            <div className="space-y-4 pt-1">
              {/* Business Owner Card (Indigo theme) */}
              <button
                onClick={() => setSelected('admin')}
                style={optionAdminStyle}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-start gap-4 cursor-pointer relative overflow-hidden ${
                  selected === 'admin' ? 'font-bold scale-[1.01] shadow-xs' : 'hover:scale-[1.005]'
                }`}
              >
                <div className={`p-3.5 rounded-xl shrink-0 transition-colors ${
                  selected === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : (isDark ? 'bg-slate-900 text-slate-500' : 'bg-slate-100 text-slate-400')
                }`}>
                  <Shield size={22} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black font-sans uppercase tracking-wider">
                      {isHi ? 'बिज़नेस ओनर (मालिक)' : 'Business Owner'}
                    </span>
                    <div 
                      className="w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all shrink-0"
                      style={{ borderColor: selected === 'admin' ? '#6366F1' : '#94A3B8' }}
                    >
                      {selected === 'admin' && <div className="w-2 h-2 rounded-full bg-white" style={{ backgroundColor: '#6366F1' }} />}
                    </div>
                  </div>
                  <p 
                    style={textSecondaryStyle}
                    className="text-[10px] font-medium leading-relaxed font-sans mt-1"
                  >
                    {isHi 
                      ? 'पूरा सिस्टम कंट्रोल, कंपनी बिलिंग सेटअप, सेटिंग्स डैशबोर्ड, अकाउंटिंग रिपोर्ट और स्टाफ मैनेजमेंट।' 
                      : 'Full-system control, company billing setup, settings dashboard, accounting reports, and staff registration managers.'}
                  </p>
                </div>
              </button>

              {/* Staff Member Card (Emerald theme) */}
              <button
                onClick={() => setSelected('staff')}
                style={optionStaffStyle}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-start gap-4 cursor-pointer relative overflow-hidden ${
                  selected === 'staff' ? 'font-bold scale-[1.01] shadow-xs' : 'hover:scale-[1.005]'
                }`}
              >
                <div className={`p-3.5 rounded-xl shrink-0 transition-colors ${
                  selected === 'staff' ? 'bg-emerald-500/20 text-emerald-450' : (isDark ? 'bg-slate-900 text-slate-500' : 'bg-slate-100 text-slate-400')
                }`}>
                  <Users size={22} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black font-sans uppercase tracking-wider">
                      {isHi ? 'स्टाफ सदस्य (ऑपरेटर)' : 'Staff Member'}
                    </span>
                    <div 
                      className="w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all shrink-0"
                      style={{ borderColor: selected === 'staff' ? '#10B981' : '#94A3B8' }}
                    >
                      {selected === 'staff' && <div className="w-2 h-2 rounded-full bg-white" style={{ backgroundColor: '#10B981' }} />}
                    </div>
                  </div>
                  <p 
                    style={textSecondaryStyle}
                    className="text-[10px] font-medium leading-relaxed font-sans mt-1"
                  >
                    {isHi 
                      ? 'मौजूदा बिज़नेस से जुड़ें, लेन-देन रिकॉर्ड करें, और आवंटित ऑपरेटर्स सीमाओं के तहत बिलिंग करें।' 
                      : 'Join an existing business, record transactions, manage sales bills under assigned operator limits with live syncing.'}
                  </p>
                </div>
              </button>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                onClick={handleProceed}
                className="w-full font-black py-3.5 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs hover:-translate-y-0.5 cursor-pointer text-white focus:outline-none min-h-[44px]"
                style={{
                  background: selected === 'admin' 
                    ? 'linear-gradient(to right, #4F46E5, #4338CA)' 
                    : 'linear-gradient(to right, #10B981, #059669)',
                  boxShadow: selected === 'admin'
                    ? '0 4px 12px rgba(79, 70, 229, 0.2)'
                    : '0 4px 12px rgba(16, 185, 129, 0.2)'
                }}
              >
                {isHi ? 'सेटअप जारी रखें' : 'Continue Setup'}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Bottom Footer Credits */}
      <footer 
        style={textSecondaryStyle}
        className="text-center text-[10px] pb-2 transition-colors duration-500 shrink-0 w-full max-w-sm mx-auto"
      >
        Eazy Billing Client Core • v2.1.0 • Offline Ready
      </footer>
    </div>
  );
};
