import React, { useState } from 'react';
import { Shield, Users, ChevronRight, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Language } from '../../core/types/';
import { safeLocalStorage } from '../../core/utils/storage';

interface RoleSelectionScreenProps {
  onSelect: (role: 'admin' | 'staff') => void;
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
  onBack?: () => void;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({ 
  onSelect, 
  language,
  onLanguageChange,
  onBack
}) => {
  const { switchRole } = useAuth();
  const [selected, setSelected] = useState<'admin' | 'staff'>('admin');
  const isHi = language === 'hi';

  const handleProceed = () => {
    // Save to localStorage & AuthContext with try-catch for sandbox iframe protection
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

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#070b13] text-white p-4 overflow-y-auto animate-in fade-in duration-500 font-sans">
      {/* Background radial effects */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top action bar for Back/Language Toggle */}
      <div className="w-full max-w-sm flex items-center justify-between mb-4 px-1 relative z-10">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-white transition cursor-pointer bg-slate-950/60 hover:bg-slate-900/60 py-2 px-3.5 rounded-full border border-slate-800/80 shadow-md"
          >
            ← {isHi ? 'भाषा बदलें' : 'Change Language'}
          </button>
        ) : <div />}

        {onLanguageChange && (
          <button
            onClick={() => onLanguageChange(isHi ? 'en' : 'hi')}
            className="flex items-center gap-1.5 text-[11px] font-black text-indigo-400 hover:text-indigo-300 transition cursor-pointer bg-indigo-950/40 hover:bg-indigo-950/60 py-2 px-4 rounded-full border border-indigo-900/40 shadow-md uppercase tracking-wider font-sans animate-pulse"
          >
            🌐 {isHi ? 'English' : 'हिन्दी'}
          </button>
        )}
      </div>

      <div className="w-full max-w-sm bg-slate-900/85 border border-slate-800/80 p-5 sm:p-6 rounded-3xl shadow-2xl space-y-6 backdrop-blur-md relative z-10">
        {/* Header Section */}
        <div className="text-center">
          <div className="mx-auto bg-gradient-to-tr from-indigo-500 to-emerald-500 p-[1.5px] rounded-2xl w-14 h-14 flex items-center justify-center shadow-lg shadow-indigo-500/10 mb-4">
            <div className="w-full h-full bg-[#0a0f1d] rounded-2xl flex items-center justify-center">
              <Activity size={24} className="text-indigo-400" />
            </div>
          </div>
          <span className="text-[10px] bg-slate-800/85 text-emerald-400 font-black px-3.5 py-1 rounded-full uppercase tracking-widest border border-slate-700/60 shadow-sm inline-block">
            {isHi ? 'भूमिका परिभाषा सेटअप' : 'Setup Role Definition'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-3 text-white uppercase tracking-tight">
            {isHi ? 'अपनी ' : 'Select Your '}<span className="text-indigo-400">{isHi ? 'भूमिका चुनें' : 'Role'}</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed max-w-sm mx-auto">
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
            className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 cursor-pointer relative overflow-hidden ${
              selected === 'admin'
                ? 'bg-indigo-950/30 border-indigo-500/80 text-white shadow-xl shadow-indigo-500/10 scale-[1.01]'
                : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/40 hover:border-slate-700/80'
            }`}
          >
            {selected === 'admin' && (
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none translate-x-4 -translate-y-4"></div>
            )}
            <div className={`p-3.5 rounded-xl shrink-0 transition-colors ${
              selected === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-900 text-slate-500'
            }`}>
              <Shield size={22} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black font-sans uppercase tracking-wider">
                  {isHi ? 'बिज़नेस ओनर (मालिक)' : 'Business Owner'}
                </span>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                  selected === 'admin' ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
                }`}>
                  {selected === 'admin' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed font-sans mt-1">
                {isHi 
                  ? 'पूरा सिस्टम कंट्रोल, कंपनी बिलिंग सेटअप, सेटिंग्स डैशबोर्ड, अकाउंटिंग रिपोर्ट और स्टाफ मैनेजमेंट।' 
                  : 'Full-system control, company billing setup, settings dashboard, accounting reports, and staff registration managers.'}
              </p>
            </div>
          </button>

          {/* Staff Member Card (Emerald theme) */}
          <button
            onClick={() => setSelected('staff')}
            className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 cursor-pointer relative overflow-hidden ${
              selected === 'staff'
                ? 'bg-emerald-950/30 border-emerald-500/80 text-white shadow-xl shadow-emerald-500/10 scale-[1.01]'
                : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/40 hover:border-slate-700/80'
            }`}
          >
            {selected === 'staff' && (
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none translate-x-4 -translate-y-4"></div>
            )}
            <div className={`p-3.5 rounded-xl shrink-0 transition-colors ${
              selected === 'staff' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 text-slate-500'
            }`}>
              <Users size={22} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black font-sans uppercase tracking-wider">
                  {isHi ? 'स्टाफ सदस्य (ऑपरेटर)' : 'Staff Member'}
                </span>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                  selected === 'staff' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                }`}>
                  {selected === 'staff' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed font-sans mt-1">
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
            className={`w-full font-black py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs hover:-translate-y-0.5 cursor-pointer text-white ${
              selected === 'admin' 
                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20' 
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
            }`}
          >
            {isHi ? 'सेटअप जारी रखें' : 'Continue Setup'}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
