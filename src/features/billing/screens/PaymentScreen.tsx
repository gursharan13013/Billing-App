import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Calendar, Save, Trash2, QrCode, Search, Check, 
  User, Landmark, CreditCard, Coins, AlignLeft, FileSpreadsheet, 
  Trash, Bookmark, Tag, AlertCircle, Info, Receipt, Landmark as BankIcon
} from 'lucide-react';
import { Party, PaymentRecord, Invoice } from '../../../core/types/';
import { billingService } from '../../../services/billingService';
import { sqliteService } from '../../../services/sqliteService';
import { motion, AnimatePresence } from 'motion/react';

// Scanner imports
import { Html5Qrcode } from 'html5-qrcode';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { PartySearch } from '../../../components/shared/PartySearch';
import { sharePaymentWithClient } from '../../../services/firebaseService';

interface PaymentScreenProps {
  onBack: () => void;
  type: 'Payment' | 'Receipt';
  initialParty?: Party;
  initialDate?: Date;
  initialAmount?: number;
  initialPayment?: PaymentRecord;
  savedInvoiceId?: string;
  currentLanguage?: 'en' | 'hi';
}

const translations = {
  en: {
    receipt: 'Receipt Entry',
    payment: 'Payment Entry',
    byBill: 'By Bill Reference',
    byBalance: 'By General Balance',
    partyName: 'Party Name',
    partyBankDetails: 'Select Party Bank',
    paymentType: 'Payment Mode / Type',
    amount: 'Amount (₹)',
    narration: 'Narration / Remarks',
    billNo: 'Bill No.',
    billTotal: 'Total Balance',
    paid: 'Applied',
    advance: 'Payment Amt',
    noPendingBills: 'No Pending Bills Found for this Partner',
    save: 'SAVE RECORD',
    scanQr: 'SCAN QR CODE',
    cancel: 'Cancel',
    errPartyRequired: 'Please select a Party Name to proceed.',
    errAmountRequired: 'Please enter a valid numerical amount.',
    errBillAmountRequired: 'Please enter payment amounts for the chosen bills.',
    errSaveFailed: 'Failed to save transaction details.',
    partyNotFound: 'Zero party records matched this QR code.',
    cameraPermission: 'Camera permission is required to search parties via QR.',
    cameraFailed: 'Access to the physical camera hardware failed.',
    cameraStartFailed: 'Unable to start camera scanner feed.',
    debit: 'Debit Account',
    credit: 'Credit Account',
    balance: 'Clear Balance',
    dateLabel: 'Transaction Value Date',
    selectPartyPlaceholder: 'Select partner ledger or scan QR...',
    bankDetailsPlaceholder: 'Enter custom bank details...',
    enterAmountPlaceholder: 'Enter transaction amount in ₹...',
    remarksPlaceholder: 'e.g. Cleared via UPI / Cash / Online Transfer',
    billAmtPlaceholder: '0.00',
    deleteConfirm: 'Are you absolutely sure you want to permanently delete this billing payment record?',
    successSave: 'Payment records successfully written!',
    scanBtn: 'Scan Client QR',
    activeVoucher: 'Voucher Code'
  },
  hi: {
    receipt: 'रसीद एंट्री (Receipt)',
    payment: 'भुगतान एंट्री (Payment)',
    byBill: 'बिल अनुसार (By Bill)',
    byBalance: 'सामान्य शेष अनुसार (By Balance)',
    partyName: 'पक्ष का नाम (Party Name)',
    partyBankDetails: 'पक्ष का बैंक विवरण (Select Party Bank)',
    paymentType: 'भुगतान का प्रकार (Payment Type)',
    amount: 'भुगतान राशि (₹ - Amount)',
    narration: 'विवरण / नरेशन (Narration)',
    billNo: 'बिल सं.',
    billTotal: 'कुल शेष',
    paid: 'लागू राशि',
    advance: 'भुगतान',
    noPendingBills: 'इस साझेदार के लिए कोई लंबित बिल नहीं मिला',
    save: 'रिकॉर्ड सुरक्षित करें',
    scanQr: 'क्यूआर कोड स्कैन करें',
    cancel: 'रद्द करें',
    errPartyRequired: 'कृपया आगे बढ़ने के लिए एक पक्ष (Party Name) चुनें।',
    errAmountRequired: 'कृपया एक मान्य संख्यात्मक राशि दर्ज करें।',
    errBillAmountRequired: 'कृपया चुने गए बिलों के लिए भुगतान राशि दर्ज करें।',
    errSaveFailed: 'लेनदेन विवरण सहेजने में विफल।',
    partyNotFound: 'इस क्यूआर कोड से कोई पक्ष मेल नहीं खाता।',
    cameraPermission: 'कैमरा स्कैनर सक्षम करने की अनुमति आवश्यक है।',
    cameraFailed: 'कैमरा हार्डवेयर एक्सेस करने में विफलता।',
    cameraStartFailed: 'कैमरा स्कैनर आरंभ करने में विफलता।',
    debit: 'डेबिट खाता (Debit)',
    credit: 'क्रेडिट खाता (Credit)',
    balance: 'सामान्य शेष',
    dateLabel: 'लेनदेन मूल्य तिथि',
    selectPartyPlaceholder: 'साझेदार चुनें या क्यूआर स्कैन करें...',
    bankDetailsPlaceholder: 'बैंक का नाम या विवरण दर्ज करें...',
    enterAmountPlaceholder: 'भुगतान राशि दर्ज करें (₹)...',
    remarksPlaceholder: 'उदा. यूपीआई / नकद / ऑनलाइन ट्रांसफर द्वारा भुगतान',
    billAmtPlaceholder: '0.00',
    deleteConfirm: 'क्या आप वाकई इस भुगतान रिकॉर्ड को स्थायी रूप से हटाना चाहते हैं?',
    successSave: 'भुगतान सफलतापूर्वक सुरक्षित किया गया!',
    scanBtn: 'स्कैन क्यूआर',
    activeVoucher: 'वाउचर संख्या'
  }
};

