import React, { useState, useEffect } from 'react';
import { DashboardScreen } from './views/admin/DashboardScreen';
import { InvoiceScreen } from './views/billing/InvoiceScreen';
import { MasterScreen } from './views/admin/MasterScreen';
import { ReportScreen } from './views/reports/ReportScreen';
import { PaymentScreen } from './views/billing/PaymentScreen';
import { PaymentListScreen } from './views/billing/PaymentListScreen';
import { OrderListScreen } from './views/billing/OrderListScreen';
import { SettingsScreen } from './views/admin/SettingsScreen';
import { UnitListScreen } from './views/inventory/UnitListScreen';
import { ItemListScreen } from './views/inventory/ItemListScreen';
import { PartyListScreen } from './views/crm/PartyListScreen';
import { CompanyProfileScreen } from './views/admin/CompanyProfileScreen';
import { TaxListScreen } from './views/inventory/TaxListScreen';
import { CategoryListScreen } from './views/inventory/CategoryListScreen';
import { AccountGroupListScreen } from './views/admin/AccountGroupListScreen';
import { HSNListScreen } from './views/inventory/HSNListScreen';
import { BusinessReportScreen } from './views/reports/BusinessReportScreen';
import { ReportOptionsScreen } from './views/reports/ReportOptionsScreen';
import { AggregatedReportScreen } from './views/reports/AggregatedReportScreen';
import { PartySelectReportScreen } from './views/reports/PartySelectReportScreen';
import { PartyDetailReportScreen } from './views/reports/PartyDetailReportScreen';
import { PartyItemDetailReportScreen } from './views/reports/PartyItemDetailReportScreen';
import { ItemSelectReportScreen } from './views/reports/ItemSelectReportScreen';
import { ItemDetailReportScreen } from './views/reports/ItemDetailReportScreen';
import { StockSummaryScreen } from './views/inventory/StockSummaryScreen';
import { GSTReportScreen } from './views/reports/GSTReportScreen';
import { ChatListScreen } from './views/crm/ChatListScreen';
import { ChatDetailScreen } from './views/crm/ChatDetailScreen';
import { JournalListScreen } from './views/billing/JournalListScreen';
import { JournalEntryScreen } from './views/billing/JournalEntryScreen';
import { AttendanceScreen } from './views/crm/AttendanceScreen';
import { ContraScreen } from './views/billing/ContraScreen';
import { FinancialReportScreen } from './views/reports/FinancialReportScreen';
import { LedgerReportScreen } from './views/reports/LedgerReportScreen';
import { MasterDataTableScreen } from './views/admin/MasterDataTableScreen';
import { NearbyShopsScreen } from './views/crm/NearbyShopsScreen';
import { NotificationScreen } from './views/admin/NotificationScreen'; // Import
import { FinancialYearScreen } from './views/admin/FinancialYearScreen';
import { ManufacturingScreen } from './views/inventory/ManufacturingScreen';
import { ManufacturingReportScreen } from './views/inventory/ManufacturingReportScreen';
import { OpeningStockScreen } from './views/inventory/OpeningStockScreen';
import { CreateBroadcastScreen } from './views/crm/CreateBroadcastScreen';
import { BroadcastChatScreen } from './views/crm/BroadcastChatScreen';
import { HelpLegalScreen } from './views/admin/HelpLegalScreen';
import { SplashScreen } from './views/auth/SplashScreen';
import { LanguageScreen } from './views/auth/LanguageScreen';
import { TransactionType, Party, Language, Item } from './core/types';
import { Zap, Home, LayoutGrid, FileBarChart } from 'lucide-react'; // Icon for Splash
import { billingService, BroadcastGroup } from './services/billingService';
import { LockScreen } from './views/auth/LockScreen'; // Import LockScreen
import { MasterLayoutShell } from './components/layout/MasterLayoutShell';
import { MenuPageHarmonizer } from './components/layout/MenuPageHarmonizer';
import { JoinStoreScreen } from './views/auth/JoinStoreScreen';
import { RoleSelectionScreen } from './views/auth/RoleSelectionScreen';
import { initFirebaseAuth, startChatSync, startInvoiceSync, startPaymentSync, startItemSync } from './services/firebaseService';
import { AuthProvider, useAuth } from './context/AuthContext';
import { initializeSyncEngine, startPullSync, stopPullSync } from './services/syncEngine';
import { runSmokeTest } from './services/smokeTest';
import { motion, AnimatePresence } from 'motion/react';
import { TabTransitionWrapper } from './components/layout/TabTransitionWrapper';
import { SwipeBackProvider } from './components/layout/SwipeBackProvider';

import { safeLocalStorage, safeSessionStorage } from './core/utils/storage';

export type Theme = 'system' | 'light' | 'dark';

interface NavigationState {
  screen: 'roleSelection' | 'joinStore' | 'dashboard' | 'language' | 'invoice' | 'master' | 'report' | 'payment' | 'paymentList' | 'orderList' | 'settings' | 'unitList' | 'itemList' | 'partyList' | 'companyProfile' | 'taxList' | 'categoryList' | 'accountGroupList' | 'hsnList' | 'businessReport' | 'reportOptions' | 'aggregatedReport' | 'partySelectReport' | 'partyDetailReport' | 'itemSelectReport' | 'itemDetailReport' | 'partyItemDetailReport' | 'stockSummary' | 'gstReport' | 'chatList' | 'chatDetail' | 'journalList' | 'journalEntry' | 'attendance' | 'contra' | 'financialReport' | 'ledgerReport' | 'masterDataTable' | 'nearbyShops' | 'notifications' | 'manufacturing' | 'manufacturingReport' | 'openingStock' | 'createBroadcast' | 'broadcastDetail' | 'helpLegal' | 'masterLayoutShell';
  activeTab?: 'dashboard' | 'master' | 'report';
  params?: {
    type?: TransactionType;
    tab?: TransactionType;
    party?: Party;
    item?: Item;
    reportMode?: string;
    invoiceId?: string;
    itemId?: string;
    returnScreen?: string;
    returnParams?: any;
    items?: any[]; // Added for AI prefilling
    reportType?: 'TrialBalance' | 'ProfitLoss' | 'BalanceSheet'; 
    reportView?: 'main' | 'accounting'; // Added parameter for ReportScreen view
    amount?: number;
    payment?: any; // For editing Payment
    broadcastGroup?: BroadcastGroup;
    reportOption?: 'By Party' | 'By Item' | 'By Party By Item' | 'Default';
    searchQuery?: string;
    partyMode?: 'customer' | 'ledger';
    savedInvoiceId?: string;
  };
}

