import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Plus, Trash2, Edit2, Calendar, CheckSquare, Square, Download, Filter, Send } from 'lucide-react';
import { TransactionType, Invoice, PaymentRecord, Party } from '../types';
import { billingService } from '../src/services/billingService';
import { sqliteService } from '../src/services/sqliteService';
import { shareInvoiceWithClient } from '../src/services/firebaseService';
import { BillingService } from '../src/services/SecureBillingService';
import { PermissionWrapper } from './PermissionWrapper';


interface BusinessReportScreenProps {
  onBack: () => void;
  initialTab?: TransactionType;
  initialSearchQuery?: string;
  onCreateNew: (type: TransactionType) => void;
  onEditInvoice: (id: string, type: TransactionType) => void;
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

export const BusinessReportScreen: React.FC<BusinessReportScreenProps> = ({ 
    onBack, 
    initialTab = 'Sale', 
    initialSearchQuery = '',
    onCreateNew,
    onEditInvoice
}) => {
  const [activeTab, setActiveTab] = useState<TransactionType>(initialTab);
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
          // Balance = Total - Paid
          // If Balance is negative, it means Advance (Paid > Total)
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
  }, [invoices, payments, searchQuery, dateFilter]);

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
              alert(`Could not find customer profile for some bills. They may have been deleted. WhatsApp skipped.`);
              continue;
          }

          if (!party.mobile) {
              alert(`Mobile number not found for ${party.name}`);
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
                              alert(`Failed to sync bill ${inv.invoiceNo} to cloud: ${result.error || "Please check network connection."}`);
                          }
                      }
                  } catch (e) {
                      console.warn("Could not sync invoice in bulk", e);
                      alert(`Error syncing bill ${inv.invoiceNo} to cloud. Please check network.`);
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

          // Small delay if loop to allow browser to handle multiple opens (though browsers might block multiple popups)
          await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Deselect after action
      setSelectedIds([]);
      if (cloudSyncCount > 0) {
          loadData();
      }
  };

  // --- Bulk Delete Function with Admin Permission Check ---
  const handleBulkDelete = async () => {
      if (selectedIds.length === 0) return;

      const confirmMsg = `Are you sure you want to delete ${selectedIds.length} selected invoice(s)? This will reverse stock changes and cannot be undone.`;
      if (!confirm(confirmMsg)) return;

      try {
          for (const id of selectedIds) {
              await BillingService.deleteInvoice(id);
          }
          alert(`Successfully deleted ${selectedIds.length} invoice(s)! ✅`);
          setSelectedIds([]);
          loadData();
      } catch (error: any) {
          console.error("Bulk delete error", error);
          alert(`Error: ${error.message || 'Failed to delete some invoices'}`);
          loadData();
      }
  };

  const handleCreateNew = () => {
      onCreateNew(activeTab);
  };

  const handleDownload = () => {
      if (processedInvoices.length === 0) {
          alert("No data to download.");
          return;
      }

      // Define CSV headers
      const headers = [
          'Bill No',
          'Date',
          'Name',
          'Total Qty',
          'Total Amount',
          'Paid Amount',
          'Balance'
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
          headers.join(','),
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

  // Tab Definitions matching the screenshot + generic types
  const tabs: TransactionType[] = ['Sale', 'Purchase', 'Sale Return', 'Purchase Return'];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white p-4 px-4 pt-[max(env(safe-area-inset-top),48px)] pb-2 flex items-center justify-between shadow-md shrink-0 border-b border-slate-700 relative">
        <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1"><ArrowLeft size={28} /></button>
            <div>
                <h1 className="text-xl font-bold uppercase tracking-wide leading-tight">BUSINESS REPORTS</h1>
                <p className="text-sm text-slate-300 leading-tight">Detailed View</p>
            </div>
        </div>
        <div className="flex gap-2">
            {selectedIds.length > 0 ? (
                <>
                    <button 
                        onClick={handleBulkShare} 
                        className="bg-blue-600 p-1.5 rounded hover:bg-blue-700 transition-colors flex items-center gap-1.5 px-2 shadow-md border border-blue-500 text-white"
                        title="Send to WhatsApp"
                    >
                        <Send size={16} />
                        <span className="text-sm font-bold hidden sm:inline">Send</span>
                    </button>
                    
                    <PermissionWrapper requiredRole="admin" fallback="lock">
                        <button 
                            onClick={handleBulkDelete} 
                            className="bg-red-600 p-1.5 rounded hover:bg-red-700 transition-colors flex items-center gap-1.5 px-2 shadow-md border border-red-500 text-white"
                            title="Delete Selected Invoices"
                        >
                            <Trash2 size={16} />
                            <span className="text-sm font-bold hidden sm:inline">Delete</span>
                        </button>
                    </PermissionWrapper>
                </>
            ) : (
                <>
                    <button 
                        onClick={handleDownload}
                        className="bg-slate-700 p-1.5 rounded hover:bg-slate-600 transition-colors border border-slate-600"
                        title="Download CSV Report"
                    >
                        <Download size={18} />
                    </button>
                    <button 
                        onClick={handleCreateNew} 
                        className="bg-blue-600 p-1.5 rounded hover:bg-blue-500 transition-colors border border-blue-500 text-white shadow-sm"
                    >
                        <Plus size={18} strokeWidth={3} />
                    </button>
                </>
            )}
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-slate-900 pb-2 px-2 shadow-md overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5 min-w-max">
              {tabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider transition-all border ${
                        activeTab === tab 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm' 
                        : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                      {tab}
                  </button>
              ))}
          </div>
      </div>

      {/* Filters & Summary */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 px-3">
          <div className="flex gap-1.5 mb-2">
              {[
                  { id: 'Today', label: 'Today' },
                  { id: 'Month', label: dateFilter === 'Month' && selectedSummaryMonth && selectedSummaryMonth !== currentMonthStr ? new Date(selectedSummaryMonth + '-01').toLocaleString('en-US', { month: 'short' }) : currentMonthName },
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
                    className={`flex-1 border text-sm font-bold py-2 flex items-center justify-center rounded uppercase transition-colors ${
                        dateFilter === f.id 
                        ? 'border-blue-600 bg-blue-600 text-white dark:bg-blue-600 dark:border-blue-600' 
                        : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                      {f.label}
                  </button>
              ))}
          </div>

          <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search Name or Bill No..."
                className="block w-full pl-8 pr-2 py-2 border border-slate-200 dark:border-slate-700 rounded text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
          </div>
      </div>

      {/* TABLE CONTAINER - Horizontal Scroll */}
      <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 relative">
          {loading ? (
              <div className="text-center py-10 text-slate-400 text-sm">Loading Data...</div>
          ) : dateFilter === 'All' ? (
              <div className="min-w-full inline-block align-middle pb-20">
                  <div className="border border-x-0 sm:border-x rounded-none sm:rounded-lg overflow-x-auto overflow-y-visible">
                      <table className="min-w-max w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-bold sticky top-0 z-10 border-b border-slate-300 dark:border-slate-600">
                              <tr>
                                  <th className="p-3 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Month</th>
                                  <th className="p-3 border-r border-slate-200 dark:border-slate-700">Bills</th>
                                  <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-right">Total Qty</th>
                                  <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-right">Bill Total</th>
                                  <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-right">Payment</th>
                                  <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-right">Balance</th>
                                  <th className="p-3 text-right text-amber-600 dark:text-amber-400">Advance</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {monthlySummary.map((m) => (
                                  <tr 
                                      key={m.monthStr}
                                      onClick={() => {
                                          setSelectedSummaryMonth(m.monthStr);
                                          setDateFilter('Month');
                                      }}
                                      className="cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 group relative"
                                  >
                                      <td className="p-3 border-r border-slate-100 dark:border-slate-800 sticky left-0 z-10 bg-white group-hover:bg-blue-50 dark:bg-slate-900 dark:group-hover:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors text-blue-600 dark:text-blue-400 font-medium">
                                        <div className="flex items-center justify-between">
                                          <span>{m.name}</span>
                                          <span className="text-slate-300 dark:text-slate-600 text-xs font-normal ml-2">{m.monthStr.split('-')[0]}</span>
                                        </div>
                                      </td>
                                      <td className="p-3 border-r border-slate-100 dark:border-slate-800">{m.bills}</td>
                                      <td className="p-3 border-r border-slate-100 dark:border-slate-800 text-right">{m.totalQty.toFixed(2)}</td>
                                      <td className="p-3 border-r border-slate-100 dark:border-slate-800 text-right font-medium">₹{formatNumber(m.totalAmount)}</td>
                                      <td className="p-3 border-r border-slate-100 dark:border-slate-800 text-right text-emerald-600 dark:text-emerald-400">₹{formatNumber(m.totalPayment)}</td>
                                      <td className="p-3 border-r border-slate-100 dark:border-slate-800 text-right text-rose-600 dark:text-rose-400">₹{formatNumber(m.totalBalance)}</td>
                                      <td className="p-3 text-right text-amber-600 dark:text-amber-400">₹{formatNumber(m.totalAdvance)}</td>
                                  </tr>
                              ))}
                          </tbody>
                          <tfoot className="bg-[#4b5563] text-white font-bold sticky bottom-0 z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.2)]">
                              <tr>
                                  <td className="p-3 sticky left-0 bg-[#4b5563] z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">Months : 12</td>
                                  <td className="p-3">{monthlySummary.reduce((acc, curr) => acc + curr.bills, 0)}</td>
                                  <td className="p-3 text-right">{monthlySummary.reduce((acc, curr) => acc + curr.totalQty, 0).toFixed(2)}</td>
                                  <td className="p-3 text-right">₹{formatNumber(monthlySummary.reduce((acc, curr) => acc + curr.totalAmount, 0))}</td>
                                  <td className="p-3 text-right text-emerald-300">₹{formatNumber(monthlySummary.reduce((acc, curr) => acc + curr.totalPayment, 0))}</td>
                                  <td className="p-3 text-right text-rose-300">₹{formatNumber(monthlySummary.reduce((acc, curr) => acc + curr.totalBalance, 0))}</td>
                                  <td className="p-3 text-right text-amber-300">₹{formatNumber(monthlySummary.reduce((acc, curr) => acc + curr.totalAdvance, 0))}</td>
                              </tr>
                          </tfoot>
                      </table>
                  </div>
              </div>
          ) : processedInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-10 pb-10 text-slate-400">
                  <p className="text-xs font-medium">No records found for {dateFilter}</p>
              </div>
          ) : (
              <div className="min-w-full inline-block align-middle">
                  <div className="border rounded-lg overflow-hidden">
                      <table className="min-w-[700px] w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider sticky top-0 z-10 shadow-sm text-xs border-b border-slate-300 dark:border-slate-600">
                              <tr>
                                  <th className="p-2 w-8 text-center sticky left-0 bg-slate-100 dark:bg-slate-800 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                      <button onClick={handleSelectAll}>
                                          {selectedIds.length === processedInvoices.length && processedInvoices.length > 0 ? (
                                              <CheckSquare size={16} className="text-blue-600" />
                                          ) : (
                                              <Square size={16} className="text-slate-400" />
                                          )}
                                      </button>
                                  </th>
                                  <th className="p-2 border-r border-slate-200 dark:border-slate-700">Bill No</th>
                                  <th className="p-2 border-r border-slate-200 dark:border-slate-700">Date</th>
                                  <th className="p-2 border-r border-slate-200 dark:border-slate-700 min-w-[120px]">Name</th>
                                  <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">Qty</th>
                                  <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">Bill Total</th>
                                  <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">Payment</th>
                                  <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">GST</th>
                                  <th className="p-2 border-r border-slate-200 dark:border-slate-700 text-right">Balance</th>
                                  <th className="p-2 text-right">Advance</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {processedInvoices.map((inv) => {
                                  const isSelected = selectedIds.includes(inv.id);
                                  const isSynced = inv.isSyncedToCloud && (inv.type === 'Sale' || inv.type === 'Purchase Return');
                                  
                                  let rowBg = isSynced ? 'bg-[#5ad368] text-black dark:bg-[#3fac4a] dark:text-white' : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200';
                                  if (isSelected) {
                                      rowBg = isSynced ? 'bg-[#4bbf57] text-black dark:bg-[#328e3b] dark:text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-slate-800 dark:text-slate-200';
                                  }

                                  const textClass = isSynced ? '!text-black dark:!text-white' : '';

                                  return (
                                      <tr 
                                        key={inv.id} 
                                        className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${rowBg}`}
                                        onClick={() => onEditInvoice(inv.id, inv.type)}
                                      >
                                          <td className={`p-2 text-center sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${rowBg}`} onClick={(e) => e.stopPropagation()}>
                                              <button onClick={() => handleSelectRow(inv.id)}>
                                                  {isSelected ? (
                                                      <CheckSquare size={16} className={`text-blue-600 ${textClass}`} />
                                                  ) : (
                                                      <Square size={16} className={`text-slate-300 ${textClass}`} />
                                                  )}
                                              </button>
                                          </td>
                                          <td className={`p-2 border-r border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 ${textClass}`}>
                                              {inv.invoiceNo}
                                          </td>
                                          <td className={`p-2 border-r border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 ${textClass}`}>
                                              {inv.date}
                                          </td>
                                          <td className={`p-2 border-r border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white truncate max-w-[150px] ${textClass}`} title={inv.partyName}>
                                              {inv.partyName}
                                          </td>
                                          <td className={`p-2 border-r border-slate-100 dark:border-slate-800 text-center font-medium ${textClass}`}>
                                              {inv.totalQty}
                                          </td>
                                          <td className={`p-2 border-r border-slate-100 dark:border-slate-800 text-right font-bold text-blue-600 dark:text-blue-400 ${textClass}`}>
                                              ₹{formatNumber(inv.totalAmount)}
                                          </td>
                                          <td className={`p-2 border-r border-slate-100 dark:border-slate-800 text-right font-medium text-green-600 dark:text-green-400 ${textClass}`}>
                                              {inv.paidAmount > 0 ? `₹${formatNumber(inv.paidAmount)}` : '-'}
                                          </td>
                                          <td className={`p-2 border-r border-slate-100 dark:border-slate-800 text-right text-slate-500 font-medium ${textClass}`}>
                                              {formatNumber(inv.gstAmount)}
                                          </td>
                                          <td className={`p-2 border-r border-slate-100 dark:border-slate-800 text-right font-bold text-red-500 dark:text-red-400 ${textClass}`}>
                                              {inv.balance > 0 ? `₹${formatNumber(inv.balance)}` : '-'}
                                          </td>
                                          <td className={`p-2 text-right font-bold text-emerald-600 dark:text-emerald-400 ${textClass}`}>
                                              {inv.advance > 0 ? `₹${formatNumber(inv.advance)}` : '-'}
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                          <tfoot className="bg-slate-200 dark:bg-slate-800 font-bold text-slate-900 dark:text-white sticky bottom-0 z-20 border-t-2 border-slate-300 dark:border-slate-600 text-sm">
                              <tr>
                                  <td className="p-2 sticky left-0 bg-slate-200 dark:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></td>
                                  <td colSpan={3} className="p-2 text-right border-r border-slate-300 dark:border-slate-600 uppercase text-slate-600 dark:text-slate-400">
                                      Grand Total
                                  </td>
                                  <td className="p-2 text-center border-r border-slate-300 dark:border-slate-600">{totals.qty}</td>
                                  <td className="p-2 text-right border-r border-slate-300 dark:border-slate-600">₹{formatNumber(totals.billTotal)}</td>
                                  <td className="p-2 text-right border-r border-slate-300 dark:border-slate-600">₹{formatNumber(totals.payment)}</td>
                                  <td className="p-2 text-right border-r border-slate-300 dark:border-slate-600">₹{formatNumber(totals.gst)}</td>
                                  <td className="p-2 text-right border-r border-slate-300 dark:border-slate-600 text-red-600">₹{formatNumber(totals.balance)}</td>
                                  <td className="p-2 text-right text-emerald-600">₹{formatNumber(totals.advance)}</td>
                              </tr>
                          </tfoot>
                      </table>
                  </div>
              </div>
          )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30">
          <button 
            onClick={handleCreateNew}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all border-2 border-white dark:border-slate-800"
          >
              <Plus size={24} strokeWidth={3} />
          </button>
      </div>
    </div>
  );
};