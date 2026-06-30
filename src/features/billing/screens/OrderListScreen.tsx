import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Plus, Truck, ShoppingCart, List, Search, 
  ArrowRightLeft, Trash2, CheckSquare, Square, Check, AlertCircle, Download, Edit
} from 'lucide-react';
import { TransactionType, Language } from '../../../core/types/';
import { billingService, Order } from '../../../services/billingService';
import { sqliteService } from '../../../services/sqliteService';

interface OrderListScreenProps {
  onBack: () => void;
  onCreate: (type: TransactionType) => void;
  onEdit: (id: string, type: TransactionType) => void;
  initialTab?: 'receive' | 'send';
  language?: Language;
}

const formatNumber = (val: number) => {
    return Number(val.toFixed(2)).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const MONTH_NAMES: { [key: string]: { [lang in 'en' | 'hi']: string } } = {
  Jan: { en: 'Jan', hi: 'जनवरी' },
  Feb: { en: 'Feb', hi: 'फरवरी' },
  Mar: { en: 'Mar', hi: 'मार्च' },
  Apr: { en: 'Apr', hi: 'अप्रैल' },
  May: { en: 'May', hi: 'मई' },
  Jun: { en: 'Jun', hi: 'जून' },
  Jul: { en: 'Jul', hi: 'जुलाई' },
  Aug: { en: 'Aug', hi: 'अगस्त' },
  Sep: { en: 'Sep', hi: 'सितंबर' },
  Oct: { en: 'Oct', hi: 'अक्टूबर' },
  Nov: { en: 'Nov', hi: 'नवंबर' },
  Dec: { en: 'Dec', hi: 'दिसंबर' },
};

const LOCALIZATION = {
  en: {
    orderManagement: "Order Management",
    receiveOrder: "Receive Order",
    sendOrder: "Send Order",
    receivedOrdersTab: "Received Orders",
    sentOrdersTab: "Sent Orders",
    today: "Today",
    allTime: "All Time",
    searchPlaceholder: "Search Order...",
    noOrdersFound: "No orders found",
    converted: "Converted",
    statusPending: "Pending",
    orderSelected: "{count} Order(s) Selected",
    convertButton: "Convert",
    itemSummaryTitleDelivered: "Items to Deliver",
    itemSummaryTitlePurchase: "Items to Purchase",
    itemSummarySubtitle: "Unconverted order items summary report",
    totalItems: "Total Items",
    items: "Items",
    thItem: "Item Name",
    thQty: "Qty",
    thAmount: "Net Amount",
    noItemsFound: "No items found for {filter}",
    grandTotal: "Grand Total",
    deleteTitle: "Delete Order?",
    deleteMsg: "Are you sure you want to delete this order? This action cannot be undone.",
    cancel: "Cancel",
    delete: "Delete",
    convertTitle: "Convert Selected?",
    convertMsg: "Are you sure you want to convert {count} selected order(s) into {type} invoices?",
    success: "Success!",
    info: "Info",
    error: "Error",
    ok: "OK",
    viewItemSummary: "View item summary for active filter",
    loading: "Loading orders..."
  },
  hi: {
    orderManagement: "ऑर्डर प्रबंधन",
    receiveOrder: "ऑर्डर प्राप्त करें",
    sendOrder: "ऑर्डर भेजें",
    receivedOrdersTab: "प्राप्त ऑर्डर",
    sentOrdersTab: "भेजे गए ऑर्डर",
    today: "आज",
    allTime: "कुल समय",
    searchPlaceholder: "ऑर्डर खोजें...",
    noOrdersFound: "कोई ऑर्डर नहीं मिला",
    converted: "परिवर्तित",
    statusPending: "लंबित",
    orderSelected: "{count} ऑर्डर चुने गए",
    convertButton: "बदलें",
    itemSummaryTitleDelivered: "डिलिवरी के सामान",
    itemSummaryTitlePurchase: "खरीदने के सामान",
    itemSummarySubtitle: "अपरिवर्तित ऑर्डरों का कुल मद सारांश",
    totalItems: "कुल आइटम",
    items: "मदें",
    thItem: "आइटम का नाम",
    thQty: "मात्रा",
    thAmount: "कुल राशि",
    noItemsFound: "{filter} के लिए कोई आइटम नहीं मिला",
    grandTotal: "कुल योग",
    deleteTitle: "ऑर्डर हटाएं?",
    deleteMsg: "क्या आप वाकई इस ऑर्डर को हटाना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।",
    cancel: "रद्द करें",
    delete: "हटाएं",
    convertTitle: "परिवर्तित करें?",
    convertMsg: "क्या आप वाकई {count} चयनित ऑर्डर को {type} बिल में बदलना चाहते हैं?",
    success: "सफलता!",
    info: "जानकारी",
    error: "त्रुटि",
    ok: "ठीक है",
    viewItemSummary: "सक्रिय फ़िल्टर का सारांश देखें",
    loading: "ऑर्डर लोड हो रहे हैं..."
  }
};

export const OrderListScreen: React.FC<OrderListScreenProps> = ({ 
  onBack, 
  onCreate, 
  onEdit, 
  initialTab,
  language = 'en'
}) => {
  const [tab, setTab] = useState<'receive' | 'send'>(initialTab || 'receive'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'month' | 'year'>('today');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showItemSummary, setShowItemSummary] = useState(false);

  // Custom Alert Modal State
  const [alertModal, setAlertModal] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      type: 'success' | 'info' | 'error';
  }>({
      isOpen: false,
      title: '',
      message: '',
      type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'info' | 'error' = 'info') => {
      setAlertModal({ isOpen: true, title, message, type });
  };

  useEffect(() => {
      loadOrders();
  }, []);

  const loadOrders = async () => {
      setLoading(true);
      try {
          const data = await billingService.getAllOrders();
          setOrders(data);
          setLoading(false); // Render instantly right away!

          // Run the slow cloud check/auto-migration asynchronously in the background so it never freezes the UI thread
          setTimeout(async () => {
              try {
                  let updated = false;
                  for (const order of data) {
                      if (order && !order.isSyncedToCloud) {
                          const invoiceRecord = await billingService.getInvoiceById(order.id);
                          if (invoiceRecord && invoiceRecord.isSyncedToCloud) {
                              await sqliteService.saveOrder({ ...order, isSyncedToCloud: true });
                              order.isSyncedToCloud = true;
                              updated = true;
                          }
                      }
                  }
                  if (updated) {
                      const latestData = await billingService.getAllOrders();
                      setOrders(latestData);
                  }
              } catch (bgErr) {
                  console.warn("Background order migration check failed safely:", bgErr);
              }
          }, 0);
      } catch (err) {
          console.error("Failed to load orders:", err);
          setOrders([]);
          setLoading(false);
      }
  }

  const confirmDelete = async () => {
      if (deleteId) {
          await billingService.deleteOrder(deleteId);
          setDeleteId(null);
          setSelectedOrderIds(prev => prev.filter(id => id !== deleteId));
          loadOrders();
      }
  };

  const toggleSelectOrder = (id: string, isConverted: boolean) => {
      if (isConverted) return; // Prevent selecting already converted orders
      
      setSelectedOrderIds(prev => {
          if (prev.includes(id)) return prev.filter(oid => oid !== id);
          return [...prev, id];
      });
  };

  const handleSelectAll = () => {
      const activeOrders = filteredOrders.filter(o => !o.convertedToInvoiceId);
      if (selectedOrderIds.length === activeOrders.length && activeOrders.length > 0) {
          setSelectedOrderIds([]); // Deselect all
      } else {
          setSelectedOrderIds(activeOrders.map(o => o.id)); // Select all valid
      }
  };

  const handleConvertClick = () => {
      if (selectedOrderIds.length === 0) return;
      setShowConvertModal(true);
  };

  const processConversion = async () => {
      try {
          setLoading(true);
          // Small delay to show loading state if instant
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const count = await billingService.convertOrdersToSaleBills(selectedOrderIds);
          
          setLoading(false);
          setShowConvertModal(false);
          
          if (count > 0) {
              const targetType = tab === 'receive' 
                  ? (language === 'hi' ? 'बिक्री बिल (Sale Bill)' : 'Sale Bill') 
                  : (language === 'hi' ? 'क्रय बिल (Purchase Bill)' : 'Purchase Bill');
              const successTitle = LOCALIZATION[language].success;
              const successMsg = language === 'hi'
                  ? `🎉 सफलता! ${count} ऑर्डर को ${targetType} में बदल दिया गया है।`
                  : `🎉 Success! ${count} Order(s) converted to ${targetType}.`;
              showAlert(successTitle, successMsg, 'success');
              setSelectedOrderIds([]);
              loadOrders();
          } else {
              const infoTitle = LOCALIZATION[language].info;
              const infoMsg = language === 'hi'
                  ? 'कोई ऑर्डर नहीं बदला गया था। वे शायद पहले ही बदले जा चुके हैं।'
                  : 'No orders were converted. They might have been converted already.';
              showAlert(infoTitle, infoMsg, 'info');
          }
      } catch (error) {
          console.error("Conversion failed", error);
          setLoading(false);
          setShowConvertModal(false);
          const errorTitle = LOCALIZATION[language].error;
          const errorMsg = language === 'hi'
              ? 'ऑर्डर बदलने में विफल। कृपया पुन: प्रयास करें।'
              : 'Failed to convert orders. Please try again.';
          showAlert(errorTitle, errorMsg, 'error');
      }
  };

  const handleEditClick = (e: React.MouseEvent, order: Order) => {
      e.stopPropagation(); // Prevent row selection
      const transactionType = order.type === 'receive' ? 'Sale Order' : 'Purchase Order';
      onEdit(order.id, transactionType);
  };

  // Helper function to check if a date matches the selected filter
  const isDateMatchingFilter = (dateString: string, filter: 'all' | 'today' | 'month' | 'year') => {
      if (filter === 'all') return true;
      if (!dateString) return false;

      let orderDate: Date;
      try {
          orderDate = Date.fromLocalDateString(dateString);
      } catch (e) {
          return false;
      }
      const today = new Date();

      if (filter === 'today') {
          return orderDate.getDate() === today.getDate() &&
                 orderDate.getMonth() === today.getMonth() &&
                 orderDate.getFullYear() === today.getFullYear();
      }
      if (filter === 'month') {
          return orderDate.getMonth() === today.getMonth() &&
                 orderDate.getFullYear() === today.getFullYear();
      }
      if (filter === 'year') {
          return orderDate.getFullYear() === today.getFullYear();
      }
      return true;
  };

  const filteredOrders = orders.filter(o => 
    o && o.type === tab && 
    isDateMatchingFilter(o.date || '', timeFilter) && // Apply time filter safely
    ((o.partyName || '').toLowerCase().includes(searchTerm.trim().toLowerCase()) || 
     (o.orderNumber || '').toLowerCase().includes(searchTerm.trim().toLowerCase()))
  ).sort((a, b) => {
      const dateA = Date.fromLocalDateString(a.date || '').getTime();
      const dateB = Date.fromLocalDateString(b.date || '').getTime();
      if (dateB !== dateA) return dateB - dateA; // Sort sequentially by day
      
      const createdA = a.createdAt || 0;
      const createdB = b.createdAt || 0;
      if (createdB !== createdA) {
          return createdB - createdA; // Sort by creation time descending if possible
      }
      
      const numA = parseInt((a.orderNumber || '').replace(/\D/g, '')) || 0;
      const numB = parseInt((b.orderNumber || '').replace(/\D/g, '')) || 0;
      if (numA !== numB) {
          return numB - numA;
      }
      return (b.orderNumber || '').localeCompare(a.orderNumber || '');
  });

  // Dynamic labels for current month and year with bilingual support
  const rawMonthName = new Date().toLocaleString('en-US', { month: 'short' });
  const currentMonthName = MONTH_NAMES[rawMonthName]?.[language] || rawMonthName;
  const currentYear = new Date().getFullYear();

  // Compute Item Summary based on CURRENT Time Filter
  const currentItemSummary = useMemo(() => {
      const summary: { [itemName: string]: { qty: number, amount: number } } = {};
      
      orders.forEach(o => {
          if (o && o.type === tab && isDateMatchingFilter(o.date || '', timeFilter)) { 
             if (o.items) {
                 o.items.forEach(invoiceItem => {
                      if (invoiceItem) {
                          const itemName = invoiceItem?.item?.name || 'Unknown Item';
                          const name = itemName.trim();
                          if (!summary[name]) summary[name] = { qty: 0, amount: 0 };
                          
                          const qty = Number(invoiceItem.qty) || 0;
                          const rate = Number(invoiceItem.rate) || 0;
                          const discount = (Number(invoiceItem.discountPercent) || 0) / 100;
                          const gross = qty * rate;
                          const net = gross - (gross * discount);
                          
                          let finalAmount = net;
                          if (invoiceItem.taxType === 'Excluded') {
                              finalAmount += net * ((Number(invoiceItem.taxPercent) || 0) / 100);
                          }
                          
                          summary[name].qty += qty;
                          summary[name].amount += finalAmount;
                      }
                 });
             }
         }
      });
      return Object.entries(summary)
          .map(([name, data]) => ({ name, qty: data.qty, amount: data.amount }))
          .sort((a, b) => b.qty - a.qty);
  }, [orders, tab, timeFilter]);

  const getFilterLabel = () => {
      if (timeFilter === 'today') return language === 'hi' ? "आज का" : "Today's";
      if (timeFilter === 'month') {
          const mName = MONTH_NAMES[rawMonthName]?.[language] || rawMonthName;
          return language === 'hi' ? `${mName} महीने का` : `${mName} Month's`;
      }
      if (timeFilter === 'year') return language === 'hi' ? `${new Date().getFullYear()} वर्ष का` : `${new Date().getFullYear()} Year's`;
      return language === 'hi' ? "कुल समय" : "All Time";
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-main)] transition-all duration-200 pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Header */}
      <header className="bg-[var(--bg-card)] text-[var(--text-main)] p-4 flex items-center justify-between border-b border-[var(--border-ui)]/40 dark:border-transparent shrink-0 pt-[max(env(safe-area-inset-top),48px)] transition-all duration-200 shadow-none">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="cursor-pointer hover:bg-[var(--brand-light)] p-1.5 rounded-xl text-[var(--text-main)] transition-all"><ArrowLeft size={22} /></button>
            <h1 className="text-xl font-extrabold tracking-tight">{LOCALIZATION[language].orderManagement}</h1>
        </div>
        <button 
            onClick={() => onCreate(tab === 'receive' ? 'Sale Order' : 'Purchase Order')}
            className="flex items-center justify-center p-2 rounded-xl bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-hover)] transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
            title={language === 'hi' ? 'नया ऑर्डर' : 'New Order'}
        >
            <Plus size={18} strokeWidth={2.5} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Action Buttons (Shortcut) */}
        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={() => onCreate('Sale Order')}
                className="flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-indigo-600/10 dark:from-indigo-500/15 via-indigo-600/[0.04] dark:via-indigo-500/[0.04] to-transparent border border-indigo-600/20 dark:border-indigo-500/15 text-[var(--text-main)] font-extrabold py-3.5 px-4 rounded-xl cursor-pointer active:scale-[0.98] transition-all text-sm sm:text-base hover:bg-indigo-600/[0.14] dark:hover:bg-indigo-500/[0.14]"
            >
                <div className="flex items-center gap-2 text-[var(--brand-primary)]">
                    <Download size={18} className="rotate-180" /> 
                    <span>{LOCALIZATION[language].receiveOrder}</span>
                </div>
                <span className="text-[10px] block text-[var(--text-secondary)] opacity-85 font-semibold">({language === 'hi' ? 'विक्रय ऑर्डर' : 'Sale Order'})</span>
            </button>
            <button 
                onClick={() => onCreate('Purchase Order')}
                className="flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-violet-500/10 via-violet-500/[0.04] to-transparent border border-violet-500/20 dark:border-violet-500/15 text-[var(--text-main)] font-extrabold py-3.5 px-4 rounded-xl cursor-pointer active:scale-[0.98] transition-all text-sm sm:text-base hover:bg-violet-500/[0.14]"
            >
                <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                    <Truck size={18} /> 
                    <span>{LOCALIZATION[language].sendOrder}</span>
                </div>
                <span className="text-[10px] block text-[var(--text-secondary)] opacity-85 font-semibold">({language === 'hi' ? 'क्रय ऑर्डर' : 'Purchase Order'})</span>
            </button>
        </div>

        {/* Status Tabs */}
        <div className="grid grid-cols-2 bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-ui)]/50 dark:border-transparent shadow-xs">
            <button 
                onClick={() => { setTab('receive'); setSelectedOrderIds([]); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-extrabold transition-all duration-200 cursor-pointer ${
                    tab === 'receive' 
                        ? 'bg-[var(--brand-light)] text-[var(--brand-primary)] shadow-xs' 
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-app)]'
                }`}
            >
                <ShoppingCart size={16} /> 
                {LOCALIZATION[language].receivedOrdersTab}
            </button>
            <button 
                onClick={() => { setTab('send'); setSelectedOrderIds([]); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-extrabold transition-all duration-200 cursor-pointer ${
                    tab === 'send' 
                        ? 'bg-violet-500/10 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 shadow-xs' 
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-app)]'
                }`}
            >
                <List size={16} /> 
                {LOCALIZATION[language].sentOrdersTab}
            </button>
        </div>

        {/* Time Filters */}
        <div className="flex bg-[var(--bg-card)] border border-[var(--border-ui)]/50 dark:border-transparent rounded-xl p-1 shadow-xs overflow-x-auto hide-scrollbar">
            <button 
                onClick={() => { setTimeFilter('today'); setSelectedOrderIds([]); }}
                className={`flex-1 min-w-max px-4 py-2 text-sm font-extrabold rounded-lg transition-all duration-200 cursor-pointer ${
                    timeFilter === 'today' 
                        ? 'bg-[var(--brand-light)] text-[var(--brand-primary)] shadow-xs' 
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-app)]'
                }`}
            >
                {LOCALIZATION[language].today}
            </button>
            <button 
                onClick={() => { setTimeFilter('month'); setSelectedOrderIds([]); }}
                className={`flex-1 min-w-max px-4 py-2 text-sm font-extrabold rounded-lg transition-all duration-200 cursor-pointer ${
                    timeFilter === 'month' 
                        ? 'bg-[var(--brand-light)] text-[var(--brand-primary)] shadow-xs' 
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-app)]'
                }`}
            >
                {currentMonthName}
            </button>
            <button 
                onClick={() => { setTimeFilter('year'); setSelectedOrderIds([]); }}
                className={`flex-1 min-w-max px-4 py-2 text-sm font-extrabold rounded-lg transition-all duration-200 cursor-pointer ${
                    timeFilter === 'year' 
                        ? 'bg-[var(--brand-light)] text-[var(--brand-primary)] shadow-xs' 
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-app)]'
                }`}
            >
                {currentYear}
            </button>
            <button 
                onClick={() => { setTimeFilter('all'); setSelectedOrderIds([]); }}
                className={`flex-1 min-w-max px-4 py-2 text-sm font-extrabold rounded-lg transition-all duration-200 cursor-pointer ${
                    timeFilter === 'all' 
                        ? 'bg-[var(--brand-light)] text-[var(--brand-primary)] shadow-xs' 
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-app)]'
                }`}
            >
                {LOCALIZATION[language].allTime}
            </button>
        </div>

        {/* Search & Select All */}
        <div className="flex gap-2 items-center">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-60" size={18} />
                <input 
                    type="text" 
                    placeholder={LOCALIZATION[language].searchPlaceholder} 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border-ui)]/55 dark:border-transparent bg-[var(--bg-card)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 shadow-none text-base placeholder-[var(--text-secondary)]/50"
                />
            </div>
            {/* Show Select All mainly in Receive Tab as per requirement */}
            {tab === 'receive' && (
                <button 
                    onClick={handleSelectAll}
                    className="bg-[var(--bg-card)] border border-[var(--border-ui)]/55 dark:border-transparent p-3 rounded-xl text-[var(--brand-primary)] hover:bg-[var(--brand-light)] transition-all cursor-pointer"
                    title={language === 'hi' ? 'सभी को चुनें/हटाएं' : 'Select/Deselect All'}
                >
                    <CheckSquare size={20} />
                </button>
            )}
        </div>

        {/* List */}
        <div className="space-y-3 pb-24">
            {loading ? (
                <div className="text-center py-10 text-[var(--text-secondary)] text-lg flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]"></div>
                    <span>{LOCALIZATION[language].loading}</span>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-secondary)] font-semibold text-base bg-[var(--bg-card)] rounded-xl border border-[var(--border-ui)]/40 dark:border-transparent shadow-none">
                    {LOCALIZATION[language].noOrdersFound}
                </div>
            ) : (
                filteredOrders.map(order => {
                    const isConverted = !!order.convertedToInvoiceId;
                    const isSelected = selectedOrderIds.includes(order.id);
                    const isSynced = order.isSyncedToCloud && order.type === 'send';
                    const syncedBgClass = isSynced ? 'bg-[rgba(5,150,105,0.04)] dark:bg-[rgba(16,185,129,0.06)] border-emerald-500/20 dark:border-emerald-500/15' : '';
                    
                    return (
                        <div 
                            key={order.id}
                            onClick={() => {
                                if (tab === 'receive') {
                                    toggleSelectOrder(order.id, isConverted);
                                }
                            }}
                            className={`relative bg-[var(--bg-card)] p-4 rounded-xl border transition-all duration-200 ${
                                isSelected 
                                    ? 'border-[var(--brand-primary)] bg-[var(--brand-light)]' 
                                    : 'border-[var(--border-ui)]/45 dark:border-transparent'
                            } ${isConverted ? 'opacity-70' : tab === 'receive' ? 'cursor-pointer hover:border-[var(--brand-primary)]/40' : ''} ${syncedBgClass}`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Checkbox Column - Only for receive orders */}
                                {tab === 'receive' && (
                                    <div className="pt-1 select-none">
                                        {isConverted ? (
                                            <div className="text-emerald-500"><Check size={22} strokeWidth={3} /></div>
                                        ) : (
                                            <div className={isSelected ? 'text-[var(--brand-primary)]' : 'text-[var(--text-secondary)] opacity-50'}>
                                                {isSelected ? <CheckSquare size={22} /> : <Square size={22} />}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="font-extrabold text-xl text-[var(--text-main)]">{order.orderNumber}</span>
                                                {isConverted ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100/60 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                        {LOCALIZATION[language].converted}
                                                    </span>
                                                ) : (
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                        order.status === 'pending' 
                                                            ? 'bg-yellow-100/60 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' 
                                                            : 'bg-red-100/60 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                                    }`}>
                                                        {order.status === 'pending' ? LOCALIZATION[language].statusPending : order.status}
                                                    </span>
                                                )}
                                                {order.isSyncedToCloud && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">
                                                        <Check size={10} strokeWidth={3} /> Cloud
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-base font-bold text-[var(--text-main)]">{order.partyName}</div>
                                            <div className="text-xs mt-1 text-[var(--text-secondary)] font-medium">{order.date}</div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-2">
                                            <div className="text-xl font-extrabold text-[var(--brand-primary)]">₹{formatNumber(order.grandTotal)}</div>
                                            <div className="flex gap-1">
                                                {!isConverted && (
                                                    <>
                                                        <button 
                                                            onClick={(e) => handleEditClick(e, order)}
                                                            className="p-1.5 transition-colors rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer"
                                                            title={language === 'hi' ? 'ऑर्डर संपादित करें' : 'Edit Order'}
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setDeleteId(order.id); }} 
                                                            className="p-1.5 transition-colors rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                                                            title={language === 'hi' ? 'ऑर्डर हटाएं' : 'Delete Order'}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Inline Items Summary List */}
                                    {order.items && order.items.length > 0 && (
                                        <div className="mt-3 pt-2.5 border-t border-[var(--border-ui)]/30 flex flex-wrap gap-1.5">
                                            {order.items.slice(0, 3).map((it, idx) => (
                                                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-app)] text-[11px] text-[var(--text-secondary)] font-bold border border-[var(--border-ui)]/30">
                                                    {it?.item?.name || 'Item'} ({it.qty})
                                                </span>
                                            ))}
                                            {order.items.length > 3 && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--brand-light)] text-[var(--brand-primary)] text-[11px] font-extrabold border border-indigo-600/10 dark:border-indigo-500/20">
                                                    +{order.items.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      </div>

      {/* Floating Action Bar for Conversion & Floating Item Summary FAB (styled elegant & always visible) */}
      {selectedOrderIds.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-[var(--bg-card)] border-t border-[var(--border-ui)]/50 dark:border-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl z-30 animate-in slide-in-from-bottom duration-250">
              <div className="flex justify-between items-center max-w-lg mx-auto">
                   <div className="font-extrabold text-[var(--text-main)] text-base sm:text-lg">
                       {LOCALIZATION[language].orderSelected.replace('{count}', selectedOrderIds.length.toString())}
                   </div>
                   <button 
                     onClick={handleConvertClick}
                     className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-extrabold shadow-md flex items-center gap-2 active:scale-95 transition-all text-base cursor-pointer border border-green-500/10"
                   >
                       <ArrowRightLeft size={18} />
                       {LOCALIZATION[language].convertButton}
                   </button>
              </div>
          </div>
      )}

      {/* Item Summary FAB: Animated position adjustment shifts upwards beautifully when conversion bar slides in */}
      <div 
        className={`absolute right-6 z-30 transition-all duration-300 ${
          selectedOrderIds.length > 0 
            ? 'bottom-[calc(5rem+max(1.2rem,env(safe-area-inset-bottom)))]' 
            : 'bottom-[max(1.5rem,env(safe-area-inset-bottom))]'
        }`}
      >
          <button 
            onClick={() => setShowItemSummary(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer border-none"
            title={LOCALIZATION[language].viewItemSummary}
          >
              <List size={24} strokeWidth={2.5} />
          </button>
      </div>

      {/* Item Summary Modal */}
      {showItemSummary && (
          <div className="absolute inset-0 z-[60] flex flex-col bg-[var(--bg-app)] animate-in slide-in-from-right pb-[max(env(safe-area-inset-bottom),0px)]">
              {/* Modal Header */}
              <header className="bg-[var(--bg-card)] text-[var(--text-main)] p-4 flex items-center gap-3 shrink-0 border-b border-[var(--border-ui)]/40 dark:border-transparent pt-[max(env(safe-area-inset-top),48px)] transition-all duration-200 shadow-none">
                  <button onClick={() => setShowItemSummary(false)} className="p-1.5 hover:bg-[var(--brand-light)] rounded-xl cursor-pointer"><ArrowLeft size={22} /></button>
                  <div>
                      <h1 className="text-lg font-extrabold tracking-tight">
                          {tab === 'receive' ? LOCALIZATION[language].itemSummaryTitleDelivered : LOCALIZATION[language].itemSummaryTitlePurchase}
                      </h1>
                      <div className="text-xs text-[var(--text-secondary)] font-medium">{LOCALIZATION[language].itemSummarySubtitle}</div>
                  </div>
              </header>

              <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto p-4 space-y-6">
                  {/* Single Summary Section based on time filter */}
                  <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-ui)]/50 dark:border-transparent overflow-hidden pb-8 shadow-xs">
                      <div className="bg-[var(--brand-light)] text-[var(--brand-primary)] font-bold p-3 border-b border-[var(--border-ui)]/40 dark:border-transparent flex justify-between text-sm sm:text-base">
                          <span>{getFilterLabel()} {LOCALIZATION[language].totalItems}</span>
                          <span>
                              {currentItemSummary.reduce((sum, item) => sum + item.qty, 0)} {LOCALIZATION[language].items}
                          </span>
                      </div>
                      <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-[var(--bg-app)] text-[var(--text-secondary)]">
                              <tr>
                                  <th className="p-3 font-bold truncate max-w-[150px]">{LOCALIZATION[language].thItem}</th>
                                  <th className="p-3 text-center font-bold w-24">{LOCALIZATION[language].thQty}</th>
                                  <th className="p-3 text-right font-bold w-32">{LOCALIZATION[language].thAmount}</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-ui)]/40 dark:divide-transparent">
                              {currentItemSummary.length === 0 ? (
                                  <tr>
                                      <td colSpan={3} className="p-8 text-center text-[var(--text-secondary)] opacity-60 font-medium">
                                          {LOCALIZATION[language].noItemsFound.replace('{filter}', getFilterLabel())}
                                      </td>
                                  </tr>
                              ) : (
                                  currentItemSummary.map(item => (
                                      <tr key={item.name} className="text-[var(--text-main)] font-semibold hover:bg-[var(--brand-light)] transition-colors">
                                          <td className="p-3 truncate max-w-[150px]" title={item.name}>{item.name}</td>
                                          <td className="p-3 text-center text-[var(--brand-primary)] font-extrabold text-base">{item.qty}</td>
                                          <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-extrabold">₹{formatNumber(item.amount)}</td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                          {currentItemSummary.length > 0 && (
                              <tfoot className="bg-[var(--bg-app)] font-extrabold text-[var(--text-main)] border-t border-[var(--border-ui)]/40 dark:border-transparent">
                                  <tr>
                                      <td className="p-3 uppercase tracking-wider text-xs text-[var(--text-secondary)]">{LOCALIZATION[language].grandTotal}</td>
                                      <td className="p-3 text-center text-[var(--brand-primary)] font-black text-base">
                                          {currentItemSummary.reduce((sum, item) => sum + item.qty, 0)}
                                      </td>
                                      <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-black text-base">
                                          ₹{formatNumber(currentItemSummary.reduce((sum, item) => sum + item.amount, 0))}
                                      </td>
                                  </tr>
                              </tfoot>
                          )}
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl">
            <div className="bg-[var(--bg-card)] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-[var(--border-ui)]/50 dark:border-transparent">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-900/10">
                    <Trash2 size={28} />
                </div>
                <h3 className="text-xl font-extrabold text-[var(--text-main)] mb-2">{LOCALIZATION[language].deleteTitle}</h3>
                <p className="text-[var(--text-secondary)] mb-6 font-medium text-sm">
                    {LOCALIZATION[language].deleteMsg}
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeleteId(null)} 
                        className="flex-1 py-2.5 rounded-xl font-bold bg-[var(--bg-app)] text-[var(--text-main)] border border-[var(--border-ui)]/50 dark:border-transparent hover:bg-[var(--brand-light)] transition-colors cursor-pointer"
                    >
                        {LOCALIZATION[language].cancel}
                    </button>
                    <button 
                        onClick={confirmDelete} 
                        className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-md transition-colors cursor-pointer"
                    >
                        {LOCALIZATION[language].delete}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Convert Confirmation Modal */}
      {showConvertModal && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl">
            <div className="bg-[var(--bg-card)] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-[var(--border-ui)]/50 dark:border-transparent">
                <div className="w-16 h-16 bg-[var(--brand-light)] text-[var(--brand-primary)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border-ui)]/30 dark:border-transparent">
                    <ArrowRightLeft size={28} />
                </div>
                <h3 className="text-xl font-extrabold text-[var(--text-main)] mb-2">{LOCALIZATION[language].convertTitle}</h3>
                <p className="text-[var(--text-secondary)] mb-6 font-medium text-sm">
                    {LOCALIZATION[language].convertMsg
                        .replace('{count}', selectedOrderIds.length.toString())
                        .replace('{type}', tab === 'receive' ? (language === 'hi' ? 'बिक्री' : 'Sale') : (language === 'hi' ? 'खरीद' : 'Purchase'))
                    }
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowConvertModal(false)} 
                        className="flex-1 py-2.5 rounded-xl font-bold bg-[var(--bg-app)] text-[var(--text-main)] border border-[var(--border-ui)]/50 dark:border-transparent hover:bg-[var(--brand-light)] transition-colors cursor-pointer"
                    >
                        {LOCALIZATION[language].cancel}
                    </button>
                    <button 
                        onClick={processConversion} 
                        className="flex-1 py-2.5 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-md transition-colors cursor-pointer"
                    >
                        {LOCALIZATION[language].convertButton}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertModal.isOpen && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl">
            <div className="bg-[var(--bg-card)] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-[var(--border-ui)]/50 dark:border-transparent">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${
                    alertModal.type === 'success' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-transparent' 
                        : alertModal.type === 'error'
                            ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-100 dark:border-transparent'
                            : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-transparent'
                }`}>
                    {alertModal.type === 'success' ? <Check size={28} /> : alertModal.type === 'error' ? <AlertCircle size={28} /> : <AlertCircle size={28} />}
                </div>
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">{alertModal.title}</h3>
                <p className="text-[var(--text-secondary)] mb-6 font-medium text-sm sm:text-base">
                    {alertModal.message}
                </p>
                <button 
                    onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))} 
                    className="w-full py-2.5 rounded-xl font-extrabold bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-hover)] transition-colors text-base cursor-pointer"
                >
                    {LOCALIZATION[language].ok}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