export const AppContent = () => {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser?.businessId) {
      startPullSync(currentUser.businessId);
    } else {
      stopPullSync();
    }
    return () => {
      stopPullSync();
    };
  }, [currentUser?.businessId]);

  const [showSplash, setShowSplash] = useState(() => {
      const isAppInitialized = safeLocalStorage.getItem('app_initialized') === 'true';
      if (isAppInitialized) return false;
      return true;
  });
  const [showFYSelection, setShowFYSelection] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [navState, setNavState] = useState<NavigationState>(() => {
      const isAppInitialized = safeLocalStorage.getItem('app_initialized') === 'true';
      if (!isAppInitialized) {
          const isLanguageSelected = safeLocalStorage.getItem('onboarding_language_selected') === 'true';
          const isRoleSelected = safeLocalStorage.getItem('onboarding_role_selected') === 'true';
          const savedRole = safeLocalStorage.getItem('locked_role');
          if (!isLanguageSelected) {
              return { screen: 'language' };
          }
          if (!isRoleSelected) {
              return { screen: 'roleSelection' };
          }
          if (savedRole === 'staff') {
              return { screen: 'joinStore' };
          }
          return { screen: 'companyProfile' };
      }
      try {
          const saved = safeSessionStorage.getItem('navState');
          return saved ? JSON.parse(saved) : { screen: 'dashboard' };
      } catch (e) { return { screen: 'dashboard' }; }
  });
  const [history, setHistory] = useState<NavigationState[]>(() => {
      try {
          const saved = safeSessionStorage.getItem('history');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'report'>(() => {
      return (safeSessionStorage.getItem('activeTab') as 'dashboard' | 'master' | 'report') || 'dashboard';
  });
  const [language, setLanguage] = useState<Language>(() => {
      return (safeLocalStorage.getItem('appLanguage') as Language) || 'en';
  });
  
  useEffect(() => {
      safeLocalStorage.setItem('appLanguage', language);
  }, [language]);

  const [theme, setTheme] = useState<Theme>(() => {
    return (safeLocalStorage.getItem('appTheme') as Theme) || 'system';
  });
  const [isDBReady, setIsDBReady] = useState(false);
  
  // GLOBAL DATE STATE - Controls date across the app
  const [globalDate, setGlobalDate] = useState<Date>(new Date());

  // Slide direction manager for premium tab carousel
  const [prevScreen, setPrevScreen] = useState<string>(() => navState?.screen || 'dashboard');
  const [slideDirection, setSlideDirection] = useState<number>(1);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const getInitialTrackScreens = (initialNav: NavigationState): NavigationState[] => {
    const isAppInitialized = safeLocalStorage.getItem('app_initialized') === 'true';
    if (!isAppInitialized) {
      return [initialNav];
    } else {
      return [
        { screen: 'dashboard' },
        { screen: 'master' },
        { screen: 'report' },
      ];
    }
  };

  const getInitialTrackIndex = (): number => {
    const isAppInitialized = safeLocalStorage.getItem('app_initialized') === 'true';
    if (!isAppInitialized) return 0;
    const tabOrder = ['dashboard', 'master', 'report'];
    const idx = tabOrder.indexOf(navState.screen as any);
    return idx >= 0 ? idx : 0;
  };

  const [trackScreens, setTrackScreens] = useState<NavigationState[]>(() => getInitialTrackScreens(navState));
  const [trackIndex, setTrackIndex] = useState<number>(() => getInitialTrackIndex());

  const lastNavStateRef = React.useRef<NavigationState>(navState);

  // Core Orchestrator for physics-perfect consecutive slide transitions
  useEffect(() => {
    const prev = lastNavStateRef.current;
    lastNavStateRef.current = navState;

    if (prev.screen === navState.screen && JSON.stringify(prev.params) === JSON.stringify(navState.params)) {
      return;
    }

    const tabOrder = ['dashboard', 'master', 'report'];
    const isPrevTab = tabOrder.includes(prev.screen as any);
    const isCurrTab = tabOrder.includes(navState.screen as any);

    if (isPrevTab && isCurrTab) {
      // Case A: Transition between main bottom tabs
      setTrackScreens([
        { screen: 'dashboard' },
        { screen: 'master' },
        { screen: 'report' },
      ]);
      const nextIdx = tabOrder.indexOf(navState.screen as any);
      setTrackIndex(nextIdx >= 0 ? nextIdx : 0);
    } else {
      // Case B: Linear Sub-page transitions or onboarding steps
      if (slideDirection === 1) {
        // Forward entry slide: Left page (prev) to Right page (current)
        setTrackScreens([prev, navState]);
        setTrackIndex(0);
        
        // Defer slide focus index change after paint to trigger CSS transition
        const timer = setTimeout(() => {
          setTrackIndex(1);
        }, 30);
        return () => clearTimeout(timer);
      } else {
        // Backward exit slide: Right page (prev) slides off, Left page (current) comes in
        const isTrackMatching = trackScreens.length === 2 && 
                                trackScreens[0].screen === navState.screen &&
                                JSON.stringify(trackScreens[0].params) === JSON.stringify(navState.params);
                                
        if (isTrackMatching) {
          setTrackIndex(0);
        } else {
          setTrackScreens([navState, prev]);
          setTrackIndex(1);
          const timer = setTimeout(() => {
            setTrackIndex(0);
          }, 30);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [navState, slideDirection]);

  // Restores base tabs layout once backward/forward slide towards a main tab settles
  useEffect(() => {
    const tabOrder = ['dashboard', 'master', 'report'];
    const isCurrTab = tabOrder.includes(navState.screen as any);
    
    if (isCurrTab) {
      const timer = setTimeout(() => {
        setTrackScreens([
          { screen: 'dashboard' },
          { screen: 'master' },
          { screen: 'report' },
        ]);
        const nextIdx = tabOrder.indexOf(navState.screen as any);
        setTrackIndex(nextIdx >= 0 ? nextIdx : 0);
      }, 350); // let the 300ms transition settle cleanly
      return () => clearTimeout(timer);
    }
  }, [navState]);

  useEffect(() => {
    const tabOrder = ['dashboard', 'master', 'report'];
    if (navState.screen !== prevScreen) {
        const prevIsTab = tabOrder.includes(prevScreen as any);
        const nextIsTab = tabOrder.includes(navState.screen as any);
        
        if (prevIsTab && nextIsTab) {
            const prevIdx = tabOrder.indexOf(prevScreen as any);
            const nextIdx = tabOrder.indexOf(navState.screen as any);
            setSlideDirection(nextIdx > prevIdx ? 1 : -1);
        }
        setPrevScreen(navState.screen);
    }
  }, [navState.screen, prevScreen]);

  // GLOBAL FINTECH TOAST SYSTEM STATE
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    window.alert = (msg: string) => {
      let type: 'success' | 'error' | 'info' = 'info';
      let cleanMsg = msg;

      const lower = msg.toLowerCase();
      if (lower.includes('success') || lower.includes('सफलतापूर्वक') || lower.includes('saved successfully') || lower.includes('clear ho gaye') || lower.includes('successfully populated') || lower.includes('auto-fill sandbox') || lower.includes('save ho gaya')) {
        type = 'success';
        if (msg.includes('populated')) {
          cleanMsg = "Database successfully populate ho gaya hai! ✅";
        } else if (msg.includes('save ho gaya') || msg.includes('se save ho gaya')) {
          cleanMsg = "Aapka business profile successfully save ho gaya hai! Chaliye dashboard pe chalte hain! ✅";
        } else if (lower.includes('saved successfully') || lower.includes('saved successfully!')) {
          cleanMsg = "Bill successfully save ho gaya hai! ✅";
        } else if (lower.includes('imported as')) {
          cleanMsg = "Bill import ho gaya hai! ✅";
        }
      } else if (lower.includes('fail') || lower.includes('error') || lower.includes('denied') || lower.includes('missing') || lower.includes('required')) {
        type = 'error';
        if (lower.includes('camera')) {
          cleanMsg = "Camera permission missing hai. Mobile settings check karein! ❌";
        }
      }

      setToast({ message: cleanMsg, type });

      // Auto dismiss after 3 seconds
      const timer = setTimeout(() => {
        setToast(prev => prev?.message === cleanMsg ? null : prev);
      }, 3000);

      return () => clearTimeout(timer);
    };
  }, []);

  // Global error handler for Dexie cancellation errors
  useEffect(() => {
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
          if (event.reason?.name === 'DatabaseClosedError' || event.reason?.message?.includes('cancelled')) {
              // Suppress these specific Dexie errors as they are expected during DB switching
              event.preventDefault();
              console.warn('Suppressed Dexie error:', event.reason.message);
          }
      };
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  // Check for Auto-Import from URL (WhatsApp Deep Link)
  useEffect(() => {
      const initApp = async () => {
          // 1. Initialize DB based on activeFY
          const activeFY = safeLocalStorage.getItem('activeFY') || 'BillingDB';
          await billingService.initDB(activeFY);

          // One-time fresh restart hook requested by the user
          let isLocalStorageFunctional = false;
          try {
              const testKey = '__storage_test_key_functional__';
              localStorage.setItem(testKey, testKey);
              localStorage.removeItem(testKey);
              isLocalStorageFunctional = true;
          } catch (e) {
              isLocalStorageFunctional = false;
          }

          if (isLocalStorageFunctional) {
              if (!safeLocalStorage.getItem('app_reset_completed_v3')) {
                  try {
                      await billingService.clearAllData();
                  } catch (e) {
                      console.warn("Error running fresh start clear:", e);
                  }
                  safeLocalStorage.clear();
                  safeSessionStorage.clear();
                  safeLocalStorage.setItem('app_reset_completed_v3', 'true');
                  window.location.reload();
                  return;
              }
          } else {
              // If native storage is not functional, we are running in-memory which is already empty/fresh on load.
              // Just mark it as reset in-memory so the check doesn't trigger reload-loops, though we won't call reload either.
              safeLocalStorage.setItem('app_reset_completed_v3', 'true');
          }

          setIsDBReady(true);
          initializeSyncEngine();
          runSmokeTest().catch(console.error);

          // Check app lock
          if (safeLocalStorage.getItem('appLockEnabled') === 'true' && safeLocalStorage.getItem('appPin')) {
              setIsLocked(true);
          }
          
          try {
              await initFirebaseAuth();
              await startChatSync();
              await startInvoiceSync();
              await startPaymentSync();
              await startItemSync();
          } catch(e) {
              console.error(e);
          }
          
          // 2. Check for Auto-Import
          let importData = null;
          
          if (window.location.hash.includes('import_data=')) {
              const hash = window.location.hash.substring(1);
              const params = new URLSearchParams(hash);
              importData = params.get('import_data');
          }
          
          if (!importData) {
              const params = new URLSearchParams(window.location.search);
              importData = params.get('import_data');
          }

          if (importData) {
              try {
                  const decoded = decodeURIComponent(importData);
                  await new Promise(resolve => setTimeout(resolve, 500));
                  const result = await billingService.importTransaction(decoded);
                  const newUrl = window.location.pathname;
                  try {
                      window.history.replaceState({}, document.title, newUrl);
                  } catch (e) {
                      console.warn("safe replaceState failed:", e);
                  }
                  alert(`Auto-Import Successful!\nConverted to ${result.type} Bill.`);
                  setShowSplash(false);
                  setShowFYSelection(false);
                  navigateTo('invoice', { type: result.type, invoiceId: result.id });
              } catch (e) {
                  console.error("Auto import failed", e);
                  alert("Failed to import bill from link. Please try manual copy-paste.");
              }
          } else {
              const isAppInitialized = safeLocalStorage.getItem('app_initialized') === 'true';
              if (!isAppInitialized) {
                  if (!showSplash) {
                      if (safeLocalStorage.getItem('companyProfileSetup') === 'true') {
                          setShowFYSelection(true);
                      } else {
                          const isLanguageSelected = safeLocalStorage.getItem('onboarding_language_selected') === 'true';
                          const isRoleSelected = safeLocalStorage.getItem('onboarding_role_selected') === 'true';
                          const savedRole = safeLocalStorage.getItem('locked_role');

                          if (!isLanguageSelected) {
                              navigateTo('language');
                          } else if (!isRoleSelected) {
                              navigateTo('roleSelection');
                          } else if (savedRole === 'staff') {
                              navigateTo('joinStore');
                          } else {
                              navigateTo('companyProfile');
                          }
                      }
                  }
              }
          }
      };

      initApp();
  }, [showSplash]);

  const skipTransitionRef = React.useRef(false);
  const isNavigatingBackRef = React.useRef(false);

  useEffect(() => {
    if (skipTransitionRef.current) {
      skipTransitionRef.current = false;
    }
  }, [navState]);

  const popReactHistory = () => {
    setHistory(prevHistory => {
      if (prevHistory.length > 0) {
        const newHistory = [...prevHistory];
        const prevState = newHistory.pop()!;
        setNavState(prevState);
        if (prevState.activeTab) {
          setActiveTab(prevState.activeTab);
        } else if (['dashboard', 'master', 'report'].includes(prevState.screen)) {
          setActiveTab(prevState.screen as any);
        }
        return newHistory;
      } else {
        setNavState({ screen: 'dashboard', activeTab: 'dashboard' });
        setActiveTab('dashboard');
        return [];
      }
    });
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (isNavigatingBackRef.current) {
        isNavigatingBackRef.current = false;
        return;
      }
      
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 300);

      // Always treat popstate as a "back" navigation
      setSlideDirection(-1);
      popReactHistory();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (screen: NavigationState['screen'], params?: NavigationState['params']) => {
    const isOnboarding = ['language', 'roleSelection', 'companyProfile', 'joinStore'].includes(screen);
    if (isTransitioning && !isOnboarding) return;
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 300);

    setSlideDirection(1); // Manual forward transition
    isNavigatingBackRef.current = false;
    
    const stateToPush: NavigationState = { ...navState, activeTab };

    if (['dashboard', 'master', 'report'].includes(screen)) {
      // If we are already on this base screen and just navigating to a different view inside it, 
      // push to history instead of clearing it.
      if (screen === navState.screen) {
          setHistory(prev => [...prev, stateToPush]);
      } else {
          setHistory([]);
      }
    } else {
      setHistory(prev => [...prev, stateToPush]);
    }
    setNavState({ screen, params, activeTab });
    try {
        window.history.pushState({ screen }, '', ''); // Push fresh state ONLY when navigating manually
    } catch (e) {
        console.warn("safe pushState failed:", e);
    }
    window.scrollTo(0, 0); // Ensure new screen starts at top
  };

  const goBack = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 300);

    setSlideDirection(-1); // Manual backward transition
    popReactHistory();
    
    const hasBrowserHistory = window.history && window.history.state;
    if (hasBrowserHistory && history.length > 0) {
      isNavigatingBackRef.current = true;
      try {
        window.history.back();
      } catch (e) {
        isNavigatingBackRef.current = false;
        console.warn("safe window.history.back failed:", e);
      }
    }
  };

  useEffect(() => {
    safeSessionStorage.setItem('navState', JSON.stringify(navState));
    safeSessionStorage.setItem('history', JSON.stringify(history));
    safeSessionStorage.setItem('activeTab', activeTab);
  }, [navState, history, activeTab]);

  React.useEffect(() => {
    const handleThemeChange = () => {
      let isDark = false;
      if (theme === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        isDark = theme === 'dark';
      }

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    handleThemeChange();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => handleThemeChange();
      try {
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
      } catch (e) {
        // Fallback for older browsers
        try {
          mediaQuery.addListener(listener);
          return () => mediaQuery.removeListener(listener);
        } catch (err) {}
      }
    }
    safeLocalStorage.setItem('appTheme', theme);
  }, [theme]);

  const renderTabScreen = (tab: 'dashboard' | 'master' | 'report', state: NavigationState = navState) => {
    switch (tab) {
      case 'dashboard':
        return <DashboardScreen 
          onNavigate={(type, party, prefilledItems) => {
              // AI / Scanner Logic: If specific party or items are provided, go straight to Invoice Entry
              if (party || (prefilledItems && prefilledItems.length > 0)) {
                  navigateTo('invoice', { type: type as any, party, items: prefilledItems });
                  return;
              }

              // Menu Logic: Redirect Sale/Purchase to REPORT (List) first
              if (['Sale', 'Purchase', 'Sale Return', 'Purchase Return'].includes(type)) {
                  navigateTo('businessReport', { tab: type as any });
              } else if (['Payment', 'Receipt'].includes(type)) {
                  navigateTo('paymentList', { type: type as any });
              } else if (['Sale Order', 'Purchase Order'].includes(type)) {
                  navigateTo('orderList', { type: type as any });
              } else if (type === 'Settings' || type === 'settings') {
                  navigateTo('settings');
              } else if (['Journal', 'journal', 'journalList'].includes(type)) {
                  navigateTo('journalList');
              } else if (['Contra', 'contra'].includes(type)) {
                  navigateTo('contra');
              } else if (['Attendance', 'attendance'].includes(type)) {
                  navigateTo('attendance');
              } else {
                  navigateTo('invoice', { type: type as any });
              }
          }}
          onSwitchTab={(t) => { setActiveTab(t); }}
          onOpenSettings={() => navigateTo('settings')}
          onNotification={() => navigateTo('notifications')}
          onChat={() => navigateTo('chatList')}
          onJournal={() => navigateTo('journalList')}
          onAttendance={() => navigateTo('attendance')}
          onContra={() => navigateTo('contra')}
          language={language}
          selectedDate={globalDate}
          onDateChange={setGlobalDate}
          hideFooter={true}
        />;
      case 'master':
        return <MasterScreen 
          onSwitchTab={(t) => { setActiveTab(t); }}
          onOpenSettings={() => navigateTo('settings')}
          onNotification={() => navigateTo('notifications')}
          onNavigate={(screen, params) => navigateTo(screen, params)}
          language={language}
          selectedDate={globalDate}
          onDateChange={setGlobalDate}
          hideFooter={true}
        />;
      case 'report':
        return <ReportScreen 
          onSwitchTab={(t) => { setActiveTab(t); }}
          onOpenSettings={() => navigateTo('settings')}
          onNotification={() => navigateTo('notifications')}
          onNavigate={(screen, params) => navigateTo(screen, params)}
          onBack={goBack}
          initialView={state.params?.reportView}
          language={language}
          selectedDate={globalDate}
          onDateChange={setGlobalDate}
          hideFooter={true}
        />;
    }
  };

  const renderScreen = (state: NavigationState = navState) => {
    switch (state.screen) {
      case 'language':
        return <LanguageScreen 
          currentLanguage={language}
          onSelect={(lang) => {
            setLanguage(lang);
            try {
              safeLocalStorage.setItem('onboarding_language_selected', 'true');
            } catch (err) {
              console.warn("Storage write protected:", err);
            }
            navigateTo('roleSelection');
          }} 
        />;
      case 'roleSelection':
        return <RoleSelectionScreen 
          language={language}
          onLanguageChange={setLanguage}
          onBack={() => {
            // Unset onboarding language selected if we go back
            safeLocalStorage.removeItem('onboarding_language_selected');
            navigateTo('language');
          }}
          onSelect={(role) => {
            if (role === 'staff') {
              navigateTo('joinStore');
            } else {
              navigateTo('companyProfile');
            }
          }}
        />;
      case 'joinStore':
        return <JoinStoreScreen 
          currentLanguage={language}
          onSuccess={() => {
            setHistory([]);
            setNavState({ screen: 'dashboard' });
            setActiveTab('dashboard');
          }}
          onBack={() => {
            navigateTo('roleSelection');
          }}
        />;
      case 'dashboard':
        return renderTabScreen(activeTab, state);
      case 'master':
        return renderTabScreen('master', state);
      case 'report':
        return renderTabScreen('report', state);
      case 'invoice':
        return <InvoiceScreen 
          onBack={goBack} 
          transactionType={state.params?.type || 'Sale'} 
          language={language}
          invoiceId={state.params?.invoiceId}
          initialParty={state.params?.party} // Pass initialParty from scan/AI
          initialDate={globalDate} // Pass Global Date
          initialItems={state.params?.items} // Pass prefilled items from AI
          onNavigate={(screen, type, party, amount, savedInvoiceId, extraParams) => {
              if (screen === 'payment') {
                  // Replace current navState with the saved invoiceId BEFORE navigating to payment
                  // so when we 'goBack' from payment, we load the saved invoice, not a blank new one.
                  setHistory(prev => {
                      const newHistory = [...prev];
                      const currentState = { ...navState, activeTab };
                      if (savedInvoiceId) {
                          currentState.params = { ...currentState.params, invoiceId: savedInvoiceId };
                      }
                      return [...newHistory, currentState];
                  });
                  setNavState({ screen: 'payment', params: { type, party: party || undefined, amount, payment: extraParams?.payment, savedInvoiceId: savedInvoiceId }, activeTab });
                  try {
                      window.history.pushState({ screen: 'payment' }, '', '');
                  } catch (e) {
                      console.warn("safe pushState for payment failed:", e);
                  }
                  window.scrollTo(0, 0);
              }
              if (screen === 'itemList') {
                  setHistory(prev => {
                      const newHistory = [...prev];
                      const currentState = { ...navState, activeTab };
                      if (savedInvoiceId) {
                          currentState.params = { ...currentState.params, invoiceId: savedInvoiceId };
                      }
                      return [...newHistory, currentState];
                  });
                  setNavState({ 
                      screen: 'itemList', 
                      params: { itemId: extraParams?.itemId, returnScreen: 'invoice', returnParams: { ...state.params, invoiceId: savedInvoiceId || state.params?.invoiceId } },
                      activeTab
                  });
                  try {
                      window.history.pushState({ screen: 'itemList' }, '', '');
                  } catch (e) {
                      console.warn("safe pushState for itemList failed:", e);
                  }
                  window.scrollTo(0, 0);
              }
              if (screen === 'orderList') navigateTo('orderList', { type });
              if (screen === 'businessReport') {
                  setHistory([]); // Prevent returning to the invoice creation screen via back button
                  setActiveTab('report');
                  setNavState({ screen: 'businessReport', params: { tab: type }, activeTab: 'report' });
                  try {
                      window.history.pushState({ screen: 'businessReport' }, '', '');
                  } catch (e) {
                      console.warn("safe pushState for businessReport failed:", e);
                  }
                  window.scrollTo(0, 0);
              }
          }}
        />;
      case 'payment':
        return <PaymentScreen 
          onBack={goBack} 
          type={(state.params?.type as 'Payment'|'Receipt') || 'Payment'} 
          initialParty={state.params?.party}
          initialDate={globalDate} // Pass Global Date
          initialAmount={state.params?.amount}
          initialPayment={state.params?.payment}
          savedInvoiceId={state.params?.savedInvoiceId as string}
          currentLanguage={language}
        />;
      case 'settings':
        return <SettingsScreen 
          onBack={goBack} 
          onNavigate={navigateTo}
          currentLanguage={language}
          onLanguageChange={setLanguage}
          currentTheme={theme}
          onThemeChange={setTheme}
        />;
      case 'unitList': return <UnitListScreen onBack={goBack} currentLanguage={language} />;
      case 'itemList': return <ItemListScreen onBack={goBack} initialEditItemId={state.params?.itemId} returnScreen={state.params?.returnScreen} returnParams={state.params?.returnParams} onReturn={(screen, params) => setNavState({ screen: screen as any, params, activeTab })} language={language} />;
      case 'partyList': return <PartyListScreen onBack={goBack} initialMode={state.params?.partyMode} language={language} />;
      case 'companyProfile': 
         return <CompanyProfileScreen 
          onBack={goBack} 
          onSaveSuccess={() => {
            setHistory([]);
            setShowFYSelection(true);
          }} 
        />;
      case 'taxList': return <TaxListScreen onBack={goBack} />;
      case 'categoryList': return <CategoryListScreen onBack={goBack} />;
      case 'accountGroupList': return <AccountGroupListScreen onBack={goBack} language={language} />;
      case 'hsnList': return <HSNListScreen onBack={goBack} />;
      case 'reportOptions':
        return <ReportOptionsScreen
          onBack={goBack}
          type={state.params?.type || 'Sale'}
          onSelectOption={(option) => {
              if (option === 'Default') {
                  navigateTo('businessReport', { tab: state.params?.type });
              } else if (option === 'By Party') {
                  navigateTo('partySelectReport', { type: state.params?.type });
              } else if (option === 'By Item') {
                  navigateTo('itemSelectReport', { type: state.params?.type });
              } else if (option === 'By Party By Item') {
                  navigateTo('partySelectReport', { type: state.params?.type, reportMode: 'party-item' });
              } else {
                  navigateTo('aggregatedReport', { type: state.params?.type, reportOption: option });
              }
          }}
        />;
      case 'partySelectReport':
        return <PartySelectReportScreen
          onBack={goBack}
          type={state.params?.type || 'Sale'}
          onSelect={(party) => {
              if (state.params?.reportMode === 'party-item') {
                  navigateTo('partyItemDetailReport', { type: state.params?.type, party });
              } else {
                  navigateTo('partyDetailReport', { type: state.params?.type, party });
              }
          }}
        />;
      case 'partyDetailReport':
        return <PartyDetailReportScreen
          onBack={goBack}
          type={state.params?.type || 'Sale'}
          party={state.params?.party || null}
        />;
      case 'partyItemDetailReport':
        return <PartyItemDetailReportScreen
          onBack={goBack}
          type={state.params?.type || 'Sale'}
          party={state.params?.party || null}
        />;
      case 'itemSelectReport':
        return <ItemSelectReportScreen
          onBack={goBack}
          type={state.params?.type || 'Sale'}
          onSelect={(item) => {
              navigateTo('itemDetailReport', { type: state.params?.type, item });
          }}
        />;
      case 'itemDetailReport':
        return <ItemDetailReportScreen
          onBack={goBack}
          type={state.params?.type || 'Sale'}
          item={state.params?.item || null}
        />;
      case 'aggregatedReport':
        return <AggregatedReportScreen 
          onBack={goBack}
          type={state.params?.type || 'Sale'}
          reportOption={state.params?.reportOption || 'By Party'}
          onNavigate={navigateTo}
        />;
      case 'businessReport': 
        return <BusinessReportScreen 
          onBack={goBack} 
          initialTab={state.params?.tab} 
          initialSearchQuery={state.params?.searchQuery}
          onCreateNew={(type) => navigateTo('invoice', { type })} 
          onEditInvoice={(id, type) => navigateTo('invoice', { type, invoiceId: id })}
          language={language}
        />;
      case 'stockSummary': return <StockSummaryScreen onBack={goBack} />;
      case 'gstReport': return <GSTReportScreen onBack={goBack} />;
      case 'chatList': return <ChatListScreen onBack={goBack} onSelectChat={(p) => navigateTo('chatDetail', { party: p })} onCreateBroadcast={() => navigateTo('createBroadcast')} onSelectBroadcast={(group) => navigateTo('broadcastDetail', { broadcastGroup: group })} onOpenNearbyShops={() => navigateTo('nearbyShops')} />;
      case 'chatDetail': return <ChatDetailScreen onBack={goBack} party={state.params!.party!} />;
      case 'paymentList': return <PaymentListScreen onBack={goBack} type={state.params?.type as any} onCreateNew={() => navigateTo('payment', { type: state.params?.type })} onEdit={(payment) => navigateTo('payment', { type: state.params?.type, payment })} currentLanguage={language} />;
      case 'orderList': 
        return <OrderListScreen 
          onBack={goBack} 
          onCreate={(type) => navigateTo('invoice', { type })} 
          initialTab={state.params?.type?.includes('Sale') ? 'receive' : 'send'} 
          onEdit={(id, type) => navigateTo('invoice', { type, invoiceId: id })}
          language={language}
        />;
      case 'journalList': return <JournalListScreen onBack={goBack} onCreateNew={() => navigateTo('journalEntry')} language={language} />;
      case 'journalEntry': return <JournalEntryScreen onBack={goBack} initialDate={globalDate} />;
      case 'attendance': return <AttendanceScreen onBack={goBack} language={language} initialDate={globalDate} />;
      case 'contra': return <ContraScreen onBack={goBack} initialDate={globalDate} />;
      case 'financialReport': return <FinancialReportScreen onBack={goBack} reportType={state.params?.reportType || 'TrialBalance'} />;
      case 'ledgerReport': return <LedgerReportScreen onBack={goBack} />;
      case 'masterDataTable': return <MasterDataTableScreen onBack={goBack} />;
      case 'nearbyShops': return <NearbyShopsScreen onBack={goBack} />;
      case 'notifications': return <NotificationScreen onBack={goBack} />;
      case 'manufacturing': return <ManufacturingScreen onBack={goBack} />;
      case 'manufacturingReport': return <ManufacturingReportScreen onBack={goBack} />;
      case 'openingStock': return <OpeningStockScreen onBack={goBack} language={language} />;
      case 'createBroadcast': return <CreateBroadcastScreen onBack={goBack} onGroupCreated={(group) => navigateTo('broadcastDetail', { broadcastGroup: group })} />;
      case 'broadcastDetail': return <BroadcastChatScreen onBack={goBack} broadcastGroup={state.params!.broadcastGroup!} />;
      case 'masterLayoutShell': return <MasterLayoutShell />;
      case 'helpLegal': return <HelpLegalScreen onBack={goBack} language={language} />;
      default: return <DashboardScreen onNavigate={() => {}} onSwitchTab={() => {}} onOpenSettings={() => {}} onNotification={() => {}} onChat={() => {}} /> as any;
    }
  };

  const getOnboardingProgress = () => {
    const isAppInitialized = safeLocalStorage.getItem('app_initialized') === 'true';
    if (isAppInitialized) return null;
    
    if (showSplash) return 20;
    if (showFYSelection) return 80;
    if (navState.screen === 'roleSelection') return 30;
    if (navState.screen === 'language') return 50;
    if (navState.screen === 'joinStore') return 70;
    if (navState.screen === 'companyProfile') return 60;
    return null;
  };

  if (!isDBReady) {
    return (
      <div className="min-h-screen bg-slate-200 dark:bg-slate-900 flex items-center justify-center sm:p-4 font-sans">
        <div className="w-full h-[100dvh] sm:h-[90vh] sm:max-h-[900px] sm:max-w-[420px] bg-slate-950 text-white relative sm:rounded-2xl sm:shadow-[0_0_40px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col items-center justify-center sm:border-8 border-slate-800 dark:border-slate-700">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          <p className="text-slate-400 text-xs mt-3 tracking-widest font-mono uppercase">Starting Services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col w-full overflow-hidden">
      <div className="w-full flex-1 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white relative overflow-hidden flex flex-col">
        {/* Unified Synchronized Onboarding Progress Bar */}
        {getOnboardingProgress() !== null && (
          <div className="absolute top-0 left-0 w-full h-1.5 bg-neutral-900/40 z-[9999] pointer-events-none">
            <div 
              className="h-full bg-gradient-to-r from-brand-primary to-money-in transition-all duration-700 ease-out" 
              style={{ width: `${getOnboardingProgress()}%` }}
            ></div>
          </div>
        )}
        {showFYSelection ? (
          <FinancialYearScreen 
            language={language}
            onSelect={async (fyId) => {
              safeLocalStorage.setItem('activeFY', fyId);
              await billingService.initDB(fyId);
              safeLocalStorage.setItem('app_initialized', 'true');
              safeLocalStorage.setItem('onboardingCompleted', 'true');
              setShowFYSelection(false);
              // Check app lock after setting FY
              if (safeLocalStorage.getItem('appLockEnabled') === 'true' && safeLocalStorage.getItem('appPin')) {
                  setIsLocked(true);
              }
              setHistory([]);
              setNavState({ screen: 'dashboard' });
              setActiveTab('dashboard');
              try { window.history.replaceState({ screen: 'dashboard' }, '', ''); } catch(e){}
              window.scrollTo(0, 0);
            }} 
          />
        ) : isLocked ? (
          <LockScreen onUnlock={() => setIsLocked(false)} />
        ) : currentUser?.role === 'staff' && (!currentUser.businessId || currentUser.businessId === 'default_business_id') ? (
          <JoinStoreScreen currentLanguage={language} />
        ) : (
          <div className="flex-1 flex flex-col min-h-0 h-full w-full relative">
            {/* Premium Handheld-Feel Slide Viewport Carousel */}
            <SwipeBackProvider 
              onSwipeBack={() => {
                skipTransitionRef.current = true;
                goBack();
              }} 
              canGoBack={history.length > 0 && !['dashboard', 'master', 'report'].includes(navState.screen)}
              activeTab={['dashboard', 'master', 'report'].includes(navState.screen) ? activeTab : undefined}
              onTabChange={(tab) => {
                skipTransitionRef.current = true;
                setActiveTab(tab);
              }}
              renderPreviousScreen={() => {
                const prev = history[history.length - 1];
                return prev ? renderScreen(prev) : null;
              }}
              renderLeftTabScreen={() => {
                const currTab = ['dashboard', 'master', 'report'].includes(navState.screen) ? activeTab : undefined;
                if (currTab === 'master') {
                  return renderTabScreen('dashboard');
                } else if (currTab === 'report') {
                  return renderTabScreen('master');
                }
                return null;
              }}
              renderRightTabScreen={() => {
                const currTab = ['dashboard', 'master', 'report'].includes(navState.screen) ? activeTab : undefined;
                if (currTab === 'dashboard') {
                  return renderTabScreen('master');
                } else if (currTab === 'master') {
                  return renderTabScreen('report');
                }
                return null;
              }}
            >
              <div className="flex-1 relative min-h-0 w-full overflow-hidden bg-[var(--bg-app)] dark:bg-[var(--bg-app)]">
                {(() => {
                  const totalPages = trackScreens.length;
                  const activeIdx = trackIndex >= 0 && trackIndex < totalPages ? trackIndex : 0;
                  return (
                    <div className={`relative w-full h-full bg-[var(--bg-app)] ${isTransitioning ? 'pointer-events-none select-none' : ''}`}>
                      {trackScreens.map((state, idx) => {
                        // Compute offset percentage for each individual slide
                        const offset = (idx - activeIdx) * 100;
                        const isVisible = Math.abs(idx - activeIdx) <= 1; // adjacent sliding performance filter
                        if (!isVisible) return null;

                        return (
                          <div 
                            key={`${state.screen}-${idx}`} 
                            className={`absolute inset-0 h-full w-full shrink-0 flex flex-col bg-[var(--bg-app)] overflow-hidden ${
                              skipTransitionRef.current ? '' : 'transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]'
                            }`}
                            style={{
                              transform: `translate3d(${offset}%, 0, 0)`,
                            }}
                          >
                            <MenuPageHarmonizer language={language}>
                              {renderScreen(state)}
                            </MenuPageHarmonizer>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </SwipeBackProvider>

            {/* Static Bottom Tab Navigation Bar (Never Flickers) */}
            {['dashboard', 'master', 'report'].includes(navState.screen) && (
              <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shrink-0 z-40 pt-2 pb-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
                  <div className="max-w-5xl mx-auto w-full flex items-center justify-between px-8">
                      <button 
                          onClick={() => { setActiveTab('dashboard'); if (navState.screen !== 'dashboard') navigateTo('dashboard'); }} 
                          className={`flex flex-col items-center gap-0.5 transition-all duration-200 ${activeTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400 scale-105' : 'text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                      >
                          <Home size={22} fill={activeTab === 'dashboard' ? "currentColor" : "none"} />
                          <span className="text-[10px] font-bold">Home</span>
                      </button>
                      <button 
                          onClick={() => { setActiveTab('master'); if (navState.screen !== 'dashboard') navigateTo('dashboard'); }} 
                          className={`flex flex-col items-center gap-0.5 transition-all duration-200 ${activeTab === 'master' ? 'text-indigo-600 dark:text-indigo-400 scale-105' : 'text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                      >
                          <LayoutGrid size={22} fill={activeTab === 'master' ? "currentColor" : "none"} />
                          <span className="text-[10px] font-bold">Master</span>
                      </button>
                      <button 
                          onClick={() => { setActiveTab('report'); if (navState.screen !== 'dashboard') navigateTo('dashboard'); }} 
                          className={`flex flex-col items-center gap-0.5 transition-all duration-200 ${activeTab === 'report' ? 'text-emerald-600 dark:text-emerald-400 scale-105 font-bold' : 'text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400'}`}
                      >
                          <FileBarChart size={22} fill={activeTab === 'report' ? "currentColor" : "none"} />
                          <span className="text-[10px] font-bold">Report</span>
                      </button>
                  </div>
              </footer>
            )}
          </div>
        )}

        {/* Floating absolute overlay for Splash Screen */}
        {showSplash && (
          <div className="absolute inset-0 z-[1000] overflow-hidden">
            <SplashScreen 
              onComplete={() => {
                setShowSplash(false);
                safeSessionStorage.setItem('hasShownSplash', 'true');
                const isAppInitialized = safeLocalStorage.getItem('app_initialized') === 'true';
                if (isAppInitialized) {
                  navigateTo('dashboard');
                } else if (safeLocalStorage.getItem('companyProfileSetup') === 'true') {
                  setShowFYSelection(true);
                } else {
                  const isLanguageSelected = safeLocalStorage.getItem('onboarding_language_selected') === 'true';
                  const isRoleSelected = safeLocalStorage.getItem('onboarding_role_selected') === 'true';
                  const savedRole = safeLocalStorage.getItem('locked_role');

                  if (!isLanguageSelected) {
                    navigateTo('language');
                  } else if (!isRoleSelected) {
                    navigateTo('roleSelection');
                  } else if (savedRole === 'staff') {
                    navigateTo('joinStore');
                  } else {
                    navigateTo('companyProfile');
                  }
                }
              }} 
            />
          </div>
        )}

        {/* Global Premium Hinglish Visual Toast Overlay */}
        {toast && (
          <div className="absolute top-4 left-4 right-4 z-[9999] animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-none">
            <div className={`p-3.5 rounded-xl shadow-lg border text-[12px] font-extrabold flex items-center gap-2.5 backdrop-blur-md ${
              toast.type === 'success' 
                ? 'bg-emerald-500/95 border-emerald-400 text-white shadow-emerald-500/10' 
                : toast.type === 'error'
                ? 'bg-red-500/95 border-red-400 text-white shadow-red-500/10'
                : 'bg-indigo-600/95 border-indigo-500 text-white shadow-indigo-600/10'
            }`}>
              <span className="text-base select-none">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
              </span>
              <div className="flex-1 font-sans leading-relaxed">
                {toast.message}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
