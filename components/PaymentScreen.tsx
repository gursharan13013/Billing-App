import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Calendar, Save, Trash2, QrCode, Search, Check } from 'lucide-react';
import { Party, PaymentRecord, Invoice } from '../types';
import { billingService } from '../src/services/billingService';
import { sqliteService } from '../src/services/sqliteService';

// Scanner imports
import { Html5Qrcode } from 'html5-qrcode';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { PartySearch } from './PartySearch';
import { sharePaymentWithClient } from '../src/services/firebaseService';


interface PaymentScreenProps {
  onBack: () => void;
  type: 'Payment' | 'Receipt';
  initialParty?: Party;
  initialDate?: Date;
  initialAmount?: number;
  initialPayment?: PaymentRecord;
  savedInvoiceId?: string;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({ onBack, type, initialParty, initialDate, initialAmount, initialPayment, savedInvoiceId }) => {
  const [selectedParty, setSelectedParty] = useState<Party | null>(initialParty || null);
  const [entryType, setEntryType] = useState<'By Bill' | 'By Balance'>('By Balance');
  
  const [amount, setAmount] = useState<string>(initialAmount ? initialAmount.toString() : '');
  const [date, setDate] = useState((initialDate || new Date()).toLocalDateString());
  const [remarks, setRemarks] = useState('');
  const [partyBank, setPartyBank] = useState('');
  
  // Ledgers for Payment Type (Our Bank / Cash)
  const [ledgers, setLedgers] = useState<Party[]>([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>('');

  // Unpaid Bills
  const [unpaidBills, setUnpaidBills] = useState<Invoice[]>([]);
  const [billPayments, setBillPayments] = useState<Record<string, string>>({}); // invoiceId -> amount string

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScannerRunning = useRef(false);

  const isPayment = type === 'Payment';
  const themeColor = isPayment ? 'text-red-600' : 'text-green-600';
  const headerColor = isPayment ? 'bg-red-600' : 'bg-[#3a589e]'; // Match standard blue for receipt header

  useEffect(() => {
    // Fetch ledgers (Cash / Banks)
    billingService.getAllParties().then(parties => {
        const banksAndCash = parties.filter(p => p.accountGroup === 'Bank Account' || p.accountGroup === 'Cash In Hand' || p.name.toLowerCase() === 'cash' || p.name.toLowerCase() === 'bank');
        setLedgers(banksAndCash);
        
        // Match existing payment mode/ledger
        if (initialPayment) {
            // Find ledger by name matching mode or something
            const matchedLedger = banksAndCash.find(l => l.name === initialPayment.mode) || banksAndCash.find(l => l.name.toLowerCase() === 'cash');
            if (matchedLedger) setSelectedLedgerId(matchedLedger.id);
        } else {
            // Default to Bank, fallback to Cash
            const bankLedger = banksAndCash.find(l => l.accountGroup === 'Bank Account' || l.name.toLowerCase() === 'bank');
            const cashLedger = banksAndCash.find(l => l.accountGroup === 'Cash In Hand' || l.name.toLowerCase() === 'cash');
            if (bankLedger) setSelectedLedgerId(bankLedger.id);
            else if (cashLedger) setSelectedLedgerId(cashLedger.id);
            else if (banksAndCash.length > 0) setSelectedLedgerId(banksAndCash[0].id);
        }
    });
  }, [initialPayment]);

  useEffect(() => {
    if (initialPayment) {
        // If editing an existing payment, always use its actual amount
        const amt = initialPayment.amount.toString();
        setAmount(amt);
        setDate(initialPayment.date);
        setRemarks(initialPayment.remarks || '');
        setEntryType(initialPayment.invoiceId || savedInvoiceId ? 'By Bill' : 'By Balance');
        
        if (initialPayment.invoiceId) {
            setBillPayments({ [initialPayment.invoiceId]: amt });
        } else if (savedInvoiceId) {
            setBillPayments({ [savedInvoiceId]: amt });
        }

        billingService.getAllParties().then(parties => {
            const p = parties.find(x => x.id === initialPayment.partyId);
            if (p) setSelectedParty(p);
        });
    } else if (savedInvoiceId && initialAmount !== undefined) {
        setEntryType('By Bill');
        setBillPayments({ [savedInvoiceId]: initialAmount.toString() });
    }
  }, [initialPayment, savedInvoiceId, initialAmount]);

  // Fetch unpaid bills when party changes
  useEffect(() => {
      if (selectedParty) {
          setPartyBank(selectedParty.bankDetails || '');
      } else {
          setPartyBank('');
      }
      const loadBills = async () => {
          if (!selectedParty) {
              setUnpaidBills([]);
              return;
          }
          const allInvoices = await billingService.getInvoices(isPayment ? 'Purchase' : 'Sale');
          const partyInvoices = allInvoices.filter(i => i.partyId === selectedParty.id && (i.status !== 'PAID' || (initialPayment && i.id === initialPayment.invoiceId) || (savedInvoiceId && i.id === savedInvoiceId)));
          setUnpaidBills(partyInvoices);
      };
      loadBills();
  }, [selectedParty, isPayment]);

  const toggleScanner = async () => {
    if (isScanning) {
        stopScanner();
    } else {
        startScanner();
    }
  };

  const startScanner = async () => {
    try {
        if (Capacitor.isNativePlatform()) {
            const status = await Camera.requestPermissions();
            if (status.camera !== 'granted' && status.camera !== 'limited') {
                alert('Camera permission is required to scan QR codes.');
                return;
            }
        }
        setIsScanning(true);
        setTimeout(() => {
            scannerRef.current = new Html5Qrcode("payment-qr-reader");
            isScannerRunning.current = true;
            scannerRef.current.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                async (decodedText) => {
                    stopScanner();
                    // Process decoded text
                    const parties = await billingService.getAllParties();
                    const foundParty = parties.find(p => p.id === decodedText || p.mobile === decodedText || p.name === decodedText);
                    if (foundParty) {
                        setSelectedParty(foundParty);
                    } else {
                        alert('Party not found for this QR code.');
                    }
                },
                (errorMessage) => {}
            ).catch((err) => {
                console.error("Scanner error", err);
                stopScanner();
                alert("Failed to start camera");
            });
        }, 100);
    } catch (err) {
        console.error('Permission error:', err);
        alert('Failed to access camera.');
    }
  };

  const stopScanner = () => {
    if (scannerRef.current && isScannerRunning.current) {
        scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
            isScannerRunning.current = false;
        }).catch(err => console.error(err));
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
        if (scannerRef.current && isScannerRunning.current) {
            scannerRef.current.stop().catch(() => {}).finally(() => {
                try { scannerRef.current?.clear(); } catch(e) {}
            });
        }
    };
  }, []);

  const handleBillPaymentChange = (invoiceId: string, val: string) => {
      setBillPayments(prev => ({ ...prev, [invoiceId]: val }));
  };

  const handleSave = async () => {
    if (!selectedParty) {
        alert('Please select a Party Name.');
        return;
    }
    const selectedLedger = ledgers.find(l => l.id === selectedLedgerId);
    const modeName = selectedLedger ? selectedLedger.name : 'Unknown';

    try {
        if (entryType === 'By Balance') {
            if (!amount || parseFloat(amount) <= 0) {
                alert('Please enter a valid amount.');
                return;
            }
            
            const newPayment: PaymentRecord = {
                id: initialPayment ? initialPayment.id : `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                voucherNo: initialPayment ? initialPayment.voucherNo : `${type === 'Payment' ? 'PAY' : 'RCP'}-${Math.floor(1000 + Math.random() * 9000)}`,
                partyId: selectedParty.id,
                partyName: selectedParty.name,
                date: date,
                amount: parseFloat(amount),
                type: type,
                mode: modeName as any,
                modeLedgerId: selectedLedgerId,
                remarks: remarks,
                createdAt: initialPayment?.createdAt || Date.now(),
                ...(initialPayment && initialPayment.isSyncedToCloud !== undefined ? { isSyncedToCloud: initialPayment.isSyncedToCloud } : {})
            };
            await billingService.savePayment(newPayment, !!initialPayment);

            // Re-sync basic notification
            if (type !== 'Payment') {
                try {
                    const saved = await sqliteService.getPaymentById(newPayment.id);
                    if (saved) {
                        const result = await sharePaymentWithClient(saved);
                        if (result.success) {
                            await sqliteService.savePayment({ ...saved, isSyncedToCloud: true });
                        }
                    }
                } catch(e) {}
            }
        } else {
            // By Bill
            let hasValidPayment = false;
            
            // Collect all bills that have an amount entered
            const billsToPay = unpaidBills.filter(inv => {
                const amt = billPayments[inv.id];
                return amt && parseFloat(amt) > 0;
            });
            
            if (billsToPay.length === 0) {
                alert('Please enter payment amounts for bills.');
                return;
            }
            
            // If editing an existing payment, we only support updating that SINGLE payment record.
            if (initialPayment) {
                 // Even if they entered amounts for multiple bills, an existing payment is tied to ONE voucher.
                 // We apply it to the first bill they entered an amount for.
                 const inv = billsToPay[0];
                 const newPayment: PaymentRecord = {
                    ...initialPayment,
                    amount: parseFloat(billPayments[inv.id]),
                    mode: modeName as any,
                    modeLedgerId: selectedLedgerId,
                    remarks: remarks,
                    invoiceId: inv.id, // Update invoice ID in case they somehow switched it
                    date: date,
                    ...(initialPayment.isSyncedToCloud !== undefined ? { isSyncedToCloud: initialPayment.isSyncedToCloud } : {})
                 };
                 await billingService.savePayment(newPayment, true);
            } else {
                 // Creating entirely new payments (one per bill)
                 for (const inv of billsToPay) {
                     const newPayment: PaymentRecord = {
                          id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                          voucherNo: `${type === 'Payment' ? 'PAY' : 'RCP'}-${Math.floor(1000 + Math.random() * 9000)}`,
                          partyId: selectedParty.id,
                          partyName: selectedParty.name,
                          date: date,
                          amount: parseFloat(billPayments[inv.id]),
                          type: type,
                          mode: modeName as any,
                          modeLedgerId: selectedLedgerId,
                          remarks: remarks,
                          invoiceId: inv.id,
                          createdAt: Date.now()
                     };
                     await billingService.savePayment(newPayment, false);

                     if (type !== 'Payment') {
                         try {
                             const saved = await sqliteService.getPaymentById(newPayment.id);
                             if (saved) {
                                 const result = await sharePaymentWithClient(saved);
                                 if (result.success) {
                                     await sqliteService.savePayment({ ...saved, isSyncedToCloud: true });
                                 }
                             }
                         } catch(e) {}
                     }
                 }
            }
        }
        
        onBack();
    } catch (e) {
        console.error(e);
        alert('Failed to save');
    }
  };

  const displayBalance = selectedParty ? Math.abs(selectedParty.currentBalance).toFixed(2) : '0.00';
  const balancePrefix = selectedParty ? (selectedParty.currentBalance > 0 ? 'Debit : ' : (selectedParty.currentBalance < 0 ? 'Credit : ' : 'Balance : ')) : 'Balance : ';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Header */}
      <header className={`${headerColor} text-white p-3 pt-[max(env(safe-area-inset-top),48px)] flex justify-between items-center z-20`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-medium leading-tight">{type === 'Receipt' ? 'Receipt' : 'Payment'}</h1>
            <p className="text-sm opacity-90">{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Trash2 size={24} className="opacity-0" />
          <Check onClick={handleSave} size={28} className="cursor-pointer" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Balance and Toggles */}
        <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">{balancePrefix}{displayBalance}</h2>
            
            <div className="flex justify-center gap-6 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative flex items-center justify-center">
                        <input type="radio" className="peer sr-only" name="entryType" value="By Bill" checked={entryType === 'By Bill'} onChange={() => setEntryType('By Bill')} />
                        <div className="w-5 h-5 rounded-full border-2 border-slate-400 peer-checked:border-[#e5534b] transition-colors"></div>
                        <div className="absolute w-2.5 h-2.5 rounded-full bg-[#e5534b] opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">By Bill</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative flex items-center justify-center">
                        <input type="radio" className="peer sr-only" name="entryType" value="By Balance" checked={entryType === 'By Balance'} onChange={() => setEntryType('By Balance')} />
                        <div className="w-5 h-5 rounded-full border-2 border-slate-400 peer-checked:border-[#e5534b] transition-colors"></div>
                        <div className="absolute w-2.5 h-2.5 rounded-full bg-[#e5534b] opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">By Balance</span>
                </label>
            </div>
        </div>

        {isScanning && (
            <div className="fixed inset-0 z-50 bg-black flex flex-col pt-[max(env(safe-area-inset-top),48px)]">
                <div className="p-4 flex justify-between items-center bg-slate-900 text-white">
                    <h2 className="font-bold text-lg">Scan QR Code</h2>
                    <button onClick={stopScanner} className="px-4 py-2 bg-slate-800 rounded text-sm font-bold">Cancel</button>
                </div>
                <div id="payment-qr-reader" className="flex-1 bg-black w-full h-full"></div>
            </div>
        )}

        {/* Input Fields Container */}
        <div className="space-y-4">
            
            {/* Party Name */}
            <div>
                <label className="block text-base font-bold text-slate-900 dark:text-white mb-1">Party Name</label>
                <div className="flex gap-1 items-center">
                    <div className="flex-1 relative">
                        <PartySearch selectedParty={selectedParty} onSelect={setSelectedParty} />
                    </div>
                    <button onClick={toggleScanner} className="p-2 text-slate-900 dark:text-white flex items-center justify-center flex-shrink-0">
                        <QrCode size={28} />
                    </button>
                </div>
            </div>

            {/* Select Party Bank */}
            <div>
                 <label className="block text-base font-bold text-slate-900 dark:text-white mb-1">Select Party Bank</label>
                 <input 
                     type="text"
                     value={partyBank}
                     onChange={(e) => setPartyBank(e.target.value)}
                     className="w-full border-2 border-slate-400 rounded-md p-2 text-base font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                 />
            </div>

            {/* Payment Type */}
            <div>
                 <label className="block text-base font-bold text-slate-900 dark:text-white mb-1">Payment Type</label>
                 <select 
                     value={selectedLedgerId}
                     onChange={(e) => setSelectedLedgerId(e.target.value)}
                     className="w-full border-2 border-slate-400 rounded-md p-2.5 text-base font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none appearance-none"
                 >
                     {ledgers.map(l => (
                         <option key={l.id} value={l.id}>{l.name}</option>
                     ))}
                 </select>
            </div>

            {/* Content based on Toggle */}
            {entryType === 'By Balance' ? (
                <div>
                     <label className="block text-base font-bold text-slate-900 dark:text-white mb-1">Amount</label>
                     <input 
                         type="number"
                         value={amount}
                         onChange={(e) => setAmount(e.target.value)}
                         className="w-full border-2 border-slate-400 rounded-md p-2 text-base font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                     />
                </div>
            ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-md overflow-x-auto mt-2">
                     <table className="w-full text-sm text-left">
                         <thead className="bg-[#f0f0f0] dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                             <tr>
                                 <th className="px-3 py-2 font-bold text-slate-900 dark:text-white whitespace-nowrap">Bill. No</th>
                                 <th className="px-3 py-2 font-bold text-slate-900 dark:text-white whitespace-nowrap">Bill Total</th>
                                 <th className="px-3 py-2 font-bold text-slate-900 dark:text-white whitespace-nowrap">Payment</th>
                                 <th className="px-3 py-2 font-bold text-slate-900 dark:text-white whitespace-nowrap">Advance</th>
                             </tr>
                         </thead>
                         <tbody>
                             {unpaidBills.length === 0 ? (
                                 <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-500 font-bold">No Pending Bills</td></tr>
                             ) : unpaidBills.map(inv => {
                                 // Show default payment amount = 0
                                 return (
                                 <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-800">
                                     <td className="px-3 py-3 font-bold">{inv.invoiceNo}</td>
                                     <td className="px-3 py-3 font-bold">{inv.totalAmount.toFixed(1)}</td>
                                     <td className="px-3 py-3 font-bold">0.0</td>
                                     <td className="px-3 py-2">
                                         <input 
                                             type="number"
                                             value={billPayments[inv.id] || ''}
                                             onChange={(e) => handleBillPaymentChange(inv.id, e.target.value)}
                                             placeholder="0"
                                             className="w-24 border-2 border-slate-600 rounded p-1.5 text-base font-bold focus:outline-none bg-white dark:bg-slate-900 dark:text-white text-slate-900"
                                         />
                                     </td>
                                 </tr>
                                 )
                             })}
                         </tbody>
                     </table>
                </div>
            )}

            {/* Naration */}
            <div>
                 <label className="block text-base font-bold text-slate-900 dark:text-white mb-1">Naration</label>
                 <input 
                     type="text"
                     value={remarks}
                     onChange={(e) => setRemarks(e.target.value)}
                     className="w-full border-2 border-slate-400 rounded-md p-2 text-base font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                 />
            </div>
            
        </div>

      </div>

      {/* Bottom Save Button */}
      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white dark:bg-slate-950">
          <button 
              onClick={handleSave}
              className={`w-full ${headerColor} text-white font-bold text-lg py-3 rounded-sm shadow-md active:scale-95 transition-transform`}
          >
              SAVE
          </button>
      </div>
    </div>
  );
};
