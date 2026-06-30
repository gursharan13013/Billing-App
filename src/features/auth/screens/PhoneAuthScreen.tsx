import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { auth, db } from '../../../services/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, signInAnonymously } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { billingService } from '../../../services/billingService';
import { pullFromCloud, setCloudSyncToggle } from '../../../infrastructure/SyncEngine';
import { Phone, Lock, Loader2, ArrowRight, ArrowLeft, ShieldCheck, Sparkles, Sun, Moon } from 'lucide-react';
import { Theme } from '../../../App';
import { Language } from '../../../core/types';
import { safeLocalStorage } from '../../../core/utils/storage';
import { motion, AnimatePresence } from 'motion/react';

interface PhoneAuthScreenProps {
  onSuccess: (isNewUser: boolean, phone: string) => void;
  onBack: () => void;
  currentTheme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  currentLanguage?: Language;
  onLanguageChange?: (lang: Language) => void;
}

export const PhoneAuthScreen: React.FC<PhoneAuthScreenProps> = ({
  onSuccess,
  onBack,
  currentTheme = 'system',
  onThemeChange,
  currentLanguage = 'en',
  onLanguageChange
}) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [timer, setTimer] = useState(60);
  
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const recaptchaVerifierRef = useRef<any>(null);

  const isHi = currentLanguage === 'hi';
  const [isDark, setIsDark] = useState(() => {
    if (currentTheme === 'dark') return true;
    if (currentTheme === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (currentTheme === 'dark') setIsDark(true);
    else if (currentTheme === 'light') setIsDark(false);
    else setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, [currentTheme]);

  // Timer countdown for Resend OTP
  useEffect(() => {
    if (step !== 'otp' || timer === 0) return;
    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timer]);

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    if (onThemeChange) {
      onThemeChange(nextTheme);
    }
  };

  // Helper to get bilingual text
  const t = {
    title: isHi ? 'मालिक सत्यापन' : 'Owner Verification',
    subPhone: isHi ? 'क्लाउड बैकअप को लिंक करने के लिए अपना 10-अंकीय मोबाइल नंबर सत्यापित करें।' : 'Verify your 10-digit mobile number to link cloud ledger tables.',
    subOtp: isHi ? 'हमने आपके नंबर पर 6-अंकों का सत्यापन कोड भेजा है।' : 'We have dispatched a 6-digit confirmation key to your device.',
    phoneLabel: isHi ? 'मोबाइल नंबर (Mobile Number)' : 'Mobile Number',
    otpLabel: isHi ? 'ओटीपी कोड (Verification Code)' : 'OTP Code',
    sendOtp: isHi ? 'ओटीपी भेजें' : 'Send OTP',
    verifyBtn: isHi ? 'सत्यापित करें' : 'Verify & Proceed',
    back: isHi ? 'पीछे' : 'Back',
    resend: isHi ? 'पुनः भेजें' : 'Resend',
    invalidPhone: isHi ? 'कृपया एक वैध 10-अंकीय मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.',
    invalidOtp: isHi ? 'कृपया 6-अंकीय सत्यापन कोड दर्ज करें।' : 'Please enter 6-digit verification code.',
    otpError: isHi ? 'सत्यापन विफल। अमान्य कोड।' : 'Authentication failed. Invalid code.',
    sandboxNotice: isHi ? 'डेमो सैंडबॉक्स एक्टिव: ओटीपी 123456 दर्ज करें' : 'Demo Sandbox Active: Enter OTP 123456',
  };

  // Setup invisible recaptcha verifier
  const initRecaptcha = () => {
    if (recaptchaVerifierRef.current) return;
    try {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        }
      });
    } catch (e) {
      console.warn("reCAPTCHA failed to initialize:", e);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanPhone = phone.trim().replace(/\D/g, '');

    if (cleanPhone.length !== 10) {
      setErrorMsg(t.invalidPhone);
      return;
    }

    setLoading(true);

    // Bypassing reCAPTCHA and network calls completely for local testing
    setTimeout(() => {
      setStep('otp');
      setTimer(60);
      setLoading(false);
      setSuccessMsg(t.sandboxNotice);
    }, 600);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const cleanOtp = otp.trim().replace(/\D/g, '');

    if (cleanOtp.length !== 6) {
      setErrorMsg(t.invalidOtp);
      return;
    }

    setLoading(true);

    try {
      let firebaseUser: any = null;

      // Validate using sandbox code 123456
      if (cleanOtp !== '123456') {
        throw new Error("Invalid verification code");
      }

      // Sign in anonymously to link auth parameters
      const anonResult = await signInAnonymously(auth);
      firebaseUser = anonResult.user;

      if (!firebaseUser) {
        throw new Error("Failed to authenticate user");
      }

      let localProfileData = null;
      try {
        localProfileData = await billingService.getCompanyProfile();
      } catch (e) {}

      // Verify if returning profile exists on Firestore or local db when offline
      let isNewUser = true;
      let profileDoc = null;

      if (navigator.onLine) {
        const profileRef = doc(db, 'company_profile', cleanPhone);
        try {
          profileDoc = await getDoc(profileRef);
          if (profileDoc && profileDoc.exists()) {
            isNewUser = false;
          }
        } catch (err) {
          console.warn("Could not query Firestore profile:", err);
        }
      } else {
        // Offline: Check if local DB profile matches the logged in phone number
        if (localProfileData && localProfileData.mobile && localProfileData.mobile.replace(/\D/g, '') === cleanPhone) {
          isNewUser = false;
        }
      }

      // Lock Auth context business parameters
      const lockedUid = firebaseUser.uid;
      safeLocalStorage.setItem('businessId_locked', 'true');
      safeLocalStorage.setItem('locked_businessId', lockedUid);
      safeLocalStorage.setItem('locked_role', 'admin');

      if (!isNewUser && profileDoc && navigator.onLine) {
        const cloudProfile = profileDoc.data();
        
        // Recover profile to local database
        const localProfile = {
          name: cloudProfile?.name || '',
          address: cloudProfile?.address || '',
          city: cloudProfile?.city || '',
          state: cloudProfile?.state || '',
          pincode: cloudProfile?.pincode || '',
          gstin: cloudProfile?.gstin || '',
          pan: cloudProfile?.pan || '',
          mobile: cloudProfile?.mobile || phone,
          email: cloudProfile?.email || '',
          website: cloudProfile?.website || '',
          bankDetails: cloudProfile?.bank_details || '',
          terms: cloudProfile?.terms || '',
          businessCategory: cloudProfile?.business_category || '',
          businessType: cloudProfile?.business_type || '',
          isGstRegistered: cloudProfile?.is_gst_registered ?? false,
          latitude: cloudProfile?.latitude || 28.6139,
          longitude: cloudProfile?.longitude || 77.2090
        };

        try {
          await billingService.saveCompanyProfile(localProfile, false);
        } catch (e) {
          console.warn("Failed to recover profile offline:", e);
        }
        
        // Enable Cloud Sync directly
        await setCloudSyncToggle(true);
        
        // Pull other ledger data down
        setSuccessMsg(isHi ? 'खाता बही डेटा पुनः प्राप्त किया जा रहा है...' : 'Restoring transaction ledgers...');
        await pullFromCloud().catch(e => console.warn("Background restore pull failed", e));
      } else if (isNewUser) {
        // Pre-fill profile mobile number locally so they start onboarding with their verified phone
        const newProfile = {
          name: '', address: '', city: '', state: '', pincode: '', gstin: '', pan: '',
          mobile: phone, email: '', website: '', bankDetails: '', terms: '',
          businessCategory: '', businessType: '', isGstRegistered: false,
          latitude: 28.6139, longitude: 77.2090
        };
        try {
          await billingService.saveCompanyProfile(newProfile, false);
        } catch (e) {
          console.warn("Failed to prefill profile offline:", e);
        }
      }

      setSuccessMsg(isHi ? 'सत्यापन सफल! ✅' : 'Verification Successful! ✅');

      setTimeout(() => {
        onSuccess(isNewUser, phone);
      }, 1500);

    } catch (err: any) {
      console.error("OTP verification error:", err);
      setErrorMsg(t.otpError);
    } finally {
      setLoading(false);
    }
  };

  const canvasStyle = {
    background: isDark 
      ? 'linear-gradient(to bottom, #020617 0%, #0f172a 70%, #1e1b4b 100%)'
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

  const inputStyle = {
    backgroundColor: isDark ? 'rgba(9, 13, 22, 0.5)' : '#F8FAFC',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#CBD5E1',
    color: isDark ? '#F1F5F9' : '#0F172A'
  };

  const textSecondaryStyle = {
    color: isDark ? '#94A3B8' : '#475569'
  };

  return (
    <div 
      style={canvasStyle}
      className="relative h-screen w-full flex flex-col justify-between p-5 md:p-8 overflow-hidden select-none font-sans transition-colors duration-200"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)] pointer-events-none" />
      <div id="recaptcha-container"></div>

      {/* Header bar */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between z-10 shrink-0">
        <button
          onClick={step === 'otp' ? () => setStep('phone') : onBack}
          style={headerBtnStyle}
          className="flex items-center gap-1.5 text-[11px] font-bold py-2 px-3.5 rounded-full border shadow-3xs cursor-pointer active:scale-95 hover:scale-105 min-h-[44px]"
        >
          <ArrowLeft size={14} /> {t.back}
        </button>

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
            type="button"
            onClick={toggleTheme}
            style={headerBtnStyle}
            className="p-3 rounded-full border transition-all duration-300 flex items-center justify-center cursor-pointer shadow-3xs active:scale-95 hover:scale-105 min-w-[44px] min-h-[44px]"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Main card */}
      <div className="flex-grow flex-1 w-full flex items-center justify-center z-10">
        <main className="w-full max-w-md">
          <div 
            style={cardStyle}
            className="w-full border p-6 sm:p-8 rounded-[2rem] shadow-2xl transition-all duration-500 space-y-6"
          >
            {/* Header branding */}
            <div className="text-center space-y-3">
              <div 
                className="mx-auto p-4 rounded-2xl w-14 h-14 flex items-center justify-center shadow-md text-white animate-pulse"
                style={{
                  background: 'linear-gradient(to top right, #6366F1, #4F46E5)'
                }}
              >
                {step === 'phone' ? <Phone size={26} /> : <Lock size={26} />}
              </div>

              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                  {t.title}
                </h1>
                <p style={textSecondaryStyle} className="text-xs font-semibold leading-relaxed max-w-xs mx-auto">
                  {step === 'phone' ? t.subPhone : t.subOtp}
                </p>
              </div>
            </div>

            {/* Verification Inputs */}
            <AnimatePresence mode="wait">
              <motion.form 
                key={step}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                onSubmit={step === 'phone' ? handleSendOtp : handleVerifyOtp}
                className="space-y-4 text-left"
              >
                {step === 'phone' ? (
                  /* STEP 1: Phone input */
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase">
                      {t.phoneLabel}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-sm font-black text-indigo-500 font-mono">+91</span>
                      <input 
                        type="tel"
                        required
                        maxLength={10}
                        value={phone}
                        style={inputStyle}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        className="w-full border rounded-xl py-3 pl-12 pr-4 text-sm font-black tracking-wider outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  /* STEP 2: OTP input */
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase">
                      {t.otpLabel}
                    </label>
                    <input 
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      style={inputStyle}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full text-center text-xl font-mono tracking-[0.3em] py-3 border focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white rounded-xl outline-none"
                    />
                    
                    <div className="flex justify-between items-center px-1 text-[11px] font-bold pt-1.5">
                      <span style={textSecondaryStyle}>
                        {timer > 0 ? `${timer}s` : ''}
                      </span>
                      {timer === 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setTimer(60);
                            setOtp('');
                          }}
                          className="text-indigo-500 hover:text-indigo-650 cursor-pointer border-0 bg-transparent font-black"
                        >
                          {t.resend}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Feedback notices */}
                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-red-500 text-xs font-semibold animate-pulse">
                    ⚠️ {errorMsg}
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center text-emerald-500 dark:text-emerald-300 text-xs font-bold flex flex-col items-center gap-1.5">
                    <ShieldCheck size={20} className="text-emerald-500 animate-bounce" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Submit trigger button */}
                <button
                  type="submit"
                  disabled={loading || (step === 'phone' ? phone.length !== 10 : otp.length !== 6)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold rounded-xl shadow-md transition-all flex justify-center items-center gap-2 text-xs border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    <>
                      {step === 'phone' ? t.sendOtp : t.verifyBtn}
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </motion.form>
            </AnimatePresence>

          </div>
        </main>
      </div>

      {/* Footer */}
      <footer 
        style={textSecondaryStyle}
        className="text-center text-[10px] pb-2 shrink-0 w-full max-w-sm mx-auto"
      >
        Eazy Billing Client Core • v2.1.0 • Offline Ready
      </footer>
    </div>
  );
};
