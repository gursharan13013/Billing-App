import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Calendar, ArrowUpRight, ArrowDownLeft, FileText, CheckCircle2 } from 'lucide-react';
import { billingService } from '../src/services/billingService';
import { Invoice, TransactionType } from '../types';


interface GSTReportScreenProps {
  onBack: () => void;
}

// Helper interface for display
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

export const GSTReportScreen: React.FC<GSTReportScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'GSTR-1' | 'GSTR-2' | 'GSTR-3B'>('GSTR-1');
  const [loading, setLoading] = useState(false);
  const [gstEntries, setGstEntries] = useState<GSTEntry[]>([]);
  
  // Initialize with current month, but we will auto-detect data month
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocalDateString().slice(0, 7)); // YYYY-MM

  // Auto-detect the month with data on first load
  useEffect(() => {
      const detectDataMonth = async () => {
          // Check for any Sale or Purchase to guess the month
          const sales = await billingService.getInvoices('Sale');
          if (sales.length > 0) {
              // Sort descending to get latest
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
    // Determine types based on tab
    let types: TransactionType[] = [];
    if (activeTab === 'GSTR-1') types = ['Sale', 'Sale Return'];
    else if (activeTab === 'GSTR-2') types = ['Purchase', 'Purchase Return'];
    else types = ['Sale', 'Purchase', 'Sale Return', 'Purchase Return']; // GSTR-3B needs all

    // Fetch all relevant invoices
    const allPromises = types.map(t => billingService.getInvoices(t));
    const results = await Promise.all(allPromises);
    const flatInvoices = results.flat();

    // Filter by month
    const monthInvoices = flatInvoices.filter(inv => inv.date.startsWith(selectedMonth));

    // Convert to GST Entries with Accurate Calculation
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
                  // Included Tax Logic: Tax = Total - (Total / (1 + rate/100))
                  const base = subTotal / (1 + (item.taxPercent / 100));
                  taxableValue += base;
                  taxAmount += subTotal - base;
              }
          });
      } else {
          // Fallback if no items (should rare with new data)
          const assumedRate = 18; 
          taxableValue = inv.totalAmount / (1 + assumedRate / 100);
          taxAmount = inv.totalAmount - taxableValue;
      }

      // Handle Returns (Negative Values)
      if (isReturn) {
          taxableValue = -taxableValue;
          taxAmount = -taxAmount;
      }

      return {
        id: inv.id,
        date: inv.date,
        invoiceNo: inv.invoiceNo,
        partyName: inv.partyName,
        gstin: 'URD', // Ideally fetch party GSTIN, keeping simple for list
        totalAmount: isReturn ? -inv.totalAmount : inv.totalAmount,
        taxable: taxableValue,
        taxAmt: taxAmount,
        type: inv.type
      };
    });

    setGstEntries(processed);
    setLoading(false);
  };

  const calculateTotals = (entries: GSTEntry[]) => {
    return entries.reduce((acc, curr) => ({
      taxable: acc.taxable + (curr.taxable || 0),
      taxAmt: acc.taxAmt + (curr.taxAmt || 0),
      total: acc.total + (curr.totalAmount || 0)
    }), { taxable: 0, taxAmt: 0, total: 0 });
  };

  const downloadExcel = () => {
    if (gstEntries.length === 0) {
        alert("No data to download");
        return;
    }

    const headers = ['Date', 'Invoice No', 'Party Name', 'GSTIN', 'Type', 'Taxable Value', 'Tax Amount', 'Total Amount'];
    
    const rows = gstEntries.map(entry => [
        entry.date,
        entry.invoiceNo,
        `"${entry.partyName.replace(/"/g, '""')}"`, // Handle quotes in CSV
        entry.gstin,
        entry.type,
        (entry.taxable || 0).toFixed(2),
        (entry.taxAmt || 0).toFixed(2),
        (entry.totalAmount || 0).toFixed(2)
    ]);

    // Add Totals Row at the bottom
    const totals = calculateTotals(gstEntries);
    rows.push([
        '', '', 'TOTAL', '', '', 
        (totals.taxable || 0).toFixed(2), 
        (totals.taxAmt || 0).toFixed(2), 
        (totals.total || 0).toFixed(2)
    ]);

    const csvString = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    // Create Blob with BOM for correct Excel encoding
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
    const totals = calculateTotals(gstEntries);
    
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-white border-b border-gray-200">
           <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
              <p className="text-[10px] font-bold text-blue-500 uppercase">Taxable Value</p>
              <p className="text-lg font-bold text-blue-700">₹{Math.abs(totals.taxable).toFixed(0)}</p>
           </div>
           <div className="bg-purple-50 p-2 rounded-lg border border-purple-100">
              <p className="text-[10px] font-bold text-purple-500 uppercase">Total Tax</p>
              <p className="text-lg font-bold text-purple-700">₹{Math.abs(totals.taxAmt).toFixed(0)}</p>
           </div>
           <div className="bg-green-50 p-2 rounded-lg border border-green-100">
              <p className="text-[10px] font-bold text-green-500 uppercase">Total Amount</p>
              <p className="text-lg font-bold text-green-700">₹{Math.abs(totals.total).toFixed(0)}</p>
           </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 bg-gray-100 p-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
            <div className="col-span-3 pl-2">Date / Inv No</div>
            <div className="col-span-4">Party</div>
            <div className="col-span-2 text-right">Taxable</div>
            <div className="col-span-3 text-right pr-2">Tax / Total</div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
            {gstEntries.length === 0 ? (
               <div className="flex flex-col items-center justify-center pt-20 text-gray-400">
                   <FileText size={40} className="mb-2 opacity-50" />
                   <p className="text-sm">No transactions found for {selectedMonth}</p>
               </div>
            ) : (
               <div className="divide-y divide-gray-100 bg-white">
                  {gstEntries.map(entry => (
                     <div key={entry.id} className="grid grid-cols-12 p-3 items-center hover:bg-gray-50">
                        <div className="col-span-3 pl-2">
                           <p className="text-xs font-bold text-gray-800">{entry.invoiceNo}</p>
                           <p className="text-[10px] text-gray-400">{entry.date}</p>
                        </div>
                        <div className="col-span-4 pr-1">
                           <p className="text-xs font-semibold text-gray-700 truncate">{entry.partyName}</p>
                           <p className="text-[10px] text-gray-400 truncate">GST: {entry.gstin}</p>
                        </div>
                        <div className="col-span-2 text-right">
                           <p className="text-xs font-medium text-gray-600">₹{Math.abs(entry.taxable).toFixed(0)}</p>
                        </div>
                        <div className="col-span-3 text-right pr-2">
                           <p className="text-xs font-bold text-gray-800">₹{Math.abs(entry.totalAmount).toFixed(0)}</p>
                           <p className="text-[10px] text-green-600 font-medium">Tx: {Math.abs(entry.taxAmt).toFixed(0)}</p>
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
    // Split into Outward (Sales) and Inward (Purchases)
    const outward = gstEntries.filter(e => e.type === 'Sale' || e.type === 'Sale Return');
    const inward = gstEntries.filter(e => e.type === 'Purchase' || e.type === 'Purchase Return');
    
    const outTotals = calculateTotals(outward);
    const inTotals = calculateTotals(inward);

    const taxPayable = outTotals.taxAmt - inTotals.taxAmt;

    return (
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
          {/* Output Tax Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="bg-blue-50 p-3 border-b border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600"><ArrowUpRight size={18} /></div>
                   <h3 className="font-bold text-gray-800">Outward Supplies (Sales)</h3>
                </div>
                <span className="text-xs font-bold bg-white px-2 py-0.5 rounded text-blue-600 border border-blue-200">3.1</span>
             </div>
             <div className="p-4 grid grid-cols-2 gap-4">
                 <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Taxable Value</p>
                    <p className="text-lg font-bold text-gray-800">₹{Math.abs(outTotals.taxable).toFixed(2)}</p>
                 </div>
                 <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Total Tax</p>
                    <p className="text-lg font-bold text-blue-600">₹{Math.abs(outTotals.taxAmt).toFixed(2)}</p>
                 </div>
             </div>
          </div>

          {/* Input Tax Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="bg-green-50 p-3 border-b border-green-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="bg-green-100 p-1.5 rounded-lg text-green-600"><ArrowDownLeft size={18} /></div>
                   <h3 className="font-bold text-gray-800">Eligible ITC (Purchases)</h3>
                </div>
                <span className="text-xs font-bold bg-white px-2 py-0.5 rounded text-green-600 border border-green-200">4</span>
             </div>
             <div className="p-4 grid grid-cols-2 gap-4">
                 <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Taxable Value</p>
                    <p className="text-lg font-bold text-gray-800">₹{Math.abs(inTotals.taxable).toFixed(2)}</p>
                 </div>
                 <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">ITC Available</p>
                    <p className="text-lg font-bold text-green-600">₹{Math.abs(inTotals.taxAmt).toFixed(2)}</p>
                 </div>
             </div>
          </div>

          {/* Net Payable Card */}
          <div className="bg-slate-800 text-white rounded-xl shadow-lg overflow-hidden">
             <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2">
                   <CheckCircle2 size={18} className="text-green-400" /> Net Tax Payable
                </h3>
             </div>
             <div className="p-6 text-center">
                 <p className="text-sm text-slate-300 mb-1">{taxPayable >= 0 ? 'You have to pay' : 'You have credit of'}</p>
                 <h2 className={`text-3xl font-extrabold ${taxPayable >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                    ₹{Math.abs(taxPayable).toFixed(2)}
                 </h2>
             </div>
          </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 pb-[max(env(safe-area-inset-bottom),0px)]">
       {/* Header */}
       <header className="bg-slate-800 text-white pt-4 pb-2 px-4 shadow-md z-10 pt-[max(env(safe-area-inset-top),48px)]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
             <button onClick={onBack}><ArrowLeft size={24} /></button>
             <div>
                 <h1 className="text-xl font-bold leading-none">GST REPORTS</h1>
                 <p className="text-xs text-slate-300 mt-1">GSTR-1 / GSTR-2 / GSTR-3B</p>
             </div>
          </div>
          <div className="flex gap-2">
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-700 text-white text-xs border border-slate-600 rounded px-2 py-1 outline-none focus:border-blue-500"
              />
              <button 
                onClick={downloadExcel}
                className="bg-green-600 p-1.5 rounded hover:bg-green-700 transition-colors active:scale-95"
                title="Download Report"
              >
                  <Download size={18} />
              </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-slate-700 rounded-lg">
           {(['GSTR-1', 'GSTR-2', 'GSTR-3B'] as const).map(tab => (
              <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white'}`}
              >
                  {tab}
              </button>
           ))}
        </div>
      </header>

      {/* Content */}
      {loading ? (
         <div className="flex-1 flex items-center justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
         </div>
      ) : (
         activeTab === 'GSTR-3B' ? renderGSTR3B() : renderGSTR1_2()
      )}
    </div>
  );
};