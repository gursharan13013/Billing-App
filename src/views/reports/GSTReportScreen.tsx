import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Download, Calendar, ArrowUpRight, ArrowDownLeft, FileText, CheckCircle2 } from 'lucide-react';
import { billingService } from '../../services/billingService';
import { Invoice, TransactionType, Language } from '../../core/types/';
import { motion, AnimatePresence } from 'motion/react';

interface GSTReportScreenProps {
  onBack: () => void;
  language?: Language;
}

interface GSTEntry {
  id: string;
  date: string;
  invoiceNo: string;
  partyName: string;
  gstin: string;
  totalAmount: number;
  taxable: number;
  taxAmt: number;
  type: TransactionType;
}

export const GSTReportScreen: React.FC<GSTReportScreenProps> = ({ onBack, language }) => {
  const [activeTab, setActiveTab] = useState<'GSTR-1' | 'GSTR-2' | 'GSTR-3B'>('GSTR-1');
  const [loading, setLoading] = useState(false);
  const [gstEntries, setGstEntries] = useState<GSTEntry[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocalDateString().slice(0, 7)); // YYYY-MM

  const isHi = language === 'hi';

  // Dynamic Bilingual Localization Dictionary Data Object
  const t = {
    title: isHi ? 'जीएसटी रिपोर्ट्स' : 'GST REPORTS',
    subtitle: isHi ? 'जीएसटीआर-1 / जीएसटीआर-2 / जीएसटीआर-3बी' : 'GSTR-1 / GSTR-2 / GSTR-3B',
    taxableVal: isHi ? 'करयोग्य मूल्य' : 'Taxable Value',
    totalTax: isHi ? 'कुल कर' : 'Total Tax',
    totalAmount: isHi ? 'कुल राशि' : 'Total Amount',
    dateInv: isHi ? 'तारीख / इनवॉइस नंबर' : 'Date / Inv No',
    party: isHi ? 'पार्टी' : 'Party',
    taxable: isHi ? 'करयोग्य' : 'Taxable',
    taxTotal: isHi ? 'कर / कुल' : 'Tax / Total',
    noTrans: isHi ? 'कोई लेनदेन नहीं मिला' : 'No transactions found for',
    outward: isHi ? 'जावक आपूर्ति (बिक्री)' : 'Outward Supplies (Sales)',
    inward: isHi ? 'पात्र आईटीसी (खरीद)' : 'Eligible ITC (Purchases)',
    netPayable: isHi ? 'शुद्ध देय कर' : 'Net Tax Payable',
    toPay: isHi ? 'आपको भुगतान करना है' : 'You have to pay',
    toCredit: isHi ? 'आपका क्रेडिट शेष है' : 'You have credit of',
    noDataDownload: isHi ? 'डाउनलोड करने के लिए कोई डेटा नहीं है' : 'No data to download'
  };

  useEffect(() => {
    const detectDataMonth = async () => {
      const sales = await billingService.getInvoices('Sale');
      if (sales.length > 0) {
        sales.sort((a, b) => Date.fromLocalDateString(b.date).getTime() - Date.fromLocalDateString(a.date).getTime());
        setSelectedMonth(sales[0].date.slice(0, 7));
      } else {
        const purchases = await billingService.getInvoices('Purchase');
        if (purchases.length > 0) {
          purchases.sort((a, b) => Date.fromLocalDateString(b.date).getTime() - Date.fromLocalDateString(a.date).getTime());
          setSelectedMonth(purchases[0].date.slice(0, 7));
        }
      }
    };
    detectDataMonth();
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    let types: TransactionType[] = [];
    if (activeTab === 'GSTR-1') types = ['Sale', 'Sale Return'];
    else if (activeTab === 'GSTR-2') types = ['Purchase', 'Purchase Return'];
    else types = ['Sale', 'Purchase', 'Sale Return', 'Purchase Return'];

    const allPromises = types.map(t => billingService.getInvoices(t));
    const results = await Promise.all(allPromises);
    const flatInvoices = results.flat();
    const monthInvoices = flatInvoices.filter(inv => inv.date.startsWith(selectedMonth));

    const processed: GSTEntry[] = monthInvoices.map(inv => {
      const isReturn = inv.type.includes('Return');
      let taxableValue = 0;
      let taxAmount = 0;

      if (inv.items && inv.items.length > 0) {
        inv.items.forEach(item => {
          const gross = item.qty * item.rate;
          const discount = gross * (item.discountPercent / 100);
          const subTotal = gross - discount;

          if (item.taxType === 'Excluded') {
            taxableValue += subTotal;
            taxAmount += subTotal * (item.taxPercent / 100);
          } else {
            const base = subTotal / (1 + (item.taxPercent / 100));
            taxableValue += base;
            taxAmount += subTotal - base;
          }
        });
      } else {
        const assumedRate = 18; 
        taxableValue = inv.totalAmount / (1 + assumedRate / 100);
        taxAmount = inv.totalAmount - taxableValue;
      }

      if (isReturn) {
        taxableValue = -taxableValue;
        taxAmount = -taxAmount;
      }

      return {
        id: inv.id,
        date: inv.date,
        invoiceNo: inv.invoiceNo,
        partyName: inv.partyName,
        gstin: 'URD', 
        totalAmount: isReturn ? -inv.totalAmount : inv.totalAmount,
        taxable: taxableValue,
        taxAmt: taxAmount,
        type: inv.type
      };
    });

    setGstEntries(processed);
    setLoading(false);
  };

  const totals = useMemo(() => {
    return gstEntries.reduce((acc, curr) => ({
      taxable: acc.taxable + (curr.taxable || 0),
      taxAmt: acc.taxAmt + (curr.taxAmt || 0),
      total: acc.total + (curr.totalAmount || 0)
    }), { taxable: 0, taxAmt: 0, total: 0 });
  }, [gstEntries]);

  const downloadExcel = () => {
    if (gstEntries.length === 0) {
      alert(t.noDataDownload);
      return;
    }

    const headers = ['Date', 'Invoice No', 'Party Name', 'GSTIN', 'Type', 'Taxable Value', 'Tax Amount', 'Total Amount'];
    const rows = gstEntries.map(entry => [
      entry.date,
      entry.invoiceNo,
      `"${entry.partyName.replace(/"/g, '""')}"`,
      entry.gstin,
      entry.type,
      (entry.taxable || 0).toFixed(2),
      (entry.taxAmt || 0).toFixed(2),
      (entry.totalAmount || 0).toFixed(2)
    ]);

    rows.push([
      '', '', 'TOTAL', '', '', 
      (totals.taxable || 0).toFixed(2), 
      (totals.taxAmt || 0).toFixed(2), 
      (totals.total || 0).toFixed(2)
    ]);

    const csvString = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeTab}_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderGSTR1_2 = () => {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3.5 p-4 bg-[var(--bg-card)] border-b border-[var(--border-ui)]">
          <div className="bg-[var(--brand-light)] p-3 rounded-xl border border-[var(--brand-primary)]/10">
            <p className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-wider">{t.taxableVal}</p>
            <p className="text-base font-bold text-[var(--text-main)] mt-0.5">₹{Math.abs(totals.taxable).toFixed(2)}</p>
          </div>
          <div className="bg-[var(--brand-light)] p-3 rounded-xl border border-[var(--brand-primary)]/10">
            <p className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-wider">{t.totalTax}</p>
            <p className="text-base font-bold text-[var(--text-main)] mt-0.5">₹{Math.abs(totals.taxAmt).toFixed(2)}</p>
          </div>
          <div className="bg-[var(--brand-light)] p-3 rounded-xl border border-[var(--brand-primary)]/10">
            <p className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-wider">{t.totalAmount}</p>
            <p className="text-base font-bold text-[var(--text-main)] mt-0.5">₹{Math.abs(totals.total).toFixed(2)}</p>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 bg-[var(--bg-app)] p-3.5 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest border-b border-[var(--border-ui)]">
          <div className="col-span-3 pl-2">{t.dateInv}</div>
          <div className="col-span-4">{t.party}</div>
          <div className="col-span-2 text-right">{t.taxable}</div>
          <div className="col-span-3 text-right pr-2">{t.taxTotal}</div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg-app)] custom-scrollbar">
          {gstEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-24 text-[var(--text-secondary)]/60">
              <FileText size={40} className="mb-2 opacity-50" />
              <p className="text-xs font-bold uppercase tracking-wider">{t.noTrans} {selectedMonth}</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-ui)]/40 bg-[var(--bg-card)]">
              {gstEntries.map(entry => (
                <div key={entry.id} className="grid grid-cols-12 p-3.5 items-center hover:bg-[var(--bg-app)] transition-colors">
                  <div className="col-span-3 pl-2">
                    <p className="text-xs font-bold text-[var(--text-main)]">{entry.invoiceNo}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{entry.date}</p>
                  </div>
                  <div className="col-span-4 pr-1">
                    <p className="text-xs font-bold text-[var(--text-main)] truncate">{entry.partyName}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">GST: {entry.gstin}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-xs font-medium text-[var(--text-secondary)]">₹{Math.abs(entry.taxable).toFixed(2)}</p>
                  </div>
                  <div className="col-span-3 text-right pr-2">
                    <p className="text-xs font-bold text-[var(--text-main)]">₹{Math.abs(entry.totalAmount).toFixed(2)}</p>
                    <p className="text-[10px] text-[var(--money-in)] font-bold mt-0.5">Tx: ₹{Math.abs(entry.taxAmt).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderGSTR3B = () => {
    const outward = gstEntries.filter(e => e.type === 'Sale' || e.type === 'Sale Return');
    const inward = gstEntries.filter(e => e.type === 'Purchase' || e.type === 'Purchase Return');
    
    const outTotals = calculateTotals(outward);
    const inTotals = calculateTotals(inward);
    const taxPayable = outTotals.taxAmt - inTotals.taxAmt;

    const calculateTotalsLocal = (entries: GSTEntry[]) => {
      return entries.reduce((acc, curr) => ({
        taxable: acc.taxable + (curr.taxable || 0),
        taxAmt: acc.taxAmt + (curr.taxAmt || 0),
        total: acc.total + (curr.totalAmount || 0)
      }), { taxable: 0, taxAmt: 0, total: 0 });
    };

    return (
      <div className="flex-1 overflow-y-auto p-4 bg-[var(--bg-app)] space-y-4 custom-scrollbar">
        {/* Output Tax Card */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-ui)] overflow-hidden shadow-sm">
          <div className="bg-[var(--brand-light)] p-3 border-b border-[var(--brand-primary)]/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-[var(--brand-primary)]/20 p-1.5 rounded-lg text-[var(--brand-primary)]"><ArrowUpRight size={18} /></div>
              <h3 className="font-bold text-[var(--text-main)] text-sm">{t.outward}</h3>
            </div>
            <span className="text-[10px] font-bold bg-[var(--bg-card)] px-2.5 py-0.5 rounded text-[var(--brand-primary)] border border-[var(--border-ui)]">3.1</span>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t.taxableVal}</p>
              <p className="text-base font-bold text-[var(--text-main)] mt-0.5">₹{Math.abs(outTotals.taxable).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t.totalTax}</p>
              <p className="text-base font-bold text-[var(--brand-primary)] mt-0.5">₹{Math.abs(outTotals.taxAmt).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Input Tax Card */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-ui)] overflow-hidden shadow-sm">
          <div className="bg-emerald-500/10 p-3 border-b border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500/20 p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400"><ArrowDownLeft size={18} /></div>
              <h3 className="font-bold text-[var(--text-main)] text-sm">{t.inward}</h3>
            </div>
            <span className="text-[10px] font-bold bg-[var(--bg-card)] px-2.5 py-0.5 rounded text-emerald-600 border border-[var(--border-ui)]">4</span>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t.taxableVal}</p>
              <p className="text-base font-bold text-[var(--text-main)] mt-0.5">₹{Math.abs(inTotals.taxable).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">ITC Available</p>
              <p className="text-base font-bold text-[var(--money-in)] mt-0.5">₹{Math.abs(inTotals.taxAmt).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Net Payable Card */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-ui)] overflow-hidden shadow-md">
          <div className="p-4 border-b border-[var(--border-ui)] flex justify-between items-center bg-[var(--bg-app)]">
            <h3 className="font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[var(--money-in)]" /> {t.netPayable}
            </h3>
          </div>
          <div className="p-6 text-center">
            <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider mb-1">{taxPayable >= 0 ? t.toPay : t.toCredit}</p>
            <h2 className={`text-3xl font-black tracking-tight ${taxPayable >= 0 ? 'text-[var(--money-out)]' : 'text-[var(--money-in)]'}`}>
              ₹{Math.abs(taxPayable).toFixed(2)}
            </h2>
          </div>
        </div>
      </div>
    );
  };

  const calculateTotals = (entries: GSTEntry[]) => {
    return entries.reduce((acc, curr) => ({
      taxable: acc.taxable + (curr.taxable || 0),
      taxAmt: acc.taxAmt + (curr.taxAmt || 0),
      total: acc.total + (curr.totalAmount || 0)
    }), { taxable: 0, taxAmt: 0, total: 0 });
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', ease: [0.25, 1, 0.5, 1], duration: 0.35 }}
      style={{ willChange: 'transform' }}
      className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)] relative overflow-hidden transition-colors"
    >
      {/* Premium Top Header */}
      <header className="bg-[var(--bg-card)] p-4 flex items-center justify-between shadow-sm shrink-0 border-b border-[var(--border-ui)] pt-[max(env(safe-area-inset-top),48px)] transition-colors">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-secondary)] hover:text-[var(--text-main)] p-2 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90"
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-main)] leading-tight">
              {t.title}
            </h1>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] tracking-widest mt-0.5 opacity-80 uppercase">
              {t.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[var(--bg-app)] text-[var(--text-main)] border border-[var(--border-ui)] rounded-lg px-3 py-2.5 text-xs font-bold outline-none focus-active-light dark:focus-active-dark min-h-[44px]"
          />
          <button 
            onClick={downloadExcel}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white p-2 rounded-lg transition-all flex items-center justify-center min-w-[44px] min-h-[44px] active:scale-95 shadow-sm cursor-pointer"
            title="Download Report"
          >
            <Download size={18} />
          </button>
        </div>
      </header>

      {/* Tabs segment controller */}
      <div className="p-4 pb-0">
        <div className="flex p-1 bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl shadow-xs">
          {(['GSTR-1', 'GSTR-2', 'GSTR-3B'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-all min-h-[38px] ${activeTab === tab ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0 mt-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]"></div>
          </div>
        ) : (
          activeTab === 'GSTR-3B' ? renderGSTR3B() : renderGSTR1_2()
        )}
      </div>
    </motion.div>
  );
};