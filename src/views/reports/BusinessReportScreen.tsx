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

// Extended Invoice type for display purposes
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
  Sep: { en: 'Sep', hi: 'सितंबर' },
  Oct: { en: 'Oct', hi: 'अक्टूबर' },
  Nov: { en: 'Nov', hi: 'नवंबर' },
  Dec: { en: 'Dec', hi: 'दिसंबर' },
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
    // Modals
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
    month: "महीना",
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
    // Modals
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
  const [allParties, setAllParties] = useState<Party[]>([]); // To look up mobile numbers
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  
  const [dateFilter, setDateFilter] = useState<'Today' | 'Month' | 'All'>(
   (localStorage.getItem('businessReportDateFilter') as 'Today' | 'Month' | 'All') || 'Today'
  );

  useEffect(() => {
    localStorage.setItem('businessReportDateFilter', dateFilter);
  }, [dateFilter]);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal States
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
    setSelectedIds([]); // Clear selection on tab change
  }, [initialTab]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    // Fetch Invoices
    const invPromise = billingService.getInvoices(activeTab);

    // Fetch Payments to calculate balance (Opposite type: Sale -> Receipt)
    const paymentType = (activeTab === 'Sale' || activeTab === 'Sale Return') ? 'Receipt' : 'Payment';
    const payPromise = billingService.getAllPayments(paymentType);
    
    // Fetch Parties for Mobile Numbers
    const partyPromise = billingService.getAllParties();

    const [invData, payData, partiesData] = await Promise.all([invPromise, payPromise, partyPromise]);
    
    setInvoices(invData);
    setPayments(payData);
    setAllParties(partiesData);
    
    setLoading(false);
  };

  const [selectedSummaryMonth, setSelectedSummaryMonth] = useState<string>('');

  // --- Processing Data for Table ---
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - (offset*60*1000));
  const todayStr = localDate.toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM
  const currentMonthName = localDate.toLocaleString('en-US', { month: 'short' });

  const processedInvoices: InvoiceDisplay[] = useMemo(() => {
      let filtered = invoices;

      // 1. Date Filtering
      if (dateFilter === 'Today') {
          filtered = filtered.filter(inv => inv.date === todayStr);
      } else if (dateFilter === 'Month') {
          const targetMonth = selectedSummaryMonth || currentMonthStr;
          filtered = filtered.filter(inv => inv.date.startsWith(targetMonth));
      }
      // 'All' does not filter by date

      // 2. Search Filtering
      filtered = filtered.filter(inv => 
        inv.partyName.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
        inv.invoiceNo.toLowerCase().includes(searchQuery.trim().toLowerCase())
      );

      const mappedList = filtered.map(inv => {
          // 1. Calculate Item Details (Qty, GST)
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
                      // Back calculate GST from inclusive amount
                      const base = discounted / (1 + item.taxPercent / 100);
                      gst += discounted - base;
                  }
              });
          }

          // 2. Calculate Payment Paid against this invoice
          const linkedPayments = payments.filter(p => p.invoiceId === inv.id);
          const paid = linkedPayments.reduce((sum, p) => sum + p.amount, 0);

          // 3. Balance & Advance Logic
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

      // Sort by Date DESC, then by Invoice No DESC (Latest overall first)
      return mappedList.sort((a, b) => {
          if (a.date !== b.date) {
              return b.date.localeCompare(a.date); // Newer date first
          }
          // Sort invoiceNo DESC
          const numA = parseInt(a.invoiceNo.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.invoiceNo.replace(/\D/g, '')) || 0;
          if (numA !== numB) {
              return numB - numA; // Descending numerical
          }
          return b.invoiceNo.localeCompare(a.invoiceNo); // Descending string fallback
      });
  }, [invoices, payments, searchQuery, dateFilter, selectedSummaryMonth]);

  // --- Monthly Summary Calculation (For 'All' tab) ---
  const monthlySummary = useMemo(() => {
      if (dateFilter !== 'All') return [];
      
      const year = localDate.getFullYear();
      // Use current year's Apr to Mar (Financial Year)
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
          // get invoices for this month
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

  // --- Totals Calculation ---
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

  // --- Selection Handlers ---
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

  // --- Bulk Share Function ---
  const handleBulkShare = async () => {
      if (selectedIds.length === 0) return;

      // 1. Get selected invoices
      const selectedInvoices = processedInvoices.filter(inv => selectedIds.includes(inv.id));
      
      // 2. Group by Party ID (to send one consolidated message per customer)
      const invoicesByParty: { [key: string]: InvoiceDisplay[] } = {};
      selectedInvoices.forEach(inv => {
          if (!invoicesByParty[inv.partyId]) {
              invoicesByParty[inv.partyId] = [];
          }
          invoicesByParty[inv.partyId].push(inv);
      });

      const partyIds = Object.keys(invoicesByParty);

      // 3. Iterate and Open WhatsApp & Sync to Cloud
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
          
          // --- CLOUD SYNC ---
          for (const inv of partyInvoices) {
              if (inv.type !== 'Purchase' && !inv.isSyncedToCloud) {
                  try {
                      // Fetch full invoice from DB to get items correctly
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

          // Construct Message
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

          // Format Number
          let cleanNumber = party.mobile.replace(/\D/g, '');
          if (cleanNumber.length === 10) cleanNumber = '91' + cleanNumber;

          // Open WhatsApp
          const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Small delay if loop to allow browser to handle multiple opens
          await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Deselect after action
      setSelectedIds([]);
      if (cloudSyncCount > 0) {
          loadData();
          showAlert(loc.success, loc.syncSuccess, 'success');
      }
  };

  // --- Bulk Delete Function with Admin Permission Check ---
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

      // Define CSV headers
      const csvHeaders = [
          loc.billNoCol,
          loc.dateCol,
          loc.nameCol,
          loc.qtyCol,
          loc.billNoCol === "Bill No" ? 'Total Amount' : 'कुल राशि',
          loc.billNoCol === "Bill No" ? 'Paid Amount' : 'भुगतान राशि',
          loc.balanceCol
      ];

      // Convert data to CSV rows
      const rows = processedInvoices.map(inv => [
          inv.invoiceNo,
          inv.date,
          inv.partyName,
          inv.totalQty.toString(),
          (inv.totalAmount || 0).toFixed(2),
          (inv.paidAmount || 0).toFixed(2),
          (inv.balance || 0).toFixed(2)
      ]);

      // Combine headers and rows
      const csvContent = [
          csvHeaders.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create a Blob and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${activeTab}_Report_${dateFilter}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Translate month names for All table and month label
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
    <div lang={lang} className={`flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-main)] transition-all duration-200 pb-[max(env(safe-area-inset-bottom),0px)] ${lang === 'hi' ? 'leading-relaxed' : ''}`}>
      {/* Header */}
      <header className="bg-[var(--bg-card)] text-[var(--text-main)] p-4 px-5 pt-[max(env(safe-area-inset-top),48px)] pb-3 flex items-center justify-between border-b border-transparent dark:border-transparent shrink-0 relative transition-all duration-200 shadow-none">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1 px-1.5 hover:bg-[var(--brand-light)] rounded-lg text-[var(--text-main)] transition-all cursor-pointer"><ArrowLeft size={24} /></button>
            <div>
                <h1 className="text-lg font-extrabold uppercase tracking-tight text-[var(--text-main)] leading-tight">{loc.businessReports}</h1>
                <p className="text-xs text-[var(--text-secondary)] leading-tight">{loc.detailedView}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            {selectedIds.length > 0 ? (
                <div className="flex gap-1.5 animate-in zoom-in-95 duration-150">
                    <button 
                        onClick={handleBulkShare} 
                        className="bg-[var(--money-in)] p-1.5 rounded-lg hover:brightness-105 transition-all flex items-center gap-1.5 px-3.5 shadow-sm border border-emerald-500/20 text-white cursor-pointer active:scale-95 animate-pulse"
                        title={lang === 'hi' ? "व्हाट्सएप पर भेजें" : "Send to WhatsApp"}
                    >
                        <Send size={16} />
                        <span className="text-sm font-bold">{loc.sendButton}</span>
                    </button>
                    
                    <PermissionWrapper requiredRole="admin" requiredPermission="can_delete_invoice" fallback="lock">
                        <button 
                            onClick={() => setDeleteConfirmOpen(true)} 
                            className="bg-[var(--money-out)] p-1.5 rounded-lg hover:brightness-105 transition-all flex items-center gap-1.5 px-3.5 shadow-sm border border-red-500/20 text-white cursor-pointer active:scale-95"
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
                        className="bg-[var(--bg-app)] text-[var(--text-main)] border border-slate-200 dark:border-transparent hover:bg-[var(--brand-light)] p-2 rounded-lg transition-all cursor-pointer shadow-none animate-none"
                        title={loc.downloadTooltip}
                    >
                        <Download size={18} />
                    </button>
                    <button 
                        onClick={handleCreateNew} 
                        className="bg-[var(--brand-primary)] text-white hover:brightness-110 p-2 rounded-lg transition-all shadow-md cursor-pointer active:scale-95"
                        title={loc.addNewTooltip}
                    >
                        <Plus size={18} strokeWidth={2.5} />
                    </button>
                </div>
            )}
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[var(--bg-card)] py-3.5 px-4 overflow-x-auto hide-scrollbar border-b border-transparent dark:border-transparent transition-all duration-200 shrink-0 shadow-none">
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
                            ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-md' 
                            : 'bg-[var(--bg-app)] text-[var(--text-secondary)] border-slate-200 dark:border-transparent hover:bg-[var(--brand-light)] hover:text-[var(--text-main)]'
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
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-ui)] shadow-xs p-4 transition-all duration-200 shrink-0 hover:-translate-y-0.5">
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
                                setSelectedSummaryMonth(currentMonthStr); // Reset to current month when clicking tab
                            }
                        }}
                        className={`flex-1 border text-xs font-extrabold py-2.5 flex items-center justify-center rounded-lg uppercase tracking-wide transition-colors cursor-pointer ${
                            dateFilter === f.id 
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-xs' 
                            : 'border-[var(--border-ui)] text-[var(--text-secondary)] hover:bg-[var(--brand-light)] hover:text-[var(--text-main)]'
                        }`}
                      >
                          {f.label}
                      </button>
                  ))}
              </div>

              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-[var(--text-secondary)] opacity-70" />
                  </div>
                  <input
                    type="text"
                    placeholder={loc.searchPlaceholder}
                    className="block w-full pl-9 pr-3 py-2 bg-[var(--bg-app)] text-[var(--text-main)] border border-[var(--border-ui)] rounded-lg outline-none transition-all placeholder-[var(--text-secondary)]/50 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-light)] text-sm"
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
                className="absolute inset-0 bg-[var(--bg-card)] rounded-xl border border-[var(--border-ui)] shadow-xs flex flex-col overflow-auto custom-scrollbar"
              >
              {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 text-[var(--text-secondary)] text-sm font-medium gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]"></div>
                      <span>{loc.loadingData}</span>
                  </div>
              ) : dateFilter === 'All' ? (
                  <div className="min-w-full inline-block align-middle flex-1">
                      <div className="overflow-x-auto overflow-y-visible w-full">
                          <table className="min-w-max w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-[var(--bg-card)] text-[var(--text-main)] font-semibold sticky top-0 z-10 border-b border-[var(--border-ui)]">
                                  <tr>
                                      <th className="p-3 border-r border-[var(--border-ui)] sticky left-0 z-20 bg-[var(--bg-card)] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-[var(--brand-primary)] font-bold">{loc.monthCol}</th>
                                      <th className="p-3 border-r border-[var(--border-ui)] text-[var(--text-main)]">{loc.billsCol}</th>
                                      <th className="p-3 border-r border-[var(--border-ui)] text-right text-[var(--text-main)]">{loc.totalQtyCol}</th>
                                      <th className="p-3 border-r border-[var(--border-ui)] text-right text-[var(--text-main)]">{loc.billTotalCol}</th>
                                      <th className="p-3 border-r border-[var(--border-ui)] text-right text-[var(--text-main)]">{loc.paymentCol}</th>
                                      <th className="p-3 border-r border-[var(--border-ui)] text-right text-[var(--text-main)]">{loc.balanceCol}</th>
                                      <th className="p-3 text-right text-[var(--money-warn)]">{loc.advanceCol}</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--border-ui)]">
                                  {monthlySummary.map((m) => (
                                      <tr 
                                          key={m.monthStr}
                                          onClick={() => {
                                              setSelectedSummaryMonth(m.monthStr);
                                              setDateFilter('Month');
                                          }}
                                          className="cursor-pointer hover:bg-[var(--brand-light)] transition-colors bg-[var(--bg-card)] text-[var(--text-main)] group relative"
                                      >
                                          <td className="p-3 border-r border-[var(--border-ui)] sticky left-0 z-10 bg-[var(--bg-card)] group-hover:bg-[var(--brand-light)] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors text-[var(--brand-primary)] font-bold">
                                            <div className="flex items-center justify-between">
                                              <span>{getTranslatedMonthName(m.name)}</span>
                                              <span className="text-[var(--text-secondary)] opacity-60 text-xs font-normal ml-2">{m.monthStr.split('-')[0]}</span>
                                            </div>
                                          </td>
                                          <td className="p-3 border-r border-[var(--border-ui)] font-bold">{m.bills}</td>
                                          <td className="p-3 border-r border-[var(--border-ui)] text-right font-medium">{m.totalQty.toFixed(2)}</td>
                                          <td className="p-3 border-r border-[var(--border-ui)] text-right font-extrabold text-[var(--brand-primary)]">₹{formatNumber(m.totalAmount)}</td>
                                          <td className="p-3 border-r border-[var(--border-ui)] text-right text-[var(--money-in)] font-bold">₹{formatNumber(m.totalPayment)}</td>
                                          <td className="p-3 border-r border-[var(--border-ui)] text-right text-[var(--money-out)] font-bold">₹{formatNumber(m.totalBalance)}</td>
                                          <td className="p-3 text-right text-[var(--money-warn)] font-bold">₹{formatNumber(m.totalAdvance)}</td>
                                      </tr>
                                  ))}
                              </tbody>
                              <tfoot className="bg-[var(--bg-card)] border-t-2 border-[var(--border-ui)] text-[var(--text-main)] sticky bottom-0 z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] font-extrabold">
                                  <tr className="bg-[var(--bg-card)]">
                                      <td className="p-3 sticky left-0 bg-[var(--bg-card)] z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-[var(--text-main)] font-extrabold">{loc.monthsCount}</td>
                                      <td className="p-3 text-[var(--brand-primary)] font-extrabold">{monthlySummary.reduce((acc, curr) => acc + curr.bills, 0)}</td>
                                      <td className="p-3 text-right font-medium">{monthlySummary.reduce((acc, curr) => acc + curr.totalQty, 0).toFixed(2)}</td>
                                      <td className="p-3 text-right text-[var(--brand-primary)] font-extrabold">₹{formatNumber(monthlySummary.reduce((acc, curr) => acc + curr.totalAmount, 0))}</td>
                                      <td className="p-3 text-right text-[var(--money-in)] font-extrabold">₹{formatNumber(monthlySummary.reduce((acc, curr) => acc + curr.totalPayment, 0))}</td>
                                      <td className="p-3 text-right text-[var(--money-out)] font-extrabold">₹{formatNumber(monthlySummary.reduce((acc, curr) => acc + curr.totalBalance, 0))}</td>
                                      <td className="p-3 text-right text-[var(--money-warn)] font-extrabold">₹{formatNumber(monthlySummary.reduce((acc, curr) => acc + curr.totalAdvance, 0))}</td>
                                  </tr>
                              </tfoot>
                          </table>
                      </div>
                  </div>
              ) : processedInvoices.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-14 text-[var(--text-secondary)] text-center px-4">
                      <AlertCircle size={40} className="mx-auto text-[var(--text-secondary)] opacity-40 mb-3" />
                      <p className="text-base font-bold text-[var(--text-main)] mb-1">
                          {loc.noRecordsFound.replace('{filter}', getFilterLabel())}
                      </p>
                  </div>
              ) : (
                  <div className="min-w-full inline-block align-middle flex-1">
                      <div className="overflow-x-auto w-full">
                          <table className="min-w-[850px] w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-[var(--bg-card)] text-[var(--text-secondary)] font-bold uppercase tracking-wider sticky top-0 z-10 text-xs border-b border-[var(--border-ui)] shadow-2xs">
                                  <tr>
                                      <th className="p-3 w-8 text-center sticky left-0 bg-[var(--bg-card)] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-[var(--border-ui)]">
                                          <button onClick={handleSelectAll} className="cursor-pointer">
                                              {selectedIds.length === processedInvoices.length && processedInvoices.length > 0 ? (
                                                  <CheckSquare size={20} className="text-[var(--brand-primary)]" />
                                              ) : (
                                                  <Square size={20} className="text-[var(--text-secondary)] opacity-50" />
                                              )}
                                          </button>
                                      </th>
                                      <th className="p-3 border-r border-[var(--border-ui)]">{loc.billNoCol}</th>
                                      <th className="p-3 border-r border-[var(--border-ui)]">{loc.dateCol}</th>
                                      <th className="p-3 border-r border-[var(--border-ui)] min-w-[140px]">{loc.nameCol}</th>
                                      <th className="p-3 border-r border-[var(--border-ui)] text-center">{loc.qtyCol}</th>
                                      <th className="p-3 border-r border-[var(--border-ui)] text-right">{loc.billTotalCol}</th>
                                      <th className="p-3 border-r border-[var(--border-ui)] text-right">{loc.paymentCol}</th>
                                      <th className="p-3 border-r border-[var(--border-ui)] text-right">{loc.gstCol}</th>
                                      <th className="p-3 border-r border-[var(--border-ui)] text-right">{loc.balanceCol}</th>
                                      <th className="p-3 text-right">{loc.advanceCol}</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--border-ui)]">
                                  {processedInvoices.map((inv) => {
                                      const isSelected = selectedIds.includes(inv.id);
                                      const isSynced = inv.isSyncedToCloud && (inv.type === 'Sale' || inv.type === 'Purchase Return');
                                      
                                      let rowBg = 'bg-[var(--bg-card)] text-[var(--text-main)]';
                                      if (isSynced) {
                                          rowBg = 'bg-[rgba(5,150,105,0.04)] dark:bg-[rgba(16,185,129,0.06)] text-[var(--text-main)]';
                                      }
                                      if (isSelected) {
                                          rowBg = 'bg-[var(--brand-light)] text-[var(--text-main)]';
                                      }

                                      return (
                                          <tr 
                                            key={inv.id} 
                                            className={`cursor-pointer hover:bg-[var(--brand-light)] transition-colors ${rowBg}`}
                                            onClick={() => onEditInvoice(inv.id, inv.type)}
                                          >
                                              <td className={`p-3 text-center sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-[var(--border-ui)] ${rowBg}`} onClick={(e) => e.stopPropagation()}>
                                                  <button onClick={() => handleSelectRow(inv.id)} className="cursor-pointer">
                                                      {isSelected ? (
                                                          <CheckSquare size={20} className="text-[var(--brand-primary)]" />
                                                      ) : (
                                                          <Square size={20} className="text-[var(--text-secondary)] opacity-55" />
                                                      )}
                                                  </button>
                                              </td>
                                              <td className="p-3 border-r border-[var(--border-ui)] font-bold">
                                                  {inv.invoiceNo}
                                              </td>
                                              <td className="p-3 border-r border-[var(--border-ui)] font-semibold text-[var(--text-secondary)]">
                                                  {inv.date}
                                              </td>
                                              <td className="p-3 border-r border-[var(--border-ui)] font-bold truncate max-w-[160px]" title={inv.partyName}>
                                                  {inv.partyName}
                                              </td>
                                              <td className="p-3 border-r border-[var(--border-ui)] text-center font-semibold text-[var(--text-main)]">
                                                  {inv.totalQty}
                                              </td>
                                              <td className="p-3 border-r border-[var(--border-ui)] text-right font-extrabold text-[var(--brand-primary)]">
                                                  ₹{formatNumber(inv.totalAmount)}
                                              </td>
                                              <td className="p-3 border-r border-[var(--border-ui)] text-right font-semibold text-[var(--money-in)]">
                                                  {inv.paidAmount > 0 ? `₹${formatNumber(inv.paidAmount)}` : '-'}
                                              </td>
                                              <td className="p-3 border-r border-[var(--border-ui)] text-right text-[var(--text-secondary)] font-medium">
                                                  {formatNumber(inv.gstAmount)}
                                              </td>
                                              <td className="p-3 border-r border-[var(--border-ui)] text-right font-extrabold text-[var(--money-out)]">
                                                  {inv.balance > 0 ? `₹${formatNumber(inv.balance)}` : '-'}
                                              </td>
                                              <td className="p-3 text-right font-extrabold text-[var(--money-in)]">
                                                  {inv.advance > 0 ? `₹${formatNumber(inv.advance)}` : '-'}
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                              <tfoot className="bg-[var(--bg-card)] font-extrabold text-[var(--text-main)] sticky bottom-0 z-20 border-t-2 border-[var(--border-ui)] text-sm shadow-[0_-2px_8px_rgba(0,0,0,0.06)] bg-slate-50 dark:bg-slate-900">
                                  <tr className="bg-[var(--bg-card)]">
                                      <td className="p-3 sticky left-0 bg-[var(--bg-card)] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-[var(--border-ui)]"></td>
                                      <td colSpan={3} className="p-3 text-right border-r border-[var(--border-ui)] uppercase text-[var(--text-secondary)] text-xs tracking-wider">
                                          {loc.grandTotal}
                                      </td>
                                      <td className="p-3 text-center border-r border-[var(--border-ui)] font-extrabold text-[var(--text-main)]">{totals.qty}</td>
                                      <td className="p-3 text-right border-r border-[var(--border-ui)] text-[var(--brand-primary)] font-extrabold">₹{formatNumber(totals.billTotal)}</td>
                                      <td className="p-3 text-right border-r border-[var(--border-ui)] text-[var(--money-in)] font-extrabold">₹{formatNumber(totals.payment)}</td>
                                      <td className="p-3 text-right border-r border-[var(--border-ui)] text-[var(--text-secondary)] font-bold">{formatNumber(totals.gst)}</td>
                                      <td className="p-3 text-right border-r border-[var(--border-ui)] text-[var(--money-out)] font-extrabold">₹{formatNumber(totals.balance)}</td>
                                      <td className="p-3 text-right text-[var(--money-in)] font-extrabold">₹{formatNumber(totals.advance)}</td>
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
                className="w-14 h-14 rounded-full bg-[var(--brand-primary)] text-white shadow-xl flex items-center justify-center hover:bg-[var(--brand-hover)] hover:scale-105 active:scale-95 transition-all border-2 border-[var(--bg-card)] cursor-pointer"
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
                     className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-[var(--border-ui)]"
                  >
                      <div className="w-16 h-16 bg-[rgba(220,38,38,0.1)] dark:bg-[rgba(248,113,113,0.15)] text-[var(--money-out)] border border-[var(--money-out)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Trash2 size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">{loc.confirmDeleteTitle}</h3>
                      <p className="text-[var(--text-secondary)] mb-6 font-medium text-sm">
                          {loc.confirmDeleteMsg.replace('{count}', selectedIds.length.toString())}
                      </p>
                      <div className="flex gap-3">
                          <button 
                              onClick={() => setDeleteConfirmOpen(false)} 
                              className="flex-1 py-3 rounded-xl font-bold bg-[var(--bg-app)] text-[var(--text-main)] border border-[var(--border-ui)] hover:bg-[var(--brand-light)] transition-colors cursor-pointer"
                          >
                              {loc.cancel}
                          </button>
                          <button 
                              onClick={handleBulkDelete} 
                              className="flex-1 py-3 rounded-xl font-bold bg-[var(--money-out)] hover:brightness-105 text-white shadow-lg transition-all cursor-pointer"
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
                     className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-[var(--border-ui)]"
                  >
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${
                          alertModal.type === 'success' 
                              ? 'bg-[rgba(5,150,105,0.1)] dark:bg-[rgba(16,185,129,0.15)] text-[var(--money-in)] border-emerald-500/20 dark:border-emerald-400/30' 
                              : alertModal.type === 'error'
                                  ? 'bg-[rgba(220,38,38,0.1)] dark:bg-[rgba(248,113,113,0.15)] text-[var(--money-out)] border-red-500/20 dark:border-red-400/30'
                                  : 'bg-[var(--brand-light)] text-[var(--brand-primary)] border-indigo-600/20 dark:border-indigo-500/30'
                      }`}>
                          {alertModal.type === 'success' ? <Check size={32} /> : <AlertCircle size={32} />}
                      </div>
                      <h3 className="text-xl font-extrabold text-[var(--text-main)] mb-2">{alertModal.title}</h3>
                      <p className="text-[var(--text-secondary)] mb-6 font-medium text-sm sm:text-base">
                          {alertModal.message}
                      </p>
                      <button 
                          onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))} 
                          className="w-full py-3 rounded-xl font-bold bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-hover)] transition-colors text-base cursor-pointer"
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
