import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ShieldCheck, Loader2, ArrowRight, LogOut, Key, Store } from 'lucide-react';

interface JoinStoreScreenProps {
  onSuccess?: () => void;
  onBack?: () => void;
  currentLanguage?: 'en' | 'hi';
}

export const JoinStoreScreen: React.FC<JoinStoreScreenProps> = ({ onSuccess, onBack, currentLanguage }) => {
  const { joinStoreByCode, switchRole, logout } = useAuth();
  const [storeCode, setStoreCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Language Check: Respect parent prop or check app state language stored in localStorage
  const activeLang = currentLanguage || (localStorage.getItem('appLanguage') as 'en' | 'hi') || 'en';
  const isHi = activeLang === 'hi';

  const t = {
    joinStore: isHi ? 'स्टोर से जुड़ें' : 'Join Store',
    subTitle: isHi 
      ? 'स्टोर एडमिन द्वारा प्रदान किया गया कोड, यूजरनेम और पासवर्ड दर्ज करें।' 
      : 'Enter the code, username, and password provided by your store Administrator.',
    storeCodeLabel: isHi ? 'स्टोर का गुप्त कोड (Store Code)' : 'Store Code',
    usernameLabel: isHi ? 'स्टाफ मोबाइल नंबर / यूजरनेम (Username)' : 'Staff Username / Mobile',
    passwordLabel: isHi ? 'पासवर्ड (Password)' : 'Password',
    loginStoreBtn: isHi ? 'लॉग-इन करें' : 'Login Store',
    useAsAdmin: isHi ? 'एडमिन के रूप में उपयोग करें' : 'Use as Admin',
    logout: isHi ? 'लॉगआउट' : 'Logout',
    verifying: isHi ? 'स्टाफ सत्यापन किया जा रहा है...' : 'Verifying staff...',
    errorInvalidCode: isHi ? 'कृपया 6-अंकीय वैध स्टोर कोड दर्ज करें।' : 'Please enter a valid 6-digit store code.',
    errorUsernameRequired: isHi ? 'कृपया मोबाइल नंबर / यूजरनेम दर्ज करें।' : 'Please enter active username / mobile number.',
    errorPasswordRequired: isHi ? 'कृपया पासवर्ड दर्ज करें।' : 'Please enter password.',
    errorConnectivity: isHi ? 'सिस्टम कनेक्टिविटी समस्या। कृपया पुनः प्रयास करें।' : 'System connectivity issue. Please try again.',
    demoBadge: isHi ? 'डेमो क्रेडेंशियल भरें' : 'Autofill Demo Credentials',
    demoSub: isHi 
      ? 'त्वरित परीक्षण के लिए सैंपल स्टाफ जानकारी दर्ज करने के लिए यहां क्लिक करें' 
      : 'Click to quickly populate pre-configured sample staff login credentials',
  };

  const handleAutofillDemo = () => {
    setStoreCode('123456');
    setUsername('sample_staff');
    setPassword('password123');
    setErrorMsg('');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    const cleanCode = storeCode.trim();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (cleanCode.length !== 6 || isNaN(Number(cleanCode))) {
      setErrorMsg(t.errorInvalidCode);
      return;
    }

    if (!cleanUser) {
      setErrorMsg(t.errorUsernameRequired);
      return;
    }

    if (!cleanPass) {
      setErrorMsg(t.errorPasswordRequired);
      return;
    }

    setIsLoading(true);
    try {
      const res = await joinStoreByCode(cleanCode, cleanUser, cleanPass);
      if (res.success) {
        setSuccessMsg(res.message);
        localStorage.setItem('app_initialized', 'true');
        localStorage.setItem('onboardingCompleted', 'true');
        
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            window.location.reload();
          }
        }, 1500);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || t.errorConnectivity);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToAdmin = () => {
    // Escape hatch: switch back to admin
    localStorage.removeItem('locked_role');
    localStorage.removeItem('onboarding_role_selected');
    switchRole('admin');
    if (onBack) {
      onBack();
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-between p-6 md:p-12 relative overflow-hidden font-sans transition-colors duration-200">
      {/* Dynamic background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl -z-10"></div>

      {/* Header bar */}
      <div className="flex justify-between items-center w-full max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Store size={22} />
          </div>
          <span className="font-bold font-sans tracking-tight text-slate-900 dark:text-white uppercase text-base">EAZY BILLING</span>
        </div>
        <button 
          onClick={logout}
          className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-250 dark:border-slate-800 transition-all duration-200 cursor-pointer"
        >
          <LogOut size={14} />
          {t.logout}
        </button>
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div className="bg-white dark:bg-slate-900/65 border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8 rounded-3xl shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-md">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mb-2 border border-indigo-100/50 dark:border-indigo-500/20 ring-4 ring-indigo-500/5 dark:ring-indigo-400/5">
              <Key size={30} className="animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-1.5 font-sans">
              {t.joinStore}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              {t.subTitle}
            </p>
          </div>

          {/* Quick Demo Autofill Banner */}
          <div 
            onClick={handleAutofillDemo}
            className="mb-5 p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-dashed border-indigo-200/60 dark:border-indigo-500/30 hover:bg-indigo-55/65 dark:hover:bg-indigo-950/30 transition-all duration-200 cursor-pointer group text-left"
          >
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400 mt-0.5 group-hover:scale-105 transition-transform duration-200">
                <Store size={14} />
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                    {t.demoBadge}
                  </span>
                  <span className="text-[9.5px] font-sans py-0.5 px-1.5 bg-indigo-500/10 dark:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 rounded-md font-bold select-none">
                    TRY DEMO
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mb-1.5">
                  {t.demoSub}
                </p>
                <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 flex flex-wrap gap-x-2.5 gap-y-1 bg-slate-50 dark:bg-slate-950/50 p-1.5 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
                  <span>Code: <strong className="text-indigo-650 dark:text-indigo-300 font-bold">123456</strong></span>
                  <span>User: <strong className="text-indigo-650 dark:text-indigo-300 font-bold">sample_staff</strong></span>
                  <span>Pass: <strong className="text-indigo-650 dark:text-indigo-300 font-bold">password123</strong></span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase block">
                {t.storeCodeLabel}
              </label>
              <input 
                type="text"
                maxLength={6}
                value={storeCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setStoreCode(val);
                }}
                disabled={isLoading}
                placeholder="••••••"
                className="w-full text-center text-xl font-mono tracking-[0.3em] py-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-850 focus:border-indigo-500 dark:focus:border-indigo-500 hover:border-slate-350 dark:hover:border-slate-700 text-slate-900 dark:text-white rounded-xl select-all outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 placeholder:font-sans placeholder:tracking-[0.1em]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase block">
                {t.usernameLabel}
              </label>
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                placeholder={isHi ? "उदा. 9876543210" : "e.g. 9876543210"}
                className="w-full text-center text-sm font-sans py-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-850 focus:border-indigo-500 dark:focus:border-indigo-500 hover:border-slate-350 dark:hover:border-slate-700 text-slate-900 dark:text-white rounded-xl outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase block">
                {t.passwordLabel}
              </label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="••••••••"
                className="w-full text-center text-sm font-semibold tracking-wider py-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-850 focus:border-indigo-500 dark:focus:border-indigo-500 hover:border-slate-350 dark:hover:border-slate-700 text-slate-900 dark:text-white rounded-xl outline-none transition-all placeholder:text-slate-450 dark:placeholder:text-slate-650 placeholder:font-sans placeholder:tracking-[0.1em]"
              />
            </div>

            {/* Feedback messages */}
            {errorMsg && (
              <div className="p-3 bg-red-550/10 border border-red-500/20 rounded-xl text-center text-red-650 dark:text-red-200 text-xs font-semibold animate-in fade-in zoom-in duration-200">
                ❌ {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-550/10 border border-emerald-500/20 rounded-xl text-center text-emerald-650 dark:text-emerald-200 text-xs font-semibold flex flex-col items-center gap-1 animate-in fade-in zoom-in duration-200">
                <ShieldCheck size={24} className="text-emerald-500 dark:text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Action button */}
            <button 
              type="submit"
              disabled={isLoading || storeCode.length !== 6 || !username || !password || !!successMsg}
              className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-550 active:bg-indigo-750 shadow-indigo-600/10 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t.verifying}
                </>
              ) : (
                <>
                  {t.loginStoreBtn}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer / Alternate switch option */}
      <div className="w-full max-w-md mx-auto text-center mt-6">
        <button 
          onClick={handleSwitchToAdmin}
          disabled={isLoading}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 border-b border-indigo-500/20 hover:border-indigo-550 dark:hover:border-indigo-300 transition-colors pb-0.5 cursor-pointer"
        >
          {t.useAsAdmin}
        </button>
      </div>
    </div>
  );
};