export const PaymentScreen: React.FC<PaymentScreenProps> = ({ 
  onBack, 
  type, 
  initialParty, 
  initialDate, 
  initialAmount, 
  initialPayment, 
  savedInvoiceId,
  currentLanguage = 'en'
}) => {
  const isHi = currentLanguage === 'hi';
  const t = isHi ? translations.hi : translations.en;

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

  // Custom Alert & Confirm Modals State
  const [alertConfig, setAlertConfig] = useState<{ message: string; title?: string; type: 'alert' | 'confirm'; onConfirm?: () => void } | null>(null);

  const showCustomAlert = (message: string, title?: string) => {
    setAlertConfig({ message, title, type: 'alert' });
  };

  const showCustomConfirm = (message: string, onConfirm: () => void, title?: string) => {
    setAlertConfig({ message, title, type: 'confirm', onConfirm });
  };

  const isPayment = type === 'Payment';
  const headerThemeClass = isPayment 
    ? 'from-red-600 to-red-700 dark:from-red-950/40 dark:to-red-900/30 text-white' 
    : 'from-emerald-600 to-emerald-700 dark:from-slate-900 dark:to-slate-950 text-white';

  const badgeColorClass = isPayment
    ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/40'
    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40';

  useEffect(() => {
    // Fetch ledgers (Cash / Banks)
    billingService.getAllParties().then(parties => {
        const banksAndCash = parties.filter(p => p.accountGroup === 'Bank Account' || p.accountGroup === 'Cash In Hand' || p.name.toLowerCase() === 'cash' || p.name.toLowerCase() === 'bank');
        setLedgers(banksAndCash);
        
        // Match existing payment mode/ledger
        if (initialPayment) {
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
  }, [selectedParty, isPayment, initialPayment, savedInvoiceId]);

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
                showCustomAlert(t.cameraPermission, "Permission Denied");
                return;
            }
        }
        setIsScanning(true);
        setTimeout(() => {
            try {
                scannerRef.current = new Html5Qrcode("payment-qr-reader");
                isScannerRunning.current = true;
                scannerRef.current.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    async (decodedText) => {
                        stopScanner();
                        const parties = await billingService.getAllParties();
                        const foundParty = parties.find(p => p.id === decodedText || p.mobile === decodedText || p.name === decodedText);
                        if (foundParty) {
                            setSelectedParty(foundParty);
                        } else {
                            showCustomAlert(t.partyNotFound, "Search Result");
                        }
                    },
                    (errorMessage) => {}
                ).catch((err) => {
                    console.error("Scanner error", err);
                    stopScanner();
                    showCustomAlert(t.cameraStartFailed, "Scanner Error");
                });
            } catch (errX) {
                console.error(errX);
                stopScanner();
            }
        }, 150);
    } catch (err) {
        console.error('Permission error:', err);
        showCustomAlert(t.cameraFailed, "Scanner Error");
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

  const handleDelete = () => {
    if (!initialPayment) return;
    const confirmMessage = isPayment 
      ? (isHi ? 'क्या आप वाकई इस भुगतान रिकॉर्ड को स्थायी रूप से हटाना चाहते हैं?' : 'Are you absolutely sure you want to permanently delete this billing payment record?')
      : (isHi ? 'क्या आप वाकई इस रसीद रिकॉर्ड को स्थायी रूप से हटाना चाहते हैं?' : 'Are you absolutely sure you want to permanently delete this receipt record?');

    showCustomConfirm(
        confirmMessage,
        async () => {
            try {
                await billingService.deletePayment(initialPayment.id);
                onBack();
            } catch (e) {
                console.error(e);
                showCustomAlert(t.errSaveFailed, "Delete Failure");
            }
        },
        isHi ? "हटाना सुनिश्चित करें" : "Confirm Deletion"
    );
  };

  const handleSave = async () => {
    if (!selectedParty) {
        showCustomAlert(t.errPartyRequired, isHi ? "त्रुटि" : "Required Field");
        return;
    }
    const selectedLedger = ledgers.find(l => l.id === selectedLedgerId);
    const modeName = selectedLedger ? selectedLedger.name : 'Unknown';

    try {
        if (entryType === 'By Balance') {
            if (!amount || parseFloat(amount) <= 0) {
                showCustomAlert(t.errAmountRequired, isHi ? "त्रुटि" : "Invalid Amount");
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
            let hasValidPayment = false;
            const billsToPay = unpaidBills.filter(inv => {
                const amt = billPayments[inv.id];
                return amt && parseFloat(amt) > 0;
            });
            
            if (billsToPay.length === 0) {
                showCustomAlert(t.errBillAmountRequired, isHi ? "त्रुटि" : "Details Required");
                return;
            }
            
            if (initialPayment) {
                 const inv = billsToPay[0];
                 const newPayment: PaymentRecord = {
                    ...initialPayment,
                    amount: parseFloat(billPayments[inv.id]),
                    mode: modeName as any,
                    modeLedgerId: selectedLedgerId,
                    remarks: remarks,
                    invoiceId: inv.id,
                    date: date,
                    ...(initialPayment.isSyncedToCloud !== undefined ? { isSyncedToCloud: initialPayment.isSyncedToCloud } : {})
                 };
                 await billingService.savePayment(newPayment, true);
            } else {
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
        showCustomAlert(t.errSaveFailed, "Save Failure");
    }
  };

  const displayBalance = selectedParty ? Math.abs(selectedParty.currentBalance).toFixed(2) : '0.00';
  const balancePrefix = selectedParty 
    ? (selectedParty.currentBalance > 0 ? t.debit : (selectedParty.currentBalance < 0 ? t.credit : t.balance)) 
    : t.balance;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Dynamic Styled Header */}
      <header className={`bg-gradient-to-r ${headerThemeClass} p-4 pt-[max(env(safe-area-inset-top),48px)] flex justify-between items-center z-20 shadow-md relative overflow-hidden`}>
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={onBack} 
            className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="font-sans">
            <h1 className="text-lg font-extrabold tracking-tight leading-tight flex items-center gap-1.5">
              <span>{type === 'Receipt' ? t.receipt : t.payment}</span>
            </h1>
            <p className="text-[10px] opacity-85 font-semibold tracking-wider uppercase font-mono mt-0.5">
              {new Intl.DateTimeFormat(isHi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {initialPayment && (
            <button 
              type="button"
              onClick={handleDelete}
              className="p-2.5 bg-red-500/20 hover:bg-red-500/30 active:scale-95 text-red-100 rounded-xl transition-all cursor-pointer mr-1"
              title={isHi ? 'हटाएं' : 'Delete'}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button 
            type="button"
            onClick={handleSave}
            className="p-2.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center"
            title={t.save}
          >
            <Check size={20} className="stroke-[3px]" />
          </button>
        </div>
      </header>

      {/* Main Content Pane */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
        
        {/* State Information Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Balance Widget Display */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl shadow-xs text-center flex flex-col items-center justify-center relative overflow-hidden transition-colors">
            {selectedParty ? (
              <>
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 mb-1">
                  {selectedParty.name}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 mr-0.5">₹</span>
                  <span className="text-3.5xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                    {Number(displayBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className={`mt-2 flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-extrabold shadow-3xs ${badgeColorClass}`}>
                  <span className={selectedParty.currentBalance > 0 ? "text-amber-500 font-bold" : selectedParty.currentBalance < 0 ? "text-emerald-500 font-bold" : "text-slate-400"}>
                    ●
                  </span>
                  <span>{balancePrefix}</span>
                </div>
              </>
            ) : (
              <div className="py-4 text-center">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-850 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400">
                  <User size={18} />
                </div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 max-w-[200px] mx-auto leading-normal">
                  {t.selectPartyPlaceholder}
                </p>
              </div>
            )}
          </div>

          {/* Type Selection Segmented Pill */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl shadow-xs flex flex-col justify-center transition-colors">
            {initialPayment && (
              <div className="mb-3 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/65 border border-slate-100 dark:border-slate-800 rounded-xl flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t.activeVoucher}</span>
                <span className="text-xs font-mono font-extrabold text-slate-800 dark:text-slate-350">{initialPayment.voucherNo}</span>
              </div>
            )}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/40 rounded-xl w-full">
              <button
                type="button"
                onClick={() => setEntryType('By Bill')}
                className={`flex-1 py-2.5 text-xs font-extrabold rounded-lg transition-all duration-200 cursor-pointer text-center ${
                  entryType === 'By Bill'
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs font-black'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-bold'
                }`}
              >
                {t.byBill}
              </button>
              <button
                type="button"
                onClick={() => setEntryType('By Balance')}
                className={`flex-1 py-2.5 text-xs font-extrabold rounded-lg transition-all duration-200 cursor-pointer text-center ${
                  entryType === 'By Balance'
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs font-black'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-bold'
                }`}
              >
                {t.byBalance}
              </button>
            </div>
          </div>
        </motion.div>

        {/* QR Scanner Overlay modal inside application viewport */}
        {isScanning && (
            <div className="fixed inset-0 z-50 bg-black flex flex-col pt-[max(env(safe-area-inset-top),48px)]">
                <div className="p-4 flex justify-between items-center bg-slate-900 border-b border-slate-800 text-white font-sans">
                    <h2 className="font-extrabold text-sm tracking-widest uppercase">{t.scanQr}</h2>
                    <button 
                      type="button"
                      onClick={stopScanner} 
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-705 text-white active:scale-95 rounded-xl text-xs font-bold transition-transform cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                </div>
                <div id="payment-qr-reader" className="flex-1 bg-black w-full h-full"></div>
            </div>
        )}

        {/* Form Inputs Container */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-2xl shadow-xs space-y-4 transition-colors text-left"
        >
            {/* Party Select Input Grid */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <User size={13} className="text-slate-400" />
                  {t.partyName}
                </label>
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex-1 relative">
                  <PartySearch selectedParty={selectedParty} onSelect={setSelectedParty} />
                </div>
                <button 
                  type="button"
                  onClick={toggleScanner} 
                  className={`p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-250 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition-all flex items-center justify-center shrink-0 shadow-3xs cursor-pointer h-[46px] w-[46px] active:scale-95 ${isScanning ? 'ring-2 ring-indigo-500 animate-pulse' : ''}`}
                  title={t.scanBtn}
                >
                  <QrCode size={18} className="text-indigo-600 dark:text-indigo-400 stroke-[2.2px]" />
                </button>
              </div>
            </div>

            {/* Select Party Bank Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Landmark size={13} className="text-slate-400" />
                {t.partyBankDetails}
              </label>
              <input 
                type="text"
                value={partyBank}
                onChange={(e) => setPartyBank(e.target.value)}
                placeholder={t.bankDetailsPlaceholder}
                className="w-full border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-slate-800 dark:text-slate-150 font-bold outline-none focus:border-slate-400 dark:focus:border-slate-700 transition-all shadow-3xs hover:bg-slate-50 dark:hover:bg-slate-950/80"
              />
            </div>

            {/* Payment Type Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <CreditCard size={13} className="text-slate-400" />
                {t.paymentType}
              </label>
              <div className="relative">
                <select 
                  value={selectedLedgerId}
                  onChange={(e) => setSelectedLedgerId(e.target.value)}
                  className="w-full border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl py-2.5 px-3.5 pr-10 text-xs sm:text-sm text-slate-800 dark:text-slate-150 font-bold outline-none focus:border-slate-400 dark:focus:border-slate-700 transition-all appearance-none cursor-pointer shadow-3xs"
                >
                  {ledgers.map(l => (
                    <option key={l.id} value={l.id} className="font-bold">{l.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                  <svg className="fill-current h-4.5 w-4.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Date Display Pill Row */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                {t.dateLabel}
              </label>
              <div className="w-full border border-slate-205 dark:border-slate-805 bg-slate-100/55 dark:bg-slate-950/20 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-slate-550 dark:text-slate-400 font-bold outline-none flex items-center gap-2 select-none">
                <Calendar size={14} className="text-slate-400" />
                <span>{new Intl.DateTimeFormat(isHi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date))}</span>
              </div>
            </div>

            {/* Amount / Unpaid Bills Conditional Grid Block */}
            {entryType === 'By Balance' ? (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Coins size={13} className="text-slate-400" />
                    {t.amount}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-black text-xs sm:text-sm">
                      ₹
                    </div>
                    <input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={t.enterAmountPlaceholder}
                      className="w-full border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl py-2.5 pl-8 pr-3.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-bold outline-none focus:border-slate-400 dark:focus:border-slate-700 transition-all shadow-3xs"
                    />
                  </div>
                </div>
            ) : (
                <div className="space-y-2 animate-fadeIn">
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FileSpreadsheet size={13} className="text-slate-400" />
                    {isHi ? 'लंबित बिल संदर्भ सूची' : 'Pending Invoice References'}
                  </label>
                  
                  {unpaidBills.length === 0 ? (
                      <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl text-center flex flex-col items-center justify-center space-y-1.5">
                        <FileSpreadsheet size={28} className="text-slate-350 dark:text-slate-650" />
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                          {t.noPendingBills}
                        </p>
                      </div>
                  ) : (
                      <div className="border border-slate-100 dark:border-slate-800/60 rounded-xl overflow-hidden shadow-3xs bg-slate-50/30 dark:bg-slate-950/10">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-105 dark:bg-slate-950/45 border-b border-slate-200 dark:border-slate-800/70">
                            <tr>
                              <th className="px-3.5 py-2.5 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{t.billNo}</th>
                              <th className="px-3.5 py-2.5 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{t.billTotal}</th>
                              <th className="px-3.5 py-2.5 text-[9px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400">{t.paid}</th>
                              <th className="px-3.5 py-2.5 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">{t.advance}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                            {unpaidBills.map(inv => (
                              <tr key={inv.id} className="hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-colors">
                                <td className="px-3.5 py-2.5 text-xs font-bold text-slate-850 dark:text-slate-250">{inv.invoiceNo}</td>
                                <td className="px-3.5 py-2.5 text-xs font-extrabold text-slate-800 dark:text-slate-250">₹{inv.totalAmount.toFixed(2)}</td>
                                <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-400">₹0.00</td>
                                <td className="px-3.5 py-1 text-right">
                                  <div className="inline-flex items-center relative">
                                    <span className="absolute left-2.5 text-[11px] text-slate-450 font-extrabold">₹</span>
                                    <input 
                                      type="number"
                                      value={billPayments[inv.id] || ''}
                                      onChange={(e) => handleBillPaymentChange(inv.id, e.target.value)}
                                      placeholder={t.billAmtPlaceholder}
                                      className="w-20 border border-slate-250 dark:border-slate-755 rounded-lg py-1 pl-4.5 pr-2 text-xs font-bold focus:outline-none focus:border-slate-400 dark:focus:border-slate-700 bg-white dark:bg-slate-950 text-slate-850 dark:text-white text-right"
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                  )}
                </div>
            )}

            {/* Remarks / Narration */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <AlignLeft size={13} className="text-slate-400" />
                {t.narration}
              </label>
              <input 
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={t.remarksPlaceholder}
                className="w-full border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-slate-800 dark:text-slate-150 font-bold outline-none focus:border-slate-400 dark:focus:border-slate-700 transition-all shadow-3xs hover:bg-slate-50 dark:hover:bg-slate-950/80"
              />
            </div>
        </motion.div>
      </div>

      {/* Premium Sticky Action Footer */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850/60 shadow-lg relative z-10 transition-colors">
          <button 
              type="button"
              onClick={handleSave}
              className={`w-full bg-gradient-to-r ${isPayment ? 'from-red-650 to-red-700 dark:from-red-700 dark:to-red-800' : 'from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800'} text-white font-extrabold text-sm tracking-widest py-3.5 rounded-2xl shadow-md active:scale-95 hover:shadow-lg hover:brightness-105 transition-all uppercase flex items-center justify-center gap-2 cursor-pointer`}
          >
              <Save size={16} className="stroke-[2.5px]" />
              <span>{t.save}</span>
          </button>
      </div>

      {/* Accessible Glass-morphic Backdrop Dynamic Dialog Modal */}
      <AnimatePresence>
        {alertConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-3xs select-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-2xl text-center"
            >
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-650 dark:text-indigo-400">
                <AlertCircle size={24} className="stroke-[2.5px]" />
              </div>
              {alertConfig.title && (
                <h4 className="text-sm font-black text-slate-800 dark:text-white tracking-wider uppercase mb-1.5 font-sans">
                  {alertConfig.title}
                </h4>
              )}
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-5 leading-relaxed font-sans px-2">
                {alertConfig.message}
              </p>
              <div className="flex gap-2 font-sans">
                {alertConfig.type === 'confirm' && (
                  <button 
                    type="button"
                    onClick={() => setAlertConfig(null)}
                    className="flex-1 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => {
                    if (alertConfig.onConfirm) alertConfig.onConfirm();
                    setAlertConfig(null);
                  }}
                  className={`flex-1 py-2.5 text-xs font-black text-white hover:opacity-90 rounded-xl shadow-xs transition-all cursor-pointer bg-gradient-to-r ${isPayment ? 'from-red-600 to-red-650' : 'from-indigo-600 to-violet-650'}`}
                >
                  {isHi ? "आगे बढ़ें (OK)" : "OK"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
