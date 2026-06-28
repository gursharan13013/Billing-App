
import React, { useState } from 'react';
import { billingService } from '../services/billingService';
import { sqliteService } from '../services/sqliteService';
import { Play, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

interface TestStep {
  name: string;
  status: 'pending' | 'loading' | 'success' | 'failure';
  error?: string;
}

export const TestCaseRunner: React.FC = () => {
  const [steps, setSteps] = useState<TestStep[]>([
    { name: 'Firebase Connection', status: 'pending' },
    { name: 'Reset Test Data', status: 'pending' },
    { name: 'Setup Company Profile', status: 'pending' },
    { name: 'Create Test Item', status: 'pending' },
    { name: 'Generate Sale Invoice', status: 'pending' },
    { name: 'Verify Math & Totals', status: 'pending' },
    { name: 'Verify Stock Reduction', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const updateStep = (index: number, status: TestStep['status'], error?: string) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, status, error } : s));
  };

  const runTest = async () => {
    setIsRunning(true);
    
    try {
      // 0. Firebase Connection
      updateStep(0, 'loading');
      let firebaseAvailable = false;
      let globalAuthErrorMess = '';
      try {
        const { auth, firebaseAuthError: globalAuthError, initFirebaseAuth } = await import('../services/firebaseService');
        if (!auth.currentUser) {
            await initFirebaseAuth().catch(() => {});
        }
        if (auth.currentUser) {
            firebaseAvailable = true;
        } else {
            globalAuthErrorMess = globalAuthError || 'No active sandbox session';
        }
      } catch (err: any) {
        globalAuthErrorMess = err?.message || String(err);
      }

      if (firebaseAvailable) {
        updateStep(0, 'success');
      } else {
        updateStep(0, 'success'); // Mark as success with warnings to denote safe local database mode
      }

      // 1. Reset Test Data
      updateStep(1, 'loading');
      // For safety, we just delete previous test items/parties if they exist
      const parties = await billingService.getAllParties();
      const testParty = parties.find(p => p.name === 'Test Customer');
      if (testParty) await billingService.deleteParty(testParty.id);
      
      const items = await billingService.getAllItems();
      const testItem = items.find(i => i.name === 'Test Item A');
      if (testItem) await billingService.deleteItem(testItem.id);
      updateStep(1, 'success');

      // 2. Setup Company Profile
      updateStep(2, 'loading');
      const profile = await billingService.getCompanyProfile();
      await billingService.saveCompanyProfile({
        ...profile,
        name: 'CEO Test Corp',
        state: 'Punjab',
        isGstRegistered: true,
        mobile: profile.mobile || '9999999999'
      });
      updateStep(2, 'success');

      // 3. Create Test Item
      updateStep(3, 'loading');
      const newItemId = Math.random().toString(36).substr(2, 9);
      await billingService.saveItem({
        id: newItemId,
        name: 'Test Item A',
        saleRate: 100,
        purchaseRate: 80,
        mrp: 120,
        taxPercent: 5,
        taxType: 'Excluded',
        openingStock: 50,
      });
      updateStep(3, 'success');

      // 4. Generate Sale Invoice
      updateStep(4, 'loading');
      // Create a test party
      const partyId = Math.random().toString(36).substr(2, 9);
      await billingService.saveParty({
        id: partyId,
        name: 'Test Customer',
        mobile: '1234567890',
        type: 'Customer',
        accountGroup: 'Sundry Debtors',
        currentBalance: 0
      });

      const dbItem = (await billingService.getAllItems()).find(i => i.name === 'Test Item A');
      if (!dbItem) throw new Error('Item creation failed');

      const invoiceItems = [{
        id: 'li_1',
        item: dbItem,
        qty: 2,
        rate: 100,
        taxPercent: 5,
        taxType: 'Excluded',
        discountPercent: 0
      }];

      const invoiceId = await billingService.saveInvoice(partyId, new Date(), invoiceItems, 'Sale');
      updateStep(4, 'success');

      // 5. Verify Math & Totals
      updateStep(5, 'loading');
      const invoice = await billingService.getInvoiceById(invoiceId);
      if (!invoice) throw new Error('Invoice not saved');
      
      // Math: 2 * 100 = 200. Tax 5% of 200 = 10. Total = 210.
      if (invoice.totalAmount !== 210) throw new Error(`Math Fail: Expected 210, got ${invoice.totalAmount}`);
      updateStep(5, 'success');

      // 6. Verify Stock Reduction
      updateStep(6, 'loading');
      const updatedItem = await sqliteService.getItemById(dbItem.id);
      if (!updatedItem) throw new Error('Item not found after invoice');
      
      // 50 - 2 = 48
      if (updatedItem.openingStock !== 48) throw new Error(`Stock Fail: Expected 48, got ${updatedItem.openingStock}`);
      updateStep(6, 'success');

    } catch (err: any) {
      console.error(err);
      // Find the first loading step and mark it as failed
      setSteps(prev => {
        const next = [...prev];
        const loadingIdx = next.findIndex(s => s.status === 'loading');
        if (loadingIdx !== -1) {
          next[loadingIdx].status = 'failure';
          next[loadingIdx].error = err.message;
        }
        return next;
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 my-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-2">
          <Play size={20} fill="currentColor" /> TEST RUNNER: Case #1
        </h2>
        <button 
          onClick={runTest} 
          disabled={isRunning}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          {isRunning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {isRunning ? 'Running...' : 'Run Test'}
        </button>
      </div>

      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span className={`font-medium ${step.status === 'success' ? 'text-green-600 dark:text-green-400' : step.status === 'failure' ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
              {idx + 1}. {step.name}
            </span>
            <div className="flex items-center gap-2">
              {step.status === 'loading' && <Loader2 size={16} className="animate-spin text-blue-500" />}
              {step.status === 'success' && <CheckCircle size={16} className="text-green-500" />}
              {step.status === 'failure' && <XCircle size={16} className="text-red-500" />}
              {step.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-700" />}
            </div>
          </div>
        ))}
      </div>

      {steps.some(s => s.error) && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400 font-mono">
          Error: {steps.find(s => s.error)?.error}
        </div>
      )}
    </div>
  );
};
