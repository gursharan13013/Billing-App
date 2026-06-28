import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Building, MapPin, Phone, Mail, Globe, CreditCard, Flag, Layers, Briefcase, Loader2, Navigation, Search, ChevronDown, X, Check, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { CompanyProfile, UNIFIED_CATEGORIES } from '../types';
import { billingService } from '../src/services/billingService';
import { motion, AnimatePresence } from 'motion/react';

interface CompanyProfileScreenProps {
  onBack: () => void;
  onSaveSuccess?: () => void;
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

// Default Location: New Delhi
const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.2090;

export const CompanyProfileScreen: React.FC<CompanyProfileScreenProps> = ({ onBack, onSaveSuccess }) => {
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

  // Active Tab for detailed editor mode to prevent vertical bloat
  const [activeTab, setActiveTab] = useState<'identity' | 'contact' | 'address' | 'bank'>('identity');

  // Stepper state for onboarding (first-time only)
  const isInitialSetup = localStorage.getItem('app_initialized') !== 'true';
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  // Custom premium notification states
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showSuccessOnboardModal, setShowSuccessOnboardModal] = useState(false);

  useEffect(() => {
    billingService.getCompanyProfile().then(data => {
        setFormData({
            ...data,
            isGstRegistered: data.isGstRegistered ?? !!data.gstin,
            latitude: data.latitude || DEFAULT_LAT,
            longitude: data.longitude || DEFAULT_LNG
        });
        if (data.businessCategory) {
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
        setToastMessage({ type: 'error', text: 'Geolocation is not supported by this browser.' });
      }
      return;
    }
    setGettingLocation(true);
    if (!isAuto) {
      setToastMessage({ type: 'info', text: 'Fetching live GPS address... Please allow location request.' });
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
          setToastMessage({ type: 'info', text: 'GPS connected! Fetching address details...' });
        }

        try {
          // OpenStreetMap Nominatim reverse geocoding API
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: {
              'Accept-Language': 'en'
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.address) {
              const addressObj = data.address;
              
              // Normalize State from Response
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

              setToastMessage({ type: 'success', text: 'Live location & address synchronized! 📍' });
            } else {
              if (!isAuto) {
                setToastMessage({ type: 'success', text: 'GPS Coordinates fetched!' });
              }
            }
          } else {
            if (!isAuto) {
              setToastMessage({ type: 'success', text: 'GPS Coordinates fetched!' });
            }
          }
        } catch (err) {
          console.warn("Reverse geocode request issue", err);
          if (!isAuto) {
            setToastMessage({ type: 'success', text: 'GPS Coordinates linked successfully!' });
          }
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        setGettingLocation(false);
        console.warn("Geolocation failure", error);
        if (!isAuto) {
          setToastMessage({ type: 'error', text: 'Live tracking permission denied or timed out.' });
        }
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (isInitialSetup && currentStep === 3) {
      triggerLocationFetch(true);
    }
  }, [currentStep]);

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
      setToastMessage({ type: 'error', text: 'Demo content loading encountered an issue.' });
    }
  };

  const handleSaveAndComplete = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    
    // Fallbacks if fields left empty
    const sanitizedProfile: CompanyProfile = {
      ...formData,
      name: formData.name.trim() || 'My Business',
      address: formData.address.trim() || 'Not Specified',
      gstin: formData.gstin.trim() || '',
      latitude: formData.latitude || DEFAULT_LAT,
      longitude: formData.longitude || DEFAULT_LNG
    };

    try {
      await billingService.saveCompanyProfile(sanitizedProfile, false);
      const isInitial = localStorage.getItem('app_initialized') !== 'true';
      
      try {
        localStorage.setItem('companyProfileSetup', 'true');
        if (!isInitial) {
          localStorage.setItem('app_initialized', 'true');
          localStorage.setItem('onboardingCompleted', 'true');
        }
      } catch (err) {
        console.warn('Failed to set localStorage', err);
      }
      
      setSaving(false);

      if (isInitialSetup) {
        setShowSuccessOnboardModal(true);
      } else {
        setToastMessage({ type: 'success', text: 'Business Profile successfully updated! ✅' });
        setTimeout(() => {
          if (onSaveSuccess) onSaveSuccess();
          else onBack();
        }, 1200);
      }
    } catch (error) {
      console.error("Save error", error);
      setSaving(false);
      setToastMessage({ type: 'error', text: 'Profile fail context. Please review and try again.' });
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

  // Validation checks with trimmed helpers
  const mobileTrimmed = formData.mobile.trim();
  const isMobileValid = mobileTrimmed.length >= 10 && /^\+?[0-9]{10,14}$/.test(mobileTrimmed);
  const isEmailValid = formData.email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
  const isContactStepValid = isMobileValid && isEmailValid;

  const getMobileError = () => {
    if (mobileTrimmed.length > 0 && !isMobileValid) {
      return "Format invalid. Enter at least 10 numbers.";
    }
    return null;
  };

  const getEmailError = () => {
    if (formData.email.trim().length > 0 && !isEmailValid) {
      return "Please enter a valid email address.";
    }
    return null;
  };

  const STEPS_CONFIG = [
    { label: 'Contact', desc: 'Mobile & Email', icon: Phone },
    { label: 'Identity', desc: 'Name & GST', icon: Building },
    { label: 'Category', desc: 'BusinessType', icon: Briefcase },
    { label: 'Address', desc: 'State & Map', icon: MapPin },
    { label: 'Bank', desc: 'Terms & Cards', icon: CreditCard }
  ];

  const editorTabs = [
    { id: 'identity', label: 'Identity & Registration', icon: Building, desc: 'Name, GST & PAN details' },
    { id: 'contact', label: 'Contact Settings', icon: Phone, desc: 'Mobile, Email & Web links' },
    { id: 'address', label: 'Billing Address', icon: MapPin, desc: 'Street, State & GPS location' },
    { id: 'bank', label: 'Bank & Footers', icon: CreditCard, desc: 'Terms & printed bank rules' }
  ] as const;

  // Motion variants for slide transitions
  const stepVariants = {
    enter: (dir: 'forward' | 'backward') => ({
      x: dir === 'forward' ? 80 : -80,
      opacity: 0,
      scale: 0.99
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (dir: 'forward' | 'backward') => ({
      x: dir === 'forward' ? -80 : 80,
      opacity: 0,
      scale: 0.99
    })
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
        <Loader2 className="animate-spin text-brand-primary w-10 h-10 mb-2" />
        <p className="text-xs font-semibold opacity-75">Loading Profile Details...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full pb-[max(env(safe-area-inset-bottom),0px)] relative overflow-hidden ${
      isInitialSetup 
        ? 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-white' 
        : 'bg-slate-50 dark:bg-slate-950 text-text-main'
    }`}>
      
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
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-200 p-1">
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
              className="w-full bg-gradient-to-r from-brand-primary to-money-in py-2.5 rounded-lg text-xs font-extrabold text-white shadow-md active:scale-[0.98] transition-all"
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
              className="w-full bg-green-600 hover:bg-green-700 font-extrabold py-2.5 rounded-lg text-xs text-white shadow-md active:scale-95 transition-all duration-150"
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* Header section (snug height) */}
      <header className={`px-4 py-3 sm:py-3.5 flex items-center gap-2.5 shrink-0 border-b pt-[max(env(safe-area-inset-top),48px)] ${
        isInitialSetup 
          ? 'bg-slate-900 text-white border-slate-800' 
          : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200/80 dark:border-slate-800 shadow-xs'
      }`}>
        {!isInitialSetup && (
          <button onClick={onBack} className="p-1 px-1.5 focus:bg-slate-100 dark:focus:bg-slate-800 rounded-lg active:scale-90 transition-all text-slate-600 dark:text-slate-300">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm sm:text-base font-extrabold leading-tight tracking-tight mt-0.5">
            {isInitialSetup ? 'Business Profiles Onboarding' : 'Modify Company Profile'}
          </h1>
          {isInitialSetup ? (
            <p className="text-[10px] text-slate-400 tracking-wide font-medium truncate">Quick steps to set up invoice parameters</p>
          ) : (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Configure GSTIN, location, and printed ledger footers</p>
          )}
        </div>
      </header>

      {/* FIRST TIME ONBOARDING SYSTEM */}
      {isInitialSetup ? (
        <div className="flex-grow flex flex-col justify-between overflow-hidden">
          
          {/* Progress Indicators (Tighter Spacing) */}
          <div className="bg-slate-950/30 border-b border-slate-800/60 p-2.5 sm:p-3 shrink-0">
            <div className="max-w-md mx-auto">
              <div className="relative flex justify-between items-center px-1 mb-1.5">
                <div className="absolute top-1/2 left-0 w-full h-[1.5px] bg-slate-800 -translate-y-1/2 z-0">
                  <div 
                    className="h-full bg-gradient-to-r from-brand-primary to-indigo-500 transition-all duration-400 ease-out" 
                    style={{ width: `${(currentStep / 4) * 100}%` }}
                  ></div>
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
                      className={`relative z-10 w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all duration-200 ${
                        isCompleted 
                          ? 'bg-gradient-to-tr from-brand-primary to-indigo-650 text-white shadow-sm shadow-brand-primary/10'
                          : isActive
                            ? 'bg-slate-50 text-slate-950 border border-brand-primary shadow ring-4 ring-brand-primary/10 font-bold scale-105'
                            : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      {isCompleted ? <Check size={11} strokeWidth={3.5} /> : <Icon size={11} />}
                    </button>
                  );
                })}
              </div>

              {/* Step Title Micro Labels */}
              <div className="flex justify-between text-[9px] text-slate-400 font-bold px-1.5 select-none tracking-tight">
                <span className={currentStep === 0 ? 'text-slate-100' : ''}>Contact</span>
                <span className={currentStep === 1 ? 'text-slate-100' : ''}>Identity</span>
                <span className={currentStep === 2 ? 'text-slate-100' : ''}>Industry</span>
                <span className={currentStep === 3 ? 'text-slate-100' : ''}>Location</span>
                <span className={currentStep === 4 ? 'text-slate-100' : ''}>Bank Details</span>
              </div>
            </div>
          </div>

          {/* Stepper Card Frame (Snug & aligned from top to keep gap consistent) */}
          <div className="flex-1 overflow-y-auto pl-3 pt-3.5 pr-3 pb-3 sm:p-4 flex items-start justify-center">
            <div className="w-full max-w-md bg-slate-900/65 border border-slate-800/80 pl-4 pr-4 pb-4 pt-[14px] ml-[1px] rounded-xl shadow-xl backdrop-blur-md h-[470px] flex flex-col justify-between">
              
              <div className="flex-1 flex flex-col justify-between overflow-y-auto pr-1">
              
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "tween", ease: "easeInOut", duration: 0.25 }}
                  className="space-y-3"
                >
                  
                  {/* STEP 1: CONTACT */}
                  {currentStep === 0 && (
                    <div className="space-y-3">
                      <div className="border-b border-indigo-900/35 pb-1.5">
                        <div className="flex items-center gap-1.5 text-brand-primary font-bold text-xs uppercase tracking-wider">
                          <Phone size={11} /> Step 1: Secure Connectivity
                        </div>
                        <h2 className="text-base font-extrabold text-white mt-0.5">Primary Contact particulars</h2>
                        <p className="text-xs text-slate-400 leading-normal">Your mobile & email are mandatory to keep transaction tables protected.</p>
                      </div>

                      {/* QUICK SEED PANEL (Very Compact) */}
                      <div className="p-2 bg-brand-primary/5 border border-brand-primary/10 rounded-lg flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-indigo-400 flex items-center gap-1">⚡ Sandboxed Demo Seeder</p>
                          <p className="text-xs text-slate-400 leading-snug">Fill profile immediately with demo ledger entries & reports.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleFillDemoProfile}
                          className="bg-brand-primary text-white hover:opacity-90 active:scale-95 text-xs font-extrabold px-2.5 py-1.5 rounded transition-all shadow-xs shrink-0"
                        >
                          SeedTest
                        </button>
                      </div>

                      <div className="space-y-2 mt-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-0.5 uppercase tracking-wide">Mobile Number (Mobile/Phone)</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 text-xs text-slate-500 font-mono">+91</span>
                            <input 
                              type="tel"
                              required
                              value={formData.mobile}
                              onChange={e => setFormData({ ...formData, mobile: e.target.value.replace(/[^0-9+]/g, '') })}
                              placeholder="9876543210"
                              className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-1.5 px-9 text-xs text-white outline-none focus:border-brand-primary transition-all font-mono"
                            />
                          </div>
                          {getMobileError() && (
                            <p className="text-xs text-red-400 font-semibold mt-0.5 flex items-center gap-1">
                              <AlertCircle size={10} /> {getMobileError()}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-0.5 uppercase tracking-wide">Email Address</label>
                          <div className="relative">
                            <Mail size={12} className="absolute left-2.5 top-2 text-slate-500" />
                            <input 
                              type="email"
                              required
                              value={formData.email}
                              onChange={e => setFormData({ ...formData, email: e.target.value })}
                              placeholder="info@yourstore.com"
                              className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-1.5 pl-8 pr-2.5 text-xs text-white outline-none focus:border-brand-primary transition-all"
                            />
                          </div>
                          {getEmailError() && (
                            <p className="text-xs text-red-400 font-semibold mt-0.5 flex items-center gap-1">
                              <AlertCircle size={10} /> {getEmailError()}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-0.5 uppercase tracking-wide">Website URL (Optional)</label>
                          <div className="relative">
                            <Globe size={12} className="absolute left-2.5 top-2 text-slate-500" />
                            <input 
                              type="text"
                              value={formData.website || ''}
                              onChange={e => setFormData({ ...formData, website: e.target.value })}
                              placeholder="www.yourcompany.com"
                              className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-1.5 pl-8 pr-2.5 text-xs text-white outline-none focus:border-brand-primary transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: BUSINESS IDENTITY DETAILS */}
                  {currentStep === 1 && (
                    <div className="space-y-3">
                      <div className="border-b border-indigo-900/35 pb-1.5">
                        <div className="flex items-center gap-1.5 text-brand-primary font-bold text-xs uppercase tracking-wider">
                          <Building size={11} /> Step 2: Legal Registration
                        </div>
                        <h2 className="text-base font-extrabold text-white mt-0.5">Enterprise Name & Tax Code</h2>
                        <p className="text-xs text-slate-400 leading-normal">Specify the name printed in billing vouchers. Non-GST systems proceed instantly.</p>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-0.5 uppercase tracking-wide">Business / Trade Name</label>
                          <input 
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Retail Shoppee (Default: My Business)"
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white outline-none focus:border-brand-primary transition-all font-semibold"
                          />
                        </div>

                        {/* GST Registry Toggle State */}
                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide">GST Registration Status</label>
                          <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, isGstRegistered: false, gstin: '' })}
                              className={`py-1.5 rounded text-xs font-black transition-all ${
                                !formData.isGstRegistered ? 'bg-brand-primary text-white' : 'text-slate-400'
                              }`}
                            >
                              Non-GST (बिना टैक्स)
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, isGstRegistered: true })}
                              className={`py-1.5 rounded text-xs font-black transition-all ${
                                formData.isGstRegistered ? 'bg-brand-primary text-white shadow' : 'text-slate-400'
                              }`}
                            >
                              GST Registered (टैक्स)
                            </button>
                          </div>
                        </div>

                        {formData.isGstRegistered && (
                          <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                            <label className="block text-xs font-bold text-slate-300 mb-0.5 uppercase tracking-wide">GSTIN (15-characters)</label>
                            <input 
                              type="text"
                              value={formData.gstin}
                              onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                              placeholder="07AAAAA0000A1Z5"
                              className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white uppercase outline-none focus:border-brand-primary font-mono"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-0.5 uppercase tracking-wide">Company PAN Number (Optional)</label>
                          <input 
                            type="text"
                            value={formData.pan || ''}
                            onChange={e => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                            placeholder="ABCDE1234F"
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white uppercase outline-none focus:border-brand-primary font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: BUSINESS CLASSIFICATION */}
                  {currentStep === 2 && (
                    <div className="space-y-3">
                      <div className="border-b border-indigo-900/35 pb-1.5">
                        <div className="flex items-center gap-1.5 text-brand-primary font-bold text-xs uppercase tracking-wider">
                          <Briefcase size={11} /> Step 3: Industry Code
                        </div>
                        <h2 className="text-base font-extrabold text-white mt-0.5">Sector Classification</h2>
                        <p className="text-xs text-slate-400 leading-normal">Allows EazyBilling's financial ledger rules to adjust tax matrices appropriately.</p>
                      </div>

                      <div className="space-y-3">
                        <div className="relative">
                          <label className="block text-xs font-bold text-slate-300 mb-0.5 uppercase tracking-wide">Industrial Sector / Line</label>
                          <div className="relative">
                            <input 
                              type="text"
                              value={categorySearch}
                              onFocus={() => setShowCategoryDropdown(true)}
                              onChange={(e) => {
                                  setCategorySearch(e.target.value);
                                  setShowCategoryDropdown(true);
                              }}
                              placeholder="Type to search e.g. Dairy, Grocery..."
                              className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-1.5 pl-7 pr-7 text-xs text-white outline-none focus:border-brand-primary"
                            />
                            <Search className="absolute left-2.5 top-2 text-slate-500" size={12} />
                            {categorySearch && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCategorySearch('');
                                  setFormData({ ...formData, businessCategory: '' });
                                }}
                                className="absolute right-2 top-2 text-slate-400 hover:text-white"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>

                          {showCategoryDropdown && (
                            <div className="absolute z-55 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg shadow-2xl">
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
                                  className="p-2 text-xs text-slate-200 border-b border-slate-850 cursor-pointer hover:bg-slate-800 flex justify-between items-center"
                                >
                                  <span>{cat.en}</span>
                                  <span className="text-xs text-slate-500">({cat.hi})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-0.5 uppercase tracking-wide">Operation Style</label>
                          <select
                            value={formData.businessType || ''}
                            onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-slate-200 outline-none"
                          >
                            <option value="">- Select Style -</option>
                            {BUSINESS_TYPES.map(type => (
                              <option key={type} value={type} className="bg-slate-950 text-slate-100">{type}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: ADDRESS DETAILS LOCATION */}
                  {currentStep === 3 && (
                    <div className="space-y-3">
                      <div className="border-b border-indigo-900/35 pb-1.5">
                        <div className="flex items-center gap-1.5 text-brand-primary font-bold text-xs uppercase tracking-wider">
                          <MapPin size={11} /> Step 4: Physical Location
                        </div>
                        <h2 className="text-base font-extrabold text-white mt-0.5">Where is your store based?</h2>
                        <p className="text-xs text-slate-400 leading-normal">Printed directly in customer invoice details. Coordinates map automatically.</p>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-0.5 uppercase tracking-wide">Street Address (Local Office)</label>
                          <textarea 
                            rows={1.5}
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Plot Num, Area, Market sector"
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-2 text-xs text-white resize-none outline-none focus:border-brand-primary"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-0.5 uppercase tracking-wide">State</label>
                            <select
                              value={formData.state || ''}
                              onChange={e => setFormData({ ...formData, state: e.target.value })}
                              className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-1.5 px-2 text-xs text-slate-200 outline-none focus:border-brand-primary"
                            >
                              <option value="">- State -</option>
                              {INDIAN_STATES.map(s => (
                                <option key={s} value={s} className="bg-slate-950 text-slate-200">{s}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-0.5 uppercase tracking-wide">City</label>
                            <input 
                              type="text"
                              value={formData.city || ''}
                              onChange={e => setFormData({ ...formData, city: e.target.value })}
                              placeholder="City / Town"
                              className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white outline-none focus:border-brand-primary"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 items-center">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-0.5 uppercase tracking-wide">Pincode</label>
                            <input 
                              type="number"
                              value={formData.pincode || ''}
                              onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                              placeholder="Pincode e.g. 110001"
                              className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white outline-none focus:border-brand-primary font-mono"
                            />
                          </div>

                          <div className="mt-3.5">
                            <button
                              type="button"
                              disabled={gettingLocation}
                              onClick={() => triggerLocationFetch(false)}
                              className="w-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary hover:text-white transition-all text-xs font-extrabold py-2 rounded-lg active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              {gettingLocation ? <Loader2 className="animate-spin w-3 h-3" /> : <Navigation size={10} />}
                              Get GPS Coords
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 5: BANK DETAILS & TERMS */}
                  {currentStep === 4 && (
                    <div className="space-y-3">
                      <div className="border-b border-indigo-900/35 pb-1.5">
                        <div className="flex items-center gap-1.5 text-brand-primary font-bold text-xs uppercase tracking-wider">
                          <CreditCard size={11} /> Step 5: Printed Footers
                        </div>
                        <h2 className="text-base font-extrabold text-white mt-0.5">Voucher Rules & Terms</h2>
                        <p className="text-xs text-slate-400 leading-normal">Enter details printed at the bottom of bills. You can skip any blank box.</p>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-0.5 uppercase tracking-wide">Bank Account details</label>
                          <textarea 
                            rows={2}
                            value={formData.bankDetails || ''}
                            onChange={e => setFormData({ ...formData, bankDetails: e.target.value })}
                            placeholder="Ac: 100200400, Bank: ICICI, IFSC..."
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-2 text-xs text-white resize-none outline-none focus:border-brand-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-0.5 uppercase tracking-wide">Customer Terms & Conditions</label>
                          <textarea 
                            rows={2}
                            value={formData.terms || ''}
                            onChange={e => setFormData({ ...formData, terms: e.target.value })}
                            placeholder="e.g. Subject to local Jurisdiction."
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-2 text-xs text-white resize-none outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
              </div>

              {/* NAVIGATION ACTION BAR FOR WIZARD */}
              <div className="flex justify-between items-center pt-2.5 gap-2.5 border-t border-slate-800/60 mt-3 md:mt-4 shrink-0">
                <button
                  type="button"
                  onClick={handleBackStep}
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    currentStep === 0 
                      ? 'invisible pointer-events-none' 
                      : 'bg-slate-850 hover:bg-slate-800 text-slate-300 active:scale-95'
                  }`}
                >
                  <ArrowLeft size={12} /> Back
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSkipStep}
                    className="px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-850/30 font-bold transition-all active:scale-95"
                  >
                    {currentStep === 4 ? "Skip & Finish" : "Skip"}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 transition-all ${
                      currentStep === 4
                        ? 'bg-gradient-to-r from-brand-primary to-money-in text-white shadow-md'
                        : 'bg-brand-primary text-white shadow-xs'
                    }`}
                  >
                    {saving ? (
                      <Loader2 className="animate-spin w-3.5 h-3.5" />
                    ) : currentStep === 4 ? (
                      <>Save profile <Check size={12} /></>
                    ) : (
                      <>Next <ArrowRight size={12} /></>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      ) : (
        /* NORMAL DETAILED EDITOR MODE (ACCESSED VIA SETTINGS SCREEN) WITH TWO-COLUMN PREMIUM GRIDS */
        <div className="flex-grow overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 bg-slate-50 dark:bg-slate-950/40">
          <div className="max-w-4xl mx-auto space-y-4">
            
            {/* Sandboxed Seeder Banner */}
            <div className="p-3 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-50/70 to-blue-50/70 dark:from-slate-900/40 dark:to-indigo-950/35 border border-indigo-100/60 dark:border-blue-900/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-blue-350 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-brand-primary" /> Auto-Fill Sandbox Seeder
                </p>
                <p className="text-[11px] text-slate-550 dark:text-slate-400">Need immediate mockup entities? Seed test products, invoices and client lists into the browser's persistent database.</p>
              </div>
              <button
                type="button"
                onClick={handleFillDemoProfile}
                className="bg-brand-primary hover:bg-indigo-600 text-white font-extrabold px-3 py-1.8 rounded-lg text-xs tracking-tight shrink-0 shadow-xs active:scale-95 transition-all duration-150"
              >
                ⚡ Seed Demo Data
              </button>
            </div>

            {/* Split layout: left navigation and right snug inputs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start pb-10">
              
              {/* Left tab sidebar list (or slide pills on mobile layout) */}
              <div className="flex overflow-x-auto md:flex-col gap-1 md:gap-1.5 pb-2 md:pb-0 md:col-span-1 bg-white dark:bg-slate-900 p-2 border border-slate-200/50 dark:border-slate-800 rounded-xl scrollbar-none shrink-0 sticky top-0 z-10">
                {editorTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2.5 px-3 py-2 sm:py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap text-left w-full ${
                        isActive
                          ? 'bg-brand-primary text-white shadow-xs'
                          : 'text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Icon size={14} className={isActive ? 'text-white animate-pulse' : 'text-slate-440'} />
                      <div className="hidden md:block">
                        <div className="leading-tight">{tab.label}</div>
                        <div className={`text-[9px] font-semibold mt-0.5 opacity-75 truncate ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {tab.desc}
                        </div>
                      </div>
                      <span className="md:hidden text-xs">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right panel: Single visual snug card */}
              <form onSubmit={handleSaveAndComplete} className="md:col-span-3 space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 sm:p-5 rounded-xl shadow-xs">
                  
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
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center gap-1.5">
                              <Building size={14} className="text-brand-primary" /> Enterprise Identity & Trade Setup
                            </h3>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-0.5">Business Name (Trade Name)</label>
                              <input 
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-lg py-1.5 px-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-bold outline-none focus:ring-1 focus:ring-brand-primary"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-0.5">Industry Category / Class</label>
                                <div className="relative">
                                  <input 
                                    type="text"
                                    value={categorySearch}
                                    onFocus={() => setShowCategoryDropdown(true)}
                                    onChange={(e) => {
                                      setCategorySearch(e.target.value);
                                      setShowCategoryDropdown(true);
                                    }}
                                    className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-lg py-1.5 pl-3 pr-7 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-brand-primary"
                                  />
                                  <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400" />
                                </div>

                                {showCategoryDropdown && (
                                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg">
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
                                        className="p-2.5 text-xs text-slate-850 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 flex justify-between items-center"
                                      >
                                        <span>{cat.en}</span>
                                        <span className="text-xs text-slate-400">({cat.hi})</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-0.5">Operation Type (Classification)</label>
                                <select
                                  value={formData.businessType || ''}
                                  onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-lg py-1.5 px-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-medium outline-none focus:ring-1 focus:ring-brand-primary"
                                >
                                  <option value="">- Select System -</option>
                                  {BUSINESS_TYPES.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Tighter inline GST status segmented slider picker */}
                            <div>
                              <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1 font-extrabold">GST Tax Filing System Designation</label>
                              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800/80">
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, isGstRegistered: false, gstin: '' })}
                                  className={`py-1 rounded text-xs font-bold transition-all ${
                                    !formData.isGstRegistered ? 'bg-white dark:bg-slate-800 text-brand-primary shadow-xs' : 'text-slate-400'
                                  }`}
                                >
                                  Non-GST Scheme (नॉन-जीएसटी)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, isGstRegistered: true })}
                                  className={`py-1 rounded text-xs font-bold transition-all ${
                                    formData.isGstRegistered ? 'bg-white dark:bg-slate-800 text-brand-primary shadow-xs' : 'text-slate-400'
                                  }`}
                                >
                                  GST Registered Scheme (जीएसटी)
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
                              {formData.isGstRegistered && (
                                <div>
                                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-0.5">GSTIN Code (Tax-Registry ID)</label>
                                  <input 
                                    type="text"
                                    value={formData.gstin}
                                    onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                                    className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-lg py-1.5 px-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 uppercase outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                                    placeholder="07AAAAA0000A1Z5"
                                  />
                                </div>
                              )}

                              <div className={formData.isGstRegistered ? '' : 'col-span-1 sm:col-span-2'}>
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-0.5">Corporate PAN Registry Number</label>
                                <input 
                                  type="text"
                                  value={formData.pan || ''}
                                  onChange={e => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-lg py-1.5 px-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 uppercase outline-none focus:ring-1 focus:ring-brand-primary font-mono"
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
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center gap-1.5">
                              <Phone size={14} className="text-brand-primary" /> primary Contact Channels
                            </h3>
                          </div>

                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-0.5">Secure Mobile Number</label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-mono">+91</span>
                                  <input 
                                    type="tel"
                                    required
                                    value={formData.mobile}
                                    onChange={e => setFormData({ ...formData, mobile: e.target.value.replace(/[^0-9+]/g, '') })}
                                    className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-lg py-1.5 pl-10 pr-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-mono outline-none"
                                  />
                                </div>
                                {getMobileError() && (
                                  <p className="text-xs text-red-500 font-semibold mt-0.5 flex items-center gap-1">⚠️ {getMobileErrorCustom()}</p>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-0.5">Registered Email</label>
                                <div className="relative">
                                  <Mail size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                                  <input 
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-lg py-1.5 pl-8 pr-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none"
                                  />
                                </div>
                                {getEmailError() && (
                                  <p className="text-xs text-red-500 font-semibold mt-0.5 flex items-center gap-1">⚠️ {getEmailError()}</p>
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-0.5">Enterprise Web Portal (Optional)</label>
                              <div className="relative">
                                <Globe size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                                <input 
                                  type="text"
                                  value={formData.website || ''}
                                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                                  placeholder="e.g. www.yourcompany.com"
                                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-lg py-1.5 pl-8 pr-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none"
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
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center gap-1.5">
                              <MapPin size={14} className="text-brand-primary" /> Physical Location & Address Info
                            </h3>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-0.5">Street Address Line</label>
                              <textarea 
                                rows={1.5}
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-brand-primary resize-none"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-0.5">Billing State</label>
                                <select
                                  value={formData.state || ''}
                                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-lg py-1.5 px-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none"
                                >
                                  <option value="">- Select State -</option>
                                  {INDIAN_STATES.map(st => (
                                    <option key={st} value={st}>{st}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-0.5">City / Town</label>
                                <input 
                                  type="text"
                                  value={formData.city || ''}
                                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-lg py-1.5 px-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                              <div>
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-0.5">Pincode</label>
                                <input 
                                  type="number"
                                  value={formData.pincode || ''}
                                  onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-lg py-1.5 px-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-mono outline-none"
                                  placeholder="Pincode"
                                />
                              </div>

                              <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between gap-2.5 mt-3">
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
                                  className="bg-brand-primary/10 text-brand-primary border border-brand-primary/15 hover:bg-brand-primary hover:text-white transition-all text-xs font-extrabold px-3 py-1.5 rounded-md flex items-center gap-1 active:scale-95 duration-100"
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
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center gap-1.5">
                              <CreditCard size={14} className="text-brand-primary" /> Bank Ledger & Print footers
                            </h3>
                          </div>

                          <div className="space-y-3 animate-in fade-in duration-200">
                            <div>
                              <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1">Select Account Ledger Bank Reference (Ledger Search)</label>
                              <div className="relative">
                                <input 
                                  type="text"
                                  placeholder="Search accounts e.g. SBI Account, Ac Cash..."
                                  value={bankSearch}
                                  onFocus={() => setShowBankDropdown(true)}
                                  onChange={(e) => {
                                    setBankSearch(e.target.value);
                                    setShowBankDropdown(true);
                                  }}
                                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-lg py-1.5 pl-8 pr-2.5 text-xs outline-none focus:ring-1 focus:ring-brand-primary"
                                />
                                <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
                              </div>

                              {showBankDropdown && (
                                <div className="absolute z-10 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl">
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
                                        className="p-2.5 text-xs text-slate-850 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
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
                              <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-0.5">Bank particulars Printed in Invoices</label>
                              <textarea 
                                rows={2}
                                value={formData.bankDetails || ''}
                                onChange={e => setFormData({ ...formData, bankDetails: e.target.value })}
                                placeholder="E.g. Bank name: SBI, Acc: 10203045, IFSC: SBIN00012"
                                className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-200 outline-none focus:ring-1 focus:ring-brand-primary resize-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-0.5">Invoice Terms Header (Print Notes)</label>
                              <textarea 
                                rows={2}
                                value={formData.terms || ''}
                                onChange={e => setFormData({ ...formData, terms: e.target.value })}
                                placeholder="E.g. Subject to Delhi jurisdiction..."
                                className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-200 outline-none focus:ring-1 focus:ring-brand-primary resize-none"
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
                    className="w-full sm:w-auto min-w-[130px] bg-gradient-to-r from-brand-primary to-money-in hover:opacity-95 text-white font-extrabold py-2 px-4 rounded-lg shadow-sm active:scale-95 transition-all flex justify-center items-center gap-1.5 text-xs text-center border-0"
                  >
                    {saving ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Save size={14} />}
                    {saving ? "Saving..." : "Save Settings (अपडेट करें)"}
                  </button>
                </div>
                
              </form>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

function getMobileErrorCustom() {
  return "Must enter at least 10 numbers.";
}
