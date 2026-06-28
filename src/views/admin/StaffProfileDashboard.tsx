import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Shield, Trash2, Share2, Check, X, Lock, 
  Phone, Calendar, TrendingUp, Coins, FileText, Sliders, 
  User, RefreshCw, ExternalLink, ShieldCheck 
} from 'lucide-react';
import { BillingService } from '../../services/SecureBillingService';
import { db, writeAuditLog } from '../../services/firebaseService';
import { useAuth } from '../../context/AuthContext';

interface StaffProfileDashboardProps {
  staff: {
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
  };
  onBack: () => void;
  onViewAuditLogs: (userId: string) => void;
  onDeleteSuccess: () => void;
  currentLanguage?: 'en' | 'hi';
}

export const StaffProfileDashboard: React.FC<StaffProfileDashboardProps> = ({
  staff,
  onBack,
  onViewAuditLogs,
  onDeleteSuccess,
  currentLanguage = 'en'
}) => {
  const isHi = currentLanguage === 'hi';
  const { currentUser } = useAuth();
  const currentStoreCode = currentUser?.storeCode || localStorage.getItem('storeCode') || staff.businessId || 'default_business_id';
  const businessId = staff.businessId || 'default_business_id';

  // State Management
  const [metrics, setMetrics] = useState({ totalSales: 0, invoiceCount: 0, averageValue: 0 });
  const [logs, setLogs] = useState<any[]>([]);
  const [perms, setPerms] = useState({
    can_delete_invoice: staff.permissions?.can_delete_invoice || false,
    can_edit_stock: staff.permissions?.can_edit_stock || false,
    view_reports: staff.permissions?.view_reports || false,
    manage_settings: staff.permissions?.manage_settings || false,
  });
  const [loading, setLoading] = useState(true);
  const [updatingPerms, setUpdatingPerms] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Translations
  const t = {
    title: isHi ? 'कर्मचारी प्रोफ़ाइल' : 'Staff Profile Detail',
    subtitle: isHi ? 'संपादित करें और रीयल-टाइम प्रदर्शन ट्रैक करें' : 'Manage and track real-time operator details',
    memberSince: isHi ? 'सदस्यता का समय' : 'Member Since',
    perfPulse: isHi ? 'रीयल-टाइम प्रदर्शन पल्स' : 'Real-time Performance Pulse',
    salesToday: isHi ? 'आज की कुल बिक्री' : 'Total Sales Today',
    invoiceCount: isHi ? 'बिलों की संख्या' : 'Invoice Count',
    avgBill: isHi ? 'औसत बिल मूल्य' : 'Avg. Bill Value',
    permMatrix: isHi ? 'सुरक्षित अनुमति मैट्रिक्स' : 'Security Permission Matrix',
    permDelete: isHi ? 'बिल डिलीट करने की अनुमति (Danger)' : 'Permission to delete bills (Danger)',
    permStock: isHi ? 'स्टॉक एडिट करने की अनुमति' : 'Permission to edit stock',
    permReports: isHi ? 'रिपोर्ट्स देखने की अनुमति' : 'Permission to view reports',
    permSettings: isHi ? 'सेटिंग्स बदलने की अनुमति' : 'Permission to change settings',
    recentActivity: isHi ? 'हाल की ऑडिट गतिविधियां' : 'Recent Operator Activity Logs',
    allLogs: isHi ? 'साफ़ सिंक और फ़िल्टर (Clean Sync)' : 'Clean Sync & Filter',
    shareCreds: isHi ? 'व्हाट्सएप लॉगिन भेजें' : 'Share Store Credentials',
    deleteStaff: isHi ? 'स्टाफ हटाएं' : 'De-provision Staff Member',
    statusActive: isHi ? 'सक्रिय' : 'Active Duty',
    statusInactive: isHi ? 'इनएक्टिव' : 'Inactive / Static',
    pinTitle: isHi ? 'सुरक्षा पिन' : 'Security PIN Required',
  };

  // Fetch real-time metrics and activity logs
  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      
      // Calculate today's sales and invoice count
      const salesData = await BillingService.getStaffSalesToday(staff.id, businessId);
      setMetrics(salesData);

      // Fetch last 5 logs for this staff member
      const activityLogs = await BillingService.getRecentStaffAuditLogs(staff.id, businessId, 5);
      setLogs(activityLogs);
    } catch (err: any) {
      console.error('Error fetching dashboard staff metrics:', err);
      setErrorMsg(isHi ? 'विवरण लोड करने में असमर्थ' : 'Error loading performance metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [staff.id, businessId]);

  // Handle Switch Permission Changes
  const handleTogglePermission = async (key: keyof typeof perms) => {
    setUpdatingPerms(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    const nextPerms = {
      ...perms,
      [key]: !perms[key]
    };

    try {
      await BillingService.updateStaffPermissions(staff.id, businessId, nextPerms);
      setPerms(nextPerms);
      setSuccessMsg(isHi ? 'अनुमतियां सहेज ली गई हैं!' : 'Security permissions successfully modified.');
      
      // Audit log the update
      await writeAuditLog({
        actionType: 'Update',
        module: 'Staff',
        description: `Modified permissions for staff "${staff.name}": ${String(key)}=${nextPerms[key]}`,
        targetId: staff.id,
        targetTable: 'staff_members',
        metadata: { staffId: staff.id, key: String(key), value: nextPerms[key] }
      });
    } catch (err: any) {
      console.error('Failed to update staff permissions:', err);
      setErrorMsg(err.message || (isHi ? 'सेटिंग बदलने में गड़बड़' : 'Could not write permissions to cloud database.'));
    } finally {
      setUpdatingPerms(false);
    }
  };

  // Handle Invitation WhatsApp invite credentials formatting
  const handleShareCredentials = () => {
    const storeCode = currentStoreCode;
    const cleanMobile = staff.mobile;
    const cleanPassword = staff.password || '1234';
    
    const whatsappInviteMessage = `👋 नमस्ते ${staff.name}!\n\nआपको *EazyBilling* स्टोर के ऑपरेटर के रूप में अधिकृत किया गया है।\n\n🔑 *आपके लॉगिन क्रेडेंशियल:*\n----------------------------\n🔹 *स्टोर कोड (Store Code):* ${storeCode}\n🔹 *मोबाइल यूजरनेम (Mobile):* ${cleanMobile}\n🔹 *पासवर्ड (Password):* ${cleanPassword}\n----------------------------\n\n📌 *कैसे लॉग-इन करें:*\n1. ऐप खोलें और "Staff Login" चुनें।\n2. ऊपर दिए गए स्टोर कोड, अपना नंबर और पासवर्ड दर्ज करें।\n\nसुरक्षा नियमों के अनुसार अपना लॉगिन विवरण किसी को सांझा न करें।`;
    
    const encoded = encodeURIComponent(whatsappInviteMessage);
    const link = `https://wa.me/91${cleanMobile}?text=${encoded}`;
    window.open(link, '_blank');
  };

  // Perform De-provisioning Staff Member
  const handleDeleteStaff = async () => {
    try {
      setShowDeleteModal(false);
      setLoading(true);
      await BillingService.deleteStaffMember(staff.id, businessId);
      
      // Save Audit Trail
      await writeAuditLog({
        actionType: 'Delete',
        module: 'Staff',
        description: `Permanently de-provisioned staff operator: "${staff.name}"`,
        targetId: staff.id,
        targetTable: 'staff_members',
        metadata: { staffId: staff.id, staffName: staff.name }
      });

      onDeleteSuccess();
    } catch (err: any) {
      console.error('Error soft deleting staff operator:', err);
      setErrorMsg(err.message || (isHi ? 'हटाने में गड़बड़ हुई' : 'Unable to soft delete staff operator from Cloud database.'));
      setLoading(false);
    }
  };

  const getInitials = (userName: string) => {
    return userName
      .split(' ')
      .map((term) => term[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formattedDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Status computation for Online indicator
  const isOnlineRecently = staff.lastLogin && (Date.now() - staff.lastLogin < 15 * 60 * 1000);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-100 overflow-y-auto">
      
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-350 transition-colors"
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
          onClick={handleShareCredentials}
          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-850 px-3.5 py-1.5 rounded-xl text-white font-extrabold text-xs shadow-md transition-all shadow-emerald-500/10 hover:shadow-emerald-500/20"
        >
          <Share2 size={13} strokeWidth={2.5} />
          <span>{t.shareCreds}</span>
        </button>
      </div>

      {/* Main Content Body Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-semibold flex items-center gap-2">
            ⚠️ {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <ShieldCheck size={16} />
            {successMsg}
          </div>
        )}

        {/* Hero Section Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 p-5 md:p-6 shadow-sm flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
          <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-indigo-600 text-white font-extrabold text-xl md:text-2xl flex items-center justify-center shadow-lg shadow-indigo-650/15 shrink-0">
            {getInitials(staff.name)}
          </div>
          
          <div className="text-center sm:text-left flex-1 space-y-1.5 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-x-2.5 gap-y-1 justify-center sm:justify-start">
              <h3 className="text-lg font-black tracking-tight">{staff.name}</h3>
              <div className="flex items-center gap-1 justify-center">
                <span className={`h-2 w-2 rounded-full ${isOnlineRecently ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-400 text-slate-100'}`} />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                  {isOnlineRecently ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1 font-mono">
                <Phone size={12} className="text-slate-400" />
                {staff.mobile}
              </span>
              <span className="flex items-center gap-0.5 font-sans">
                <Calendar size={12} className="text-slate-400" />
                {t.memberSince}: <b className="font-semibold">{formattedDate(staff.createdAt)}</b>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="p-2.5 border border-red-500/30 hover:bg-red-500/10 text-red-500 hover:text-red-600 rounded-2xl text-xs font-bold transition flex items-center gap-1"
          >
            <Trash2 size={15} />
            <span className="text-xs">{isHi ? 'निष्कासित' : 'Revoke'}</span>
          </button>
        </div>

        {/* Real-time Performance Pulse Grid Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 select-none font-sans">
            <TrendingUp size={14} className="text-emerald-500" />
            {t.perfPulse}
          </h4>

          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl flex flex-col items-center justify-center">
              <RefreshCw size={24} className="animate-spin text-indigo-500 mb-2" />
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Gathering metrics telemetry...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Tile 1: Total Sales */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4.5 flex items-center gap-4.5 hover:shadow-inner transition">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Coins size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-tight">{t.salesToday}</p>
                  <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white mt-1 leading-none truncate">₹{metrics.totalSales.toFixed(2)}</p>
                </div>
              </div>

              {/* Tile 2: Invoice Count */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4.5 flex items-center gap-4.5 hover:shadow-inner transition">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                  <FileText size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-tight">{t.invoiceCount}</p>
                  <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white mt-1 leading-none truncate">{metrics.invoiceCount}</p>
                </div>
              </div>

              {/* Tile 3: Avg bill */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4.5 flex items-center gap-4.5 hover:shadow-inner transition">
                <div className="p-3 bg-violet-50 dark:bg-violet-950/40 rounded-xl text-violet-600 dark:text-violet-400 shrink-0">
                  <TrendingUp size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-tight">{t.avgBill}</p>
                  <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white mt-1 leading-none truncate">₹{metrics.averageValue.toFixed(2)}</p>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Permission Switch Matrix Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 select-none pb-2 border-b border-slate-100 dark:border-slate-800">
            <Sliders size={14} className="text-indigo-500" />
            {t.permMatrix}
          </h4>

          <div className="space-y-3">
            
            {/* Delete Invoice Toggle */}
            <div className="flex items-center justify-between py-2.5 px-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-950/40 transition">
              <div className="space-y-0.5">
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{t.permDelete}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">Controls whether operator can trigger full double-entry deletes.</p>
              </div>
              
              <button
                type="button"
                onClick={() => handleTogglePermission('can_delete_invoice')}
                disabled={updatingPerms}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  perms.can_delete_invoice ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  perms.can_delete_invoice ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Edit Stock Toggle */}
            <div className="flex items-center justify-between py-2.5 px-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-950/40 transition">
              <div className="space-y-0.5">
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{t.permStock}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">Permissions to manipulate item details or adjust counts.</p>
              </div>
              
              <button
                type="button"
                onClick={() => handleTogglePermission('can_edit_stock')}
                disabled={updatingPerms}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  perms.can_edit_stock ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  perms.can_edit_stock ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* View Reports Toggle */}
            <div className="flex items-center justify-between py-2.5 px-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-950/40 transition">
              <div className="space-y-0.5">
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{t.permReports}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">Access rights to business analytics, ledger sheets & profits.</p>
              </div>
              
              <button
                type="button"
                onClick={() => handleTogglePermission('view_reports')}
                disabled={updatingPerms}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  perms.view_reports ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  perms.view_reports ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Manage Settings Toggle */}
            <div className="flex items-center justify-between py-2.5 px-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-950/40 transition">
              <div className="space-y-0.5">
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{t.permSettings}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">Authorize modifications to store profile & system details.</p>
              </div>
              
              <button
                type="button"
                onClick={() => handleTogglePermission('manage_settings')}
                disabled={updatingPerms}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  perms.manage_settings ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  perms.manage_settings ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

          </div>
        </div>

        {/* Recent Operator Activity Log Mini-timeline Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 select-none font-sans">
              <Shield size={14} className="text-indigo-500" />
              {t.recentActivity}
            </h4>
            
            <button
              type="button"
              onClick={() => onViewAuditLogs(staff.id)}
              className="text-[11px] font-black tracking-tight text-indigo-500 hover:text-indigo-650 flex items-center gap-0.5 transition"
            >
              <span>{t.allLogs}</span>
              <ExternalLink size={11} />
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-6 text-slate-400">
                <RefreshCw size={20} className="animate-spin text-slate-300 mx-auto mb-1" />
                <span className="text-[10px] font-bold">Querying ledger records...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 select-none">
                <Lock size={32} className="mx-auto mb-1 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-medium">No activity ledger recorded for this operator yet.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-100 dark:border-slate-800 pl-4.5 ml-2.5 space-y-5 py-1 text-xs">
                {logs.map((log) => (
                  <div key={log.id} className="relative space-y-1">
                    {/* Timestamp bullet circle */}
                    <span className="absolute -left-[24.5px] top-1.5 h-3.5 w-3.5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-505 flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    </span>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                        {log.actionType || log.action}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-medium">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <p className="text-slate-550 dark:text-slate-400 text-xs tracking-tight select-none leading-relaxed">
                      {log.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Delete Staff Member Confirmation Overlay Modal popup */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full space-y-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              <Trash2 size={24} />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-lg font-black tracking-tight">{isHi ? 'स्टाफ निष्क्रिय करना' : 'Confirm De-provisioning'}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                Are you sure you want to suspend <b className="text-slate-800 dark:text-slate-200">"{staff.name}"</b>? Their associated credentials will be revoked immediately.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-950 transition text-xs"
              >
                {isHi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDeleteStaff}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold transition text-xs shadow-md shadow-red-500/10"
              >
                {t.deleteStaff}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
