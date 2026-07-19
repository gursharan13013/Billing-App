import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Party, TransactionType, Invoice, PaymentRecord } from '../../../core/types/';
import { billingService } from '../../../services/billingService';

interface PartyDetailReportScreenProps {
  onBack: () => void;
  party: Party | null; // null means "All"
  type: TransactionType;
}

export const PartyDetailReportScreen: React.FC<PartyDetailReportScreenProps> = ({ onBack, party, type }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'Today' | 'Month' | 'Year'>('Month');

  const lang = (localStorage.getItem('language') || 'en') as 'en' | 'hi';
  const isHi = lang === 'hi';
  const t = {
    all: isHi ? 'सभी' : 'All',
    today: isHi ? 'आज' : 'Today',
    billNo: isHi ? 'बिल नंबर' : 'Bill No.',
    items: isHi ? 'सामग्रियां' : 'Items',
    totalQty: isHi ? 'कुल मात्रा' : 'Total Qty',
    billTotal: isHi ? 'बिल कुल' : 'Bill Total',
    payment: isHi ? 'भुगतान' : 'Payment',
    balance: isHi ? 'शेष राशि' : 'Balance',
    advance: isHi ? 'अग्रिम' : 'Advance',
    noRecords: (filter: string) => isHi ? `${filter} के लिए कोई रिकॉर्ड नहीं मिला` : `No records found for ${filter}`,
    bills: isHi ? 'बिल' : 'Bills'
  };

  useEffect(() => {
    loadData();
  }, [type, party]);

  const loadData = async () => {
    try {
      let invs = await billingService.getInvoices(type);
      
      const paymentType = type.includes('Sale') ? 'Receipt' : 'Payment';
      const allPayments = await billingService.getAllPayments(paymentType);
      
      if (party) {
         invs = invs.filter(i => i.partyId === party.id);
      }
      
      let relevantPayments = allPayments;

      if (party) {
         relevantPayments = relevantPayments.filter(p => p.partyId === party.id);
      }

      setInvoices(invs.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setPayments(relevantPayments);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toDateString();
  const currentMonthNum = new Date().getMonth();
  const currentYearNum = new Date().getFullYear();

  const currentMonthName = new Date().toLocaleString(isHi ? 'hi-IN' : 'en-US', { month: 'long' });

  // FIFO allocation to calculate payment / balance of each invoice
  let remainingPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  
  const enrichedInvoices = invoices.map(inv => {
      let itemsCount = 0;
      let totalQty = 0;
      if (inv.items) {
          itemsCount = inv.items.length;
          totalQty = inv.items.reduce((s, i) => s + i.qty, 0);
      }
      const billTotal = inv.totalAmount;
      
      let paymentForThisBill = 0;
      
      if (remainingPayments >= billTotal) {
          paymentForThisBill = billTotal;
          remainingPayments -= billTotal;
      } else {
          paymentForThisBill = remainingPayments;
          remainingPayments = 0;
      }
      
      const balance = billTotal - paymentForThisBill;

      return {
          ...inv,
          itemsCount,
          totalQty,
          billTotal,
          payment: paymentForThisBill,
          balance: balance,
          advance: 0
      };
  });

  if (remainingPayments > 0 && enrichedInvoices.length > 0) {
      enrichedInvoices[enrichedInvoices.length - 1].advance = remainingPayments;
  }

  // Filter based on dateFilter
  const displayInvoices = enrichedInvoices.filter(inv => {
     const d = new Date(inv.date);
     if (dateFilter === 'Today') return d.toDateString() === todayStr;
     if (dateFilter === 'Month') return d.getMonth() === currentMonthNum && d.getFullYear() === currentYearNum;
     if (dateFilter === 'Year') return d.getFullYear() === currentYearNum;
     return true;
  });

  const totals = displayInvoices.reduce((acc, inv) => {
      acc.qty += inv.totalQty;
      acc.billTotal += inv.billTotal;
      acc.payment += inv.payment;
      acc.balance += inv.balance;
      acc.advance += inv.advance;
      return acc;
  }, { qty: 0, billTotal: 0, payment: 0, balance: 0, advance: 0 });

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-app)] text-[var(--text-main)] pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Header */}
      <header className="bg-[var(--bg-card)] border-b border-[var(--border-ui)] text-[var(--text-main)] p-4 pt-[max(env(safe-area-inset-top),48px)] flex items-center gap-3 shadow-sm shrink-0">
        <button onClick={onBack} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors mr-2">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black truncate tracking-tight">{party ? party.name : t.all}</h1>
        </div>
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <Calendar size={22} />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex p-2 gap-2 border-b border-[var(--border-ui)] shrink-0 bg-[var(--bg-card)]">
          <button 
             onClick={() => setDateFilter('Today')}
             className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${dateFilter === 'Today' ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'bg-[var(--bg-app)] text-[var(--text-secondary)] border border-[var(--border-ui)]'}`}
          >
             {t.today}
          </button>
          <button 
             onClick={() => setDateFilter('Month')}
             className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${dateFilter === 'Month' ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'bg-[var(--bg-app)] text-[var(--text-secondary)] border border-[var(--border-ui)]'}`}
          >
             {currentMonthName}
          </button>
          <button 
             onClick={() => setDateFilter('Year')}
             className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${dateFilter === 'Year' ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'bg-[var(--bg-app)] text-[var(--text-secondary)] border border-[var(--border-ui)]'}`}
          >
             {currentYearNum}
          </button>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar relative bg-[var(--bg-app)]">
         <table className="w-full min-w-[700px] text-left border-collapse">
            <thead className="sticky top-0 bg-[var(--bg-card)] text-[var(--text-main)] z-10 border-b border-[var(--border-ui)]">
                <tr>
                    <th className="p-3 text-sm font-black border-r border-[var(--border-ui)]">{t.billNo}</th>
                    <th className="p-3 text-sm font-black border-r border-[var(--border-ui)]">{t.items}</th>
                    <th className="p-3 text-sm font-black border-r border-[var(--border-ui)]">{t.totalQty}</th>
                    <th className="p-3 text-sm font-black border-r border-[var(--border-ui)]">{t.billTotal}</th>
                    <th className="p-3 text-sm font-black border-r border-[var(--border-ui)]">{t.payment}</th>
                    <th className="p-3 text-sm font-black border-r border-[var(--border-ui)]">{t.balance}</th>
                    <th className="p-3 text-sm font-black">{t.advance}</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-ui)]">
                {displayInvoices.map((inv, idx) => (
                    <tr key={inv.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-ui)] font-semibold">{inv.invoiceNo}</td>
                        <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-ui)] font-semibold">{inv.itemsCount}</td>
                        <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-ui)] font-semibold">{inv.totalQty}</td>
                        <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-ui)] font-semibold">₹{inv.billTotal.toFixed(2)}</td>
                        <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-ui)] font-semibold">₹{inv.payment.toFixed(2)}</td>
                        <td className="p-3 text-sm text-[var(--text-main)] border-r border-[var(--border-ui)] font-semibold">₹{inv.balance.toFixed(2)}</td>
                        <td className="p-3 text-sm text-[var(--text-main)] font-semibold">{inv.advance > 0 ? `₹${inv.advance.toFixed(2)}` : ''}</td>
                    </tr>
                ))}
                {displayInvoices.length === 0 && !loading && (
                    <tr className="bg-[var(--bg-card)]">
                        <td colSpan={7} className="p-6 text-center text-[var(--text-secondary)] font-medium">{t.noRecords(dateFilter)}</td>
                    </tr>
                )}
            </tbody>
            <tfoot className="sticky bottom-0 bg-[var(--brand-primary)] text-white z-10 font-black">
                <tr>
                    <td colSpan={2} className="p-3 text-sm border-r border-white/10 whitespace-nowrap">{t.bills} : {displayInvoices.length}</td>
                    <td className="p-3 text-sm border-r border-white/10">{totals.qty}</td>
                    <td className="p-3 text-sm border-r border-white/10">₹{totals.billTotal.toFixed(2)}</td>
                    <td className="p-3 text-sm border-r border-white/10">₹{totals.payment.toFixed(2)}</td>
                    <td className="p-3 text-sm border-r border-white/10">₹{totals.balance.toFixed(2)}</td>
                    <td className="p-3 text-sm">{totals.advance > 0 ? `₹${totals.advance.toFixed(2)}` : ''}</td>
                </tr>
            </tfoot>
         </table>
      </div>
    </div>
  );
};
