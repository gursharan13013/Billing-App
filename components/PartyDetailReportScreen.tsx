import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Party, TransactionType, Invoice, PaymentRecord } from '../types';
import { billingService } from '../src/services/billingService';


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

  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });

  // Filter invoices based on dateFilter
  const filteredInvoices = invoices.filter(inv => {
     const d = new Date(inv.date);
     if (dateFilter === 'Today') {
         return d.toDateString() === todayStr;
     } else if (dateFilter === 'Month') {
         return d.getMonth() === currentMonthNum && d.getFullYear() === currentYearNum;
     } else if (dateFilter === 'Year') {
         return d.getFullYear() === currentYearNum;
     }
     return true;
  });

  // Since we filter invoices, we also need to know the total payments up to this point or just calculate overall FIFO and then filter the display?
  // Usually, "Payment" against a bill is calculated from overall status.
  // Let's do overall FIFO allocation to find the payment/balance of EACH invoice, THEN filter to show only the ones in the current date range!

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
      let advanceForThisBill = 0;
      
      // Check if there are specific payments linked to this invoice (future proofing)
      // Actually we are just doing FIFO.
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

  // Apply any leftover advance to the very last invoice in the FULL list
  if (remainingPayments > 0 && enrichedInvoices.length > 0) {
      enrichedInvoices[enrichedInvoices.length - 1].advance = remainingPayments;
  }

  // Now apply date filter
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
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="bg-[#3b5998] text-white p-3 flex items-center shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack} className="mr-3 p-1 active:scale-95 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-medium">{party ? party.name : 'All'}</h1>
        </div>
        <button className="p-2 active:scale-95">
          <Calendar size={22} />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex p-2 gap-2 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
          <button 
             onClick={() => setDateFilter('Today')}
             className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${dateFilter === 'Today' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
          >
             Today
          </button>
          <button 
             onClick={() => setDateFilter('Month')}
             className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${dateFilter === 'Month' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
          >
             {currentMonthName}
          </button>
          <button 
             onClick={() => setDateFilter('Year')}
             className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${dateFilter === 'Year' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
          >
             {currentYearNum}
          </button>
      </div>

      {/* Table Area - Horizontal scrollable block */}
      <div className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar relative bg-white">
         <table className="w-full min-w-[700px] text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10 border-b border-slate-200">
                <tr>
                    <th className="p-3 text-[15px] font-bold text-black border-r border-slate-200">Bill No.</th>
                    <th className="p-3 text-[15px] font-bold text-black border-r border-slate-200">Items</th>
                    <th className="p-3 text-[15px] font-bold text-black border-r border-slate-200">Total Qty</th>
                    <th className="p-3 text-[15px] font-bold text-black border-r border-slate-200">Bill Total</th>
                    <th className="p-3 text-[15px] font-bold text-black border-r border-slate-200">Payment</th>
                    <th className="p-3 text-[15px] font-bold text-black border-r border-slate-200">Balance</th>
                    <th className="p-3 text-[15px] font-bold text-black">Advance</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/20">
                {displayInvoices.map((inv, idx) => (
                    <tr key={inv.id} className={`${idx % 2 === 0 ? 'bg-[#6EE76E]' : 'bg-[#5FE15F]'}`}>
                        <td className="p-3 text-[15px] text-black border-r border-white/30">{inv.invoiceNo}</td>
                        <td className="p-3 text-[15px] text-black border-r border-white/30">{inv.itemsCount}</td>
                        <td className="p-3 text-[15px] text-black border-r border-white/30">{inv.totalQty}</td>
                        <td className="p-3 text-[15px] text-black border-r border-white/30">{inv.billTotal.toFixed(2)}</td>
                        <td className="p-3 text-[15px] text-black border-r border-white/30">{inv.payment.toFixed(2)}</td>
                        <td className="p-3 text-[15px] text-black border-r border-white/30">{inv.balance.toFixed(2)}</td>
                        <td className="p-3 text-[15px] text-black">{inv.advance > 0 ? inv.advance.toFixed(2) : ''}</td>
                    </tr>
                ))}
                {displayInvoices.length === 0 && !loading && (
                    <tr className="bg-white">
                        <td colSpan={7} className="p-6 text-center text-slate-500">No records found for {dateFilter}</td>
                    </tr>
                )}
            </tbody>
            <tfoot className="sticky bottom-0 bg-[#3b5998] text-white z-10 font-bold">
                <tr>
                    <td colSpan={2} className="p-3 text-[15px] border-r border-[#3b5998]/20 whitespace-nowrap">Bills : {displayInvoices.length}</td>
                    <td className="p-3 text-[15px] border-r border-[#3b5998]/20">{totals.qty}</td>
                    <td className="p-3 text-[15px] border-r border-[#3b5998]/20">{totals.billTotal.toFixed(2)}</td>
                    <td className="p-3 text-[15px] border-r border-[#3b5998]/20">{totals.payment.toFixed(2)}</td>
                    <td className="p-3 text-[15px] border-r border-[#3b5998]/20">{totals.balance.toFixed(2)}</td>
                    <td className="p-3 text-[15px]">{totals.advance > 0 ? totals.advance.toFixed(2) : ''}</td>
                </tr>
            </tfoot>
         </table>
      </div>
    </div>
  );
};
