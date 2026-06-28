import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Loader2, ArrowRight, LogOut, RefreshCw, Key, Store } from 'lucide-react';

export const JoinStoreScreen: React.FC = () => {
  const { joinStoreByCode, switchRole, logout } = useAuth();
  const [storeCode, setStoreCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    const cleanCode = storeCode.trim();
    if (cleanCode.length !== 6 || isNaN(Number(cleanCode))) {
      setErrorMsg('कृपया 6-अंकीय वैध न्यूमेरिक कोड दर्ज करें।');
      return;
    }

    setIsLoading(true);
    try {
      const res = await joinStoreByCode(cleanCode);
      if (res.success) {
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'सिस्टम कनेक्टिविटी समस्या। कृपया पुनः प्रयास करें।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToAdmin = () => {
    // Escape hatch: switch back to admin
    switchRole('admin');
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col justify-between p-6 md:p-12 relative overflow-hidden font-sans">
      {/* Dynamic background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10"></div>

      {/* Header bar */}
      <div className="flex justify-between items-center w-full max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <Store size={22} />
          </div>
          <span className="font-bold font-sans tracking-tight text-white uppercase text-base">EAZY BILLING</span>
        </div>
        <button 
          onClick={logout}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all duration-200"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-full bg-indigo-600/10 text-indigo-400 mb-4 border border-indigo-500/20">
            <Key size={36} className="animate-pulse" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">स्टोर से जुड़ें (Join Store)</h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
            अपने स्टोर व्यवस्थापक (Admin) द्वारा प्रदान किया गया 6-अंकीय स्टोर कोड दर्ज करें।
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 tracking-wider uppercase block">स्टोर का गुप्त कोड (Store Code)</label>
            <div className="relative">
              <input 
                type="text"
                maxLength={6}
                value={storeCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setStoreCode(val);
                }}
                disabled={isLoading}
                placeholder="000000"
                className="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 bg-slate-950/80 border-2 border-slate-800 focus:border-indigo-500 hover:border-slate-700 text-white rounded-2xl select-all outline-none transition-all placeholder:text-slate-700"
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-normal text-center">
              उदाहरण: 483729 (केवल नंबर डालें)
            </p>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-center text-red-200 text-xs font-medium animate-in fade-in zoom-in duration-200">
              ❌ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-emerald-200 text-xs font-medium flex flex-col items-center gap-1.5 animate-in fade-in zoom-in duration-200">
              <ShieldCheck size={28} className="text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action button */}
          <button 
            type="submit"
            disabled={isLoading || storeCode.length !== 6 || !!successMsg}
            className="w-full py-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/10"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                स्टोर सत्यापित किया जा रहा है...
              </>
            ) : (
              <>
                लिंक करें (Join Store)
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer / Alternate switch option */}
      <div className="w-full max-w-md mx-auto text-center mt-6">
        <button 
          onClick={handleSwitchToAdmin}
          disabled={isLoading}
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 border-b border-indigo-400/20 hover:border-indigo-300 transition-colors pb-0.5"
        >
          एडमिन के रूप में उपयोग करें (Use as Admin)
        </button>
      </div>
    </div>
  );
};
