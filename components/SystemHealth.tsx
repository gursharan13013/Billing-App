import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Activity, RefreshCcw, Database, ShieldCheck, 
  AlertTriangle, Check, Loader2, Sparkles, Play, Info
} from 'lucide-react';
import { billingService, getDb } from '../src/services/billingService';

interface SystemHealthProps {
  onBack: () => void;
}

export const SystemHealth: React.FC<SystemHealthProps> = ({ onBack }) => {
  // Check States
  const [syncHealth, setSyncHealth] = useState<{
    unsyncedCount: number;
    breakDown: Record<string, number>;
    status: 'Healthy' | 'Sync Required';
  } | null>(null);

  const [accountingHealth, setAccountingHealth] = useState<{
    isValid: boolean;
    invoiceSum: number;
    ledgerCreditsSum: number;
    details: string;
  } | null>(null);

  const [integrityHealth, setIntegrityHealth] = useState<{
    isValid: boolean;
    checkedCount: number;
    brokenIndex?: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Stress Test State
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [stressProgress, setStressProgress] = useState(0);
  const [stressTime, setStressTime] = useState<number | null>(null);
  const [stressLog, setStressLog] = useState<string[]>([]);

  // Function to run all health checks
  const runAllChecks = async () => {
    setIsLoading(true);
    try {
      // 1. Sync Health Check
      const dbInstance = getDb();
      const SYNCABLE_TABLES = ['parties', 'items', 'invoices', 'payments'] as const;
      let unsyncedCount = 0;
      const breakDown: Record<string, number> = {};

      for (const tableName of SYNCABLE_TABLES) {
        if (dbInstance.table(tableName)) {
          const records = await dbInstance.table(tableName).toArray();
          const unsyncedInTable = records.filter(r => !r.isSyncedToCloud).length;
          unsyncedCount += unsyncedInTable;
          breakDown[tableName] = unsyncedInTable;
        } else {
          breakDown[tableName] = 0;
        }
      }

      setSyncHealth({
        unsyncedCount,
        breakDown,
        status: unsyncedCount === 0 ? 'Healthy' : 'Sync Required'
      });

      // 2. Accounting Health Check (Verify Financial Integrity)
      const accResult = await billingService.verifyFinancialIntegrity();
      setAccountingHealth(accResult);

      // 3. Integrity Health Check (Check Data Integrity Chain)
      const integrityResult = await billingService.checkDataIntegrityChain();
      setIntegrityHealth(integrityResult);

    } catch (error) {
      console.error("Health check error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runAllChecks();
  }, []);

  const handleResetIntegrityChain = async () => {
    const confirmClear = window.confirm(
      "Kya aap transaction logs clear karke cryptographic chain ko reset karna chahte hain? Isse aapki billing or invoice data safe rahegi, sirf verification logs clean ho jayenge."
    );
    if (!confirmClear) return;
    
    setIsLoading(true);
    try {
      const dbInstance = getDb();
      await dbInstance.transaction_log.clear();
      await runAllChecks();
    } catch (err) {
      console.error("Reset log error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run the 100 Random Transactions Stress Test in chunks to avoid UI lag
  const handleRunStressTest = async () => {
    if (isStressTesting) return;

    setIsStressTesting(true);
    setStressProgress(0);
    setStressTime(null);
    setStressLog([]);

    const log = (msg: string) => {
      setStressLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
      console.log(`[STRESS TEST] ${msg}`);
    };

    log("Initializing Stress Test: Generating 100 Random Transactions...");

    const startTime = performance.now();

    try {
      // Find or create Stress Test Party
      const parties = await billingService.getAllParties();
      let testParty = parties.find(p => p.name === 'Stress Test Customer');
      if (!testParty) {
        log("Stress Test Customer not found. Creating a secure dummy party...");
        const partyId = 'party_st_' + Math.random().toString(36).substr(2, 9);
        testParty = {
          id: partyId,
          name: 'Stress Test Customer',
          mobile: '9876543210',
          type: 'Customer',
          accountGroup: 'Sundry Debtors',
          currentBalance: 0,
          isLocal: true
        };
        await billingService.saveParty(testParty);
        log("Test Customer created successfully.");
      }

      // Find or create Stress Test Item
      const items = await billingService.getAllItems();
      let testItem = items.find(i => i.name === 'Stress Test Item');
      if (!testItem) {
        log("Stress Test Item not found. Creating a secure dummy item...");
        const itemId = 'item_st_' + Math.random().toString(36).substr(2, 9);
        testItem = {
          id: itemId,
          name: 'Stress Test Item',
          saleRate: 50,
          purchaseRate: 40,
          mrp: 60,
          taxPercent: 18,
          taxType: 'Excluded',
          openingStock: 10000,
        };
        await billingService.saveItem(testItem);
        log("Test Item created successfully.");
      }

      const totalTransactions = 100;
      const batchSize = 5; // Yield of 5 saves at a time to let the UI paint smoothly

      for (let i = 0; i < totalTransactions; i += batchSize) {
        const currentBatchMax = Math.min(i + batchSize, totalTransactions);
        
        for (let j = i; j < currentBatchMax; j++) {
          const qty = Math.floor(Math.random() * 5) + 1;
          const rate = Math.floor(Math.random() * 100) + 10;
          
          const lineItems = [{
            id: `li_st_${j}_${Math.random().toString(36).substr(2, 5)}`,
            item: testItem,
            qty,
            rate,
            taxPercent: testItem.taxPercent || 0,
            taxType: testItem.taxType || 'Excluded',
            discountPercent: Math.random() > 0.5 ? 5 : 0
          }];

          const type = Math.random() > 0.3 ? 'Sale' : 'Purchase';
          const randomDate = new Date();
          randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));

          await billingService.saveInvoice(testParty.id, randomDate, lineItems, type as any);
        }

        const progress = Math.min(currentBatchMax, totalTransactions);
        setStressProgress(progress);
        log(`Successfully generated ${progress} / ${totalTransactions} transactions...`);

        // Yield execution to make sure there's absolutely 0 UI lagging!
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      setStressTime(durationMs);
      log(`🎉 Stress Test completed successfully in ${durationMs}ms!`);
      
      // Auto-refresh the system health check results after writing mock data
      await runAllChecks();

    } catch (err: any) {
      log(`❌ Failure during stress test: ${err.message || String(err)}`);
    } finally {
      setIsStressTesting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-[#3b5998] text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack} title="Go back to Settings" className="hover:bg-black/10 p-1 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Activity size={22} className="text-green-400 animate-pulse" />
          System Diagnostics & Health
        </h1>
      </header>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time status check of accounting, synchronization, and local database chain integrity.
          </p>
          <button 
            onClick={runAllChecks} 
            disabled={isLoading || isStressTesting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#3b5998] hover:bg-[#2d4373] text-white rounded-lg disabled:opacity-50 transition-colors shadow-sm"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
            re-run
          </button>
        </div>

        {/* 1. Sync Health Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 dark:bg-indigo-950 p-2.5 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Database size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100">Sync Queue Status (सिंक हेल्थ)</h3>
                <p className="text-xs text-slate-500">Unsynced offline modifications waiting for cloud upload.</p>
              </div>
            </div>
            {syncHealth && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                syncHealth.unsyncedCount === 0 
                  ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400' 
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
              }`}>
                {syncHealth.status}
              </span>
            )}
          </div>

          {!syncHealth ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-[#3b5998]" size={18} /></div>
          ) : (
            <div className="pt-2">
              <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                {Object.entries(syncHealth.breakDown).map(([key, count]) => (
                  <div key={key} className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">{key}</span>
                    <span className={`text-base font-bold ${(count as number) > 0 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}`}>{count as number}</span>
                    <span className="text-[9px] text-slate-500 block">unsynced</span>
                  </div>
                ))}
              </div>
              {syncHealth.unsyncedCount > 0 && (
                <div className="mt-3 flex items-start gap-2 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30 text-[11px] text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>You have {syncHealth.unsyncedCount} unsynced records locally. They will automatically sync when network connection is idle.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Accounting Health Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100">Accounting Health (लेजर ऑडिट)</h3>
                <p className="text-xs text-slate-500">Double Entry Balancing: Sum(Invoices) == Sum(Ledger Entries)</p>
              </div>
            </div>
            {accountingHealth && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                accountingHealth.isValid 
                  ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400' 
                  : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
              }`}>
                {accountingHealth.isValid ? 'Audited' : 'Mismatch Found'}
              </span>
            )}
          </div>

          {!accountingHealth ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-[#3b5998]" size={18} /></div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Invoice Base Sum</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">₹{accountingHealth.invoiceSum}</span>
                </div>
                <div className="text-slate-300 dark:text-slate-700">|</div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Ledger Entries Sum</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">₹{accountingHealth.ledgerCreditsSum}</span>
                </div>
                <div className="text-slate-300 dark:text-slate-700">|</div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Difference</span>
                  <span className={`text-sm font-bold ${accountingHealth.isValid ? 'text-green-500' : 'text-red-500'}`}>
                    ₹{(accountingHealth.invoiceSum - accountingHealth.ledgerCreditsSum).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className={`text-xs p-2.5 rounded-lg border flex items-start gap-2 ${
                accountingHealth.isValid
                  ? 'bg-green-50/40 border-green-100 text-green-800 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400'
                  : 'bg-red-50/40 border-red-100 text-red-800 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400'
              }`}>
                {accountingHealth.isValid ? <Check size={14} className="shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
                <span><b>Statement:</b> {accountingHealth.details}</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Integrity Health Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-stone-50 dark:bg-slate-800 p-2.5 rounded-lg text-stone-600 dark:text-stone-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-gray-100">Cryptographic Integrity (डाटा सिक्योर चेन)</h3>
                <p className="text-xs text-slate-500">Transaction log block hashes status. Verifies hash-chain completeness.</p>
              </div>
            </div>
            {integrityHealth && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                integrityHealth.isValid 
                  ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400' 
                  : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
              }`}>
                {integrityHealth.isValid ? 'Secured' : 'Broken Chain'}
              </span>
            )}
          </div>

          {!integrityHealth ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-[#3b5998]" size={18} /></div>
          ) : (
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Total Checked Blocks:</span>
                <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
                  {integrityHealth.checkedCount} entries
                </span>
              </div>
              <div className={`mt-3 text-xs p-2.5 rounded-lg border flex items-start gap-2 ${
                integrityHealth.isValid
                  ? 'bg-green-50/40 border-green-100 text-green-800 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400'
                  : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400'
              }`}>
                {integrityHealth.isValid ? <Check size={14} className="shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
                <div className="flex-1 space-y-2">
                  <span>
                    {integrityHealth.isValid 
                      ? "Cryptographic link established correctly. No external block alterations detected." 
                      : `Discrepancy identified! Invalid ledger link detected at local index: ${integrityHealth.brokenIndex}.`}
                  </span>
                  {!integrityHealth.isValid && (
                    <div>
                      <button 
                        onClick={handleResetIntegrityChain}
                        className="mt-1 px-3 py-1 font-bold text-[10px] bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      >
                        Reset & Clear Broken Logs (रीसेट लेजर चेन)
                      </button>
                    </div>
                  )}
                  {integrityHealth.isValid && integrityHealth.checkedCount > 100 && (
                    <div>
                      <button 
                        onClick={handleResetIntegrityChain}
                        className="mt-1 px-2.5 py-1 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded font-bold text-[10px] block border border-dashed border-slate-200 dark:border-slate-800 transition-colors"
                      >
                        Reset Diagnostic Log History (रीसेट)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Stress Test Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg text-amber-600 dark:text-amber-400">
              <Sparkles size={20} className={isStressTesting ? "animate-pulse" : ""} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100">Live Stress Testing (परफॉरमेंस टेस्ट)</h3>
              <p className="text-xs text-slate-500">Insert 100 random sales/purchases using unblocking event-yields to verify UI responsiveness.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <button
                disabled={isLoading || isStressTesting}
                onClick={handleRunStressTest}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-[#db822a] hover:bg-[#c57221] disabled:opacity-50 text-white rounded-xl transition-all shadow-md active:scale-95"
              >
                {isStressTesting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating... {stressProgress}%
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Generate 100 Transactions
                  </>
                )}
              </button>
              
              {stressTime !== null && (
                <div className="text-xs px-3 py-1.5 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 rounded-lg border border-green-100 dark:border-green-900/30 flex items-center gap-1.5">
                  <span className="font-bold">Elapsed Time:</span>
                  <span className="font-mono font-bold bg-green-100 dark:bg-green-900 px-1.5 py-0.5 rounded">{stressTime} ms</span>
                  <span className="text-[10px] opacity-75">(~{(stressTime/100).toFixed(1)}ms / txn)</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {isStressTesting && (
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-[#db822a] h-full transition-all duration-300 rounded-full" 
                  style={{ width: `${stressProgress}%` }}
                ></div>
              </div>
            )}

            {/* Action Log Box */}
            {stressLog.length > 0 && (
              <div className="bg-slate-950 text-slate-200 p-3 rounded-lg font-mono text-[11px] max-h-40 overflow-y-auto space-y-1 border border-slate-800 shadow-inner">
                {stressLog.map((line, idx) => (
                  <div key={idx} className={line.includes('❌') ? 'text-red-400' : line.includes('🎉') ? 'text-green-400 font-bold' : ''}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
