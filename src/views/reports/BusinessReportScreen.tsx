import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Search, Plus, Trash2, Edit2, Calendar, CheckSquare, Square, Download, Filter, Send, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TransactionType, Invoice, PaymentRecord, Party, Language } from '../../core/types/';
import { billingService } from '../../services/billingService';
import { sqliteService } from '../../services/sqliteService';
import { shareInvoiceWithClient } from '../../services/firebaseService';
import { BillingService } from '../../services/SecureBillingService';
import { PermissionWrapper } from '../../components/shared/PermissionWrapper';

interface BusinessReportScreenProps {
  onBack: () => void;
  initialTab?: TransactionType;
  initialSearchQuery?: string;
  onCreateNew: (type: TransactionType) => void;
  onEditInvoice: (id: string, type: TransactionType) => void;
  language?: Language;
}

interface InvoiceDisplay extends Invoice {
    totalQty: number;
    gstAmount: number;
    paidAmount: number;
    balance: number;
    advance: number;
}

const formatNumber = (val: number) => {
    return Number(val.toFixed(2)).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const MONTH_NAMES: { [key: string]: { en: string; hi: string } } = {
  Jan: { en: 'Jan', hi: 'जनवरी' },
  Feb: { en: 'Feb', hi: 'फरवरी' },
  Mar: { en: 'Mar', hi: 'मार्च' },
  Apr: { en: 'Apr', hi: 'अप्रैल' },
  May: { en: 'May', hi: 'मई' },
  Jun: { en: 'Jun', hi: 'जून' },
  Jul: { en: 'Jul', hi: 'जुलाई' },
  Aug: { en: 'Aug', hi: 'अगस्त' },
  Jan: { en: 'Jan', hi: 'जनवरी' },
  Dec: { en: 'Dec', hi: 'दिसंबर' },
  Sep: { en: 'Sep', hi: 'सितंबर' },
  Oct: { en: 'Oct', hi: 'अक्टूबर' },
  Nov: { en: 'Nov', hi: 'नवंबर' }
};

const FULL_MONTH_NAMES: { [key: string]: { en: string; hi: string } } = {
  'April': { en: 'April', hi: 'अप्रैल' },
  'May': { en: 'May', hi: 'मई' },
  'June': { en: 'June', hi: 'जून' },
  'July': { en: 'July', hi: 'जुलाई' },
  'August': { en: 'August', hi: 'अगस्त' },
  'September': { en: 'September', hi: 'सितंबर' },
  'October': { en: 'October', hi: 'अक्टूबर' },
  'November': { en: 'November', hi: 'नवंबर' },
  'December': { en: 'December', hi: 'दिसंबर' },
  'January': { en: 'January', hi: 'जनवरी' },
  'February': { en: 'February', hi: 'फरवरी' },
  'March': { en: 'March', hi: 'मार्च' },
};

const LOCALIZATION = {
  en: {
    businessReports: "Business Reports",
    detailedView: "Detailed Report View",
    searchPlaceholder: "Search Name or Bill No...",
    today: "Today",
    month: "Month",
    all: "All",
    monthCol: "Month",
    billsCol: "Bills",
    totalQtyCol: "Total Qty",
    billTotalCol: "Bill Total",
    paymentCol: "Payment",
    balanceCol: "Balance",
    advanceCol: "Advance",
    gstCol: "GST",
    billNoCol: "Bill No",
    dateCol: "Date",
    nameCol: "Name",
    qtyCol: "Qty",
    grandTotal: "Grand Total",
    loadingData: "Loading Data...",
    noRecordsFound: "No records found for {filter}",
    monthsCount: "Months: 12",
    sendButton: "Send",
    deleteButton: "Delete",
    downloadTooltip: "Download CSV Report",
    addNewTooltip: "Add New Invoice",
    tabs: {
      'Sale': "Sale",
      'Purchase': "Purchase",
      'Sale Return': "Sale Return",
      'Purchase Return': "Purchase Return"
    },
    filterLabels: {
      'Today': "Today's",
      'Month': "Month's",
      'All': "All Time"
    },
    confirmDeleteTitle: "Delete Invoices?",
    confirmDeleteMsg: "Are you sure you want to delete {count} selected invoice(s)? This will reverse stock changes and cannot be undone.",
    cancel: "Cancel",
    confirmShareTitle: "Consolidate WhatsApp?",
    confirmShareMsg: "Are you sure you want to compile and send WhatsApp notifications for {count} selected invoice(s)? We will launch WhatsApp for each party.",
    success: "Success!",
    info: "Info",
    error: "Error",
    ok: "OK",
    noDataDownload: "No data to download to CSV.",
    noCustomerFound: "Could not find customer profile for some bills. They may have been deleted. WhatsApp skipped.",
    noMobileFound: "Mobile number not found for {name}.",
    syncSuccess: "Invoices synced with Cloud!",
    bulkDeleteSuccess: "Successfully deleted {count} invoice(s)!-",
    errorSyncing: "Error syncing bill {invoiceNo} to cloud. Please check network connection.",
  },
  hi: {
    businessReports: "व्यापार रिपोर्ट",
    detailedView: "विस्तृत रिपोर्ट विवरण",
    searchPlaceholder: "नाम या बिल नंबर खोजें...",
    today: "आज",
    month: "मनीना",
    all: "सब",
    monthCol: "महीना",
    billsCol: "बिल",
    totalQtyCol: "कुल मात्रा",
    billTotalCol: "बिल कुल",
    paymentCol: "भुगतान",
    balanceCol: "शेष",
    advanceCol: "अग्रिम",
    gstCol: "जीएसटी",
    billNoCol: "बिल नंबर",
    dateCol: "तिथि",
    nameCol: "नाम",
    qtyCol: "मात्रा",
    grandTotal: "कुल योग",
    loadingData: "डेटा लोड हो रहा है...",
    noRecordsFound: "{filter} के लिए कोई प्रविष्टि नहीं मिली",
    monthsCount: "कुल महीने: 12",
    sendButton: "भेजें",
    deleteButton: "हटाएं",
    downloadTooltip: "सीएसवी रिपोर्ट डाउनलोड करें",
    addNewTooltip: "नया बिल बनाएं",
    tabs: {
      'Sale': "बिक्री (Sale)",
      'Purchase': "क्रय (Purchase)",
      'Sale Return': "बिक्री वापसी (Sale Return)",
      'Purchase Return': "क्रय वापसी (Purchase Return)"
    },
    filterLabels: {
      'Today': "आज की",
      'Month': "इस महीने की",
      'All': "कुल समय की"
    },
    confirmDeleteTitle: "बिल हटाएं?",
    confirmDeleteMsg: "क्या आप वाकई {count} चयनित बिलों को हटाना चाहते हैं? इससे स्टॉक परिवर्तन उलट जाएंगे और इसे वापस नहीं लिया जा सकता।",
    cancel: "रद्द करें",
    confirmShareTitle: "व्हाट्सएप भेजें?",
    confirmShareMsg: "क्या आप वाकई {count} चयनित बिलों के लिए व्हाट्सएप विवरण भेजना चाहते हैं? प्रत्येक ग्राहक के लिए व्हाट्सएप खोला जाएगा।",
    success: "सफलता!",
    info: "जानकारी",
    error: "त्रुटि",
    ok: "ठीक है",
    noDataDownload: "सीएसवी निर्यात करने के लिए कोई डेटा नहीं है।",
    noCustomerFound: "कुछ बिलों के लिए पार्टी प्रोफाइल नहीं मिली। वे शायद डिलीट हो चुकी हैं। व्हाट्सएप स्किप किया गया।",
    noMobileFound: "{name} के लिए मोबाइल नंबर नहीं मिला।",
    syncSuccess: "बिल क्लाउड पर सिंक्रोनाइज हो गए हैं!",
    bulkDeleteSuccess: "सफलतापूर्वक {count} बिल हटा दिए गए!-",
    errorSyncing: "बिल {invoiceNo} को क्लाउड पर सिंक करने में त्रुटि हुई। कृपया नेटवर्क जांचें।",
  }
};

const isInsideScrollable = (el: HTMLElement | null): boolean => {
  let curr = el;
  while (curr && curr !== document.body) {
    if (
      curr.tagName === 'TABLE' ||
      curr.classList.contains('overflow-x-auto') ||
      curr.classList.contains('hide-scrollbar') ||
      curr.scrollWidth > curr.clientWidth
    ) {
      const style = window.getComputedStyle(curr);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
        return true;
      }
    }
    curr = curr.parentElement;
  }
  return false;
};

