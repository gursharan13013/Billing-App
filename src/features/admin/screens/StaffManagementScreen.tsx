import React, { useState } from 'react';
import { 
  ArrowLeft, Plus, Search, Phone, Shield, User, Lock, 
  Eye, EyeOff, RefreshCw, Smartphone, Key, X, Check, Save, Share2, Copy, ExternalLink 
} from 'lucide-react';
import { BillingService } from '../../../services/SecureBillingService';
import { writeAuditLog } from '../../../services/firebaseService';
import { useAuth } from '../../../context/AuthContext';

interface StaffMember {
  id: string;
  name: string;
  mobile: string;
  password?: string;
  permissions: {
    can_delete_invoice: boolean;
    can_edit_stock: boolean;
    view_reports: boolean;
    manage_settings: boolean;
  };
  businessId: string;
  createdAt: number;
  lastLogin?: number | null;
}

interface StaffManagementScreenProps {
  staffList: StaffMember[];
  loading: boolean;
  businessId: string;
  onSelectStaff: (staff: StaffMember) => void;
  onBack: () => void;
  onRefresh: () => void;
  onAddStaffSuccess: () => void;
  currentLanguage?: 'en' | 'hi';
}

export const StaffManagementScreen: React.FC<StaffManagementScreenProps> = ({
  staffList,
  loading,
  businessId,
  onSelectStaff,
  onBack,
  onRefresh,
  onAddStaffSuccess,
  currentLanguage = 'en'
}) => {
  const isHi = currentLanguage === 'hi';
  const { currentUser } = useAuth();
  const currentStoreCode = currentUser?.storeCode || localStorage.getItem('storeCode') || '';

  // Base State variables
  const [searchQuery, setSearchQuery] = useState('');
  const [showProvisioningModal, setShowProvisioningModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedStoreCode, setCopiedStoreCode] = useState(false);
  const [showStoreCredentials, setShowStoreCredentials] = useState(true);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Default permissions state for fresh staff
  const [formPermissions, setFormPermissions] = useState({
    can_delete_invoice: false,
    can_edit_stock: true,
    view_reports: false,
    manage_settings: false,
  });

  const t = {
    title: isHi ? 'कर्मचारी प्रबंधन' : 'Staff Operator Hub',
    subtitle: isHi ? 'स्टोर सुरक्षा और ऑपरेटर लिस्ट' : 'Provision credentials & track terminal operators',
    searchPlaceholder: isHi ? 'कर्मचारी का नाम या मोबाइल खोजें...' : 'Search operators by name or phone...',
    totalStaff: isHi ? 'कुल सक्रिय कर्मचारी' : 'Total Authorized Operators',
    addStaff: isHi ? 'नया कर्मचारी जोड़ें' : 'Provision Staff Identity',
    noStaffFound: isHi ? 'कोई कर्मचारी नहीं मिला।' : 'No authorized operators match filters.',
    nameLabel: isHi ? 'ऑपरेटर का नाम (Human Name)' : 'Operator Legal Name',
    mobileLabel: isHi ? '10-अंकीय मोबाइल नंबर (Username)' : '10-Digit Mobile Username',
    passwordLabel: isHi ? 'सुरक्षित पासवर्ड' : 'Secure Login Password',
    back: isHi ? 'पीछे' : 'Back',
    generateCode: isHi ? 'कोड बनाएं' : 'Auto Generate',
    btnSubmit: isHi ? 'क्रेडेंशियल सेव करें' : 'Confirm & Write to Cloud',
    btnCancel: isHi ? 'रद्द करें' : 'Cancel',
    errFill: isHi ? 'कृपया सभी फ़ील्ड सही से भरें।' : 'Please fill all fields accurately.',
    errMobileLength: isHi ? 'मोबाइल नंबर 10 अंकों का होना चाहिए।' : 'Mobile number must be exactly 10 digits.',
    errMobileExists: isHi ? 'यह मोबाइल नंबर पहले से ही स्टाफ लिस्ट में मौजूद है।' : 'Mobile username already exists in registry.',
    successAdd: isHi ? 'नया ऑपरेटर सफलतापूर्वक पंजीकृत किया गया।' : 'New staff identity successfully deployed.',
  };

  // Generate 4-digit fast secure code
  const handleRandomPassword = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setFormPassword(code);
  };

  const handleMobileChange = (val: string) => {
    // Only permit digits up to 10
    const cleanDigits = val.replace(/\D/g, '').substring(0, 10);
    setFormMobile(cleanDigits);
  };

  // Handle Provision submission Form
  const handleSubmitProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    const cleanName = formName.trim();
    const cleanMobile = formMobile.trim();
    const cleanPassword = formPassword.trim();

    if (!cleanName || !cleanMobile || !cleanPassword) {
      setErrorMsg(t.errFill);
      setSubmitting(false);
      return;
    }

    if (cleanMobile.length !== 10) {
      setErrorMsg(t.errMobileLength);
      setSubmitting(false);
      return;
    }

    // Check pre-existing Mobile
    const exists = staffList.some((s) => s.mobile === cleanMobile);
    if (exists) {
      setErrorMsg(t.errMobileExists);
      setSubmitting(false);
      return;
    }

    const payload = {
      id: cleanMobile, // Use mobile as structured key
      name: cleanName,
      mobile: cleanMobile,
      password: cleanPassword,
      permissions: { ...formPermissions },
      businessId,
      createdAt: Date.now(),
      lastLogin: null
    };

    try {
      await BillingService.registerStaff(payload);
      
      // Write action log
      await writeAuditLog({
        actionType: 'Create',
        module: 'Staff',
        description: `Provisioned staff credentials of operator: "${cleanName}" (${cleanMobile})`,
        targetId: cleanMobile,
        targetTable: 'staff_members',
        metadata: { staffId: cleanMobile, name: cleanName }
      });

      // Clear Form and Close Window
      setFormName('');
      setFormMobile('');
      setFormPassword('');
      setShowProvisioningModal(false);
      onAddStaffSuccess();
    } catch (err: any) {
      console.error('Failed to register staff:', err);
      setErrorMsg(err.message || 'Failed to provision staff identity inside local/cloud nodes.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter staff list by search query
  const filteredList = staffList.filter((staff) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      staff.name.toLowerCase().includes(searchLower) ||
      staff.mobile.includes(searchLower)
    );
  });

  const getInitials = (userName: string) => {
    return userName
      .split(' ')
      .map((term) => term[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-100 overflow-y-auto">
      
      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 p-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-base font-extrabold tracking-tight">{t.title}</h2>
            <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">{t.subtitle}</p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className={`p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/45 dark:hover:bg-indigo-900/60 rounded-xl text-indigo-650 dark:text-indigo-400 border border-indigo-100/60 dark:border-indigo-900/40 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-md hover:shadow-indigo-550/5 ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
          title={isHi ? 'सब सिंक करें और रीफ्रेश करें' : 'Force Synchronize & Refresh'}
        >
          <RefreshCw size={14} className={`${loading ? 'animate-spin text-indigo-500' : 'transition-transform duration-500 hover:rotate-180 text-indigo-650 dark:text-indigo-400'}`} />
          <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline select-none">
            {loading ? (isHi ? 'सिंक हो रहा है...' : 'Syncing...') : (isHi ? 'रीफ्रेश' : 'Refresh')}
          </span>
        </button>
      </div>

      {/* Primary Container Body */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-4">
        
        {/* Store Code Copy & Sharing Widget Card */}
        {currentStoreCode && (
          <div id="store-code-widget-card" className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white rounded-3xl p-5 shadow-lg border border-slate-800/80 space-y-4 relative overflow-hidden">
            {/* Background ambient spotlight effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-widest block font-sans">
                    {isHi ? 'स्टोर एक्सेस क्रेडेंशियल' : 'STORE ACCESS CREDENTIALS'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-md">
                  {isHi 
                    ? 'स्टाफ ऑपरेटर्स इस क्रेडेंशियल का उपयोग करके आपके स्टोर नेटवर्क और क्लाउड सिंक में शामिल हो सकते हैं।' 
                    : 'Staff operators need this access credential to join your store network and sync data.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStoreCredentials(!showStoreCredentials)}
                className="bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 hover:from-indigo-500/30 hover:to-indigo-500/10 p-2.5 rounded-2xl border border-indigo-500/20 text-indigo-400 hover:text-indigo-350 transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
                title={showStoreCredentials ? (isHi ? 'विवरण छुपाएं' : 'Hide Credentials') : (isHi ? 'विवरण दिखाएं' : 'Show Credentials')}
              >
                <Key size={18} className={showStoreCredentials ? "animate-pulse text-indigo-400" : "text-slate-400"} />
              </button>
            </div>

            {showStoreCredentials && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-950/70 p-3.5 rounded-2xl border border-white/5 relative z-10 animate-in fade-in duration-200">
                <div className="flex items-center gap-3 px-1">
                  <div id="store-code-display" className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider">
                      {isHi ? 'स्टोर कोड (6-अंक)' : '6-DIGIT STORE CODE'}
                    </span>
                    <span className="text-3xl font-black font-mono tracking-widest text-indigo-300 select-all selection:bg-indigo-500">
                      {currentStoreCode}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                  {/* Copy Button */}
                  <button
                    type="button"
                    id="btn-copy-store-code"
                    onClick={() => {
                      navigator.clipboard.writeText(currentStoreCode);
                      setCopiedStoreCode(true);
                      setTimeout(() => setCopiedStoreCode(false), 2000);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.97] transition-all text-xs font-bold border border-white/5 text-slate-200 cursor-pointer"
                  >
                    {copiedStoreCode ? (
                      <>
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <span className="text-emerald-400 truncate">{isHi ? 'कॉपी' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} className="text-indigo-400 shrink-0" />
                        <span className="truncate">{isHi ? 'कॉपी' : 'Copy'}</span>
                      </>
                    )}
                  </button>

                  {/* WhatsApp Share Button */}
                  <button
                    type="button"
                    id="btn-whatsapp-share-code"
                    onClick={() => {
                      const msg = `*EazyBilling Store Access Invite*\n\n👋 नमस्ते!\n\nहमारे स्टोर से जुड़ने के लिए नीचे दिए गए क्रेडेंशियल का उपयोग करें:\n\n🔑 *स्टोर कोड (Store Code):* ${currentStoreCode}\n\n📌 *कैसे जुड़ें:*\n1. ऐप डाउनलोड करें और खोलें।\n2. *"Join Store as Staff"* या *"Staff Login"* पर क्लिक करें।\n3. यह स्टोर कोड दर्ज करें और अपना मोबाइल व आवंटित पासवर्ड डालकर लॉगिन करें।`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.97] transition-all text-xs font-bold text-white shadow-md shadow-emerald-600/10 cursor-pointer"
                  >
                    <Share2 size={13} className="text-white shrink-0" />
                    <span className="truncate">{isHi ? 'शेयर करें' : 'Share'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Panel */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Counter Widget */}
        <div className="flex items-center justify-between text-xs font-semibold px-1 text-slate-500 select-none font-sans">
          <span>{t.totalStaff}</span>
          <span className="bg-indigo-500/10 dark:bg-indigo-500/10 text-indigo-505 dark:text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-bold">{filteredList.length}</span>
        </div>

        {/* Staff List Stream representation */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw size={24} className="animate-spin text-indigo-500 mb-2" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Constructing user roster...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center space-y-3 shadow-sm select-none">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 flex items-center justify-center border border-indigo-100/50 dark:border-indigo-900/30">
              <Smartphone size={28} />
            </div>
            <div className="space-y-1 max-w-sm">
              <p className="text-sm font-extrabold text-slate-800 dark:text-white">
                {searchQuery 
                  ? (isHi ? 'कोई मेल नहीं मिला' : 'No operators found')
                  : (isHi ? 'कोई सक्रिय कर्मचारी नहीं है' : 'No Authorized Operators')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                {searchQuery 
                  ? (isHi ? 'कृपया कोई दूसरा नाम या मोबाइल नंबर लिखकर खोजें।' : 'Try searching for a different operator name or mobile username.')
                  : (isHi 
                      ? 'आपके स्टोर कोड के लिए अभी कोई ऑपरेटर पंजीकृत नहीं है। नया क्रेडेंशियल क्युरेट करने के लिए नीचे दिए गए प्लस (+) बटन पर क्लिक करें।' 
                      : 'No staff operators have been provisioned for this store yet. Click the "+" button below to register your first terminal operator.')}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((staff) => {
              const isOnlineRecently = staff.lastLogin && (Date.now() - staff.lastLogin < 15 * 60 * 1000);
              
              return (
                <div
                  key={staff.id}
                  onClick={() => onSelectStaff(staff)}
                  className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-4 shadow-sm hover:shadow-md hover:border-indigo-500/50 dark:hover:border-indigo-500/50 cursor-pointer transition-all duration-200 flex items-center gap-4 group"
                >
                  {/* Initials Avatar Squircle */}
                  <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-base font-extrabold flex items-center justify-center shrink-0 border border-indigo-100/50 dark:border-indigo-900/30">
                    {getInitials(staff.name)}
                  </div>
                  
                  {/* Card Content body */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {staff.name}
                      </h4>
                      
                      {/* Premium Status Capsule Badge */}
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black font-sans border tracking-wider uppercase select-none shrink-0 ${
                        isOnlineRecently 
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950/30' 
                          : 'bg-slate-50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800'
                      }`}>
                        <span className={`h-1 w-1 rounded-full ${isOnlineRecently ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span>{isOnlineRecently ? 'ONLINE' : 'OFFLINE'}</span>
                      </div>
                    </div>
                    
                    {/* Role & Mobile layout */}
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 space-y-1">
                      <div className="flex items-center gap-1 font-mono text-[11px] font-medium">
                        <Phone size={10} className="text-slate-400" />
                        <span>{staff.mobile}</span>
                      </div>
                      <div className="inline-flex items-center bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Operator
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) for Staff provisioning */}
      <button
        type="button"
        onClick={() => setShowProvisioningModal(true)}
        className="fixed right-6 bottom-24 z-20 h-16 w-16 rounded-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:shadow-[0_0_30px_rgba(99,102,241,0.8)] border border-indigo-400/30 hover:border-indigo-400/60 active:scale-95 transition-all duration-200 cursor-pointer animate-bounce"
        style={{ animationDuration: '3s' }}
        title={isHi ? 'नया ऑपरेटर जोड़ें' : 'Provision Staff Identity'}
      >
        <Plus size={32} strokeWidth={2.8} />
      </button>

      {/* Slide-over Provisioning Screen Overlay Modal */}
      {showProvisioningModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 space-y-4 text-slate-900 dark:text-white animate-in slide-in-from-bottom duration-200">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <Shield size={20} />
                <h3 className="text-md font-black tracking-tight">{t.addStaff}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowProvisioningModal(false);
                  setErrorMsg('');
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-900/10 p-2.5 rounded-xl border border-red-500/20 text-center">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitProvision} className="space-y-4 text-xs font-semibold">
              
              {/* Human Name Field */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-bold">{t.nameLabel}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><User size={14} /></span>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="E.g. Ramesh Kumar"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 pl-9 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Mobile Number Username Field */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">{t.mobileLabel}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Smartphone size={14} /></span>
                  <input
                    type="tel"
                    required
                    value={formMobile}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    placeholder="9876543210"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 pl-9 rounded-xl outline-none focus:border-indigo-500 font-mono text-slate-900 dark:text-white text-xs font-medium"
                  />
                </div>
              </div>

              {/* Numeric Fast Password Field */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">{t.passwordLabel}</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={14} /></span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value.replace(/\D/g, '').substring(0, 8))}
                      placeholder="E.g. 1234"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 pl-9 pr-8 rounded-xl outline-none focus:border-indigo-500 font-mono text-slate-900 dark:text-white text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-400"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleRandomPassword}
                    className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 border border-indigo-200/50 dark:border-indigo-900/50 rounded-xl px-3 text-[10px] uppercase font-black tracking-wider transition font-sans"
                  >
                    {t.generateCode}
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowProvisioningModal(false);
                    setErrorMsg('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-950 transition text-[11px]"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-750 text-white font-black transition text-[11px] flex items-center justify-center gap-1 shadow-md shadow-indigo-600/10"
                >
                  {submitting ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <>
                      <Save size={13} />
                      <span>{t.btnSubmit}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
