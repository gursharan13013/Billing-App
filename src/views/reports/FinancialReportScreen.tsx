import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, RefreshCw, Calendar, Download, ShieldAlert } from 'lucide-react';
import { billingService } from '../../services/billingService';
import { Party, Item, Invoice } from '../../core/types/';
import { useAuth } from '../../context/AuthContext';


interface FinancialReportScreenProps {
  onBack: () => void;
  reportType: 'TrialBalance' | 'ProfitLoss' | 'BalanceSheet';
}

// Helper types for Accounting Structure
interface AccountRow {
    name: string;
    amount: number;
    subRows?: AccountRow[];
    isTotal?: boolean;
    isHeading?: boolean;
}

interface FinancialData {
    trialBalance: { dr: AccountRow[], cr: AccountRow[], totalDr: number, totalCr: number };
    pl: { 
        expenses: AccountRow[], incomes: AccountRow[], 
        grossProfit: number, netProfit: number,
        totalExpense: number, totalIncome: number 
    };
    bs: {
        liabilities: AccountRow[], assets: AccountRow[],
        totalLiabilities: number, totalAssets: number
    }
}

export const FinancialReportScreen: React.FC<FinancialReportScreenProps> = ({ onBack, reportType }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinancialData | null>(null);
  const [asOnDate, setAsOnDate] = useState(new Date().toLocalDateString());

  useEffect(() => {
    if (currentUser?.role !== 'staff') {
      loadFinancials();
    }
  }, [asOnDate, currentUser]);

  if (currentUser?.role === 'staff') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-50 dark:bg-slate-950">
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 rounded-full text-amber-600 dark:text-amber-400 mb-4 animate-pulse">
          <ShieldAlert size={48} />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-white mb-2 font-mono">🔒 Access Restricted (प्रतिबंधित)</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed font-sans mb-6">
          सुरक्षा कारणों से, केवल अधिकृत व्यावसायिक व्यवस्थापक (Admin) ही वित्तीय रिपोर्ट्स देख सकते हैं।
        </p>
        <button 
          onClick={onBack}
          className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl shadow-sm transition-all text-xs"
        >
          Go Back / पीछे जाएं
        </button>
      </div>
    );
  }

  const loadFinancials = async () => {
    setLoading(true);
    try {
        const [parties, items] = await Promise.all([
            billingService.getAllParties(),
            billingService.getAllItems(),
        ]);

        // --- FETCH ALL INVOICES FOR TRADING ACCOUNTS ---
        const allSales = await billingService.getInvoices('Sale');
        const allPurchases = await billingService.getInvoices('Purchase');
        const allSaleReturns = await billingService.getInvoices('Sale Return');
        const allPurchaseReturns = await billingService.getInvoices('Purchase Return');

        // Calculate Gross Totals (Inclusive of Tax for TB balancing, as Party balance includes Tax)
        const totalSalesAmount = allSales.reduce((sum, i) => sum + i.totalAmount, 0);
        const totalPurchaseAmount = allPurchases.reduce((sum, i) => sum + i.totalAmount, 0);
        const totalSaleReturnAmount = allSaleReturns.reduce((sum, i) => sum + i.totalAmount, 0);
        const totalPurchaseReturnAmount = allPurchaseReturns.reduce((sum, i) => sum + i.totalAmount, 0);

        // Net for P&L
        const netSales = totalSalesAmount - totalSaleReturnAmount;
        const netPurchases = totalPurchaseAmount - totalPurchaseReturnAmount;

        // --- 1. TRIAL BALANCE CALCULATION ---
        const tbDr: AccountRow[] = [];
        const tbCr: AccountRow[] = [];
        let tbTotalDr = 0;
        let tbTotalCr = 0;

        // A. Add Parties (Assets/Liabilities/Expenses)
        parties.forEach(p => {
            if (p.currentBalance === 0) return;
            // Logic: +ve is Dr (Asset/Expense), -ve is Cr (Liability/Income)
            // Based on: Customer Dr (+), Supplier Cr (-)
            if (p.currentBalance > 0) {
                tbDr.push({ name: p.name, amount: p.currentBalance });
                tbTotalDr += p.currentBalance;
            } else {
                const amount = Math.abs(p.currentBalance);
                tbCr.push({ name: p.name, amount: amount });
                tbTotalCr += amount;
            }
        });

        // B. Add Trading Accounts (Sales/Purchase)
        // Purchase is Debit
        if (totalPurchaseAmount > 0) {
            tbDr.push({ name: 'Purchase Accounts', amount: totalPurchaseAmount });
            tbTotalDr += totalPurchaseAmount;
        }
        // Sales is Credit
        if (totalSalesAmount > 0) {
            tbCr.push({ name: 'Sales Accounts', amount: totalSalesAmount });
            tbTotalCr += totalSalesAmount;
        }
        // Sale Return is Debit (Reduces Sales Cr)
        if (totalSaleReturnAmount > 0) {
            tbDr.push({ name: 'Sales Return', amount: totalSaleReturnAmount });
            tbTotalDr += totalSaleReturnAmount;
        }
        // Purchase Return is Credit (Reduces Purchase Dr)
        if (totalPurchaseReturnAmount > 0) {
            tbCr.push({ name: 'Purchase Return', amount: totalPurchaseReturnAmount });
            tbTotalCr += totalPurchaseReturnAmount;
        }

        // C. Automatic Balancing (Diff in Opening Balances)
        // If Dr != Cr, it means opening balances were not fed via double entry journals.
        if (Math.abs(tbTotalDr - tbTotalCr) > 0.01) {
            const diff = tbTotalDr - tbTotalCr;
            if (diff > 0) {
                // Dr is higher, put diff on Cr side
                tbCr.push({ name: 'Diff. in Opening Balances', amount: diff });
                tbTotalCr += diff;
            } else {
                // Cr is higher, put diff on Dr side
                tbDr.push({ name: 'Diff. in Opening Balances', amount: Math.abs(diff) });
                tbTotalDr += Math.abs(diff);
            }
        }

        // --- 2. PROFIT & LOSS CALCULATION ---
        
        // Stock Valuation
        const closingStockValue = items.reduce((sum, i) => sum + ((i.openingStock || 0) * (i.purchaseRate || 0)), 0);
        const openingStockValue = 0; // Assuming 0 for now or fetch from historic

        // Gross Profit = (Sales + Closing Stock) - (Opening Stock + Purchase)
        const grossProfit = (netSales + closingStockValue) - (openingStockValue + netPurchases);

        // Indirect Expenses/Incomes from Ledgers
        const expenseParties = parties.filter(p => p.category === 'Expense' || p.name && p.name.toLowerCase().includes('expense') || p.name && p.name.toLowerCase().includes('rent'));
        const incomeParties = parties.filter(p => p.category === 'Income' || p.name && p.name.toLowerCase().includes('income'));

        const totalIndirectExpenses = expenseParties.reduce((sum, p) => sum + (p.currentBalance > 0 ? p.currentBalance : 0), 0); 
        const totalIndirectIncomes = incomeParties.reduce((sum, p) => sum + Math.abs(p.currentBalance), 0);

        const netProfit = grossProfit + totalIndirectIncomes - totalIndirectExpenses;

        // Structure Profit & Loss
        const plExpenses: AccountRow[] = [
            { name: 'Opening Stock', amount: openingStockValue },
            { name: 'Purchase Accounts', amount: netPurchases },
            { name: 'Direct Expenses', amount: 0 },
            { name: 'Gross Profit c/o', amount: grossProfit, isHeading: true }, 
            { name: '', amount: 0 }, 
            { name: 'Indirect Expenses', amount: totalIndirectExpenses, subRows: expenseParties.map(p => ({name: p.name, amount: p.currentBalance})) },
            { name: 'Net Profit', amount: netProfit, isHeading: true } 
        ];

        const plIncomes: AccountRow[] = [
            { name: 'Sales Accounts', amount: netSales },
            { name: 'Direct Incomes', amount: 0 },
            { name: 'Closing Stock', amount: closingStockValue },
            { name: '', amount: grossProfit }, 
            { name: 'Gross Profit b/f', amount: grossProfit, isHeading: true },
            { name: 'Indirect Incomes', amount: totalIndirectIncomes, subRows: incomeParties.map(p => ({name: p.name, amount: Math.abs(p.currentBalance)})) },
        ];

        const plTotal = Math.max(
            openingStockValue + netPurchases + grossProfit + totalIndirectExpenses + netProfit,
            netSales + closingStockValue + totalIndirectIncomes
        );

        // --- 3. BALANCE SHEET CALCULATION ---
        
        // Groups
        const debtors = parties.filter(p => p.type === 'Customer' && p.currentBalance > 0);
        const creditors = parties.filter(p => p.type === 'Supplier' && p.currentBalance < 0);
        const cashBank = parties.filter(p => p.name && p.name.toLowerCase().includes('cash') || p.name && p.name.toLowerCase().includes('bank'));
        const fixedAssets = parties.filter(p => p.category === 'Fixed Asset' || p.category === 'Machinery'); 
        const capitalAccounts = parties.filter(p => p.name && p.name.toLowerCase().includes('capital') || p.category === 'Capital');

        const debtorsTotal = debtors.reduce((sum, p) => sum + p.currentBalance, 0);
        const creditorsTotal = Math.abs(creditors.reduce((sum, p) => sum + p.currentBalance, 0));
        const cashBankTotal = cashBank.reduce((sum, p) => sum + (p.currentBalance > 0 ? p.currentBalance : 0), 0); 
        const fixedAssetsTotal = fixedAssets.reduce((sum, p) => sum + (p.currentBalance > 0 ? p.currentBalance : 0), 0);
        const capitalTotal = Math.abs(capitalAccounts.reduce((sum, p) => sum + p.currentBalance, 0)); 

        // Structure Balance Sheet
        const liabilities: AccountRow[] = [
            { name: 'Capital Account', amount: capitalTotal, subRows: capitalAccounts.map(p => ({name: p.name, amount: Math.abs(p.currentBalance)})) },
            { name: 'Current Liabilities', amount: creditorsTotal, subRows: [
                { name: 'Sundry Creditors', amount: creditorsTotal }
            ]},
            { name: 'Profit & Loss A/c', amount: netProfit } 
        ];

        const assets: AccountRow[] = [
            { name: 'Fixed Assets', amount: fixedAssetsTotal, subRows: fixedAssets.map(p => ({name: p.name, amount: p.currentBalance})) },
            { name: 'Current Assets', amount: closingStockValue + debtorsTotal + cashBankTotal, subRows: [
                { name: 'Closing Stock', amount: closingStockValue },
                { name: 'Sundry Debtors', amount: debtorsTotal },
                { name: 'Cash-in-hand', amount: cashBank.find(c => c.name.includes('Cash'))?.currentBalance || 0 },
                { name: 'Bank Accounts', amount: cashBank.find(c => c.name.includes('Bank'))?.currentBalance || 0 },
            ]}
        ];

        const totalLiabilities = liabilities.reduce((sum, i) => sum + i.amount, 0);
        const totalAssets = assets.reduce((sum, i) => sum + i.amount, 0);

        setData({
            trialBalance: { dr: tbDr, cr: tbCr, totalDr: tbTotalDr, totalCr: tbTotalCr },
            pl: { 
                expenses: plExpenses, incomes: plIncomes, 
                grossProfit, netProfit,
                totalExpense: plTotal, totalIncome: plTotal 
            },
            bs: {
                liabilities, assets,
                totalLiabilities, totalAssets
            }
        });

    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  // --- RENDER HELPERS ---

  const formatCurrency = (amount: number) => {
      if (amount === 0) return '';
      return `₹${Number(amount.toFixed(2)).toLocaleString('en-IN')}`;
  };

  const TRow = ({ label, amount, isBold = false }: { label: string, amount: number | string, isBold?: boolean }) => (
      <div className={`flex justify-between items-start py-2 px-2 border-b border-gray-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors`}>
          <span className={`text-sm ${isBold ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{label}</span>
          <span className={`text-sm font-mono ${isBold ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
              {typeof amount === 'number' ? (amount !== 0 ? formatCurrency(amount) : '') : amount}
          </span>
      </div>
  );

  const TFormatView = ({ 
      leftHeader, rightHeader,
      leftRows, rightRows, 
      leftTotal, rightTotal 
  }: {
      leftHeader: { title: string, amountTitle: string },
      rightHeader: { title: string, amountTitle: string },
      leftRows: AccountRow[], rightRows: AccountRow[],
      leftTotal: number, rightTotal: number
  }) => {
      return (
          <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-sm overflow-hidden pb-[max(env(safe-area-inset-bottom),0px)]">
              {/* Desktop: Side by Side, Mobile: Stacked but styled consistently */}
              <div className="flex-1 overflow-auto md:flex md:divide-x divide-slate-300 dark:divide-slate-700 border border-slate-300 dark:border-slate-700 m-2 shadow-sm rounded-lg">
                  
                  {/* Left Side */}
                  <div className="flex flex-col min-h-[50%] md:w-1/2 md:h-full">
                      {/* Column Header */}
                      <div className="bg-slate-100 dark:bg-slate-800 p-2 flex justify-between items-center border-b-2 border-slate-300 dark:border-slate-700 sticky top-0 z-10">
                          <span className="font-bold uppercase text-slate-800 dark:text-white text-xs sm:text-sm">{leftHeader.title}</span>
                          <span className="font-bold uppercase text-slate-800 dark:text-white text-xs sm:text-sm">{leftHeader.amountTitle}</span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto">
                          {leftRows.map((row, i) => (
                              <div key={i}>
                                  <TRow label={row.name} amount={row.amount} isBold={row.isHeading || !!row.subRows} />
                                  {row.subRows && row.subRows.map((sub, j) => (
                                      <div key={`${i}-${j}`} className="pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-2">
                                          <TRow label={sub.name} amount={sub.amount} />
                                      </div>
                                  ))}
                              </div>
                          ))}
                      </div>

                      <div className="bg-slate-200 dark:bg-slate-800 p-2 border-t-2 border-slate-300 dark:border-slate-700 flex justify-between font-extrabold text-slate-900 dark:text-white sticky bottom-0">
                          <span>Total</span>
                          <span>{formatCurrency(leftTotal)}</span>
                      </div>
                  </div>

                  {/* Right Side */}
                  <div className="flex flex-col min-h-[50%] md:w-1/2 md:h-full border-t-2 md:border-t-0 border-slate-300 dark:border-slate-700">
                      {/* Column Header */}
                      <div className="bg-slate-100 dark:bg-slate-800 p-2 flex justify-between items-center border-b-2 border-slate-300 dark:border-slate-700 sticky top-0 z-10">
                          <span className="font-bold uppercase text-slate-800 dark:text-white text-xs sm:text-sm">{rightHeader.title}</span>
                          <span className="font-bold uppercase text-slate-800 dark:text-white text-xs sm:text-sm">{rightHeader.amountTitle}</span>
                      </div>

                      <div className="flex-1 overflow-y-auto">
                          {rightRows.map((row, i) => (
                              <div key={i}>
                                  <TRow label={row.name} amount={row.amount} isBold={row.isHeading || !!row.subRows} />
                                  {row.subRows && row.subRows.map((sub, j) => (
                                      <div key={`${i}-${j}`} className="pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-2">
                                          <TRow label={sub.name} amount={sub.amount} />
                                      </div>
                                  ))}
                              </div>
                          ))}
                      </div>

                      <div className="bg-slate-200 dark:bg-slate-800 p-2 border-t-2 border-slate-300 dark:border-slate-700 flex justify-between font-extrabold text-slate-900 dark:text-white sticky bottom-0">
                          <span>Total</span>
                          <span>{formatCurrency(rightTotal)}</span>
                      </div>
                  </div>

              </div>
          </div>
      );
  };

  const downloadExcel = () => {
      if (!data) {
          alert("No data to download.");
          return;
      }

      let csvContent = "";

      if (reportType === 'TrialBalance') {
          csvContent += "Account Name,Debit,Credit\n";
          const allRows = [...data.trialBalance.dr, ...data.trialBalance.cr].sort((a,b) => a.name.localeCompare(b.name));
          
          allRows.forEach(row => {
              const isDr = data.trialBalance.dr.some(r => r.name === row.name && r.amount === row.amount);
              csvContent += `"${row.name}",${isDr ? row.amount : ''},${!isDr ? row.amount : ''}\n`;
          });
          csvContent += `"Total",${data.trialBalance.totalDr},${data.trialBalance.totalCr}\n`;
      } else {
          // P&L or Balance Sheet
          const isPL = reportType === 'ProfitLoss';
          const leftTitle = isPL ? "EXPENSES" : "LIABILITIES";
          const rightTitle = isPL ? "INCOMES" : "ASSETS";

          csvContent += `"${leftTitle}","AMOUNT (\u20B9)","${rightTitle}","AMOUNT (\u20B9)"\n`;

          const leftRows = isPL ? data.pl.expenses : data.bs.liabilities;
          const rightRows = isPL ? data.pl.incomes : data.bs.assets;

          const flatten = (rows: AccountRow[]) => {
              let res: { name: string, amount: number | string }[] = [];
              rows.forEach(r => {
                  res.push({ name: r.name, amount: r.amount });
                  if (r.subRows) {
                      r.subRows.forEach(sr => {
                          res.push({ name: '   ' + sr.name, amount: sr.amount });
                      });
                  }
              });
              return res;
          };

          const flatLeft = flatten(leftRows);
          const flatRight = flatten(rightRows);

          const maxLen = Math.max(flatLeft.length, flatRight.length);

          for (let i = 0; i < maxLen; i++) {
              const l = flatLeft[i] || { name: '', amount: '' };
              const r = flatRight[i] || { name: '', amount: '' };
              const formatAmount = (amt: number | string) => (amt && typeof amt === 'number') ? amt.toFixed(2) : amt;
              csvContent += `"${l.name}",${l.amount !== '' ? formatAmount(l.amount) : ''},"${r.name}",${r.amount !== '' ? formatAmount(r.amount) : ''}\n`;
          }

          const leftTotal = isPL ? data.pl.totalExpense : data.bs.totalLiabilities;
          const rightTotal = isPL ? data.pl.totalIncome : data.bs.totalAssets;

          csvContent += `"Total",${leftTotal.toFixed(2)},"Total",${rightTotal.toFixed(2)}\n`;
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${reportType}_Report_${asOnDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const getReportTitle = () => {
      switch(reportType) {
          case 'TrialBalance': return 'Trial Balance (ट्रायल बैलेंस)';
          case 'ProfitLoss': return 'Profit & Loss (लाभ और हानि)';
          case 'BalanceSheet': return 'Balance Sheet (बैलेंस शीट)';
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-emerald-700 text-white p-3 flex items-center justify-between shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <div className="flex items-center gap-3">
            <button onClick={onBack}><ArrowLeft size={24} /></button>
            <div>
                <h1 className="text-lg font-bold">{getReportTitle()}</h1>
                <p className="text-xs opacity-80 font-mono">As on {new Date(asOnDate).toDateString()}</p>
            </div>
        </div>
        <div className="flex gap-2">
            <button onClick={downloadExcel} className="p-2 hover:bg-emerald-600 rounded-full transition-colors" title="Download CSV">
                <Download size={20} />
            </button>
            <button onClick={loadFinancials} className="p-2 hover:bg-emerald-600 rounded-full transition-colors" title="Refresh">
                <RefreshCw size={20} />
            </button>
        </div>
      </header>

      {loading || !data ? (
          <div className="flex-1 flex items-center justify-center text-emerald-600">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
          </div>
      ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
              {reportType === 'TrialBalance' && (
                  <div className="flex-1 overflow-auto p-2">
                      <div className="border border-slate-300 dark:border-slate-700 shadow-sm rounded-t-lg overflow-hidden h-full flex flex-col bg-white dark:bg-slate-900">
                        
                        {/* Fixed Header */}
                        <div className="grid grid-cols-12 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold border-b-2 border-slate-300 dark:border-slate-600 text-sm">
                            <div className="col-span-6 p-3 border-r border-slate-300 dark:border-slate-600">
                                Account Name <br/>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">खाते का नाम</span>
                            </div>
                            <div className="col-span-3 p-3 border-r border-slate-300 dark:border-slate-600 text-right bg-slate-100 dark:bg-slate-800/50">
                                Debit (₹) <br/>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">डेबिट</span>
                            </div>
                            <div className="col-span-3 p-3 text-right bg-slate-100 dark:bg-slate-800/50">
                                Credit (₹) <br/>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">क्रेडिट</span>
                            </div>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto">
                            {[...data.trialBalance.dr, ...data.trialBalance.cr].sort((a,b) => a.name.localeCompare(b.name)).map((row, idx) => {
                                // Simple logic: if it's in Dr list, show in Dr col, else Cr col
                                // Special case: Diff row might appear in both lists but calculated only once logic ensures unique row objects
                                // We check if this exact row object exists in the Dr array
                                const isDr = data.trialBalance.dr.some(r => r.name === row.name && r.amount === row.amount);
                                
                                return (
                                    <div key={idx} className="grid grid-cols-12 text-sm border-b border-gray-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors">
                                        <div className="col-span-6 p-2 border-r border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200 truncate" title={row.name}>
                                            {row.name}
                                        </div>
                                        <div className="col-span-3 p-2 border-r border-slate-200 dark:border-slate-700 text-right font-mono text-slate-700 dark:text-slate-300 bg-slate-50/30 dark:bg-slate-800/30">
                                            {isDr ? Number(row.amount.toFixed(2)).toLocaleString('en-IN') : ''}
                                        </div>
                                        <div className="col-span-3 p-2 text-right font-mono text-slate-700 dark:text-slate-300 bg-slate-50/30 dark:bg-slate-800/30">
                                            {!isDr ? Number(row.amount.toFixed(2)).toLocaleString('en-IN') : ''}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Fixed Footer */}
                        <div className="grid grid-cols-12 bg-slate-200 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-600 text-sm">
                            <div className="col-span-6 p-3 text-center uppercase">Total (कुल)</div>
                            <div className="col-span-3 p-3 text-right border-r border-slate-300 dark:border-slate-600">₹{Number(data.trialBalance.totalDr.toFixed(2)).toLocaleString('en-IN')}</div>
                            <div className="col-span-3 p-3 text-right">₹{Number(data.trialBalance.totalCr.toFixed(2)).toLocaleString('en-IN')}</div>
                        </div>

                      </div>
                  </div>
              )}

              {reportType === 'ProfitLoss' && (
                  <TFormatView 
                      leftHeader={{ title: 'Expenses (विवरण)', amountTitle: 'Amount (राशि ₹)' }}
                      rightHeader={{ title: 'Incomes (विवरण)', amountTitle: 'Amount (राशि ₹)' }}
                      leftRows={data.pl.expenses}
                      rightRows={data.pl.incomes}
                      leftTotal={data.pl.totalExpense}
                      rightTotal={data.pl.totalIncome}
                  />
              )}

              {reportType === 'BalanceSheet' && (
                  <TFormatView 
                      leftHeader={{ title: 'Liabilities (लायबिलिटीज)', amountTitle: 'Amount (राशि ₹)' }}
                      rightHeader={{ title: 'Assets (एसेट्स)', amountTitle: 'Amount (राशि ₹)' }}
                      leftRows={data.bs.liabilities}
                      rightRows={data.bs.assets}
                      leftTotal={data.bs.totalLiabilities}
                      rightTotal={data.bs.totalAssets}
                  />
              )}
          </div>
      )}
    </div>
  );
};