export const BusinessReportScreen: React.FC<BusinessReportScreenProps> = ({ 
    onBack, 
    initialTab = 'Sale', 
    initialSearchQuery = '',
    onCreateNew,
    onEditInvoice,
    language = 'en'
}) => {
  const [activeTab, setActiveTab ] = useState<TransactionType>(initialTab);
  const [slideDir, setSlideDir] = useState<number>(1);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (isInsideScrollable(target)) return;

    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (isInsideScrollable(target)) return;

    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);

    if (Math.abs(deltaX) > 60 && deltaY < 40) {
      const currentIndex = tabsArray.indexOf(activeTab);
      if (deltaX < 0) {
        if (currentIndex < tabsArray.length - 1) {
          setSlideDir(1);
          setActiveTab(tabsArray[currentIndex + 1]);
        }
      } else {
        if (currentIndex > 0) {
          setSlideDir(-1);
          setActiveTab(tabsArray[currentIndex - 1]);
        }
      }
    }
  };
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [allParties, setAllParties] = useState<Party[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  
  const [dateFilter, setDateFilter] = useState<'Today' | 'Month' | 'All'>(
   (localStorage.getItem('businessReportDateFilter') as 'Today' | 'Month' | 'All') || 'Today'
  );

  useEffect(() => {
    localStorage.setItem('businessReportDateFilter', dateFilter);
  }, [dateFilter]);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
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
  
  const lang = language === 'hi' ? 'hi' : 'en';
  const loc = LOCALIZATION[lang];

  const showAlert = (title: string, message: string, type: 'success' | 'info' | 'error' = 'info') => {
      setAlertModal({ isOpen: true, title, message, type });
  };
  
  useEffect(() => {
    setActiveTab(initialTab);
    setSelectedIds([]); 
  }, [initialTab]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    const invPromise = billingService.getInvoices(activeTab);
    const paymentType = (activeTab === 'Sale' || activeTab === 'Sale Return') ? 'Receipt' : 'Payment';
    const payPromise = billingService.getAllPayments(paymentType);
    const partyPromise = billingService.getAllParties();

    const [invData, payData, partiesData] = await Promise.all([invPromise, payPromise, partyPromise]);
    
    setInvoices(invData);
    setPayments(payData);
    setAllParties(partiesData);
    
    setLoading(false);
  };

  const [selectedSummaryMonth, setSelectedSummaryMonth] = useState<string>('');

  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - (offset*60*1000));
  const todayStr = localDate.toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7); 
  const currentMonthName = localDate.toLocaleString('en-US', { month: 'short' });

  const processedInvoices: InvoiceDisplay[] = useMemo(() => {
      let filtered = invoices;

      if (dateFilter === 'Today') {
          filtered = filtered.filter(inv => inv.date === todayStr);
      } else if (dateFilter === 'Month') {
          const targetMonth = selectedSummaryMonth || currentMonthStr;
          filtered = filtered.filter(inv => inv.date.startsWith(targetMonth));
      }

      filtered = filtered.filter(inv => 
        inv.partyName.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
        inv.invoiceNo.toLowerCase().includes(searchQuery.trim().toLowerCase())
      );

      const mappedList = filtered.map(inv => {
          let qty = 0;
          let gst = 0;
          
          if (inv.items) {
               inv.items.forEach(item => {
                  qty += item.qty;
                  const gross = item.qty * item.rate;
                  const discounted = gross - (gross * item.discountPercent / 100);
                  
                  if (item.taxType === 'Excluded') {
                      gst += discounted * (item.taxPercent / 100);
                  } else {
                      const base = discounted / (1 + item.taxPercent / 100);
                      gst += discounted - base;
                  }
              });
          }

          const linkedPayments = payments.filter(p => p.invoiceId === inv.id);
          const paid = linkedPayments.reduce((sum, p) => sum + p.amount, 0);
          const net = inv.totalAmount - paid;
          const balance = net > 0 ? net : 0;
          const advance = net < 0 ? Math.abs(net) : 0;

          return {
              ...inv,
              totalQty: qty,
              gstAmount: gst,
              paidAmount: paid,
              balance: balance,
              advance: advance 
          };
      });

      return mappedList.sort((a, b) => {
          if (a.date !== b.date) {
              return b.date.localeCompare(a.date); 
          }
          const numA = parseInt(a.invoiceNo.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.invoiceNo.replace(/\D/g, '')) || 0;
          if (numA !== numB) {
              return numB - numA; 
          }
          return b.invoiceNo.localeCompare(a.invoiceNo); 
      });
  }, [invoices, payments, searchQuery, dateFilter, selectedSummaryMonth]);

  const monthlySummary = useMemo(() => {
      if (dateFilter !== 'All') return [];
      
      const year = localDate.getFullYear();
      const isPostMarch = localDate.getMonth() >= 3;
      const startYear = isPostMarch ? year : year - 1;
      
      const months = [
          { name: 'April', monthStr: `${startYear}-04` },
          { name: 'May', monthStr: `${startYear}-05` },
          { name: 'June', monthStr: `${startYear}-06` },
          { name: 'July', monthStr: `${startYear}-07` },
          { name: 'August', monthStr: `${startYear}-08` },
          { name: 'September', monthStr: `${startYear}-09` },
          { name: 'October', monthStr: `${startYear}-10` },
          { name: 'November', monthStr: `${startYear}-11` },
          { name: 'December', monthStr: `${startYear}-12` },
          { name: 'January', monthStr: `${startYear + 1}-01` },
          { name: 'February', monthStr: `${startYear + 1}-02` },
          { name: 'March', monthStr: `${startYear + 1}-03` },
      ];

      return months.map(m => {
          const monthInvoices = processedInvoices.filter(inv => inv.date.startsWith(m.monthStr));
          let bills = monthInvoices.length;
          let totalQty = monthInvoices.reduce((sum, inv) => sum + inv.totalQty, 0);
          let totalAmount = monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
          let totalPayment = monthInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
          let totalBalance = monthInvoices.reduce((sum, inv) => sum + inv.balance, 0);
          let totalAdvance = monthInvoices.reduce((sum, inv) => sum + inv.advance, 0);

          return {
              ...m,
              bills,
              totalQty,
              totalAmount,
              totalPayment,
              totalBalance,
              totalAdvance
          };
      });
  }, [processedInvoices, dateFilter, localDate]);

  const totals = useMemo(() => {
      return processedInvoices.reduce((acc, curr) => ({
          qty: acc.qty + curr.totalQty,
          billTotal: acc.billTotal + curr.totalAmount,
          payment: acc.payment + curr.paidAmount,
          gst: acc.gst + curr.gstAmount,
          balance: acc.balance + curr.balance,
          advance: acc.advance + curr.advance
      }), { qty: 0, billTotal: 0, payment: 0, gst: 0, balance: 0, advance: 0 });
  }, [processedInvoices]);

  const handleSelectAll = () => {
      if (selectedIds.length === processedInvoices.length && processedInvoices.length > 0) {
          setSelectedIds([]);
      } else {
          setSelectedIds(processedInvoices.map(i => i.id));
      }
  };

  const handleSelectRow = (id: string) => {
      setSelectedIds(prev => 
          prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
      );
  };

  const handleBulkShare = async () => {
      if (selectedIds.length === 0) return;

      const selectedInvoices = processedInvoices.filter(inv => selectedIds.includes(inv.id));
      const invoicesByParty: { [key: string]: InvoiceDisplay[] } = {};
      selectedInvoices.forEach(inv => {
          if (!invoicesByParty[inv.partyId]) {
              invoicesByParty[inv.partyId] = [];
          }
          invoicesByParty[inv.partyId].push(inv);
      });

      const partyIds = Object.keys(invoicesByParty);
      let cloudSyncCount = 0;

      for (const pId of partyIds) {
          const party = allParties.find(p => p.id === pId);
          if (!party) {
              showAlert(loc.error, loc.noCustomerFound, 'error');
              continue;
          }

          if (!party.mobile) {
              showAlert(loc.info, loc.noMobileFound.replace('{name}', party.name), 'info');
              continue;
          }

          const partyInvoices = invoicesByParty[pId];
          
          for (const inv of partyInvoices) {
              if (inv.type !== 'Purchase' && !inv.isSyncedToCloud) {
                  try {
                      const fullInvoice = await billingService.getInvoiceById(inv.id);
                      if (fullInvoice) {
                          const result = await shareInvoiceWithClient(fullInvoice);
                          if (result.success) {
                              const sInv = await sqliteService.getInvoiceById(inv.id);
                              if (sInv) await sqliteService.saveInvoice({ ...sInv, isSyncedToCloud: true });
                              cloudSyncCount++;
                          } else {
                              showAlert(loc.error, result.error || "Sync to cloud failed. Check connection.", 'error');
                          }
                      }
                  } catch (e) {
                      console.warn("Could not sync invoice in bulk", e);
                      showAlert(loc.error, loc.errorSyncing.replace('{invoiceNo}', inv.invoiceNo), 'error');
                  }
              }
          }

          let message = `Hello ${party.name},\nHere are your bill details:\n\n`;
          let totalSum = 0;

          partyInvoices.forEach((inv, index) => {
              message += `${index + 1}. Bill: *${inv.invoiceNo}*\n`;
              message += `   Date: ${inv.date}\n`;
              message += `   Amount: ₹${formatNumber(inv.totalAmount)}\n`;
              if(inv.balance > 0) message += `   Balance: ₹${formatNumber(inv.balance)}\n`;
              message += `\n`;
              totalSum += inv.totalAmount;
          });

          if (partyInvoices.length > 1) {
              message += `-------------------\n*Total Amount: ₹${formatNumber(totalSum)}*\n`;
          }
          
          message += `\nThank you for your business!`;

          let cleanNumber = party.mobile.replace(/\D/g, '');
          if (cleanNumber.length === 10) cleanNumber = '91' + cleanNumber;

          const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          await new Promise(resolve => setTimeout(resolve, 800));
      }

      setSelectedIds([]);
      if (cloudSyncCount > 0) {
          loadData();
          showAlert(loc.success, loc.syncSuccess, 'success');
      }
  };

  const handleBulkDelete = async () => {
      setDeleteConfirmOpen(false);
      try {
          for (const id of selectedIds) {
              await BillingService.deleteInvoice(id);
          }
          showAlert(loc.success, loc.bulkDeleteSuccess.replace('{count}', selectedIds.length.toString()), 'success');
          setSelectedIds([]);
          loadData();
      } catch (error: any) {
          console.error("Bulk delete error", error);
          showAlert(loc.error, error.message || 'Failed to delete some invoices', 'error');
          loadData();
      }
  };

  const handleCreateNew = () => {
      onCreateNew(activeTab);
  };

  const handleDownload = () => {
      if (processedInvoices.length === 0) {
          showAlert(loc.info, loc.noDataDownload, 'info');
          return;
      }

      const csvHeaders = [
          loc.billNoCol,
          loc.dateCol,
          loc.nameCol,
          loc.qtyCol,
          loc.billNoCol === "Bill No" ? 'Total Amount' : 'कुल राशि',
          loc.billNoCol === "Bill No" ? 'Paid Amount' : 'भुगतान राशि',
          loc.balanceCol
      ];

      const rows = processedInvoices.map(inv => [
          inv.invoiceNo,
          inv.date,
          inv.partyName,
          inv.totalQty.toString(),
          (inv.totalAmount || 0).toFixed(2),
          (inv.paidAmount || 0).toFixed(2),
          (inv.balance || 0).toFixed(2)
      ]);

      const csvContent = [
          csvHeaders.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${activeTab}_Report_${dateFilter}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const getTranslatedMonthName = (enMonthName: string) => {
      return FULL_MONTH_NAMES[enMonthName]?.[lang] || enMonthName;
  };

  const currentMonthTranslated = MONTH_NAMES[currentMonthName]?.[lang] || currentMonthName;

  const getFilterLabel = () => {
      if (dateFilter === 'Today') return loc.filterLabels.Today;
      if (dateFilter === 'Month') {
          if (selectedSummaryMonth && selectedSummaryMonth !== currentMonthStr) {
              const [y, m] = selectedSummaryMonth.split('-');
              const mIndex = parseInt(m) - 1;
              const dateObj = new Date(parseInt(y), mIndex, 1);
              const mName = dateObj.toLocaleString('en-US', { month: 'short' });
              const mTrans = MONTH_NAMES[mName]?.[lang] || mName;
              return lang === 'hi' ? `${mTrans} ${y} का` : `${mTrans} ${y}'s`;
          }
          return loc.filterLabels.Month;
      }
      return loc.filterLabels.All;
  };

  const tabsArray: TransactionType[] = ['Sale', 'Purchase', 'Sale Return', 'Purchase Return'];

  return (
    <div lang={lang} className={`flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-all duration-200 pb-[max(env(safe-area-inset-bottom),0px)] ${lang === 'hi' ? 'leading-relaxed' : ''}`}>
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 px-5 pt-[max(env(safe-area-inset-top),48px)] pb-3 flex items-center justify-between border-b border-gray-200 dark:border-slate-800 shrink-0 relative transition-all duration-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90"><ArrowLeft size={24} /></button>
          <div>
            <h1 className="text-lg font-extrabold uppercase tracking-tight leading-tight text-slate-900 dark:text-white">{loc.businessReports}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{loc.detailedView}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 ? (
            <div className="flex gap-1.5 animate-in zoom-in-95 duration-150">
              <button 
                onClick={handleBulkShare} 
                className="bg-emerald-605 p-1.5 rounded-lg hover:brightness-105 transition-all flex items-center gap-1.5 px-3.5 shadow-sm border border-emerald-500/20 text-white cursor-pointer active:scale-95 animate-pulse"
                title={lang === 'hi' ? "व्हाट्सएप पर भेजें" : "Send to WhatsApp"}
              >
                <Send size={16} />
                <span className="text-sm font-bold">{loc.sendButton}</span>
              </button>
              
              <PermissionWrapper requiredRole="admin" requiredPermission="can_delete_invoice" fallback="lock">
                <button 
                  onClick={() => setDeleteConfirmOpen(true)} 
                  className="bg-rose-600 p-1.5 rounded-lg hover:brightness-105 transition-all flex items-center gap-1.5 px-3.5 shadow-sm border border-red-500/20 text-white cursor-pointer active:scale-95"
                  title={lang === 'hi' ? "चयनित बिल हटाएं" : "Delete Selected Invoices"}
                >
                  <Trash2 size={16} />
                  <span className="text-sm font-bold">{loc.deleteButton}</span>
                </button>
              </PermissionWrapper>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <button 
                onClick={handleDownload}
                className="bg-slate-50 dark:bg-slate-800 text-slate-705 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 p-2.5 rounded-lg transition-all cursor-pointer"
                title={loc.downloadTooltip}
              >
                <Download size={18} />
              </button>
              <button 
                onClick={handleCreateNew} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-lg transition-all shadow-md cursor-pointer active:scale-95"
                title={loc.addNewTooltip}
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 py-3.5 px-4 overflow-x-auto hide-scrollbar border-b border-gray-200 dark:border-slate-805 transition-all duration-200 shrink-0 shadow-sm">
          <div className="flex gap-2 min-w-max max-w-7xl mx-auto">
              {tabsArray.map((t: TransactionType) => {
                  const isActive = activeTab === t;
                  return (
                      <button
                        key={t}
                        onClick={() => {
                            const currentIdx = tabsArray.indexOf(activeTab);
                            const nextIdx = tabsArray.indexOf(t);
                            if (currentIdx !== nextIdx) {
                                setSlideDir(nextIdx > currentIdx ? 1 : -1);
                                setActiveTab(t);
                            }
                        }}
                        className={`px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all border cursor-pointer ${
                            isActive 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                            : 'bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                          {loc.tabs[t]}
                      </button>
                  );
              })}
          </div>
      </div>

      {/* Outer Content Layout Container */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full gap-4"
      >
          
          {/* Filters Area styled as interactive card block */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-4 transition-all duration-200 shrink-0">
              <div className="flex gap-1.5 mb-3">
                  {[
                      { id: 'Today', label: loc.today },
                      { id: 'Month', label: dateFilter === 'Month' && selectedSummaryMonth && selectedSummaryMonth !== currentMonthStr ? (MONTH_NAMES[new Date(selectedSummaryMonth + '-01').toLocaleString('en-US', { month: 'short' })]?.[lang] || new Date(selectedSummaryMonth + '-01').toLocaleString('en-US', { month: 'short' })) : currentMonthTranslated },
                      { id: 'All', label: localDate.getFullYear().toString() }
                  ].map((f: any) => (
                      <button 
                        key={f.id}
                        onClick={() => {
                            setDateFilter(f.id);
                            if (f.id === 'Month') {
                                setSelectedSummaryMonth(currentMonthStr); 
                            }
                        }}
                        className={`flex-1 border text-xs font-extrabold py-2.5 flex items-center justify-center rounded-lg uppercase tracking-wide transition-colors cursor-pointer ${
                            dateFilter === f.id 
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' 
                            : 'border-gray-200 dark:border-slate-805 text-slate-500 dark:text-slate-400 hover:bg-slate-55 dark:hover:bg-slate-805 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                          {f.label}
                      </button>
                  ))}
              </div>

              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder={loc.searchPlaceholder}
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-gray-200 dark:border-slate-800 rounded-lg outline-none transition-all placeholder-slate-400 focus:border-indigo-500 focus-active-light dark:focus-active-dark text-sm min-h-[44px]"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
              </div>
          </div>

          {/* TABLE CONTAINER - Rounded Layout Card Frame */}
          <div className="flex-1 min-h-0 relative">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={activeTab}
                custom={slideDir}
                initial={(dir: number) => ({
                    x: dir > 0 ? '100%' : '-100%',
                    opacity: 0,
                    scale: 0.98,
                })}
                animate={{
                    x: 0,
                    opacity: 1,
                    scale: 1,
                }}
                exit={(dir: number) => ({
                    x: dir > 0 ? '-100%' : '100%',
                    opacity: 0,
                    scale: 0.98,
                })}
                transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 32,
                }}
                className="absolute inset-0 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col overflow-auto custom-scrollbar"
              >
              {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400 text-sm font-medium gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-650"></div>
                      <span>{loc.loadingData}</span>
                  </div>
              ) : dateFilter === 'All' ? (
                  <div className="min-w-full inline-block align-middle flex-1">
                      <div className="overflow-x-auto overflow-y-visible w-full">
                          <table className="min-w-max w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-semibold sticky top-0 z-10 border-b border-gray-200 dark:border-slate-800">
                                  <tr>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800 sticky left-0 z-20 bg-slate-50 dark:bg-slate-950 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-indigo-600 dark:text-indigo-400 font-bold">{loc.monthCol}</th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white">{loc.billsCol}</th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800 text-right text-slate-900 dark:text-white">{loc.totalQtyCol}</th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800 text-right text-slate-900 dark:text-white">{loc.billTotalCol}</th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800 text-right text-slate-900 dark:text-white">{loc.paymentCol}</th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800 text-right text-slate-900 dark:text-white">{loc.balanceCol}</th>
                                      <th className="p-3 text-right text-amber-650 font-bold">{loc.advanceCol}</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                                  {monthlySummary.map((m) => (
                                      <tr 
                                          key={m.monthStr}
                                          onClick={() => {
                                              setSelectedSummaryMonth(m.monthStr);
                                              setDateFilter('Month');
                                          }}
                                          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/65 transition-colors bg-white dark:bg-slate-900 text-slate-900 dark:text-white group relative"
                                      >
                                          <td className="p-3 border-r border-gray-200 dark:border-slate-800 sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/65 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors text-indigo-600 dark:text-indigo-400 font-bold">
                                            <div className="flex items-center justify-between">
                                              <span>{getTranslatedMonthName(m.name)}</span>
                                              <span className="text-slate-400 text-xs font-normal ml-2">{m.monthStr.split('-')[0]}</span>
                                            </div>
                                          </td>
                                          <td className="p-3 border-r border-gray-200 dark:border-slate-800 font-bold">{m.bills}</td>
                                          <td className="p-3 border-r border-gray-200 dark:border-slate-800 text-right font-medium">{m.totalQty.toFixed(2)}</td>
                                          <td className="p-3 border-r border-gray-200 dark:border-slate-800 text-right font-extrabold text-indigo-600 dark:text-indigo-450">₹{formatNumber(m.totalAmount)}</td>
                                          <td className="p-3 border-r border-gray-200 dark:border-slate-800 text-right text-emerald-600 dark:text-emerald-400 font-bold">₹{formatNumber(m.totalPayment)}</td>
                                          <td className="p-3 border-r border-gray-200 dark:border-slate-800 text-right text-rose-605 dark:text-rose-450 font-bold">₹{formatNumber(m.totalBalance)}</td>
                                          <td className="p-3 text-right text-amber-650 font-bold">₹{formatNumber(m.totalAdvance)}</td>
                                      </tr>
                                  ))}
                              </tbody>
                              <tfoot className="bg-slate-50 dark:bg-slate-950 border-t-2 border-gray-200 dark:border-slate-800 text-slate-900 dark:text-white sticky bottom-0 z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] font-extrabold">
                                  <tr className="bg-slate-50 dark:bg-slate-950">
                                      <td className="p-3 sticky left-0 bg-slate-50 dark:bg-slate-950 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-slate-900 dark:text-white font-extrabold">{loc.monthsCount}</td>
                                      <td className="p-3 text-indigo-600 dark:text-indigo-400 font-extrabold">{monthlySummary.reduce((acc, curr) => acc + curr.bills, 0)}</td>
                                      <td className="p-3 text-right font-medium">{monthlySummary.reduce((acc, curr) => acc + curr.totalQty, 0).toFixed(2)}</td>
                                      <td className="p-3 text-right text-indigo-600 dark:text-indigo-400 font-extrabold">₹{formatNumber(monthlySummary.reduce((acc, curr) => acc + curr.totalAmount, 0))}</td>
                                      <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-extrabold">₹{formatNumber(monthlySummary.reduce((acc, curr) => acc + curr.totalPayment, 0))}</td>
                                      <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-extrabold">₹{formatNumber(monthlySummary.reduce((acc, curr) => acc + curr.totalBalance, 0))}</td>
                                      <td className="p-3 text-right text-amber-650 font-extrabold">₹{formatNumber(monthlySummary.reduce((acc, curr) => acc + curr.totalAdvance, 0))}</td>
                                  </tr>
                              </tfoot>
                          </table>
                      </div>
                  </div>
              ) : processedInvoices.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-14 text-slate-400 text-center px-4">
                      <AlertCircle size={40} className="mx-auto text-slate-350 opacity-40 mb-3" />
                      <p className="text-base font-bold text-slate-800 dark:text-slate-205 mb-1">
                          {loc.noRecordsFound.replace('{filter}', getFilterLabel())}
                      </p>
                  </div>
              ) : (
                  <div className="min-w-full inline-block align-middle flex-1">
                      <div className="overflow-x-auto w-full">
                          <table className="min-w-[850px] w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider sticky top-0 z-10 text-xs border-b border-gray-200 dark:border-slate-850 shadow-sm">
                                  <tr>
                                      <th className="p-3 w-8 text-center sticky left-0 bg-slate-50 dark:bg-slate-950 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200 dark:border-slate-800">
                                          <button onClick={handleSelectAll} className="cursor-pointer">
                                              {selectedIds.length === processedInvoices.length && processedInvoices.length > 0 ? (
                                                  <CheckSquare size={20} className="text-indigo-600" />
                                              ) : (
                                                  <Square size={20} className="text-slate-400 opacity-50" />
                                              )}
                                          </button>
                                      </th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800">{loc.billNoCol}</th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800">{loc.dateCol}</th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800 min-w-[140px]">{loc.nameCol}</th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800 text-center">{loc.qtyCol}</th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800 text-right">{loc.billTotalCol}</th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800 text-right">{loc.paymentCol}</th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800 text-right">{loc.gstCol}</th>
                                      <th className="p-3 border-r border-gray-200 dark:border-slate-800 text-right">{loc.balanceCol}</th>
                                      <th className="p-3 text-right">{loc.advanceCol}</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                                  {processedInvoices.map((inv) => {
                                      const isSelected = selectedIds.includes(inv.id);
                                      const isSynced = inv.isSyncedToCloud && (inv.type === 'Sale' || inv.type === 'Purchase Return');
                                      
                                      let rowBg = 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white';
                                      if (isSynced) {
                                          rowBg = 'bg-emerald-500/5 dark:bg-emerald-500/10 text-slate-900 dark:text-white';
                                      }
                                      if (isSelected) {
                                          rowBg = 'bg-indigo-50 dark:bg-indigo-950/40 text-slate-900 dark:text-white';
                                      }

                                      return (
                                          <tr 
                                            key={inv.id} 
                                            className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors ${rowBg}`}
                                            onClick={() => onEditInvoice(inv.id, inv.type)}
                                          >
                                              <td className={`p-3 text-center sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-gray-200 dark:border-slate-800 ${rowBg}`} onClick={(e) => e.stopPropagation()}>
                                                  <button onClick={() => handleSelectRow(inv.id)} className="cursor-pointer">
                                                      {isSelected ? (
                                                          <CheckSquare size={20} className="text-indigo-600" />
                                                      ) : (
                                                          <Square size={20} className="text-slate-400 opacity-55" />
                                                      )}
                                                  </button>
                                              </td>
                                              <td className="p-3 border-r border-gray-200 dark:border-slate-800 font-bold">
                                                  {inv.invoiceNo}
                                              </td>
                                              <td className="p-3 border-r border-gray-200 dark:border-slate-800 font-semibold text-slate-500 dark:text-slate-400">
                                                  {inv.date}
                                              </td>
                                              <td className="p-3 border-r border-gray-200 dark:border-slate-800 font-bold truncate max-w-[160px]" title={inv.partyName}>
                                                  {inv.partyName}
                                              </td>
                                              <td className="p-3 border-r border-gray-200 dark:border-slate-800 text-center font-semibold">
                                                  {inv.totalQty}
                                              </td>
                                              <td className="p-3 border-r border-gray-200 dark:border-slate-800 text-right font-extrabold text-indigo-650 dark:text-indigo-400">
                                                  ₹{formatNumber(inv.totalAmount)}
                                              </td>
                                              <td className="p-3 border-r border-gray-200 dark:border-slate-800 text-right font-semibold text-emerald-650 dark:text-emerald-450">
                                                  {inv.paidAmount > 0 ? `₹${formatNumber(inv.paidAmount)}` : '-'}
                                              </td>
                                              <td className="p-3 border-r border-gray-200 dark:border-slate-800 text-right text-slate-500 dark:text-slate-400 font-medium">
                                                  {formatNumber(inv.gstAmount)}
                                              </td>
                                              <td className="p-3 border-r border-gray-200 dark:border-slate-800 text-right font-extrabold text-rose-650 dark:text-rose-450">
                                                  {inv.balance > 0 ? `₹${formatNumber(inv.balance)}` : '-'}
                                              </td>
                                              <td className="p-3 text-right font-extrabold text-emerald-650 dark:text-emerald-450">
                                                  {inv.advance > 0 ? `₹${formatNumber(inv.advance)}` : '-'}
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                              <tfoot className="bg-slate-50 dark:bg-slate-950 font-extrabold text-slate-900 dark:text-white sticky bottom-0 z-20 border-t-2 border-gray-200 dark:border-slate-800 text-sm shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
                                  <tr className="bg-slate-50 dark:bg-slate-950">
                                      <td className="p-3 sticky left-0 bg-slate-50 dark:bg-slate-950 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200 dark:border-slate-800"></td>
                                      <td colSpan={3} className="p-3 text-right border-r border-gray-200 dark:border-slate-800 uppercase text-slate-500 dark:text-slate-400 text-xs tracking-wider">
                                          {loc.grandTotal}
                                      </td>
                                      <td className="p-3 text-center border-r border-gray-200 dark:border-slate-800 font-extrabold">{totals.qty}</td>
                                      <td className="p-3 text-right border-r border-gray-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 font-extrabold">₹{formatNumber(totals.billTotal)}</td>
                                      <td className="p-3 text-right border-r border-gray-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 font-extrabold">₹{formatNumber(totals.payment)}</td>
                                      <td className="p-3 text-right border-r border-gray-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">{formatNumber(totals.gst)}</td>
                                      <td className="p-3 text-right border-r border-gray-200 dark:border-slate-800 text-rose-600 dark:text-rose-450 font-extrabold">₹{formatNumber(totals.balance)}</td>
                                      <td className="p-3 text-right text-emerald-600 dark:text-emerald-450 font-extrabold">₹{formatNumber(totals.advance)}</td>
                                  </tr>
                              </tfoot>
                          </table>
                      </div>
                  </div>
              )}
              </motion.div>
            </AnimatePresence>
          </div>
      </div>

      {/* Floating Action Button */}
      {selectedIds.length === 0 && (
          <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30">
              <button 
                onClick={handleCreateNew}
                className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all border-2 border-white dark:border-slate-900 cursor-pointer"
                title={loc.addNewTooltip}
              >
                  <Plus size={26} strokeWidth={2.5} />
              </button>
          </div>
      )}

      {/* Confirmation & Alert Modals (Native safe, styled using Tailwind custom tags) */}
      <AnimatePresence>
          {/* Delete Invoices Confirmation Modal */}
          {deleteConfirmOpen && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl">
                  <motion.div 
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-gray-200 dark:border-slate-800"
                  >
                      <div className="w-16 h-16 bg-red-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Trash2 size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{loc.confirmDeleteTitle}</h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium text-sm">
                          {loc.confirmDeleteMsg.replace('{count}', selectedIds.length.toString())}
                      </p>
                      <div className="flex gap-3">
                          <button 
                              onClick={() => setDeleteConfirmOpen(false)} 
                              className="flex-1 py-3 rounded-xl font-bold bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-205 border border-gray-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                          >
                              {loc.cancel}
                          </button>
                          <button 
                              onClick={handleBulkDelete} 
                              className="flex-1 py-3 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-all cursor-pointer"
                          >
                              {loc.deleteButton}
                          </button>
                      </div>
                  </motion.div>
              </div>
          )}

          {/* Custom Alert/Popup Dialog Modal */}
          {alertModal.isOpen && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl">
                  <motion.div 
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-gray-200 dark:border-slate-800"
                  >
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${
                          alertModal.type === 'success' 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20 dark:border-emerald-400/30' 
                              : alertModal.type === 'error'
                                  ? 'bg-red-500/10 text-rose-600 dark:text-rose-455 border-red-500/20 dark:border-red-400/30'
                                  : 'bg-indigo-50/10 text-indigo-650 dark:text-indigo-400 border-indigo-600/20 dark:border-indigo-500/30'
                      }`}>
                          {alertModal.type === 'success' ? <Check size={32} /> : <AlertCircle size={32} />}
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">{alertModal.title}</h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium text-sm sm:text-base">
                          {alertModal.message}
                      </p>
                      <button 
                          onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))} 
                          className="w-full py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors text-base cursor-pointer"
                      >
                          {loc.ok}
                      </button>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};
