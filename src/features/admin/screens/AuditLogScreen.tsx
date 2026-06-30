import React, { useState, useEffect } from 'react';
import { db } from '../../../services/firebaseService';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit
} from 'firebase/firestore';
import { 
  ArrowLeft,
  Calendar,
  User,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  Info,
  SlidersHorizontal,
  Trash2,
  PlusCircle,
  LogIn,
  LogOut,
  Edit2,
  Eye,
  EyeOff,
  ShieldCheck,
  CornerDownRight,
  Sparkles,
  Layers,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BillingService } from '../../../services/SecureBillingService';

export interface AuditLogEntry {
  id: string;
  action: string;
  actionType?: string;
  userId: string;
  createdBy?: string;
  userName?: string;
  userRole?: string;
  businessId: string;
  timestamp: number;
  changes?: Record<string, any>;
  metadata?: any;
  targetId?: string;
  targetTable?: string;
  module?: string;
  description: string;
}

interface AuditLogScreenProps {
  onBack: () => void;
  currentLanguage?: 'en' | 'hi';
  initialSelectedUser?: string;
}

export const AuditLogScreen: React.FC<AuditLogScreenProps> = ({ onBack, currentLanguage = 'en', initialSelectedUser }) => {
  const isHi = currentLanguage === 'hi';
  
  // Premium Translations Matching User Scope
  const t = {
    title: isHi ? 'सिस्टम ऑडिट लॉग्स' : 'System Audit Logs',
    subtitle: isHi ? 'सुरक्षित यूजर एक्टिविटी और रीयल-टाइम डेटा बदलाव' : 'Secure user activity tracking & real-time modification logs',
    searchPlaceholder: isHi ? 'सर्च करें (उदा. इनवॉइस नंबर, आइटम नाम)...' : 'Search by Invoice No, Item Name or query...',
    refresh: isHi ? 'रिफ्रेश' : 'Refresh',
    allUsers: isHi ? 'सभी ऑपरेटर्स' : 'All Operators',
    allModules: isHi ? 'सभी मॉड्यूल्स' : 'All Modules',
    startDate: isHi ? 'प्रारंभ तिथि' : 'Start Date',
    endDate: isHi ? 'अंतिम तिथि' : 'End Date',
    noLogs: isHi ? 'कोई ऑडिट लॉग नहीं मिला।' : 'No audit records found.',
    loading: isHi ? 'ऑडिट स्ट्रीम लोड हो रही है...' : 'Loading secure audit stream...',
    page: isHi ? 'पृष्ठ' : 'Page',
    loadMore: isHi ? 'अधिक ऐतिहासिक डेटा लोड करें' : 'Load Older Historical Records',
    unknownUser: isHi ? 'अज्ञात ऑपरेटर' : 'Unknown Operator',
    indicatorDelete: isHi ? 'हटाया गया विवरण' : 'Deletion Event',
    from: isHi ? 'पहले' : 'From',
    to: isHi ? 'अब' : 'To',
    viewChanges: isHi ? 'बदलाव देखें' : 'View Changes',
    hideChanges: isHi ? 'विवरण छुपाएं' : 'Hide details',
    idLabel: isHi ? 'आईडी' : 'ID',
    schemaLabel: isHi ? 'टेबल' : 'Table',
    moduleLabel: isHi ? 'मॉड्यूल' : 'Module',
    changesTitle: isHi ? 'फील्ड परिवर्तन विवरण' : 'Property Modifier Trace',
    chipAll: isHi ? 'सभी लॉग्स' : 'All Logs',
    chipDeletes: isHi ? 'हटाए गए (Crimson)' : 'Deletes Only',
    chipUpdates: isHi ? 'संशोधन (Indigo)' : 'Updates Only',
    chipLogins: isHi ? 'लॉगिन / सत्र' : 'Sessions/Logins'
  };

  const activeUser = BillingService.getCurrentUser();
  const businessId = activeUser?.businessId || 'default_business_id';

  // State Management
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Filtering States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>(initialSelectedUser || 'all');
  const [selectedActionChip, setSelectedActionChip] = useState<'all' | 'delete' | 'update' | 'login'>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Pagination & Load-More State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(20);
  const [queryLimit, setQueryLimit] = useState<number>(300); // Larger pool for precise client-side sorting/filtering without custom index failures
  const [hasMoreFromCloud, setHasMoreFromCloud] = useState<boolean>(true);
  
  // Track which IDs are expanded in the Accordion Stream
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});

  // State for collapsing advanced filters (collapsed by default for beautiful larger stream experience on mobile/all views; auto-open if filtering for a specific operator)
  const [filtersOpen, setFiltersOpen] = useState<boolean>(!!initialSelectedUser && initialSelectedUser !== 'all');

  const activeFiltersCount = 
    (selectedUser !== 'all' ? 1 : 0) + 
    (selectedActionChip !== 'all' ? 1 : 0) + 
    (selectedModule !== 'all' ? 1 : 0) + 
    (startDate ? 1 : 0) + 
    (endDate ? 1 : 0);

  const handleClearFilters = () => {
    setSelectedUser('all');
    setSelectedActionChip('all');
    setSelectedModule('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  // Dynamic list of unique operators
  const [operators, setOperators] = useState<{ id: string; name: string; role: string }[]>([]);

  // Initial Load of Logs (Batch fetch from Firestore)
  const fetchLogs = async (isRefresh = false, activeLimit = queryLimit) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMsg('');

      const logsCollection = collection(db, 'audit_logs');
      const selectQuery = query(
        logsCollection,
        where('businessId', '==', businessId),
        limit(activeLimit)
      );

      const snapshot = await getDocs(selectQuery);
      const fetchedLogs: AuditLogEntry[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedLogs.push({
          id: docSnap.id,
          action: data.action || '',
          actionType: data.actionType || '',
          userId: data.userId || '',
          createdBy: data.createdBy || '',
          userName: data.userName || '',
          userRole: data.userRole || '',
          businessId: data.businessId || '',
          timestamp: data.timestamp || 0,
          changes: data.changes || data.metadata || {},
          metadata: data.metadata || data.changes || {},
          targetId: data.targetId || '',
          targetTable: data.targetTable || '',
          module: data.module || '',
          description: data.description || ''
        });
      });

      // Sort logs strictly descending by timestamp on client-side (Solves No-Index constraint)
      fetchedLogs.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(fetchedLogs);
      
      // Auto-extract operator list from database and fetched logs
      const uniqueUsersMap = new Map<string, { id: string; name: string; role: string }>();
      
      // 1. Pre-populate with registered staff from offline-first database
      try {
        const registeredStaff = await BillingService.getStaffMembers(businessId);
        if (registeredStaff && Array.isArray(registeredStaff)) {
          registeredStaff.forEach((s: any) => {
            if (s && s.id) {
              uniqueUsersMap.set(s.id, { id: s.id, name: s.name, role: 'Operator' });
            }
          });
        }
      } catch (err) {
        console.warn("Could not load registered staff for dropdown:", err);
      }

      // 2. Pre-populate with current logged-in user
      if (activeUser && activeUser.id) {
        uniqueUsersMap.set(activeUser.id, { 
          id: activeUser.id, 
          name: activeUser.name || 'Admin User', 
          role: activeUser.role || 'Admin' 
        });
      }

      // 3. Supplement with users extracted from fetched logs
      fetchedLogs.forEach(l => {
        if (l.userId && !uniqueUsersMap.has(l.userId)) {
          const name = l.userName || (l.userId === 'system_sync' ? 'System Sync' : l.userId);
          const role = l.userRole || 'Operator';
          uniqueUsersMap.set(l.userId, { id: l.userId, name, role });
        }
      });

      setOperators(Array.from(uniqueUsersMap.values()));
      setHasMoreFromCloud(snapshot.docs.length === activeLimit);
      setCurrentPage(1);

    } catch (err: any) {
      console.error("Firestore audit_logs fetch failed:", err);
      setErrorMsg(isHi 
        ? "क्लाउड से ऑडिट स्ट्रीम लोड करने में समस्या आई। नेटवर्क चेक करें।" 
        : "Failed to download audit stream logs from Firestore. Please verify internet connectivity."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLoadMoreFromCloud = async () => {
    const nextLimit = queryLimit + 150;
    setQueryLimit(nextLimit);
    await fetchLogs(true, nextLimit);
  };

  useEffect(() => {
    fetchLogs();
  }, [businessId]);

  // Client-side filtering engine
  const getFilteredLogs = () => {
    return logs.filter(log => {
      // User check
      if (selectedUser !== 'all' && log.userId !== selectedUser) {
        return false;
      }

      // Action type chip filter
      if (selectedActionChip !== 'all') {
        const typeNormalized = (log.actionType || log.action || 'update').toLowerCase();
        if (selectedActionChip === 'delete') {
          if (!typeNormalized.includes('delete')) return false;
        } else if (selectedActionChip === 'update') {
          if (!typeNormalized.includes('update')) return false;
        } else if (selectedActionChip === 'login') {
          if (!typeNormalized.includes('login') && !typeNormalized.includes('logout')) return false;
        }
      }

      // Module check
      if (selectedModule !== 'all') {
        const logModule = (log.module || '').toLowerCase();
        const selModule = selectedModule.toLowerCase();
        const derivedModule = logModule || (
          log.targetTable === 'invoices' ? 'billing' :
          log.targetTable === 'payments' ? 'accounting' :
          log.targetTable === 'parties' ? 'crm' :
          log.targetTable === 'items' ? 'inventory' : ''
        );
        if (!derivedModule.includes(selModule)) {
          return false;
        }
      }

      // Date range constraint
      if (startDate) {
        const startMs = new Date(startDate + 'T00:00:00').getTime();
        if (log.timestamp < startMs) return false;
      }
      if (endDate) {
        const endMs = new Date(endDate + 'T23:59:59').getTime();
        if (log.timestamp > endMs) return false;
      }

      // Text search
      if (searchQuery.trim() !== '') {
        const queryNorm = searchQuery.toLowerCase();
        const desc = (log.description || '').toLowerCase();
        const targetId = (log.targetId || '').toLowerCase();
        const targetTable = (log.targetTable || '').toLowerCase();
        const userName = (log.userName || '').toLowerCase();
        const changesText = JSON.stringify(log.changes || {}).toLowerCase();

        return desc.includes(queryNorm) || 
               targetId.includes(queryNorm) || 
               targetTable.includes(queryNorm) || 
               userName.includes(queryNorm) ||
               changesText.includes(queryNorm);
      }

      return true;
    });
  };

  const filteredLogsList = getFilteredLogs();
  const totalRecords = filteredLogsList.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogsList.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const toggleLogExpand = (logId: string) => {
    setExpandedLogIds(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  // Group logs by local dates to support the requested Grouped Timeline layout
  const groupLogsByDate = (logList: AuditLogEntry[]) => {
    const groups: { [key: string]: AuditLogEntry[] } = {};
    
    logList.forEach(log => {
      const dateObj = new Date(log.timestamp);
      
      let dateHeader = dateObj.toLocaleDateString(currentLanguage === 'hi' ? 'hi-IN' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (dateObj.toDateString() === today.toDateString()) {
        dateHeader = isHi ? '📅 आज (Today)' : '📅 Active Sessions & Live Actions (Today)';
      } else if (dateObj.toDateString() === yesterday.toDateString()) {
        dateHeader = isHi ? '📅 कल (Yesterday)' : '📅 Recent Changes (Yesterday)';
      }

      if (!groups[dateHeader]) {
        groups[dateHeader] = [];
      }
      groups[dateHeader].push(log);
    });

    return groups;
  };

  const groupedTimelineLogs = groupLogsByDate(paginatedLogs);

  // Helper to resolve specific styling for each action type (Indigo & Emerald theme with crimson deletes)
  const getActionBadgeStyle = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('delete')) {
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40',
        dot: 'bg-rose-500',
        avatarBg: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900',
        icon: <Trash2 size={13} className="shrink-0" />
      };
    }
    if (act.includes('create')) {
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border-emerald-200 dark:border-emerald-900/30',
        dot: 'bg-emerald-500',
        avatarBg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
        icon: <PlusCircle size={13} className="shrink-0" />
      };
    }
    if (act.includes('login') || act.includes('logout')) {
      return {
        bg: 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/30',
        dot: 'bg-sky-500',
        avatarBg: 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900',
        icon: <LogIn size={13} className="shrink-0" />
      };
    }
    // DEFAULT UPDATE / EDIT
    return {
      bg: 'bg-blue-50 dark:bg-blue-950/20 text-[#3b5998] dark:text-blue-400 border-blue-200 dark:border-blue-900/30',
      dot: 'bg-blue-500',
      avatarBg: 'bg-blue-100 dark:bg-blue-950 text-[#3b5998] dark:text-blue-300 border-blue-200 dark:border-blue-900',
      icon: <Edit2 size={13} className="shrink-0" />
    };
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans pb-[max(env(safe-area-inset-bottom),0px)]">
      
      {/* 1. STICKY TOP PREMIUM HEADER */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white p-4 shrink-0 shadow-sm dark:shadow-md pt-[max(env(safe-area-inset-top),48px)] flex items-center justify-between animate-in fade-in ease-out duration-200">
        <div className="flex items-center gap-3">
          <button 
            id="audit_stream_back_btn"
            onClick={onBack} 
            className="p-2 bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition active:scale-95 cursor-pointer touch-manipulation border border-slate-200/50 dark:border-slate-700/50"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-left">
            <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck size={18} className="text-emerald-500 dark:text-emerald-400 animate-pulse" />
              {t.title}
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold font-sans leading-none mt-1">
              {t.subtitle}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchLogs(true)}
          disabled={loading || refreshing}
          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-55 text-slate-700 dark:text-white p-2 md:py-2 md:px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-xs font-bold transition hover:shadow cursor-pointer"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          <span className="hidden md:inline">{t.refresh}</span>
        </button>
      </header>

      {/* 2. STICKY ADVANCED FILTER ENGINE */}
      <div className="sticky top-0 z-30 p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm space-y-3 shrink-0">
        
        {/* Toggleable Filter Layout with Persistent Search */}
        <div className="flex items-center gap-2">
          {/* Keyword Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              className="w-full text-xs font-semibold pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/20 transition duration-150 outline-none"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Toggle Button for mobile and screen real-estate optimization */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-black transition cursor-pointer select-none active:scale-95 duration-150 ${
              filtersOpen 
                ? 'bg-[#1e293b] text-white border-[#1e293b] dark:bg-slate-800 dark:border-slate-700 shadow-md' 
                : activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-450'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-850 dark:text-slate-350 dark:border-slate-800'
            }`}
            title={isHi ? 'विवरण फ़िल्टर' : 'Toggle Filters'}
          >
            <SlidersHorizontal size={14} className={filtersOpen ? "rotate-90 transition-transform duration-200" : "transition-transform duration-200"} />
            <span className="hidden sm:inline">{isHi ? 'फ़िल्टर' : 'Filters'}</span>
            {activeFiltersCount > 0 && (
              <span className={`inline-flex items-center justify-center rounded-full text-[10px] font-black h-4.5 w-4.5 leading-none ${
                filtersOpen ? 'bg-white text-slate-900' : 'bg-indigo-600 text-white'
              }`}>
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Instant Reset active filters button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 dark:text-rose-450 border border-rose-200 dark:border-rose-900/40 transition active:scale-95 text-xs font-black cursor-pointer select-none"
              title={isHi ? 'रीसेट फ़िल्टर' : 'Reset All Filters'}
            >
              {isHi ? 'रीसेट' : 'Reset'}
            </button>
          )}
        </div>

        {/* Collapsible Panel with Premium smooth motion */}
        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden space-y-3.5 pt-1 border-t border-slate-100 dark:border-slate-800"
            >
              {/* Action Type Filter Toggle Chips */}
              <div className="space-y-1 block mt-2 text-left">
                <label className="text-[9px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-1">
                  💡 {isHi ? 'कार्रवाई प्रकार' : 'Filter Action Type'}
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
                  <button
                    onClick={() => { setSelectedActionChip('all'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide whitespace-nowrap transition-all cursor-pointer ${
                      selectedActionChip === 'all' 
                        ? 'bg-[#3b5998] text-white dark:bg-slate-100 dark:text-slate-950' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-850 dark:text-slate-400'
                    }`}
                  >
                    🔥 {t.chipAll}
                  </button>
                  
                  <button
                    onClick={() => { setSelectedActionChip('delete'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedActionChip === 'delete'
                        ? 'bg-rose-600 text-white shadow-sm shadow-rose-200 dark:shadow-none'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    {t.chipDeletes}
                  </button>

                  <button
                    onClick={() => { setSelectedActionChip('update'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedActionChip === 'update'
                        ? 'bg-[#3b5998] text-white shadow-sm shadow-blue-200 dark:shadow-none'
                        : 'bg-blue-50 text-[#3b5998] hover:bg-blue-100 dark:bg-blue-950/20 dark:text-blue-400'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-[#3b5998]" />
                    {t.chipUpdates}
                  </button>

                  <button
                    onClick={() => { setSelectedActionChip('login'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedActionChip === 'login'
                        ? 'bg-sky-600 text-white shadow-sm shadow-sky-200 dark:shadow-none'
                        : 'bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/20 dark:text-sky-400'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    {t.chipLogins}
                  </button>
                </div>
              </div>

              {/* Dropdowns & Date Selector Panel Block (Stack on Mobile, Grid on Desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* User selector dropdown */}
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
                    <UserCheck size={11} className="text-[#3b5998]" />
                    {isHi ? 'ऑपरेटर' : 'Staff / Admin'}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedUser}
                      onChange={(e) => {
                        setSelectedUser(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full text-xs font-bold pl-2 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-200 appearance-none outline-none focus:border-[#3b5998] animate-none"
                    >
                      <option value="all">👥 {t.allUsers}</option>
                      {operators.map(op => (
                        <option key={op.id} value={op.id}>
                          {op.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Module Selector dropdown */}
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
                    <Layers size={11} className="text-emerald-500" />
                    {isHi ? 'मॉड्यूल' : 'Module'}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedModule}
                      onChange={(e) => {
                        setSelectedModule(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full text-xs font-bold pl-2 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-200 appearance-none outline-none focus:border-[#3b5998] animate-none"
                    >
                      <option value="all">📦 {t.allModules}</option>
                      <option value="billing">💸 Billing System</option>
                      <option value="inventory">📊 Inventory</option>
                      <option value="crm">🤝 CRM Clients</option>
                      <option value="accounting">📓 Ledger</option>
                      <option value="staff">🛡️ Staff Security</option>
                      <option value="system">⚙️ System Configuration</option>
                    </select>
                  </div>
                </div>

                {/* Date range picker input */}
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
                    <Calendar size={11} className="text-pink-500" />
                    {t.startDate} - {t.endDate}
                  </label>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-1/2 text-[10px] font-extrabold px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none block"
                    />
                    <span className="text-[9px] font-bold text-slate-400">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-1/2 text-[10px] font-extrabold px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none block"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ERROR FEEDBACK BANNER */}
      {errorMsg && (
        <div className="mx-4 mt-3 bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-450 border border-rose-200 dark:border-rose-900/40 p-3 rounded-2xl flex items-start gap-2.5 text-xs">
          <Info size={16} className="shrink-0 mt-0.5 text-rose-500" />
          <p className="text-left font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* 3. GROUPED TIMELINE STREAM VIEW */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <RefreshCw size={28} className="animate-spin text-[#3b5998]" />
            <span className="text-xs font-black tracking-wider uppercase text-slate-500">{t.loading}</span>
          </div>
        ) : filteredLogsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center space-y-2.5 border border-dashed border-slate-200 dark:border-slate-850 rounded-3xl bg-white dark:bg-slate-900/40 p-6 mx-2 shadow-sm">
            <SlidersHorizontal size={36} className="text-slate-350" />
            <span className="text-sm font-black text-slate-600 dark:text-slate-400">{t.noLogs}</span>
            <span className="text-[11px] max-w-xs font-medium text-slate-400">
              {isHi 
                ? 'दिए गए फ़िल्टर मानदंडों के अनुसार कोई लॉग डेटा उपलब्ध नहीं है।' 
                : 'No audit records match the selected multi-filter combo.'}
            </span>
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-blue-100/60 dark:border-slate-800/85 space-y-8 text-left">
            {Object.entries(groupedTimelineLogs).map(([groupDateTitle, groupLogs]) => (
              <div key={groupDateTitle} className="space-y-4">
                
                {/* TIMELINE DATE HEADER */}
                <div className="sticky top-[-1px] z-20 -ml-6 pl-6 py-2 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm flex items-center gap-2">
                  <div className="absolute -left-[9.5px] top-3.5 h-4 w-4 rounded-full border-4 border-[#3b5998] bg-white dark:bg-slate-950 shadow-sm z-30" />
                  <span className="text-[11px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 font-sans flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 px-3 py-1.5 rounded-full shadow-xs">
                    <Sparkles size={11} className="text-yellow-500 animate-pulse" />
                    {groupDateTitle}
                  </span>
                </div>

                {/* TIMELINE CARDS CHRONOLOGICAL BLOCK */}
                <div className="space-y-3">
                  {groupLogs.map((log) => {
                    const normAction = (log.actionType || log.action || 'update').toLowerCase();
                    const style = getActionBadgeStyle(normAction);
                    const operatorName = log.userName || log.userId || t.unknownUser;
                    const initial = operatorName.charAt(0).toUpperCase();

                    // Formatted microsecond timeline time
                    const formattedTime = new Date(log.timestamp).toLocaleTimeString(
                      currentLanguage === 'hi' ? 'hi-IN' : 'en-US',
                      { hour: '2-digit', minute: '2-digit', second: '2-digit' }
                    );

                    const changesObj = log.changes || log.metadata || {};
                    const hasMetadataChanges = Object.keys(changesObj).length > 0;
                    const isExpanded = !!expandedLogIds[log.id];

                    return (
                      <div 
                        key={log.id}
                        className="group relative flex items-start gap-3 transition-all pb-1 text-left"
                      >
                        {/* Interactive Circle on Timeline */}
                        <div className="absolute -left-[31px] top-4.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white dark:bg-slate-900 z-10 border-2 border-blue-400 dark:border-slate-800 shadow-xs">
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        </div>

                        {/* User Avatar Initial */}
                        <div className={`mt-1 h-9 w-9 shrink-0 rounded-full flex items-center justify-center font-black text-xs select-none border shadow-sm ${style.avatarBg}`}>
                          {initial}
                        </div>

                        {/* Card Body */}
                        <div className="flex-1 min-w-0">
                           <div 
                            onClick={() => { if(hasMetadataChanges) toggleLogExpand(log.id); }}
                            className={`p-4 rounded-2xl border bg-white dark:bg-slate-900/90 transition-all ${
                              hasMetadataChanges ? 'cursor-pointer hover:shadow-md hover:border-blue-200 dark:hover:border-slate-700' : 'cursor-default shadow-sm'
                            } ${
                              isExpanded ? 'border-[#3b5998] dark:border-slate-700 ring-1 ring-blue-50/50 dark:ring-0 shadow-md' : 'border-slate-200/70 dark:border-slate-800/80'
                            }`}
                          >
                            {/* Card Item Header Context Info */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-slate-100 dark:border-slate-800 pb-2 mb-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-xs text-slate-800 dark:text-slate-150 truncate max-w-[130px]">
                                  {operatorName}
                                </span>

                                {log.userRole && (
                                  <span className="text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    {log.userRole}
                                  </span>
                                )}

                                {/* Color-coded Action Badge */}
                                <span className={`text-[8px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${style.bg}`}>
                                  {style.icon}
                                  {log.actionType || log.action}
                                </span>

                                {log.module && (
                                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 flex items-center gap-0.5">
                                    <CornerDownRight size={8} />
                                    {log.module}
                                  </span>
                                )}
                              </div>

                              <span className="text-[9px] text-slate-400 dark:text-slate-550 font-mono font-bold flex items-center gap-0.5">
                                {formattedTime}
                              </span>
                            </div>

                            {/* Human Readable Action description */}
                            <p className="text-xs font-semibold leading-relaxed text-slate-800 dark:text-slate-250">
                              {log.description}
                            </p>

                            {/* Utility IDs footer indicators */}
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                              <div className="flex items-center gap-2 flex-wrap">
                                {log.targetId && (
                                  <span>
                                    {t.idLabel}: <span className="font-semibold text-slate-600 dark:text-slate-400">{log.targetId}</span>
                                  </span>
                                )}
                                {log.targetTable && (
                                  <>
                                    <span className="text-slate-200 dark:text-slate-800">|</span>
                                    <span>
                                      {t.schemaLabel}: <span className="font-semibold text-slate-600 dark:text-slate-400 uppercase">{log.targetTable}</span>
                                    </span>
                                  </>
                                )}
                              </div>

                              {hasMetadataChanges && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleLogExpand(log.id);
                                  }}
                                  className="text-[9px] font-bold uppercase text-[#3b5998] dark:text-blue-450 hover:text-[#2d4373] flex items-center gap-1 bg-blue-50/50 dark:bg-slate-950 hover:bg-blue-50 border border-blue-100/40 dark:border-slate-850 rounded-lg px-2 py-1 cursor-pointer transition active:scale-95"
                                >
                                  {isExpanded ? <EyeOff size={10} /> : <Eye size={10} />}
                                  {isExpanded ? t.hideChanges : t.viewChanges}
                                </button>
                              )}
                            </div>

                            {/* EXPANDABLE DIFF DRAWER / PROPERTY ALTERED TRACE */}
                            <AnimatePresence initial={false}>
                              {isExpanded && hasMetadataChanges && (
                                <motion.div
                                  key="diff-grid"
                                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                  animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                  transition={{ duration: 0.2, ease: "easeInOut" }}
                                  className="overflow-hidden border-t border-slate-100 dark:border-slate-800/80 pt-3"
                                >
                                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-2.5 border border-slate-150 dark:border-slate-900/40 max-h-[250px] overflow-y-auto">
                                    <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wilder mb-2 flex items-center gap-1 font-sans">
                                      <Database size={11} className="text-emerald-500" />
                                      {t.changesTitle}
                                    </div>

                                    <div className="space-y-2.5">
                                      {Object.entries(changesObj).map(([field, deltaValue]) => {
                                        const deltaStr = String(deltaValue);
                                        let sourceVal = '';
                                        let updatedVal = deltaStr;

                                        if (deltaStr.includes('->')) {
                                          const splits = deltaStr.split('->');
                                          sourceVal = splits[0]?.trim() || '';
                                          updatedVal = splits[1]?.trim() || '';
                                        }

                                        return (
                                          <div key={field} className="border-b border-slate-200/40 dark:border-slate-900/45 pb-2 last:border-0 text-left">
                                            <span className="text-[9px] font-bold text-[#3b5998] dark:text-blue-400 font-mono block mb-1">
                                              {field}
                                            </span>
                                            
                                            <div className="grid grid-cols-2 gap-2 text-[9px] leading-tight">
                                              {sourceVal && (
                                                <div className="bg-rose-50/50 dark:bg-rose-950/10 p-1.5 rounded border border-rose-100/30">
                                                  <span className="text-[8px] uppercase tracking-wider font-extrabold text-rose-500 block mb-0.5">{t.from}</span>
                                                  <span className="font-mono text-slate-500 dark:text-slate-400 break-all block">{sourceVal}</span>
                                                </div>
                                              )}
                                              <div className={`p-1.5 rounded border ${sourceVal ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100/30' : 'col-span-2 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                                <span className={`text-[8px] uppercase tracking-wider font-extrabold block mb-0.5 ${sourceVal ? 'text-emerald-500' : 'text-slate-500'}`}>{sourceVal ? t.to : 'Current'}</span>
                                                <span className="font-mono text-slate-850 dark:text-slate-200 break-all block font-bold">{updatedVal}</span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Load More Records triggers */}
        {hasMoreFromCloud && !loading && (
          <div className="pt-4 pb-2 text-center">
            <button
              onClick={handleLoadMoreFromCloud}
              disabled={refreshing}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-[#3b5998] dark:text-blue-450 px-5 py-2.5 rounded-2xl text-xs font-black shadow-sm inline-flex items-center gap-1.5 cursor-pointer hover:shadow transition active:scale-95"
            >
              <Database size={13} className="text-emerald-500" />
              {t.loadMore}
            </button>
          </div>
        )}

      </div>

      {/* 4. PREMIUM COMPACT PAGINATION FOOTER */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3.5 flex items-center justify-between shrink-0 h-[60px] select-none shadow">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1 || loading}
          className="bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 disabled:opacity-40 text-slate-700 dark:text-slate-350 px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed border border-slate-200/20"
        >
          <ChevronLeft size={15} />
          <span className="hidden md:inline">{isHi ? 'पिछला' : 'Prev'}</span>
        </button>

        <span className="text-[11px] font-bold text-slate-550 dark:text-slate-400">
          {t.page} <span className="font-black text-slate-900 dark:text-white font-mono">{currentPage}</span> / <span className="font-mono">{totalPages}</span> 
          <span className="mx-2 text-slate-300 dark:text-slate-700">|</span> 
          <span>Total: <b className="font-mono font-black text-[#3b5998] dark:text-blue-400">{totalRecords}</b> actions</span>
        </span>

        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages || loading}
          className="bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 disabled:opacity-40 text-slate-700 dark:text-slate-350 px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed border border-slate-200/20"
        >
          <span className="hidden md:inline">{isHi ? 'अगला' : 'Next'}</span>
          <ChevronRight size={15} />
        </button>
      </footer>

    </div>
  );
};
