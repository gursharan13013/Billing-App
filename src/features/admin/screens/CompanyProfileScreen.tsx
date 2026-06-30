import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Building, MapPin, Phone, Mail, Globe, CreditCard, Flag, Layers, Briefcase, Loader2, Navigation, Search, ChevronDown, X, Check, ArrowRight, AlertCircle, Sparkles, Sun, Moon } from 'lucide-react';
import { CompanyProfile, UNIFIED_CATEGORIES } from '../../../core/types/';
import { billingService } from '../../../services/billingService';
import { Language } from '../../../core/types/';
import { Theme } from '../../../App';
import { safeLocalStorage } from '../../../core/utils/storage';
import { motion, AnimatePresence } from 'motion/react';

interface CompanyProfileScreenProps {
  onBack: () => void;
  onSaveSuccess?: () => void;
  currentTheme?: Theme;
  onThemeChange?: (theme: Theme) => void;
  currentLanguage?: Language;
  onLanguageChange?: (lang: Language) => void;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", 
  "Lakshadweep", "Puducherry"
];

const BUSINESS_TYPES = [
    "Retailer",
    "Wholesaler",
    "Distributor",
    "Manufacturer",
    "Service Provider"
];

const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.2090;

export const CompanyProfileScreen: React.FC<CompanyProfileScreenProps> = ({ 
  onBack, 
  onSaveSuccess,
  currentTheme = 'system',
  onThemeChange,
  currentLanguage = 'en',
  onLanguageChange
}) => {
  const [formData, setFormData] = useState<CompanyProfile>({
    name: '', address: '', city: '', state: '', pincode: '', gstin: '', pan: '', mobile: '', email: '', website: '', bankDetails: '', terms: '',
    businessCategory: '', businessType: '', latitude: DEFAULT_LAT, longitude: DEFAULT_LNG, isGstRegistered: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [bankLedgers, setBankLedgers] = useState<{name: string}[]>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [showBankDropdown, setShowBankDropdown] = useState(false);

  const [activeTab, setActiveTab] = useState<'identity' | 'contact' | 'address' | 'bank'>('identity');

  const isInitialSetup = safeLocalStorage.getItem('app_initialized') !== 'true';
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showSuccessOnboardModal, setShowSuccessOnboardModal] = useState(false);

  const isHi = currentLanguage === 'hi';

  const [isDark, setIsDark] = useState(() => {
    if (currentTheme === 'dark') return true;
    if (currentTheme === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (currentTheme === 'dark') {
      setIsDark(true);
    } else if (currentTheme === 'light') {
      setIsDark(false);
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, [currentTheme]);

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

  useEffect(() => {
    billingService.getCompanyProfile().then(data => {
        setFormData({
            name: data?.name || '',
            address: data?.address || '',
            city: data?.city || '',
            state: data?.state || '',
            pincode: data?.pincode || '',
            gstin: data?.gstin || '',
            pan: data?.pan || '',
            mobile: data?.mobile || '',
            email: data?.email || '',
            website: data?.website || '',
            bankDetails: data?.bankDetails || '',
            terms: data?.terms || '',
            businessCategory: data?.businessCategory || '',
            businessType: data?.businessType || '',
            isGstRegistered: data?.isGstRegistered ?? !!data?.gstin,
            latitude: data?.latitude || DEFAULT_LAT,
            longitude: data?.longitude || DEFAULT_LNG
        });
        if (data?.businessCategory) {
            setCategorySearch(data.businessCategory);
        }
        setLoading(false);
    });
    billingService.getAllParties().then(parties => {
        const banks = parties.filter(p => p.accountGroup === 'Bank Account' || (p.name && p.name.toLowerCase().includes('bank')));
        setBankLedgers(banks);
    });
  }, []);

  const triggerLocationFetch = (isAuto = false) => {
    if (!navigator.geolocation) {
      if (!isAuto) {
        setToastMessage({ type: 'error', text: isHi ? 'इस ब्राउज़र द्वारा जियोलोकेशन समर्थित नहीं है।' : 'Geolocation is not supported by this browser.' });
      }
      return;
    }
    setGettingLocation(true);
    if (!isAuto) {
      setToastMessage({ type: 'info', text: isHi ? 'लाइव जीपीएस पता प्राप्त किया जा रहा है... कृपया स्थान अनुरोध की अनुमति दें।' : 'Fetching live GPS address... Please allow location request.' });
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        
        setFormData(p => ({
          ...p,
          latitude: lat,
          longitude: lng
        }));

        if (!isAuto) {
          setToastMessage({ type: 'info', text: isHi ? 'जीपीएस जुड़ा! पता विवरण प्राप्त किया जा रहा है...' : 'GPS connected! Fetching address details...' });
        }

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: {
              'Accept-Language': 'en'
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.address) {
              const addressObj = data.address;
              
              let fetchedState = addressObj.state || addressObj.state_district || '';
              if (fetchedState.toLowerCase().includes('delhi')) {
                fetchedState = 'Delhi';
              } else {
                const matchedState = INDIAN_STATES.find(s => 
                  s.toLowerCase() === fetchedState.toLowerCase() || 
                  fetchedState.toLowerCase().includes(s.toLowerCase())
                );
                if (matchedState) {
                  fetchedState = matchedState;
                }
              }

              const fetchedCity = addressObj.city || addressObj.town || addressObj.village || addressObj.suburb || addressObj.city_district || '';
              const fetchedPincode = addressObj.postcode || '';

              const road = addressObj.road || '';
              const neighbourhood = addressObj.neighbourhood || addressObj.suburb || '';
              const county = addressObj.county || '';
              const streetAddress = [road, neighbourhood, county].filter(Boolean).join(', ') || data.display_name || '';

              setFormData(p => ({
                ...p,
                state: fetchedState || p.state,
                city: fetchedCity || p.city,
                pincode: fetchedPincode || p.pincode,
                address: streetAddress || p.address
              }));

              setToastMessage({ type: 'success', text: isHi ? 'लाइव स्थान और पता सिंक्रनाइज़ किया गया! 📍' : 'Live location & address synchronized! 📍' });
            } else {
              if (!isAuto) {
                setToastMessage({ type: 'success', text: isHi ? 'जीपीएस निर्देशांक प्राप्त किए गए!' : 'GPS Coordinates fetched!' });
              }
            }
          } else {
            if (!isAuto) {
              setToastMessage({ type: 'success', text: isHi ? 'जीपीएस निर्देशांक प्राप्त किए गए!' : 'GPS Coordinates fetched!' });
            }
          }
        } catch (err) {
          console.warn("Reverse geocode request issue", err);
          if (!isAuto) {
            setToastMessage({ type: 'success', text: isHi ? 'जीपीएस निर्देशांक सफलतापूर्वक जुड़े!' : 'GPS Coordinates linked successfully!' });
          }
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        setGettingLocation(false);
        console.warn("Geolocation failure", error);
        if (!isAuto) {
          setToastMessage({ type: 'error', text: isHi ? 'लाइव ट्रैकिंग अनुमति अस्वीकृत या समय समाप्त।' : 'Live tracking permission denied or timed out.' });
        }
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
  };

  const handleFillDemoProfile = async () => {
    const demoProfile: CompanyProfile = {
      name: 'EazyBilling Retail Solutions',
      address: 'Plot 42, Connaught Place, Inner Circle',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      gstin: '07AAAAA0000A1Z5',
      pan: 'AAAAA0000A',
      mobile: '9876543210',
      email: 'ceo@eazybilling.test',
      website: 'https://eazybilling.test',
      bankDetails: 'ICICI Bank Ac: 000401010203 IFSC: ICIC0000004',
      terms: 'Subject to Delhi Jurisdiction. Goods once sold cannot be taken back.',
      businessCategory: 'FMCG / Grocery',
      businessType: 'Retailer',
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LNG,
      isGstRegistered: true
    };
    setFormData(demoProfile);
    setCategorySearch('FMCG / Grocery');

    try {
      await billingService.seedDairyData();
      setShowDemoModal(true);
    } catch (e) {
      console.warn("DB seeding failed/skipped:", e);
      setToastMessage({ type: 'error', text: isHi ? 'डेमो सामग्री लोड करने में समस्या आई।' : 'Demo content loading encountered an issue.' });
    }
  };

  const handleSaveAndComplete = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    
    const sanitizedProfile: CompanyProfile = {
      ...formData,
      name: (formData.name || '').trim() || 'My Business',
      address: (formData.address || '').trim() || 'Not Specified',
      gstin: (formData.gstin || '').trim() || '',
      latitude: formData.latitude || DEFAULT_LAT,
      longitude: formData.longitude || DEFAULT_LNG
    };

    try {
      await billingService.saveCompanyProfile(sanitizedProfile, false);
      const isInitial = safeLocalStorage.getItem('app_initialized') !== 'true';
      
      try {
        safeLocalStorage.setItem('companyProfileSetup', 'true');
        if (!isInitial) {
          safeLocalStorage.setItem('app_initialized', 'true');
          safeLocalStorage.setItem('onboardingCompleted', 'true');
        }
      } catch (err) {
        console.warn('Failed to set localStorage', err);
      }
      
      setSaving(false);

      if (isInitialSetup) {
        setShowSuccessOnboardModal(true);
      } else {
        setToastMessage({ type: 'success', text: isHi ? 'व्यवसाय प्रोफ़ाइल सफलतापूर्वक अपडेट की गई! ✅' : 'Business Profile successfully updated! ✅' });
        setTimeout(() => {
          if (onSaveSuccess) onSaveSuccess();
          else onBack();
        }, 1200);
      }
    } catch (error) {
      console.error("Save error", error);
      setSaving(false);
      setToastMessage({ type: 'error', text: isHi ? 'प्रोफ़ाइल सहेजने में विफल। कृपया समीक्षा करें और पुन: प्रयास करें।' : 'Profile save failed. Please review and try again.' });
    }
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setDirection('forward');
      setCurrentStep(prev => prev + 1);
    } else {
      handleSaveAndComplete();
    }
  };

  const handleBackStep = () => {
    if (currentStep > 0) {
      setDirection('backward');
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkipStep = () => {
    if (currentStep < 4) {
      setDirection('forward');
      setCurrentStep(prev => prev + 1);
    } else {
      handleSaveAndComplete();
    }
  };

  const mobileTrimmed = (formData.mobile || '').trim();
  const isMobileValid = mobileTrimmed.length >= 10 && /^\+?[0-9]{10,14}$/.test(mobileTrimmed);
  const isEmailValid = (formData.email || '').trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((formData.email || '').trim());
  const isContactStepValid = isMobileValid && isEmailValid;

  const getMobileError = () => {
    if (mobileTrimmed.length > 0 && !isMobileValid) {
      return isHi ? "प्रारूप अमान्य है। कम से कम 10 अंक दर्ज करें।" : "Format invalid. Enter at least 10 numbers.";
    }
    return null;
  };

  const getEmailError = () => {
    if ((formData.email || '').trim().length > 0 && !isEmailValid) {
      return isHi ? "कृपया एक वैध ईमेल पता दर्ज करें।" : "Please enter a valid email address.";
    }
    return null;
  };

  const STEPS_CONFIG = [
    { label: isHi ? 'संपर्क' : 'Contact', desc: 'Mobile & Email', icon: Phone },
    { label: isHi ? 'पहचान' : 'Identity', desc: 'Name & GST', icon: Building },
    { label: isHi ? 'श्रेणी' : 'Category', desc: 'BusinessType', icon: Briefcase },
    { label: isHi ? 'पता' : 'Address', desc: 'State & Map', icon: MapPin },
    { label: isHi ? 'बैंक' : 'Bank', desc: 'Terms & Cards', icon: CreditCard }
  ];

  const editorTabs = [
    { id: 'identity', label: isHi ? 'पहचान' : 'Identity', icon: Building, desc: isHi ? 'नाम, जीएसटी और पैन' : 'Name, GST & PAN' },
    { id: 'contact', label: isHi ? 'संपर्क विवरण' : 'Contact Details', icon: Phone, desc: isHi ? 'मोबाइल, ईमेल और वेब' : 'Mobile, Email & Web' },
    { id: 'address', label: isHi ? 'बिलिंग पता' : 'Billing Address', icon: MapPin, desc: isHi ? 'गली, राज्य और जीपीएस' : 'Street, State & GPS' },
    { id: 'bank', label: isHi ? 'बैंक और पाद लेख' : 'Bank & Footers', icon: CreditCard, desc: isHi ? 'शर्तें और मुद्रित नियम' : 'Terms & printed rules' }
  ] as const;

  const stepVariants = {
    enter: (dir: 'forward' | 'backward') => ({
      x: dir === 'forward' ? 50 : -50,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: 'forward' | 'backward') => ({
      x: dir === 'forward' ? -50 : 50,
      opacity: 0
    })
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

  const selectStyle = {
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
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
      {/* Background glowing particles/radial pattern (matching splash) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', 
          backgroundSize: '16px 16px' 
        }} 
      />

      {/* Toast banner */}
      {toastMessage && (
        <div className="fixed top-3 left-3 right-3 z-[99999] p-3 rounded-lg shadow-xl backdrop-blur-md bg-slate-900/95 border border-slate-800 flex justify-between items-center text-slate-100 animate-in slide-in-from-top-4 duration-250">
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'success' ? (
              <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                <Check size={14} />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                <AlertCircle size={14} />
              </div>
            )}
            <p className="text-xs font-bold leading-none">{toastMessage.text}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer border-0 bg-transparent">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Demo Seeding succeeded micro modal */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-neutral-950/75 flex items-center justify-center p-3 z-[99999] backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center max-w-sm w-full space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-full mx-auto flex items-center justify-center text-indigo-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Database Seeded successfully!</h3>
              <p className="text-[11px] text-slate-400 leading-snug">
                We've populated the platform with mock products, transaction records, and party assets for quick sandbox testing.
              </p>
            </div>
            <button
              onClick={() => {
                setShowDemoModal(false);
                handleSaveAndComplete();
              }}
              className="w-full bg-gradient-to-r from-brand-primary to-money-in py-2.5 rounded-lg text-xs font-extrabold text-white shadow-md active:scale-[0.98] transition-all cursor-pointer border-0"
            >
              Okay, Go to App
            </button>
          </div>
        </div>
      )}

      {/* Onboard completion modal */}
      {showSuccessOnboardModal && (
        <div className="fixed inset-0 bg-neutral-950/80 flex items-center justify-center p-3 z-[99999] backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-center max-w-sm w-full space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-green-500/15 text-green-400 rounded-full mx-auto flex items-center justify-center">
              <Check className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Profile Configured! ✅</h3>
              <p className="text-[11px] text-slate-400 leading-snug">
                Business setup is successfully finished. Let's proceed to set up your billing details.
              </p>
            </div>
            <button
              onClick={() => {
                setShowSuccessOnboardModal(false);
                if (onSaveSuccess) onSaveSuccess();
                else onBack();
              }}
              className="w-full bg-green-600 hover:bg-green-700 font-extrabold py-2.5 rounded-lg text-xs text-white shadow-md active:scale-95 transition-all duration-150 cursor-pointer border-0"
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* Top Floating Action Bar with Back, Language Switch, and Theme Toggle */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          {!isInitialSetup && (
            <button
              onClick={onBack}
              style={headerBtnStyle}
              className="flex items-center gap-1.5 text-[11px] font-bold py-2 px-3.5 rounded-full border shadow-3xs cursor-pointer active:scale-95 hover:scale-105 min-h-[44px]"
            >
              <ArrowLeft size={14} /> {isHi ? 'पीछे' : 'Back'}
            </button>
          )}
        </div>

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
            id="profile-theme-toggle-btn"
            type="button"
            onClick={toggleTheme}
            style={headerBtnStyle}
            className="p-3 rounded-full border transition-all duration-300 flex items-center justify-center cursor-pointer shadow-3xs active:scale-95 hover:scale-105 min-w-[44px] min-h-[44px]"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} className="stroke-[2.5px]" /> : <Moon size={18} className="stroke-[2.5px]" />}
          </button>
        </div>
      </header>

      {/* Centered Scrollable Core Form Container */}
      <div className="flex-grow flex-1 w-full flex items-center justify-center overflow-y-auto my-3 py-2 z-10 scrollbar-none">
        
        {isInitialSetup ? (
          /* ONBOARDING FLOW CARD (Sm-Md centered frame, identical to role screen size & curve structure) */
          <main className="w-full max-w-md">
            <div 
              style={cardStyle}
              className="w-full border p-5 sm:p-6 rounded-[2rem] transition-all duration-500 space-y-6 shadow-2xl flex flex-col justify-between"
            >
              {/* Card Header branding */}
              <div className="text-center space-y-3">
                <div 
                  className="mx-auto p-4 rounded-2xl w-14 h-14 flex items-center justify-center shadow-md transition-all duration-550 text-white animate-pulse"
                  style={{
                    background: 'linear-gradient(to top right, #6366F1, #4F46E5)'
                  }}
                >
                  <Building size={26} className="stroke-[2px]" />
                </div>

                <div className="space-y-1">
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                    {isHi ? 'सेटअप ' : 'Setup '}<span className="text-indigo-500">{isHi ? 'व्यापार प्रोफ़ाइल' : 'Business Profile'}</span>
                  </h1>
                  <p style={textSecondaryStyle} className="text-xs font-semibold leading-relaxed">
                    {isHi ? 'आगे बढ़ने के लिए अपने व्यवसाय के पैरामीटर कॉन्फ़िगर करें।' : 'Configure your business layout parameters to proceed.'}
                  </p>
                </div>

                {/* Progress Indicators Inside the Card */}
                <div className="pt-2 border-t border-slate-205 dark:border-slate-800">
                  <div className="relative flex justify-between items-center px-1 mb-1.5 max-w-xs mx-auto">
                    <div className="absolute top-1/2 left-0 w-full h-[1.5px] bg-slate-205 dark:bg-slate-800 -translate-y-1/2 z-0">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-450 ease-out" 
                        style={{ width: `${(currentStep / 4) * 100}%` }}
                      />
                    </div>

                    {STEPS_CONFIG.map((step, idx) => {
                      const Icon = step.icon;
                      const isCompleted = idx < currentStep;
                      const isActive = idx === currentStep;

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={idx > currentStep && !isContactStepValid}
                          onClick={() => {
                            setDirection(idx > currentStep ? 'forward' : 'backward');
                            setCurrentStep(idx);
                          }}
                          className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                            isCompleted 
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : isActive
                                ? 'bg-indigo-600 text-white shadow ring-4 ring-indigo-500/20 font-bold scale-105'
                                : (isDark ? 'bg-slate-900 text-slate-500 border border-slate-800' : 'bg-slate-100 text-slate-455 border border-slate-205')
                          }`}
                        >
                          {isCompleted ? <Check size={11} strokeWidth={3.5} /> : <Icon size={11} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Dynamic scrollable steps card */}
              <div className="min-h-[220px] max-h-[320px] overflow-y-auto scrollbar-none py-1">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentStep}
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                    className="space-y-4 text-left"
                  >
                    {/* STEP 1: CONTACT */}
                    {currentStep === 0 && (
                      <div className="space-y-3">
                        <div className="p-3 bg-indigo-500/5 dark:bg-brand-primary/5 border border-brand-primary/10 rounded-xl flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-indigo-400 flex items-center gap-1">⚡ Sandboxed Demo Seeder</p>
                            <p style={textSecondaryStyle} className="text-[10px] leading-snug font-semibold">
                              {isHi ? 'सीधे डेटाबेस में मॉक डेटा लोड करें।' : 'Seed mock entities directly into DB.'}
                            </p>
                          </div>
                          <button
                            type="button; submit"
                            onClick={handleFillDemoProfile}
                            className="bg-indigo-600 text-white hover:opacity-90 active:scale-95 text-xs font-extrabold px-3 py-1.5 rounded-lg transition-all cursor-pointer border-0"
                          >
                            {isHi ? 'सीड' : 'Seed'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-450 dark:text-slate-350 mb-1 uppercase tracking-wide">
                              {isHi ? 'मोबाइल नंबर' : 'Mobile Number'}
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">+91</span>
                              <input 
                                type="tel"
                                required
                                value={formData.mobile}
                                style={inputStyle}
                                onChange={e => setFormData({ ...formData, mobile: e.target.value.replace(/[^0-9+]/g, '') })}
                                placeholder="9876543210"
                                className="w-full border rounded-xl py-2 px-10 text-xs outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                              />
                            </div>
                            {getMobileError() && (
                              <p className="text-[10px] text-red-500 font-semibold mt-1">⚠️ {getMobileError()}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-455 dark:text-slate-345 mb-1 uppercase tracking-wide">
                              {isHi ? 'ईमेल पता' : 'Email Address'}
                            </label>
                            <div className="relative">
                              <Mail size={13} className="absolute left-3 top-3 text-slate-450" />
                              <input 
                                type="email"
                                value={formData.email}
                                style={inputStyle}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="info@yourstore.com"
                                className="w-full border rounded-xl py-2 pl-10 pr-2.5 text-xs outline-none focus:ring-1 focus:ring-brand-primary"
                              />
                            </div>
                            {getEmailError() && (
                              <p className="text-[10px] text-red-500 font-semibold mt-1">⚠️ {getEmailError()}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 2: BUSINESS IDENTITY DETAILS */}
                    {currentStep === 1 && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-455 dark:text-slate-345 mb-1 uppercase tracking-wide">
                            {isHi ? 'व्यापार का नाम' : 'Business Name'}
                          </label>
                          <input 
                            type="text"
                            value={formData.name}
                            style={inputStyle}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder={isHi ? 'जैसे. मेरी दुकान' : "e.g. My Enterprise"}
                            className="w-full border rounded-xl py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-brand-primary font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-455 dark:text-slate-345 mb-1 uppercase tracking-wide">
                            {isHi ? 'जीएसटी पंजीकरण स्थिति' : 'GST Status'}
                          </label>
                          <div className="grid grid-cols-2 gap-1.5 bg-slate-105 dark:bg-slate-950 p-1 rounded-xl border border-slate-205 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, isGstRegistered: false, gstin: '' })}
                              className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-0 ${
                                !formData.isGstRegistered ? 'bg-white dark:bg-slate-800 text-indigo-500 shadow-xs' : 'text-slate-455'
                              }`}
                            >
                              Non-GST
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, isGstRegistered: true })}
                              className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-0 ${
                                formData.isGstRegistered ? 'bg-white dark:bg-slate-800 text-indigo-500 shadow-xs' : 'text-slate-455'
                              }`}
                            >
                              GST Registered
                            </button>
                          </div>
                        </div>

                        {formData.isGstRegistered && (
                          <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                            <label className="block text-xs font-bold text-slate-455 dark:text-slate-345 mb-1 uppercase tracking-wide">GSTIN (15-characters)</label>
                            <input 
                              type="text"
                              value={formData.gstin}
                              style={inputStyle}
                              onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                              placeholder="07AAAAA0000A1Z5"
                              className="w-full border rounded-xl py-2 px-3 text-xs uppercase outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* STEP 3: BUSINESS CLASSIFICATION */}
                    {currentStep === 2 && (
                      <div className="space-y-3">
                        <div className="relative">
                          <label className="block text-xs font-bold text-slate-455 dark:text-slate-345 mb-1 uppercase tracking-wide">
                            {isHi ? 'औद्योगिक क्षेत्र' : 'Industrial Sector'}
                          </label>
                          <div className="relative">
                            <input 
                              type="text"
                              value={categorySearch}
                              style={inputStyle}
                              onFocus={() => setShowCategoryDropdown(true)}
                              onChange={(e) => {
                                  setCategorySearch(e.target.value);
                                  setShowCategoryDropdown(true);
                              }}
                              placeholder={isHi ? 'खोजें जैसे. डेयरी, किराना...' : "Search sector e.g. Grocery, Cafe..."}
                              className="w-full border rounded-xl py-2 pl-10 pr-8 text-xs outline-none focus:ring-1 focus:ring-brand-primary font-semibold"
                            />
                            <Search className="absolute left-3 top-3 text-slate-450" size={13} />
                          </div>

                          {showCategoryDropdown && (
                            <div className="absolute z-55 left-0 right-0 mt-1 max-h-32 overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl">
                              {UNIFIED_CATEGORIES.filter(c => 
                                c.en.toLowerCase().includes(categorySearch.toLowerCase()) || 
                                c.hi.toLowerCase().includes(categorySearch.toLowerCase())
                              ).slice(0, 10).map((cat, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    setFormData({ ...formData, businessCategory: cat.en });
                                    setCategorySearch(cat.en);
                                    setShowCategoryDropdown(false);
                                  }}
                                  className="p-2 text-xs border-b cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 flex justify-between items-center text-slate-900 dark:text-slate-200 border-slate-105"
                                >
                                  <span>{cat.en}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-455 dark:text-slate-345 mb-1 uppercase tracking-wide">
                            {isHi ? 'कार्य प्रणाली' : 'Operation Style'}
                          </label>
                          <select
                            value={formData.businessType || ''}
                            style={selectStyle}
                            onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                            className="w-full border rounded-xl py-2 px-3 text-xs outline-none"
                          >
                            <option value="" className="text-slate-905 dark:bg-slate-950">Select Style</option>
                            {BUSINESS_TYPES.map(type => (
                              <option key={type} value={type} className="text-slate-905 dark:bg-slate-950">{type}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* STEP 4: ADDRESS DETAILS LOCATION */}
                    {currentStep === 3 && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-455 dark:text-slate-345 mb-1 uppercase tracking-wide">
                            {isHi ? 'गली का पता' : 'Street Address'}
                          </label>
                          <textarea 
                            rows={1.5}
                            value={formData.address}
                            style={inputStyle}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Plot Num, Area, Market sector"
                            className="w-full border rounded-xl p-2.5 text-xs resize-none outline-none focus:ring-1 focus:ring-brand-primary"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <select
                              value={formData.state || ''}
                              style={selectStyle}
                              onChange={e => setFormData({ ...formData, state: e.target.value })}
                              className="w-full border rounded-xl py-2 px-2 text-xs outline-none"
                            >
                              <option value="" className="text-slate-905 dark:bg-slate-950">State</option>
                              {INDIAN_STATES.map(s => (
                                <option key={s} value={s} className="text-slate-905 dark:bg-slate-950">{s}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <input 
                              type="text"
                              value={formData.city || ''}
                              style={inputStyle}
                              onChange={e => setFormData({ ...formData, city: e.target.value })}
                              placeholder="City"
                              className="w-full border rounded-xl py-2 px-2.5 text-xs outline-none"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={gettingLocation}
                          onClick={() => triggerLocationFetch(false)}
                          className="w-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all text-xs font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {gettingLocation ? <Loader2 className="animate-spin w-3 h-3" /> : <Navigation size={11} />}
                          {isHi ? 'कनेक्ट लाइव जीपीएस स्थान' : 'Connect Live GPS Location'}
                        </button>
                      </div>
                    )}

                    {/* STEP 5: BANK DETAILS & TERMS */}
                    {currentStep === 4 && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-455 dark:text-slate-345 mb-1 uppercase tracking-wide">
                            {isHi ? 'बैंक खाता विवरण' : 'Bank Account details'}
                          </label>
                          <textarea 
                            rows={2}
                            value={formData.bankDetails || ''}
                            style={inputStyle}
                            onChange={e => setFormData({ ...formData, bankDetails: e.target.value })}
                            placeholder="Ac: 100200400, Bank: ICICI, IFSC..."
                            className="w-full border rounded-xl p-2.5 text-xs resize-none outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-455 dark:text-slate-345 mb-1 uppercase tracking-wide">
                            {isHi ? 'नियम और शर्तें' : 'Terms & Conditions'}
                          </label>
                          <textarea 
                            rows={2}
                            value={formData.terms || ''}
                            style={inputStyle}
                            onChange={e => setFormData({ ...formData, terms: e.target.value })}
                            placeholder="e.g. Subject to local Jurisdiction."
                            className="w-full border rounded-xl p-2.5 text-xs resize-none outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Stepper Wizard Actions */}
              <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2E8F0' }}>
                <button
                  type="button"
                  onClick={handleBackStep}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border-0 ${
                    currentStep === 0 
                      ? 'invisible pointer-events-none' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <ArrowLeft size={13} /> {isHi ? 'पीछे' : 'Back'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSkipStep}
                    className="px-3 py-2 rounded-xl text-xs text-slate-450 hover:text-slate-700 dark:text-slate-400 font-bold transition-all cursor-pointer border-0 bg-transparent"
                  >
                    {isHi ? 'छोड़ें' : 'Skip'}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all cursor-pointer text-white border-0 bg-indigo-600"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin w-3.5 h-3.5" />
                    ) : currentStep === 4 ? (
                      <>{isHi ? 'पूरा करें' : 'Finish'} <Check size={13} /></>
                    ) : (
                      <>{isHi ? 'आगे' : 'Next'} <ArrowRight size={13} /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </main>
        ) : (
          /* REGULAR DETAILED EDITOR VIEW (Two-column responsive desktop/mobile layouts) */
          <main className="w-full max-w-4xl h-full flex flex-col justify-between overflow-y-auto pr-1">
            <div className="space-y-4 pb-12">
              {/* Sandboxed Seeder Banner */}
              <div 
                style={cardStyle}
                className="p-3 sm:py-3.5 px-4 rounded-[2rem] border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl text-left"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-indigo-500 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-indigo-500 animate-pulse" /> Auto-Fill Sandbox Seeder
                  </p>
                  <p style={textSecondaryStyle} className="text-[11px] font-semibold">
                    {isHi ? 'डेटाबेस में तुरंत डेमो सामग्री और लेखा रिपोर्ट भरें।' : 'Seed mock entities directly into DB.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFillDemoProfile}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3 py-2 rounded-xl text-xs tracking-tight shrink-0 shadow-xs active:scale-95 transition-all duration-150 cursor-pointer border-0"
                >
                  ⚡ {isHi ? 'डेमो सीड करें' : 'Seed Demo Data'}
                </button>
              </div>

              {/* Split layout: left navigation and right snug inputs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                
                {/* Left tab sidebar list */}
                <div 
                  style={cardStyle}
                  className="flex overflow-x-auto md:flex-col gap-1 md:gap-1.5 p-2 border rounded-2xl scrollbar-none shrink-0 w-full"
                >
                  {editorTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 whitespace-nowrap text-left w-full cursor-pointer border-0 ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-450 dark:text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                        <div className="hidden md:block text-left">
                          <div className="leading-tight">{tab.label}</div>
                          <div className={`text-[9px] font-bold mt-0.5 opacity-80 truncate ${isActive ? 'text-indigo-100' : 'text-slate-455'}`}>
                            {tab.desc}
                          </div>
                        </div>
                        <span className="md:hidden text-xs">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Right panel: Single visual snug card */}
                <form onSubmit={handleSaveAndComplete} className="md:col-span-3 space-y-4 text-left">
                  <div 
                    style={cardStyle}
                    className="border p-5 rounded-[2rem] shadow-2xl space-y-4"
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -3 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-4"
                      >
                        
                        {/* IDENTITY DETAILS TAB */}
                        {activeTab === 'identity' && (
                          <div className="space-y-3.5">
                            <div>
                              <h3 className="text-sm font-black border-b pb-1.5 flex items-center gap-1.5" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2E8F0' }}>
                                <Building size={14} className="text-indigo-500" /> Enterprise Identity & Trade Setup
                              </h3>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-450 dark:text-slate-350 mb-1">Business Name (Trade Name)</label>
                                <input 
                                  type="text"
                                  value={formData.name}
                                  style={inputStyle}
                                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                                  className="w-full border rounded-xl py-2 px-3.5 text-xs sm:text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-450 dark:text-slate-350 mb-1">Industry Category / Class</label>
                                  <div className="relative">
                                    <input 
                                      type="text"
                                      value={categorySearch}
                                      style={inputStyle}
                                      onFocus={() => setShowCategoryDropdown(true)}
                                      onChange={(e) => {
                                        setCategorySearch(e.target.value);
                                        setShowCategoryDropdown(true);
                                      }}
                                      className="w-full border rounded-xl py-2 pl-3 pr-7 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                    />
                                    <ChevronDown size={14} className="absolute right-2.5 top-3 text-slate-400" />
                                  </div>

                                  {showCategoryDropdown && (
                                    <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg">
                                      {UNIFIED_CATEGORIES.filter(c => 
                                        c.en.toLowerCase().includes(categorySearch.toLowerCase()) || 
                                        c.hi.toLowerCase().includes(categorySearch.toLowerCase())
                                      ).slice(0, 20).map((cat, idx) => (
                                        <div
                                          key={idx}
                                          onClick={() => {
                                            setFormData({ ...formData, businessCategory: cat.en });
                                            setCategorySearch(cat.en);
                                            setShowCategoryDropdown(false);
                                          }}
                                          className="p-2.5 text-xs border-b cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 flex justify-between items-center text-slate-900 dark:text-slate-200 border-slate-105"
                                        >
                                          <span>{cat.en}</span>
                                          <span className="text-xs text-slate-405 font-bold">({cat.hi})</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-455 dark:text-slate-345 mb-1">Operation Type</label>
                                  <select
                                    value={formData.businessType || ''}
                                    style={selectStyle}
                                    onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                                    className="w-full border rounded-xl py-2 px-3 text-xs sm:text-sm font-medium outline-none focus:ring-1 focus:ring-indigo-500"
                                  >
                                    <option value="" className="text-slate-905 dark:bg-slate-905">- Select System -</option>
                                    {BUSINESS_TYPES.map(t => (
                                      <option key={t} value={t} className="text-slate-905 dark:bg-slate-905">{t}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-455 dark:text-slate-345 mb-1.5 font-extrabold">GST Tax Designation</label>
                                <div className="grid grid-cols-2 gap-1.5 bg-slate-105 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80">
                                  <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isGstRegistered: false, gstin: '' })}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                                      !formData.isGstRegistered ? 'bg-white dark:bg-slate-800 text-indigo-500 shadow-xs' : 'text-slate-400'
                                    }`}
                                  >
                                    Non-GST Scheme
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isGstRegistered: true })}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 ${
                                      formData.isGstRegistered ? 'bg-white dark:bg-slate-800 text-indigo-500 shadow-xs' : 'text-slate-400'
                                    }`}
                                  >
                                    GST Registered
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
                                {formData.isGstRegistered && (
                                  <div>
                                    <label className="block text-xs uppercase tracking-wider font-bold text-slate-455 dark:text-slate-345 mb-1">GSTIN Code</label>
                                    <input 
                                      type="text"
                                      value={formData.gstin}
                                      style={inputStyle}
                                      onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                                      className="w-full border rounded-xl py-2 px-3 text-xs sm:text-sm uppercase outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                      placeholder="07AAAAA0000A1Z5"
                                    />
                                  </div>
                                )}

                                <div className={formData.isGstRegistered ? '' : 'col-span-1 sm:col-span-2'}>
                                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-455 dark:text-slate-345 mb-1">PAN Registry Number</label>
                                  <input 
                                    type="text"
                                    value={formData.pan || ''}
                                    style={inputStyle}
                                    onChange={e => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                                    className="w-full border rounded-xl py-2 px-3 text-xs sm:text-sm uppercase outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                    placeholder="ABCDE1234F"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* CONTACT SETTINGS DETAILS */}
                        {activeTab === 'contact' && (
                          <div className="space-y-3.5">
                            <div>
                              <h3 className="text-sm font-black border-b pb-1.5 flex items-center gap-1.5" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2E8F0' }}>
                                <Phone size={14} className="text-indigo-500" /> primary Contact Channels
                              </h3>
                            </div>

                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-455 dark:text-slate-345 mb-1">Mobile Number</label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">+91</span>
                                    <input 
                                      type="tel"
                                      required
                                      value={formData.mobile}
                                      style={inputStyle}
                                      onChange={e => setFormData({ ...formData, mobile: e.target.value.replace(/[^0-9+]/g, '') })}
                                      className="w-full border rounded-xl py-2 pl-10 pr-2.5 text-xs sm:text-sm font-mono outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-455 dark:text-slate-345 mb-1">Registered Email</label>
                                  <div className="relative">
                                    <Mail size={13} className="absolute left-3 top-3 text-slate-400" />
                                    <input 
                                      type="email"
                                      value={formData.email}
                                      style={inputStyle}
                                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                                      className="w-full border rounded-xl py-2 pl-10 pr-2.5 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-455 dark:text-slate-345 mb-1">Website URL (Optional)</label>
                                <div className="relative">
                                  <Globe size={13} className="absolute left-3 top-3 text-slate-400" />
                                  <input 
                                    type="text"
                                    value={formData.website || ''}
                                    style={inputStyle}
                                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                                    placeholder="e.g. www.yourcompany.com"
                                    className="w-full border rounded-xl py-2 pl-10 pr-2.5 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* BILLING ADDRESS DETAILS TAB */}
                        {activeTab === 'address' && (
                          <div className="space-y-3.5">
                            <div>
                              <h3 className="text-sm font-black border-b pb-1.5 flex items-center gap-1.5" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2E8F0' }}>
                                <MapPin size={14} className="text-indigo-500" /> Physical Location & Address Info
                              </h3>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-455 dark:text-slate-345 mb-1">Street Address Line</label>
                                <textarea 
                                  rows={1.5}
                                  value={formData.address}
                                  style={inputStyle}
                                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                                  className="w-full border rounded-xl p-2.5 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-semibold"
                                />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-455 dark:text-slate-345 mb-1">Billing State</label>
                                  <select
                                    value={formData.state || ''}
                                    style={selectStyle}
                                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                                    className="w-full border rounded-xl py-2 px-3 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                  >
                                    <option value="" className="text-slate-905 dark:bg-slate-905">- Select State -</option>
                                    {INDIAN_STATES.map(st => (
                                      <option key={st} value={st} className="text-slate-905 dark:bg-slate-905">{st}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-455 dark:text-slate-345 mb-1">City / Town</label>
                                  <input 
                                    type="text"
                                    value={formData.city || ''}
                                    style={inputStyle}
                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full border rounded-xl py-2 px-3 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                                <div>
                                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-455 dark:text-slate-345 mb-1">Pincode</label>
                                  <input 
                                    type="number"
                                    value={formData.pincode || ''}
                                    style={inputStyle}
                                    onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                                    className="w-full border rounded-xl py-2 px-3 text-xs sm:text-sm font-mono outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="Pincode"
                                  />
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between gap-2.5 mt-3">
                                  <div className="text-left leading-none">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Coordinates Connection</span>
                                    <p className="text-xs font-bold text-brand-primary mt-0.5 font-mono leading-none">
                                      {formData.latitude?.toFixed(4)}, {formData.longitude?.toFixed(4)}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={gettingLocation}
                                    onClick={() => triggerLocationFetch(false)}
                                    className="bg-brand-primary/10 text-brand-primary border border-brand-primary/15 hover:bg-brand-primary hover:text-white transition-all text-xs font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1 active:scale-95 duration-100 cursor-pointer"
                                  >
                                    {gettingLocation ? <Loader2 className="animate-spin w-2.5 h-2.5" /> : <Navigation size={10} />}
                                    Locate
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* FINANCIAL BANK & FOOTER DETAILS TAB */}
                        {activeTab === 'bank' && (
                          <div className="space-y-3.5">
                            <div>
                              <h3 className="text-sm font-black border-b pb-1.5 flex items-center gap-1.5" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2E8F0' }}>
                                <CreditCard size={14} className="text-indigo-500" /> Bank Ledger & Print footers
                              </h3>
                            </div>

                            <div className="space-y-3 animate-in fade-in duration-200">
                              <div>
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-455 dark:text-slate-345 mb-1">Select Account Ledger Bank Reference</label>
                                <div className="relative">
                                  <input 
                                    type="text"
                                    placeholder="Search accounts e.g. SBI Account, Ac Cash..."
                                    value={bankSearch}
                                    style={inputStyle}
                                    onFocus={() => setShowBankDropdown(true)}
                                    onChange={(e) => {
                                      setBankSearch(e.target.value);
                                      setShowBankDropdown(true);
                                    }}
                                    className="w-full border rounded-xl py-2 pl-8 pr-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                  />
                                  <Search size={12} className="absolute left-2.5 top-3 text-slate-400" />
                                </div>

                                {showBankDropdown && (
                                  <div className="absolute z-10 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                                    {bankLedgers.filter(b => b.name && b.name.toLowerCase().includes(bankSearch.toLowerCase())).length > 0 ? (
                                      bankLedgers.filter(b => b.name && b.name.toLowerCase().includes(bankSearch.toLowerCase())).map((bl, idx) => (
                                        <div 
                                          key={idx}
                                          onClick={() => {
                                            const selectText = bl.name;
                                            setFormData(prev => {
                                              if (!prev.bankDetails?.trim()) return { ...prev, bankDetails: selectText };
                                              if (!prev.bankDetails.includes(selectText)) return { ...prev, bankDetails: prev.bankDetails + `\n${selectText}` };
                                              return prev;
                                            });
                                            setBankSearch('');
                                            setShowBankDropdown(false);
                                          }}
                                          className="p-2.5 text-xs border-b cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-850 dark:text-slate-200 border-slate-100"
                                        >
                                          {bl.name}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="p-2.5 text-xs text-slate-400 italic text-center">No matching Bank cash account ledger found.</div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-455 dark:text-slate-345 mb-1">Bank particulars Printed in Invoices</label>
                                <textarea 
                                  rows={2}
                                  value={formData.bankDetails || ''}
                                  style={inputStyle}
                                  onChange={e => setFormData({ ...formData, bankDetails: e.target.value })}
                                  placeholder="E.g. Bank name: SBI, Acc: 10203045, IFSC: SBIN00012"
                                  className="w-full border rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-semibold"
                                />
                              </div>

                              <div>
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-455 dark:text-slate-345 mb-1">Invoice Terms Header</label>
                                <textarea 
                                  rows={2}
                                  value={formData.terms || ''}
                                  style={inputStyle}
                                  onChange={e => setFormData({ ...formData, terms: e.target.value })}
                                  placeholder="E.g. Subject to local jurisdiction..."
                                  className="w-full border rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-semibold"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* SNUG SAVE ACTION FLOATER */}
                  <div className="flex justify-end gap-2 p-1">
                    <button 
                      type="submit"
                      disabled={saving}
                      className="w-full sm:w-auto min-w-[130px] bg-gradient-to-r from-brand-primary to-indigo-600 hover:opacity-95 text-white font-extrabold py-2.5 px-4 rounded-xl shadow-sm active:scale-95 transition-all flex justify-center items-center gap-1.5 text-xs text-center border-0 cursor-pointer"
                    >
                      {saving ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Save size={14} />}
                      {saving ? "Saving..." : "Save Settings (अपडेट करें)"}
                    </button>
                  </div>
                  
                </form>

              </div>
            </div>
          </main>
        )}

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
