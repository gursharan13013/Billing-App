import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, RefreshCw, Download, ShieldAlert } from 'lucide-react';
import { billingService } from '../../../services/billingService';
import { AccountRow, FinancialData, Language } from '../../../core/types/';
import { useAuth } from '../../../context/AuthContext';
import { motion } from 'motion/react';

interface FinancialReportScreenProps {
  onBack: () => void;
  reportType: 'TrialBalance' | 'ProfitLoss' | 'BalanceSheet';
  language?: Language;
}

export const FinancialReportScreen: React.FC<FinancialReportScreenProps> = ({ onBack, reportType, language }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinancialData | null>(null);
  const [asOnDate, setAsOnDate] = useState(new Date().toLocalDateString());

  const isHi = language === 'hi';

  const t = {
    tbTitle: isHi ? 'ट्रायल बैलेंस (Trial Balance)' : 'Trial Balance',
    plTitle: isHi ? 'लाभ और हानि (Profit & Loss)' : 'Profit & Loss',
    bsTitle: isHi ? 'तुलन पत्र (Balance Sheet)' : 'Balance Sheet',
    asOn: isHi ? 'दिनांक तक' : 'As on',
    refresh: isHi ? 'रिफ्रेश' : 'Refresh',
    download: isHi ? 'डाउनलोड' : 'Download',
    restrictedTitle: isHi ? '🔒 एक्सेस प्रतिबंधित (Restricted)' : '🔒 Access Restricted',
    restrictedMsg: isHi ? 'सुरक्षा कारणों से, केवल अधिकृत व्यावसायिक व्यवस्थापक (Admin) ही वित्तीय रिपोर्ट्स देख सकते हैं।' : 'For security reasons, only authorized business administrators (Admin) can view financial reports.',
    goBack: isHi ? 'पीछे जाएं' : 'Go Back',
    loading: isHi ? 'वित्तीय रिपोर्ट लोड हो रही है...' : 'Loading Financials...',
    accountName: isHi ? 'खाते का नाम' : 'Account Name',
    debit: isHi ? 'डेबिट (Dr)' : 'Debit (Dr)',
    credit: isHi ? 'क्रेडिट (Cr)' : 'Credit (Cr)',
    total: isHi ? 'कुल योग' : 'Total',
    downloadError: isHi ? 'डाउनलोड करने के लिए कोई डेटा नहीं है।' : 'No data to download.',
    expenses: isHi ? 'खर्च विवरण (Expenses)' : 'Expenses',
    incomes: isHi ? 'आय विवरण (Incomes)' : 'Incomes',
    liabilities: isHi ? 'दायित्व (Liabilities)' : 'Liabilities',
    assets: isHi ? 'संपत्ति (Assets)' : 'Assets',
    amount: isHi ? 'राशि (₹)' : 'Amount (₹)'
  };

  useEffect(() => {
    if (currentUser?.role !== 'staff') {
      loadFinancials();
    }
  }, [asOnDate, currentUser]);

  if (currentUser?.role === 'staff') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-50 dark:bg-slate-950 transition-colors font-sans">
        <div className="bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 p-5 rounded-full text-amber-500 mb-5 animate-pulse">
          <ShieldAlert size={48} />
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-wide">{t.restrictedTitle}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-6 font-bold">
          {t.restrictedMsg}
        </p>
        <button 
          onClick={onBack}
          className="px-6 py-3 bg-slate-900 dark:bg-slate-800 text-white font-extrabold rounded-xl shadow-md hover:bg-slate-800 dark:hover:bg-slate-700 transition-all text-xs uppercase tracking-wider min-h-[44px]"
        >
          {t.goBack}
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

        const allSales = await billingService.getInvoices('Sale');
        const allPurchases = await billingService.getInvoices('Purchase');
        const allSaleReturns = await billingService.getInvoices('Sale Return');
        const allPurchaseReturns = await billingService.getInvoices('Purchase Return');

        const totalSalesAmount = allSales.reduce((sum, i) => sum + i.totalAmount, 0);
        const totalPurchaseAmount = allPurchases.reduce((sum, i) => sum + i.totalAmount, 0);
        const totalSaleReturnAmount = allSaleReturns.reduce((sum, i) => sum + i.totalAmount, 0);
        const totalPurchaseReturnAmount = allPurchaseReturns.reduce((sum, i) => sum + i.totalAmount, 0);

        const netSales = totalSalesAmount - totalSaleReturnAmount;
        const netPurchases = totalPurchaseAmount - totalPurchaseReturnAmount;

        const tbDr: AccountRow[] = [];
        const tbCr: AccountRow[] = [];
        let tbTotalDr = 0;
        let tbTotalCr = 0;

        parties.forEach(p => {
            if (p.currentBalance === 0) return;
            if (p.currentBalance > 0) {
                tbDr.push({ name: p.name, amount: p.currentBalance });
                tbTotalDr += p.currentBalance;
            } else {
                const amount = Math.abs(p.currentBalance);
                tbCr.push({ name: p.name, amount: amount });
                tbTotalCr += amount;
            }
        });

        if (totalPurchaseAmount > 0) {
            tbDr.push({ name: isHi ? 'खरीद खाते' : 'Purchase Accounts', amount: totalPurchaseAmount });
            tbTotalDr += totalPurchaseAmount;
        }
        if (totalSalesAmount > 0) {
            tbCr.push({ name: isHi ? 'बिक्री खाते' : 'Sales Accounts', amount: totalSalesAmount });
            tbTotalCr += totalSalesAmount;
        }
        if (totalSaleReturnAmount > 0) {
            tbDr.push({ name: isHi ? 'बिक्री वापसी' : 'Sales Return', amount: totalSaleReturnAmount });
            tbTotalDr += totalSaleReturnAmount;
        }
        if (totalPurchaseReturnAmount > 0) {
            tbCr.push({ name: isHi ? 'खरीद वापसी' : 'Purchase Return', amount: totalPurchaseReturnAmount });
            tbTotalCr += totalPurchaseReturnAmount;
        }

        if (Math.abs(tbTotalDr - tbTotalCr) > 0.01) {
            const diff = tbTotalDr - tbTotalCr;
            if (diff > 0) {
                tbCr.push({ name: isHi ? 'प्रारंभिक शेष में अंतर' : 'Diff. in Opening Balances', amount: diff });
                tbTotalCr += diff;
            } else {
                tbDr.push({ name: isHi ? 'प्रारंभिक शेष में अंतर' : 'Diff. in Opening Balances', amount: Math.abs(diff) });
                tbTotalDr += Math.abs(diff);
            }
        }
        
        const closingStockValue = items.reduce((sum, i) => sum + ((i.openingStock || 0) * (i.purchaseRate || 0)), 0);
        const openingStockValue = 0; 

        const grossProfit = (netSales + closingStockValue) - (openingStockValue + netPurchases);

        const expenseParties = parties.filter(p => p.category === 'Expense' || (p.name && p.name.toLowerCase().includes('expense')) || (p.name && p.name.toLowerCase().includes('rent')));
        const incomeParties = parties.filter(p => p.category === 'Income' || (p.name && p.name.toLowerCase().includes('income')));

        const totalIndirectExpenses = expenseParties.reduce((sum, p) => sum + (p.currentBalance > 0 ? p.currentBalance : 0), 0); 
        const totalIndirectIncomes = incomeParties.reduce((sum, p) => sum + Math.abs(p.currentBalance), 0);

        const netProfit = grossProfit + totalIndirectIncomes - totalIndirectExpenses;

        const plExpenses: AccountRow[] = [
            { name: isHi ? 'प्रारंभिक स्टॉक' : 'Opening Stock', amount: openingStockValue },
            { name: isHi ? 'खरीद खाते' : 'Purchase Accounts', amount: netPurchases },
            { name: isHi ? 'प्रत्यक्ष खर्च' : 'Direct Expenses', amount: 0 },
            { name: isHi ? 'सकल लाभ सी/ओ' : 'Gross Profit c/o', amount: grossProfit, isHeading: true }, 
            { name: '', amount: 0 }, 
            { name: isHi ? 'अप्रत्यक्ष खर्च' : 'Indirect Expenses', amount: totalIndirectExpenses, subRows: expenseParties.map(p => ({name: p.name, amount: p.currentBalance})) },
            { name: isHi ? 'शुद्ध लाभ' : 'Net Profit', amount: netProfit, isHeading: true } 
        ];

        const plIncomes: AccountRow[] = [
            { name: isHi ? 'बिक्री खाते' : 'Sales Accounts', amount: netSales },
            { name: isHi ? 'प्रत्यक्ष आय' : 'Direct Incomes', amount: 0 },
            { name: isHi ? 'अंतिम स्टॉक' : 'Closing Stock', amount: closingStockValue },
            { name: '', amount: grossProfit }, 
            { name: isHi ? 'सकल लाभ बी/एफ' : 'Gross Profit b/f', amount: grossProfit, isHeading: true },
            { name: isHi ? 'अप्रत्यक्ष आय' : 'Indirect Incomes', amount: totalIndirectIncomes, subRows: incomeParties.map(p => ({name: p.name, amount: Math.abs(p.currentBalance)})) },
        ];

        const plTotal = Math.max(
            openingStockValue + netPurchases + grossProfit + totalIndirectExpenses + netProfit,
            netSales + closingStockValue + totalIndirectIncomes
        );
        
        const debtors = parties.filter(p => p.type === 'Customer' && p.currentBalance > 0);
        const creditors = parties.filter(p => p.type === 'Supplier' && p.currentBalance < 0);
        const cashBank = parties.filter(p => (p.name && p.name.toLowerCase().includes('cash')) || (p.name && p.name.toLowerCase().includes('bank')));
        const fixedAssets = parties.filter(p => p.category === 'Fixed Asset' || p.category === 'Machinery'); 
        const capitalAccounts = parties.filter(p => (p.name && p.name.toLowerCase().includes('capital')) || p.category === 'Capital');

        const debtorsTotal = debtors.reduce((sum, p) => sum + p.currentBalance, 0);
        const creditorsTotal = Math.abs(creditors.reduce((sum, p) => sum + p.currentBalance, 0));
        const fixedAssetsTotal = fixedAssets.reduce((sum, p) => sum + (p.currentBalance > 0 ? p.currentBalance : 0), 0); 
        const capitalTotal = Math.abs(capitalAccounts.reduce((sum, p) => sum + p.currentBalance, 0)); 

        const liabilities: AccountRow[] = [
            { name: isHi ? 'पूंजी खाता' : 'Capital Account', amount: capitalTotal, subRows: capitalAccounts.map(p => ({name: p.name, amount: Math.abs(p.currentBalance)})) },
            { name: isHi ? 'चालू दायित्व' : 'Current Liabilities', amount: creditorsTotal, subRows: [
                { name: isHi ? 'विविध लेनदार' : 'Sundry Creditors', amount: creditorsTotal }
            ]},
            { name: isHi ? 'लाभ एवं हानि खाता' : 'Profit & Loss A/c', amount: netProfit } 
        ];

        const assets: AccountRow[] = [
            { name: isHi ? 'अचल संपत्ति' : 'Fixed Assets', amount: fixedAssetsTotal, subRows: fixedAssets.map(p => ({name: p.name, amount: p.currentBalance})) },
            { name: isHi ? 'चालू संपत्ति' : 'Current Assets', amount: closingStockValue + debtorsTotal, subRows: [
                { name: isHi ? 'अंतिम स्टॉक' : 'Closing Stock', amount: closingStockValue },
                { name: isHi ? 'विविध देनदार' : 'Sundry Debtors', amount: debtorsTotal },
                { name: isHi ? 'नकद हस्तस्थ' : 'Cash-in-hand', amount: cashBank.find(c => c.name.includes('Cash'))?.currentBalance || 0 },
                { name: isHi ? 'बैंक खाते' : 'Bank Accounts', amount: cashBank.find(c => c.name.includes('Bank'))?.currentBalance || 0 },
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
    } {
        setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
      if (amount === 0) return '';
      return `₹${Number(amount.toFixed(2)).toLocaleString('en-IN')}`;
  };

  const TRow = ({ label, amount, isBold = false }: { label: string, amount: number | string, isBold?: boolean }) => (
      <div className="flex justify-between items-start py-2.5 px-3 border-b border-gray-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <span className={`text-xs ${isBold ? 'font-extrabold text-slate-900 dark:text-white' : 'text-slate-655 dark:text-slate-400'}`}>{label}</span>
          <span className={`text-xs font-extrabold font-mono ${isBold ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-350'}`}>
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
          <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 text-xs overflow-hidden pb-[max(env(safe-area-inset-bottom),0px)]">
              <div className="flex-1 overflow-auto md:flex md:divide-x divide-gray-200 dark:divide-slate-800 border border-gray-200 dark:border-slate-800 m-4 bg-white dark:bg-slate-900 shadow-sm rounded-xl">
                  
                  {/* Left Side */}
                  <div className="flex flex-col min-h-[50%] md:w-1/2 md:h-full">
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 flex justify-between items-center border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10">
                          <span className="font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider text-[10px]">{leftHeader.title}</span>
                          <span className="font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider text-[10px]">{leftHeader.amountTitle}</span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto">
                          {leftRows.map((row, i) => (
                              <div key={i}>
                                  <TRow label={row.name} amount={row.amount} isBold={row.isHeading || !!row.subRows} />
                                  {row.subRows && row.subRows.map((sub, j) => (
                                      <div key={`${i}-${j}`} className="pl-4 border-l border-gray-150 dark:border-slate-800 ml-2">
                                          <TRow label={sub.name} amount={sub.amount} />
                                      </div>
                                  ))}
                              </div>
                          ))}
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950 p-3 border-t border-gray-200 dark:border-slate-800 flex justify-between font-black text-slate-900 dark:text-white sticky bottom-0 text-sm">
                          <span>{t.total}</span>
                          <span>{formatCurrency(leftTotal)}</span>
                      </div>
                  </div>

                  {/* Right Side */}
                  <div className="flex flex-col min-h-[50%] md:w-1/2 md:h-full border-t md:border-t-0 border-gray-200 dark:border-slate-800">
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 flex justify-between items-center border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10">
                          <span className="font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider text-[10px]">{rightHeader.title}</span>
                          <span className="font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider text-[10px]">{rightHeader.amountTitle}</span>
                      </div>

                      <div className="flex-1 overflow-y-auto">
                          {rightRows.map((row, i) => (
                              <div key={i}>
                                  <TRow label={row.name} amount={row.amount} isBold={row.isHeading || !!row.subRows} />
                                  {row.subRows && row.subRows.map((sub, j) => (
                                      <div key={`${i}-${j}`} className="pl-4 border-l border-gray-150 dark:border-slate-800 ml-2">
                                          <TRow label={sub.name} amount={sub.amount} />
                                      </div>
                                  ))}
                              </div>
                          ))}
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950 p-3 border-t border-gray-200 dark:border-slate-800 flex justify-between font-black text-slate-900 dark:text-white sticky bottom-0 text-sm">
                          <span>{t.total}</span>
                          <span>{formatCurrency(rightTotal)}</span>
                      </div>
                  </div>

              </div>
          </div>
      );
  };

  const downloadExcel = () => {
      if (!data) {
          alert(t.downloadError);
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
          case 'TrialBalance': return t.tbTitle;
          case 'ProfitLoss': return t.plTitle;
          case 'BalanceSheet': return t.bsTitle;
      }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', ease: [0.25, 1, 0.5, 1], duration: 0.35 }}
      style={{ willChange: 'transform' }}
      className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)] relative overflow-hidden transition-colors font-sans"
    >
      {/* Premium Header */}
      <header className="bg-white dark:bg-slate-900 p-4 flex items-center justify-between shadow-sm shrink-0 border-b border-gray-200 dark:border-slate-800 pt-[max(env(safe-area-inset-top),48px)] transition-colors">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white p-2 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90"
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {getReportTitle()}
            </h1>
            <p className="text-[10px] font-bold text-slate-500 tracking-widest mt-0.5 opacity-80 uppercase leading-none">
              {t.asOn} {asOnDate}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={downloadExcel} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95" 
              title={t.download}
            >
              <Download size={20} />
            </button>
            <button 
              onClick={loadFinancials} 
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95" 
              title={t.refresh}
            >
              <RefreshCw size={20} />
            </button>
        </div>
      </header>

      {loading || !data ? (
          <div className="flex-1 flex items-center justify-center text-indigo-650">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
      ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
              {reportType === 'TrialBalance' && (
                  <div className="flex-1 overflow-auto p-4">
                      <div className="border border-gray-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden h-full flex flex-col bg-white dark:bg-slate-900">
                        
                        {/* Fixed Header */}
                        <div className="grid grid-cols-12 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-extrabold uppercase border-b border-gray-200 dark:border-slate-800 text-[10px] tracking-wider shrink-0">
                            <div className="col-span-6 p-3.5 border-r border-gray-200 dark:border-slate-800">
                                {t.accountName}
                            </div>
                            <div className="col-span-3 p-3.5 border-r border-gray-200 dark:border-slate-800 text-right">
                                {t.debit}
                            </div>
                            <div className="col-span-3 p-3.5 text-right">
                                {t.credit}
                            </div>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800/80 custom-scrollbar">
                            {[...data.trialBalance.dr, ...data.trialBalance.cr].sort((a,b) => a.name.localeCompare(b.name)).map((row, idx) => {
                                const isDr = data.trialBalance.dr.some(r => r.name === row.name && r.amount === row.amount);
                                
                                return (
                                    <div key={idx} className="grid grid-cols-12 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="col-span-6 p-3.5 border-r border-gray-100 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-200 truncate" title={row.name}>
                                            {row.name}
                                        </div>
                                        <div className="col-span-3 p-3.5 border-r border-gray-100 dark:border-slate-800 text-right font-extrabold font-mono text-slate-800 dark:text-slate-300">
                                            {isDr ? Number(row.amount.toFixed(2)).toLocaleString('en-IN') : ''}
                                        </div>
                                        <div className="col-span-3 p-3.5 text-right font-extrabold font-mono text-slate-800 dark:text-slate-300">
                                            {!isDr ? Number(row.amount.toFixed(2)).toLocaleString('en-IN') : ''}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Fixed Footer */}
                        <div className="grid grid-cols-12 bg-slate-50 dark:bg-slate-950 font-black text-slate-900 dark:text-white border-t-2 border-gray-200 dark:border-slate-800 text-xs shrink-0 shadow-sm">
                            <div className="col-span-6 p-3.5 text-center uppercase tracking-wider">{t.total}</div>
                            <div className="col-span-3 p-3.5 text-right border-r border-gray-200 dark:border-slate-800 font-mono font-black text-indigo-650 dark:text-indigo-400">₹{Number(data.trialBalance.totalDr.toFixed(2)).toLocaleString('en-IN')}</div>
                            <div className="col-span-3 p-3.5 text-right font-mono font-black text-indigo-650 dark:text-indigo-400">₹{Number(data.trialBalance.totalCr.toFixed(2)).toLocaleString('en-IN')}</div>
                        </div>

                      </div>
                  </div>
              )}

              {reportType === 'ProfitLoss' && (
                  <TFormatView 
                      leftHeader={{ title: t.expenses, amountTitle: t.amount }}
                      rightHeader={{ title: t.incomes, amountTitle: t.amount }}
                      leftRows={data.pl.expenses}
                      rightRows={data.pl.incomes}
                      leftTotal={data.pl.totalExpense}
                      rightTotal={data.pl.totalIncome}
                  />
              )}

              {reportType === 'BalanceSheet' && (
                  <TFormatView 
                      leftHeader={{ title: t.liabilities, amountTitle: t.amount }}
                      rightHeader={{ title: t.assets, amountTitle: t.amount }}
                      leftRows={data.bs.liabilities}
                      rightRows={data.bs.assets}
                      leftTotal={data.bs.totalLiabilities}
                      rightTotal={data.bs.totalAssets}
                  />
              )}
          </div>
      )}
    </motion.div>
  );
};