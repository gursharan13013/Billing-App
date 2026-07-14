import React, { useState } from 'react';
import { 
  ArrowLeft, Plus, Search, Phone, Shield, User, Lock, 
  Eye, EyeOff, RefreshCw, Smartphone, Key, X, Check, Save, Share2, Copy, ExternalLink,
  Trash2, BarChart3, Settings
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

  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-blue-500 to-indigo-500 dark:from-blue-600 dark:to-indigo-650',
      'from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-650',
      'from-violet-500 to-purple-500 dark:from-violet-600 dark:to-purple-655',
      'from-amber-505 to-orange-500 dark:from-amber-600 dark:to-orange-600',
      'from-rose-500 to-pink-500 dark:from-rose-600 dark:to-pink-600',
      'from-cyan-500 to-blue-500 dark:from-cyan-600 dark:to-blue-600'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#090D16] text-slate-950 dark:text-slate-100 overflow-y-auto">
      
      {/* Header Panel */}
      <div className="bg-white/80 dark:bg-[#131B2E]/80 backdrop-blur-md border-b border-slate-150/80 dark:border-slate-800/60 p-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl text-slate-655 dark:text-slate-350 active:scale-95 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">{t.title}</h2>
              <span className="flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-500/20 tracking-wider select-none shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isHi ? 'सिंक सक्रिय' : 'Sync Active'}
              </span>
            </div>
            <p className="text-[9.5px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-bold mt-0.5">{t.subtitle}</p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className={`px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 rounded-xl text-indigo-650 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-md hover:shadow-indigo-550/5 ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
          title={isHi ? 'सब सिंक करें और रीफ्रेश करें' : 'Force Synchronize & Refresh'}
        >
          <RefreshCw size={13} className={`${loading ? 'animate-spin text-indigo-500' : 'transition-transform duration-500 hover:rotate-180 text-indigo-650 dark:text-indigo-455'}`} />
          <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline select-none">
            {loading ? (isHi ? 'सिंक...' : 'Syncing...') : (isHi ? 'रीफ्रेश' : 'Refresh')}
          </span>
        </button>
      </div>

      {/* Primary Container Body */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-4">
        
        {/* Store Code Copy & Sharing Widget Card */}
        {currentStoreCode && (
          <div id="store-code-widget-card" className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white rounded-3xl p-5 shadow-xl border border-indigo-500/20 dark:border-indigo-500/10 space-y-4 relative overflow-hidden">
            {/* Background ambient spotlight effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-widest block font-sans">
                    {isHi ? 'स्टोर एक्सेस क्रेडेंशियल' : 'STORE ACCESS CREDENTIALS'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-md">
                  {isHi 
                    ? 'स्टाफ ऑपरेटर इस स्टोर कोड और उनके आवंटित क्रेडेंशियल्स का उपयोग करके सुरक्षित रूप से जुड़ सकते हैं।' 
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
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-950/70 p-3.5 rounded-2xl border border-white/5 relative z-10 animate-in fade-in duration-205">
                <div className="flex items-center gap-3 px-1">
                  <div id="store-code-display" className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider">
                      {isHi ? 'स्टोर कोड (6-अंक)' : '6-DIGIT STORE CODE'}
                    </span>
                    <span className="text-3xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-150 to-indigo-400 select-all drop-shadow-[0_0_10px_rgba(99,102,241,0.25)]">
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
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-xs font-bold border border-white/20 text-white cursor-pointer hover:border-white/30"
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
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-xs font-bold text-white shadow-lg shadow-indigo-600/15 cursor-pointer border border-indigo-400/30"
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
            className="w-full bg-white/60 dark:bg-[#131B2E]/60 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80 rounded-2xl pl-11 pr-10 py-3 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 text-slate-900 dark:text-white font-medium"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/50"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Counter Widget */}
        <div className="flex items-center justify-between text-xs font-semibold px-1 text-slate-500 select-none font-sans">
          <span>{t.totalStaff}</span>
          <span className="bg-indigo-500/10 dark:bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-bold">{filteredList.length}</span>
        </div>

        {/* Staff List Stream representation */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw size={24} className="animate-spin text-indigo-500 mb-2" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Constructing user roster...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-b from-white to-slate-50/50 dark:from-[#131B2E] dark:to-[#131B2E]/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center space-y-4 shadow-sm select-none relative overflow-hidden">
            {/* Ambient background aura */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 flex items-center justify-center border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm animate-pulse relative z-10">
              <Smartphone size={32} />
            </div>
            <div className="space-y-1 max-w-sm relative z-10">
              <p className="text-base font-black text-slate-800 dark:text-white">
                {searchQuery 
                  ? (isHi ? 'कोई मेल नहीं मिला' : 'No operators found')
                  : (isHi ? 'कोई सक्रिय कर्मचारी नहीं है' : 'No Authorized Operators')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                {searchQuery 
                  ? (isHi ? 'कृपया कोई दूसरा नाम या मोबाइल नंबर लिखकर खोजें।' : 'Try searching for a different operator name or mobile username.')
                  : (isHi 
                      ? 'आपके स्टोर कोड के लिए अभी कोई ऑपरेटर पंजीकृत नहीं है। नया क्रेडेंशियल क्युरेट करने के लिए नीचे दिए गए बटन पर क्लिक करें।' 
                      : 'No staff operators have been provisioned for this store yet. Register your first operator to get started.')}
              </p>
            </div>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => setShowProvisioningModal(true)}
                className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer relative z-10 border border-indigo-550/20"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>{isHi ? 'नया ऑपरेटर जोड़ें' : 'Register Terminal Operator'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((staff) => {
              const isOnlineRecently = staff.lastLogin && (Date.now() - staff.lastLogin < 15 * 60 * 1000);
              const avatarGradient = getAvatarGradient(staff.name);
              
              return (
                <div
                  key={staff.id}
                  onClick={() => onSelectStaff(staff)}
                  className="bg-white dark:bg-[#131B2E] border border-slate-205/60 dark:border-slate-800 rounded-3xl p-4 shadow-sm hover:shadow-xl hover:border-indigo-550 dark:hover:border-indigo-500/70 hover:-translate-y-0.5 cursor-pointer transition-all duration-300 flex flex-col justify-between gap-3 group relative overflow-hidden text-left"
                >
                  {/* Subtle color highlight in the corner */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/[0.02] dark:bg-indigo-500/[0.03] rounded-bl-full pointer-events-none group-hover:bg-indigo-500/[0.05] transition-colors" />

                  <div className="flex items-center gap-3.5">
                    {/* Initials Avatar Squircle with Soft Gradient */}
                    <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${avatarGradient} text-white text-base font-black flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                      {getInitials(staff.name)}
                    </div>
                    
                    {/* Card Content body */}
                    <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4 className="text-sm font-extrabold text-slate-850 dark:text-white leading-tight group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {staff.name}
                        </h4>
                        
                        {/* Status Capsule Badge */}
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black font-sans border tracking-wider uppercase select-none shrink-0 transition-colors ${
                          isOnlineRecently 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-950/30' 
                            : 'bg-slate-50 dark:bg-slate-950/30 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800'
                        }`}>
                          <span className={`h-1 w-1 rounded-full ${isOnlineRecently ? 'bg-emerald-500 animate-pulse' : 'bg-slate-350'}`} />
                          <span>{isOnlineRecently ? 'ONLINE' : 'OFFLINE'}</span>
                        </div>
                      </div>
                      
                      {/* Mobile phone layout */}
                      <div className="flex items-center gap-1 font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                        <Phone size={10} className="text-slate-400" />
                        <span>{staff.mobile}</span>
                      </div>
                    </div>
                  </div>

                  {/* Divider line & permission display */}
                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 flex items-center justify-between gap-2 mt-0.5">
                    <span className="inline-flex items-center bg-indigo-50/50 dark:bg-indigo-950/35 text-indigo-600 dark:text-indigo-400 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border border-indigo-100/30 dark:border-indigo-900/20">
                      {isHi ? 'ऑपरेटर' : 'Operator'}
                    </span>

                    {/* Arrow sign */}
                    <ArrowLeft size={12} className="rotate-180 text-slate-350 dark:text-slate-655 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>

                  {/* Active Permissions indicators */}
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {staff.permissions.can_delete_invoice && (
                      <span className="inline-flex items-center gap-0.5 bg-rose-50/70 dark:bg-rose-950/15 text-rose-600 dark:text-rose-400 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded border border-rose-100/40 dark:border-rose-900/20 uppercase tracking-wide" title="Delete Bills">
                        <Trash2 size={7.5} />
                        {isHi ? 'बिल हटाएं' : 'Delete'}
                      </span>
                    )}
                    {staff.permissions.can_edit_stock && (
                      <span className="inline-flex items-center gap-0.5 bg-emerald-50/70 dark:bg-emerald-950/15 text-emerald-600 dark:text-emerald-400 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-100/40 dark:border-emerald-900/20 uppercase tracking-wide" title="Modify Stock">
                        <Check size={7.5} />
                        {isHi ? 'स्टॉक एडिट' : 'Stock'}
                      </span>
                    )}
                    {staff.permissions.view_reports && (
                      <span className="inline-flex items-center gap-0.5 bg-blue-50/70 dark:bg-blue-950/15 text-blue-600 dark:text-blue-400 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded border border-blue-100/40 dark:border-blue-900/20 uppercase tracking-wide" title="View Reports">
                        <BarChart3 size={7.5} />
                        {isHi ? 'रिपोर्ट्स' : 'Reports'}
                      </span>
                    )}
                    {staff.permissions.manage_settings && (
                      <span className="inline-flex items-center gap-0.5 bg-amber-50/70 dark:bg-amber-950/15 text-amber-600 dark:text-amber-400 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded border border-amber-100/40 dark:border-amber-900/20 uppercase tracking-wide" title="System Settings">
                        <Settings size={7.5} />
                        {isHi ? 'सेटिंग्स' : 'Settings'}
                      </span>
                    )}
                    {!staff.permissions.can_delete_invoice && !staff.permissions.can_edit_stock && !staff.permissions.view_reports && !staff.permissions.manage_settings && (
                      <span className="inline-flex items-center gap-0.5 bg-slate-50 dark:bg-slate-900 text-slate-400 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                        {isHi ? 'कोई अनुमति नहीं' : 'No Perms'}
                      </span>
                    )}
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
        className="fixed right-6 bottom-24 z-20 h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] dark:shadow-[0_0_25px_rgba(99,102,241,0.5)] border border-indigo-400/30 hover:border-indigo-400/65 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer group"
        title={isHi ? 'नया ऑपरेटर जोड़ें' : 'Provision Staff Identity'}
      >
        <span className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping pointer-events-none group-hover:animate-none" />
        <Plus size={26} strokeWidth={2.6} className="group-hover:rotate-90 transition-transform duration-300 relative z-10" />
      </button>

      {/* Slide-over Provisioning Screen Overlay Modal */}
      {showProvisioningModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131B2E] rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-2xl max-w-md w-full p-6 space-y-5 text-slate-900 dark:text-white animate-in slide-in-from-bottom duration-250">
            
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
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 pl-9 rounded-xl outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 font-medium text-slate-900 dark:text-white text-xs transition-all"
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
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 p-2.5 pl-9 rounded-xl outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 font-mono text-slate-900 dark:text-white text-xs font-medium transition-all"
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
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-2.5 pl-9 pr-8 rounded-xl outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 font-mono text-slate-900 dark:text-white text-xs font-medium transition-all"
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
                    className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 border border-indigo-200/50 dark:border-indigo-900/50 rounded-xl px-3 text-[10px] uppercase font-black tracking-wider transition font-sans cursor-pointer active:scale-95"
                  >
                    {t.generateCode}
                  </button>
                </div>
              </div>

              {/* Permissions Control Selector Grid */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono font-bold block mb-2">
                  {isHi ? 'ऑपरेटर अनुमतियां (Permissions)' : 'Configure Operator Permissions'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'can_edit_stock', label: isHi ? 'स्टॉक एडिट' : 'Edit Stock', desc: isHi ? 'स्टॉक एडिट करें' : 'Modify items & stock', icon: Check },
                    { key: 'can_delete_invoice', label: isHi ? 'बिल हटाएं' : 'Delete Bill', desc: isHi ? 'बिल डिलीट करें' : 'Delete transactions', icon: Trash2 },
                    { key: 'view_reports', label: isHi ? 'रिपोर्ट्स' : 'Reports', desc: isHi ? 'रिपोर्ट्स देखें' : 'Access sales reports', icon: BarChart3 },
                    { key: 'manage_settings', label: isHi ? 'सेटिंग्स' : 'Settings', desc: isHi ? 'सिस्टम सेटिंग्स बदलें' : 'Access system panels', icon: Settings }
                  ].map((perm) => {
                    const isChecked = formPermissions[perm.key as keyof typeof formPermissions];
                    const Icon = perm.icon;
                    return (
                      <button
                        key={perm.key}
                        type="button"
                        onClick={() => setFormPermissions(prev => ({ ...prev, [perm.key]: !isChecked }))}
                        className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-20 ${
                          isChecked 
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 text-slate-900 dark:text-white shadow-sm shadow-indigo-500/5' 
                            : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-900/30'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`p-1 rounded-lg ${
                            isChecked 
                              ? `bg-indigo-100 dark:bg-indigo-900/50 text-indigo-650 dark:text-indigo-400`
                              : 'bg-slate-200/50 dark:bg-slate-800 text-slate-400'
                          }`}>
                            <Icon size={12} />
                          </span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isChecked 
                              ? 'bg-indigo-600 border-indigo-600 text-white' 
                              : 'border-slate-300 dark:border-slate-700'
                          }`}>
                            {isChecked && <Check size={8} strokeWidth={3} />}
                          </span>
                        </div>
                        <div className="mt-1">
                          <p className="text-[10px] font-extrabold leading-none truncate">{perm.label}</p>
                          <p className="text-[8px] text-slate-400 leading-normal truncate mt-0.5 font-normal">{perm.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowProvisioningModal(false);
                    setErrorMsg('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-950 transition text-[11px] cursor-pointer"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold transition text-[11px] flex items-center justify-center gap-1 shadow-md shadow-indigo-600/10 cursor-pointer active:scale-95"
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
