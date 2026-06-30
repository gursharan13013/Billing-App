
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  ArrowLeft, Calendar, ArrowRight, ScanBarcode, 
  Share2, Save, MessageCircle, Eye, MoreHorizontal, ChevronDown, X, Edit, Trash2, Plus, Receipt, Copy, Check
} from 'lucide-react';
import { Party, InvoiceItem, Item, TransactionType, Language, PaymentRecord, CompanyProfile, Invoice } from '../../../core/types/';
import { BillingService as billingService, BillingService } from '../../../services/SecureBillingService';
import { InventoryService } from '../../../services/inventoryService';
import { useAuth } from '../../../context/AuthContext';
import { PermissionWrapper } from '../../../components/shared/PermissionWrapper';
import { sqliteService } from '../../../services/sqliteService';
import { PartySearch } from '../../../components/shared/PartySearch';
import { shareInvoiceWithClient, sharePaymentWithClient } from '../../../services/firebaseService';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';


interface InvoiceScreenProps {
  onBack: () => void;
  transactionType: TransactionType;
  language: Language;
  onNavigate?: (screen: 'payment' | 'orderList' | 'businessReport' | 'itemList', type?: string, party?: Party | null, amount?: number, savedInvoiceId?: string, extraParams?: any) => void;
  invoiceId?: string; // Prop for Editing
  initialDate?: Date; // Receive global date
  initialParty?: Party; // New Prop for Scanner
  initialItems?: InvoiceItem[]; // New Prop for AI Pre-filling
}

// Helper to translate Transaction Type to Hindi
const getHindiTransactionType = (type: TransactionType) => {
  switch (type) {
    case 'Sale': return 'सेल';
    case 'Purchase': return 'परचेज';
    case 'Sale Return': return 'सेल रिटर्न';
    case 'Purchase Return': return 'परचेज रिटर्न';
    case 'Sale Order': return 'सेल ऑर्डर';
    case 'Purchase Order': return 'परचेज ऑर्डर';
    default: return type;
  }
};

export const InvoiceScreen: React.FC<InvoiceScreenProps> = ({ 
    onBack, transactionType, language, onNavigate, invoiceId, 
    initialDate, initialParty, initialItems 
}) => {
  // --- Global State ---
  const authContext = useAuth();
  const [selectedParty, setSelectedParty] = useState<Party | null>(initialParty || null);
  const [items, setItems] = useState<InvoiceItem[]>(initialItems || []);
  
  // USE INITIAL DATE if provided (New Entry), otherwise use today. 
  const [today, setToday] = useState(initialDate || new Date());
  const [loading, setLoading] = useState(true);
  const [linkedPayments, setLinkedPayments] = useState<PaymentRecord[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  
  // --- Payment Modal State ---
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentMode, setNewPaymentMode] = useState<'Cash' | 'Bank' | 'Online'>('Cash');
  const [isOnlineImported, setIsOnlineImported] = useState(false);

  // --- Form State ---
  const [saleNo, setSaleNo] = useState('...');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  const defaultEntryItem = {
    code: '',
    name: '',
    mrp: 0,
    rate: 0,
    qty: 1,
    taxType: 'Excluded' as 'Excluded' | 'Included',
    taxPercent: 0,
    purchaseRate: 0,
    discPercent: 0,
    itemRef: null as Item | null
  };

  const [entryItem, setEntryItem] = useState(defaultEntryItem);

  const [itemSuggestions, setItemSuggestions] = useState<Item[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Cache for fast barcode lookup
  const allItemsRef = useRef<Item[]>([]);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // --- Scanner State ---
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScannerRunning = useRef(false);

  // Fetch items logic, taking supplier into account if applicable
  useEffect(() => {
    const fetchItems = async () => {
      let isSupplierTx = transactionType === 'Purchase Order' || transactionType === 'Purchase' || transactionType === 'Purchase Return';
      
      if (isSupplierTx && selectedParty) {
        const mappings = await billingService.getSupplierItems(selectedParty.id);
        if (transactionType === 'Purchase Order' && mappings.length === 0 && !invoiceId) {
            alert('कृपया सप्लायर से item मंगवाए\n(This supplier has not sent any items to you yet. You can only order items that they have sent you previously.)');
            setSelectedParty(null);
            allItemsRef.current = [];
        } else if (mappings.length > 0) {
          const itemIds = mappings.map(m => m.itemId);
          const allItems = await billingService.getAllItems();
          allItemsRef.current = allItems.filter(i => itemIds.includes(i.id));
        } else {
           const allItems = await billingService.getAllItems();
           allItemsRef.current = allItems;
        }
      } else {
        const allItems = await billingService.getAllItems();
        allItemsRef.current = allItems;
      }
    };
    fetchItems();
  }, [selectedParty, transactionType, invoiceId]);

  // --- Load Data for Edit Mode / Next Voucher No ---
  useEffect(() => {
      const initialize = async () => {
          setLoading(true);
          try {
            const profile = await billingService.getCompanyProfile();
            setCompanyProfile(profile);
            
            // Replaced default pre-fetch, see fetchItems useEffect above.
            const allItems = await billingService.getAllItems();
            allItemsRef.current = allItems;

            if (invoiceId) {
                let invoiceData: any = null;

                // Special handling for Orders (they are in a different table)
                if (transactionType === 'Sale Order' || transactionType === 'Purchase Order') {
                    const order = await billingService.getOrderById(invoiceId);
                    if (order) invoiceData = order;
                }
                
                // If not found in orders (or it's a regular invoice), check invoices table
                if (!invoiceData) {
                    invoiceData = await billingService.getInvoiceById(invoiceId);
                }

                if (invoiceData) {
                    setSaleNo(invoiceData.invoiceNo || invoiceData.orderNumber);
                    setToday(Date.fromLocalDateString(invoiceData.date));
                    setIsOnlineImported(!!invoiceData.isOnlineImport);
                    
                    // Safely parse items to prevent crashes
                    if(invoiceData.items && Array.isArray(invoiceData.items)) {
                        // Parse items
                        const latestItems = await billingService.getAllItems();
                        const parsedItems = invoiceData.items.map((i: any) => {
                            const latestItem = i.item?.id ? latestItems.find(li => li.id === i.item.id) : null;
                            return {
                            ...i,
                            // Ensure numeric values are numbers
                            qty: Number(i.qty) || 0,
                            rate: Number(i.rate) || 0,
                            mrp: Number(i.mrp) || 0,
                            taxPercent: Number(i.taxPercent) || 0,
                            discountPercent: Number(i.discountPercent) || 0,
                            // Ensure item object structure exists and enrich with latest data
                            item: latestItem ? { ...i.item, ...latestItem } : (i.item ? i.item : { id: 'unknown', name: i.name || 'Unknown Item' })
                            };
                        });
                        setItems(parsedItems);
                    }
                    
                    // Fetch Party Details
                    const party = await billingService.getPartyById(invoiceData.partyId);
                    if (party) setSelectedParty(party);

                    // Fetch Linked Payments (only if it's an invoice)
                    if (!transactionType.includes('Order')) {
                        const payments = await billingService.getPaymentsByInvoiceId(invoiceId);
                        setLinkedPayments(payments);
                    }
                }
            } else {
                // Load Next Voucher Number from Settings
                const nextNo = await billingService.generateNextVoucherNo(transactionType);
                setSaleNo(nextNo);
                
                // Handle Initial Party (from Scanner or AI)
                if (initialParty && !invoiceId) {
                    setSelectedParty(initialParty);
                } else if (!invoiceId) {
                    // Make default customer "Cash"
                    const parties = await billingService.getAllParties();
                    let cashParty = parties.find(p => p.name.toLowerCase() === 'cash');
                    if (!cashParty) {
                        const newParty: Party = {
                            id: crypto.randomUUID(),
                            name: 'Cash',
                            mobile: '',
                            type: transactionType.includes('Purchase') ? 'Supplier' : 'Customer',
                            currentBalance: 0
                        };
                        await billingService.saveParty(newParty);
                        cashParty = newParty;
                    }
                    setSelectedParty(cashParty);
                }
                
                // Handle Initial Items (from AI)
                if (initialItems && initialItems.length > 0) {
                    setItems(initialItems);
                }
            }
          } catch (e) {
              console.error("Error loading invoice:", e);
              alert("Error loading document details.");
          } finally {
              setLoading(false);
          }
      };
      initialize();
  }, [invoiceId, transactionType, initialParty, initialItems]);

  // Determine GST Type automatically based on State
  const gstLabel = useMemo(() => {
      if (!selectedParty || !companyProfile || !selectedParty.state || !companyProfile.state) return 'GST';
      // Normalize states for comparison
      const partyState = selectedParty.state.toLowerCase().trim();
      const companyState = companyProfile.state.toLowerCase().trim();
      
      return partyState === companyState ? 'GST' : 'IGST';
  }, [selectedParty, companyProfile]);

  // Reset form for next entry (specifically for Orders)
  const resetForm = async () => {
      setItems([]);
      setSelectedParty(null);
      setEntryItem(defaultEntryItem);
      setEditingItemId(null);
      // Fetch fresh number for next entry
      const nextNo = await billingService.generateNextVoucherNo(transactionType);
      setSaleNo(nextNo);
      setLinkedPayments([]);
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
        if (scannerRef.current) {
            if (isScannerRunning.current) {
                scannerRef.current.stop().catch(() => {}).finally(() => {
                    try { scannerRef.current?.clear(); } catch(e) {}
                });
            } else {
                try { scannerRef.current.clear(); } catch(e) {}
            }
        }
    };
  }, []);

  // --- Calculation Logic ---
  const formatNumber = (val: number) => {
    return Number(val.toFixed(2)).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const calculateItemTotal = (
    qty: number, 
    rate: number, 
    taxPercent: number, 
    taxType: 'Excluded' | 'Included', 
    discPercent: number
  ) => {
    const gross = (qty || 0) * (rate || 0);
    const discountAmount = gross * ((discPercent || 0) / 100);
    const subTotal = gross - discountAmount;

    if (taxType === 'Excluded') {
      const taxAmount = subTotal * ((taxPercent || 0) / 100);
      return subTotal + taxAmount;
    }
    return subTotal;
  };

  // --- Derived State ---
  const lineTotal = useMemo(() => {
    return calculateItemTotal(
      entryItem.qty, 
      entryItem.rate, 
      entryItem.taxPercent, 
      entryItem.taxType, 
      entryItem.discPercent
    );
  }, [entryItem]);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
       return sum + calculateItemTotal(
         item.qty, 
         item.rate, 
         item.taxPercent, 
         item.taxType, 
         item.discountPercent
       );
    }, 0);
  }, [items]);

  const totalPaid = useMemo(() => {
      return linkedPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [linkedPayments]);

  const balanceDue = totalAmount - totalPaid;

  const isSupplierTransaction = ['Purchase', 'Purchase Return', 'Purchase Order'].includes(transactionType);
  const displayType = language === 'hi' ? getHindiTransactionType(transactionType) : transactionType;
  const labels = language === 'hi' ? {
      no: 'नं.',
      customer: isSupplierTransaction ? 'सप्लायर' : 'ग्राहक',
      change: 'बदलें',
      itemCode: 'आइटम कोड',
      itemName: 'आइटम का नाम',
      searchPlaceholder: 'खोजें...',
      mrp: 'एम.आर.पी',
      rate: 'रेट',
      qty: 'मात्रा',
      add: 'जोड़ें',
      update: 'सुधारें',
      taxType: 'टैक्स टाइप',
      tax: 'टैक्स',
      disc: 'छूट',
      excluded: 'अलग से',
      included: 'शामिल',
      stock: 'स्टॉक',
      lineTotal: 'लाइन टोटल',
      item: 'आइटम',
      total: 'कुल',
      noItems: 'बिल में कोई आइटम नहीं है',
      saveAndShare: 'सेव और व्हाट्सएप',
      save: 'सेव',
      chat: 'चैट',
      preview: 'प्रीव्यू',
      payments: 'भुगतान विवरण',
      received: 'प्राप्त',
      due: 'बाकी'
  } : {
      no: 'No.',
      customer: isSupplierTransaction ? 'Supplier' : 'Customer',
      change: 'Change',
      itemCode: 'Item Code',
      itemName: 'Item Name',
      searchPlaceholder: 'Search...',
      mrp: 'MRP',
      rate: 'Rate',
      qty: 'Qty',
      add: 'Add',
      update: 'Update',
      taxType: 'Tax Type',
      tax: 'Tax',
      disc: 'Disc',
      excluded: 'Excluded',
      included: 'Included',
      stock: 'Stock',
      lineTotal: 'Line Total',
      item: 'Item',
      total: 'Total',
      noItems: 'No items in bill',
      saveAndShare: 'Save & WhatsApp',
      save: 'Save',
      chat: 'Chat',
      preview: 'Preview',
      payments: 'Payment History',
      received: 'Paid',
      due: 'Due'
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Small delay prevents some mobile browsers from showing the copy/paste toolbar instantly
      const target = e.target;
      setTimeout(() => {
          target.select();
      }, 10);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
  };

  const handlePaymentNavigation = async () => {
      let currentItems = [...items];
      
      // Auto-add drafted item if exists
      if (entryItem.name && entryItem.rate > 0 && entryItem.qty > 0) {
          const newItem: InvoiceItem = {
              id: Math.random().toString(36).substr(2, 9),
              item: entryItem.itemRef || {
                  id: 'custom',
                  name: entryItem.name,
                  saleRate: entryItem.rate,
                  code: entryItem.code
              },
              qty: entryItem.qty,
              rate: entryItem.rate,
              mrp: entryItem.mrp,
              taxType: entryItem.taxType,
              taxPercent: entryItem.taxPercent,
              purchaseRate: entryItem.purchaseRate,
              discountPercent: entryItem.discPercent
          };
          currentItems.push(newItem);
          setItems(currentItems);
          
          setEntryItem({
            code: '', name: '', mrp: 0, rate: 0, qty: 1, taxType: 'Excluded', taxPercent: 0, purchaseRate: 0, discPercent: 0, itemRef: null
          });
      }

      // Calculate total with currentItems
      const grandTotal = currentItems.reduce((sum, item) => {
         return sum + calculateItemTotal(
           item.qty, item.rate, item.taxPercent, item.taxType, item.discountPercent
         );
      }, 0);

      // Save Invoice silently if valid so Party Balance gets updated!
      let updatedParty = selectedParty;
      let finalInvoiceId = invoiceId;
      if (selectedParty && currentItems.length > 0) {
          if (!isOnlineImported) {
              try {
                 finalInvoiceId = await BillingService.saveInvoice(selectedParty.id, today, currentItems, transactionType, invoiceId, ['Purchase', 'Purchase Return'].includes(transactionType) ? saleNo : undefined);
                 // Re-fetch party to get updated balance
                 updatedParty = await billingService.getPartyById(selectedParty.id) || selectedParty;
              } catch(e) {
                 console.error("Failed auto-saving invoice:", e);
              }
          }
      }

      if (onNavigate) {
          const existingPayment = linkedPayments.length > 0 ? linkedPayments[0] : undefined;
          if (['Sale', 'Sale Return', 'Sale Order'].includes(transactionType)) {
              onNavigate('payment', 'Receipt', updatedParty, grandTotal, finalInvoiceId, { payment: existingPayment });
          } else {
              onNavigate('payment', 'Payment', updatedParty, grandTotal, finalInvoiceId, { payment: existingPayment });
          }
      }
  };

  // Search Items by Name
  useEffect(() => {
    if (entryItem.name.length > 0 && !entryItem.itemRef) {
      // Use cached items for filtering
      const filtered = allItemsRef.current.filter(i => i.name && i.name.toLowerCase().includes(entryItem.name.trim().toLowerCase()));
      setItemSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [entryItem.name, entryItem.itemRef]);

  const handleSelectItem = async (item: Item) => {
    let rateToUse = item.saleRate;
    if (['Purchase', 'Purchase Return', 'Purchase Order'].includes(transactionType)) {
        rateToUse = item.purchaseRate || 0;
    }

    if (selectedParty) {
        const lastRate = await billingService.getLastItemRate(selectedParty.id, item.id, transactionType);
        if (lastRate !== null) {
            rateToUse = lastRate;
        }
    }

    setEntryItem(prev => ({
      ...prev,
      code: item.code || item.id,
      name: item.name,
      mrp: item.mrp || (item.saleRate * 1.2),
      rate: rateToUse,
      purchaseRate: item.purchaseRate || 0,
      taxType: item.taxType || 'Excluded',
      taxPercent: item.taxPercent || 0,
      itemRef: item
    }));
    setShowSuggestions(false);
  };

  // NEW: Handle Barcode/Code Input Change
  const handleCodeChange = (code: string) => {
      // 1. Update the code field immediately
      setEntryItem(prev => ({ ...prev, code: code }));

      // 2. Check for exact match in cached items
      if (code) {
          const foundItem = allItemsRef.current.find(i => 
              i.code && i.code.toLowerCase() === code.trim().toLowerCase()
          );

          if (foundItem) {
              // 3. If found, populate data
              handleSelectItem(foundItem);
              
              // 4. Focus Quantity and Select Text so user can type quantity immediately
              setTimeout(() => {
                  if (qtyInputRef.current) {
                      qtyInputRef.current.focus();
                      qtyInputRef.current.select(); 
                  }
              }, 100);
          }
      }
  };

  // --- Scanner Logic ---
  const startScanner = async () => {
    if (Capacitor.isNativePlatform()) {
        try {
            const status = await Camera.requestPermissions();
            if (status.camera === 'denied' || status.camera === 'prompt-with-rationale') {
                alert("Please grant Camera permission to use the scanner.");
                return;
            }
        } catch (e) {
            console.warn("Camera permission request failed", e);
        }
    }

    setIsScanning(true);
    setTimeout(async () => {
        if (!document.getElementById("invoice-reader")) {
            setIsScanning(false);
            return;
        }

        if (scannerRef.current) {
            try {
                if (isScannerRunning.current) {
                    await scannerRef.current.stop();
                }
                await scannerRef.current.clear();
            } catch (e) {}
            scannerRef.current = null;
            isScannerRunning.current = false;
        }

        const html5QrCode = new Html5Qrcode("invoice-reader");
        scannerRef.current = html5QrCode;
        
        try {
            await html5QrCode.start(
                { facingMode: "environment" }, 
                { fps: 10, qrbox: { width: 250, height: 250 } }, 
                (decodedText) => {
                    handleScanSuccess(decodedText);
                },
                (errorMessage) => {
                    // ignore
                }
            );
            isScannerRunning.current = true;
        } catch (err: any) {
            console.error(err);
            setIsScanning(false);
            scannerRef.current = null;
            isScannerRunning.current = false;
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDismissedError') {
                alert("Camera access denied. Please allow camera permissions.");
            } else {
                alert(`Camera Error: ${err.message}`);
            }
        }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current && isScannerRunning.current) {
        scannerRef.current.stop().then(() => {
            isScannerRunning.current = false;
            try { scannerRef.current?.clear(); } catch(e) {}
            setIsScanning(false);
            scannerRef.current = null;
        }).catch(() => setIsScanning(false));
    } else {
        setIsScanning(false);
    }
  };

  const handleScanSuccess = async (code: string) => {
      stopScanner();
      handleCodeChange(code); // Reuse the same logic for scanner
  };

  // --- Edit Logic ---
  const handleEditItem = (item: InvoiceItem) => {
      setEditingItemId(item.id);
      setEntryItem({
          code: item.item.code || '',
          name: item.item.name,
          mrp: item.mrp,
          rate: item.rate,
          qty: item.qty,
          taxType: item.taxType,
          taxPercent: item.taxPercent,
          purchaseRate: item.purchaseRate || 0,
          discPercent: item.discountPercent,
          itemRef: item.item
      });
      // Focus quantity for quick edit
      setTimeout(() => {
          if (qtyInputRef.current) {
              qtyInputRef.current.focus();
              qtyInputRef.current.select();
          }
      }, 50);
  };

  const cancelEdit = () => {
      setEditingItemId(null);
      setEntryItem(defaultEntryItem);
  };

  const handleAddItem = () => {
    if (!entryItem.name || entryItem.qty <= 0) return;

    if (editingItemId) {
        setItems(prev => prev.map(item => {
            if (item.id === editingItemId) {
                return {
                    ...item,
                    item: entryItem.itemRef || { ...item.item, name: entryItem.name }, // Preserve ID if custom
                    qty: entryItem.qty,
                    rate: entryItem.rate,
                    mrp: entryItem.mrp,
                    taxType: entryItem.taxType,
                    taxPercent: entryItem.taxPercent,
                    purchaseRate: entryItem.purchaseRate,
                    discountPercent: entryItem.discPercent
                };
            }
            return item;
        }));
        cancelEdit(); // Reset form and exit edit mode
        return;
    }

    setItems(prev => {
        // Check if item already exists based on Master ID, Code or Name
        const existingIndex = prev.findIndex(row => {
            // Case 1: Match by ID (Item Master)
            if (entryItem.itemRef && row.item.id === entryItem.itemRef.id) {
                return true;
            }
            // Case 2: Match by Code (Barcode)
            if (entryItem.code && row.item.code === entryItem.code) {
                return true;
            }
            // Case 3: Match by Name (Text)
            if (row.item.name.trim().toLowerCase() === entryItem.name.trim().toLowerCase()) {
                return true;
            }
            return false;
        });

        if (existingIndex !== -1) {
            // Item exists -> Update Quantity (1+1=2)
            const newItems = [...prev];
            const existingItem = newItems[existingIndex];
            
            newItems[existingIndex] = {
                ...existingItem,
                qty: existingItem.qty + entryItem.qty
            };
            return newItems;
        } else {
            // New Item -> Add Row
            const newItem: InvoiceItem = {
              id: Math.random().toString(36).substr(2, 9),
              item: entryItem.itemRef || { 
                  id: 'custom', 
                  name: entryItem.name, 
                  saleRate: entryItem.rate,
                  code: entryItem.code 
              },
              qty: entryItem.qty,
              rate: entryItem.rate,
              mrp: entryItem.mrp,
              taxType: entryItem.taxType,
              taxPercent: entryItem.taxPercent,
              purchaseRate: entryItem.purchaseRate,
              discountPercent: entryItem.discPercent
            };
            return [...prev, newItem];
        }
    });
    
    setEntryItem({
      code: '', name: '', mrp: 0, rate: 0, qty: 1, taxType: 'Excluded', taxPercent: 0, purchaseRate: 0, discPercent: 0, itemRef: null
    });
  };

  const removeItem = (id: string) => {
      setItems(prev => prev.filter(i => i.id !== id));
      if (editingItemId === id) cancelEdit();
  };

  // --- Payment Handling (Quick Add inside Invoice) ---
  const handleAddPayment = async () => {
      if(!newPaymentAmount || !selectedParty || !invoiceId) return;
      
      const type = (transactionType === 'Sale' || transactionType === 'Sale Return') ? 'Receipt' : 'Payment';
      
      const newPayment: PaymentRecord = {
          id: Math.random().toString(36).substr(2, 9),
          voucherNo: `RCP-${Math.floor(1000 + Math.random() * 9000)}`,
          partyId: selectedParty.id,
          partyName: selectedParty.name,
          date: today.toLocalDateString(),
          amount: parseFloat(newPaymentAmount),
          type: type,
          mode: newPaymentMode,
          invoiceId: invoiceId, // Link to this invoice
          createdAt: Date.now()
      };

      await billingService.savePayment(newPayment);
      
      // Auto sync inline payment to cloud, EXCEPT for 'Payment' (which corresponds to Purchase)
      if (type !== 'Payment') {
          try {
              if (selectedParty?.mobile) {
                  const result = await sharePaymentWithClient(newPayment);
                  if (result.success) {
                      const p = await sqliteService.getPaymentById(newPayment.id);
                      if (p) await sqliteService.savePayment({ ...p, isSyncedToCloud: true });
                  }
              }
          } catch (e) {
              console.error("Could not sync inline payment", e);
          }
      }
      
      // Reload payments
      const payments = await billingService.getPaymentsByInvoiceId(invoiceId);
      setLinkedPayments(payments);
      
      setShowPaymentModal(false);
      setNewPaymentAmount('');
  };

  const handleDeletePayment = async (id: string) => {
      if(confirm('Delete this payment record?')) {
          await billingService.deletePayment(id);
          if (invoiceId) {
              const payments = await billingService.getPaymentsByInvoiceId(invoiceId);
              setLinkedPayments(payments);
          }
      }
  };

  // --- SAVE LOGIC ---
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [pendingShare, setPendingShare] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [shareDetails, setShareDetails] = useState<{url: string, message: string} | null>(null);

  const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfWeek = new Date(year, month, 1).getDay();
      const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

      const days = [];
      for (let i = 0; i < startOffset; i++) days.push(null);
      for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
      return days;
  };

  const handleSave = async (share: boolean) => {
    if (isOnlineImported) {
        alert(language === 'hi' ? 'प्राप्त बिल को बदला नहीं जा सकता' : 'Imported bills cannot be modified');
        return;
    }
    if (!selectedParty) {
      alert(language === 'hi' ? 'कृपया ग्राहक चुनें' : 'Please select a customer');
      return;
    }
    if (items.length === 0) {
      alert(language === 'hi' ? 'कृपया आइटम जोड़ें' : 'Please add items');
      return;
    }

    if (transactionType === 'Purchase Order' && !invoiceId) {
        setPendingShare(share);
        setSelectedDates([]);
        setShowDateModal(true);
        return;
    }

    await processSave([today], share);
  };

  const processSave = async (datesToSave: Date[], share: boolean) => {
    try {
        let lastInvoiceId = '';
        let wasNewlySynced = false;
        let syncFailed = false;
        let syncError = '';
        
        const settings = await billingService.getAppSettings();

        for (const targetDate of datesToSave) {
            const passedId = datesToSave.length === 1 ? invoiceId : undefined;
            const newInvoiceId = await BillingService.saveInvoice(selectedParty!.id, targetDate, items, transactionType, passedId, ['Purchase', 'Purchase Return'].includes(transactionType) ? saleNo : undefined);
            lastInvoiceId = newInvoiceId;

            // Share invoice through cloud automatically, EXCEPT for 'Purchase' entries, and ONLY if Cloud Sync is enabled
            if (transactionType !== 'Purchase' && settings.cloudSyncEnabled) {
                try {
                    const savedInvoice = await sqliteService.getInvoiceById(newInvoiceId);
                    // If it wasn't already synced, try to sync it now
                    if(savedInvoice && selectedParty!.mobile && !savedInvoice.isSyncedToCloud) {
                        const result = await shareInvoiceWithClient(savedInvoice);
                        if (result.success) {
                            await sqliteService.saveInvoice({ ...savedInvoice, isSyncedToCloud: true });
                            if (transactionType === 'Sale Order' || transactionType === 'Purchase Order') {
                                const od = await sqliteService.getOrderById(newInvoiceId);
                                if (od) await sqliteService.saveOrder({ ...od, isSyncedToCloud: true });
                            }
                            wasNewlySynced = true;
                        } else {
                            syncFailed = true;
                            syncError = result.error || "Could not sync online";
                        }
                    } else if (savedInvoice && savedInvoice.isSyncedToCloud) {
                        // It was already synced before, and we preserved it.
                        // If we updated an existing invoice that was online, we might want to re-sync.
                        // For now, shareInvoiceWithClient will overwrite the existing shared invoice.
                        const result = await shareInvoiceWithClient(savedInvoice);
                        if (result.success) {
                            if (transactionType === 'Sale Order' || transactionType === 'Purchase Order') {
                                const od = await sqliteService.getOrderById(newInvoiceId);
                                if (od) await sqliteService.saveOrder({ ...od, isSyncedToCloud: true });
                            }
                            wasNewlySynced = true; // Still show message that update went online
                        } else {
                            syncFailed = true;
                            syncError = result.error || "Could not sync online";
                        }
                    }
                } catch(e: any) {
                    console.warn("Could not sync invoice to cloud", e);
                    syncFailed = true;
                    syncError = e.message || "Unknown error";
                }
            }
        }

        const newInvoiceId = lastInvoiceId;
        const messageDate = datesToSave[datesToSave.length - 1] || today;

        // Construct Detailed Message
        const billDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(messageDate);
        let message = `*${displayType.toUpperCase()} INVOICE: ${newInvoiceId}*\n`;
        message += `Date: ${billDate}\n`;
        message += `Customer: ${selectedParty!.name}\n`;
        message += `------------------------------\n`;
        
        items.forEach(item => {
            const itemTotal = calculateItemTotal(item.qty, item.rate, item.taxPercent, item.taxType, item.discountPercent);
            message += `${item.item.name}\n`;
            message += `${item.qty} x ₹${item.rate} = ₹${formatNumber(itemTotal)}\n`;
        });
        
        message += `------------------------------\n`;
        message += `*Total Amount: ₹${formatNumber(totalAmount)}*\n`;
        message += `\nGenerated via QuickBill`;

        // GENERATE MINIFIED JSON PAYLOAD FOR DEEP LINK
        // Using very short keys to minimize URL length
        const payload = {
            ot: transactionType, // Origin Type
            d: messageDate.toLocalDateString(), // Date
            t: totalAmount, // Total
            pn: companyProfile?.name || "Sender", // Party Name (Sender)
            v: saleNo, // Invoice Number
            i: items.map(item => ({
                n: item.item.name, // Name
                q: item.qty, // Qty
                r: item.rate, // Rate
                m: item.mrp || 0, // MRP
                tt: item.taxType === 'Included' ? 'I' : 'E', // Tax Type
                tp: item.taxPercent || 0, // Tax Percent
                dp: item.discountPercent || 0 // Discount Percent
            }))
        };

        const jsonString = JSON.stringify(payload);
        
        // DEEP LINK GENERATION
        // Use clean base URL to avoid appending to existing hashes/queries
        const baseUrl = window.location.origin + window.location.pathname;
        const importLink = baseUrl + "#import_data=" + encodeURIComponent(jsonString);
        
        message += "\n\n👇 *Click to Save Bill in Your App:*\n" + importLink;
        
        // ADD JSON PAYLOAD FOR MANUAL IMPORT
        message += "\n\nOr copy this entire message and paste it in the 'Import Transaction' section:\n---QUICKBILL_DATA_START---\n" + jsonString + "\n---QUICKBILL_DATA_END---";

        if (share) {
            // WHATSAPP DIRECT SHARE LOGIC
            if (selectedParty.mobile) {
                let cleanNumber = selectedParty.mobile.replace(/\D/g, '');
                if (cleanNumber.length === 10) {
                    cleanNumber = '91' + cleanNumber;
                }

                const encodedMsg = encodeURIComponent(message);
                const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;
                
                // Show modal overlay instead of async link.click() to avoid browser popup blockers
                setShareDetails({ url: whatsappUrl, message });
            } else {
                // Fallback to clipboard if no mobile
                navigator.clipboard.writeText(message).then(() => {
                    alert('Mobile number missing. Message copied to clipboard!');
                    if (onNavigate) {
                        if (transactionType.includes('Order')) {
                            onNavigate('orderList', transactionType);
                        } else {
                            onNavigate('businessReport', transactionType);
                        }
                    } else {
                        onBack();
                    }
                });
            }
            
        } else {
            if (wasNewlySynced) {
                alert(language === 'hi' ? 'सफलतापूर्वक सेव किया गया और ऑनलाइन अपडेट भेजा गया!' : 'Saved successfully and updated online!');
            } else if (syncFailed) {
                const errorDetail = syncError ? ` (${syncError})` : '';
                alert(language === 'hi' 
                    ? `सेव हो गया, लेकिन क्लाउड सिंक नहीं हुआ।${errorDetail ? ' कारण: ' + errorDetail : ' (इंटरनेट या कस्टमर मोबाइल नंबर चेक करें)'}` 
                    : `Saved locally! Could not sync online.${errorDetail ? ' Reason: ' + errorDetail : ' (Check customer mobile or internet connection)'}`
                );
            } else {
                alert(language === 'hi' ? 'सफलतापूर्वक सेव किया गया!' : 'Saved Successfully!');
            }
            if (onNavigate) {
                if (transactionType.includes('Order')) {
                    onNavigate('orderList', transactionType);
                } else {
                    onNavigate('businessReport', transactionType);
                }
            } else {
                onBack();
            }
        }

    } catch (error) {
        console.error(error);
        alert('Error saving invoice');
    }
  };

  const copyDeepLink = () => {
        const payload = {
            ot: transactionType,
            d: today.toLocalDateString(),
            t: totalAmount,
            pn: companyProfile?.name || "Sender",
            v: saleNo,
            i: items.map(item => ({
                n: item.item.name,
                q: item.qty,
                r: item.rate,
                m: item.mrp || 0,
                tt: item.taxType === 'Included' ? 'I' : 'E',
                tp: item.taxPercent || 0,
                dp: item.discountPercent || 0
            }))
        };
        const jsonString = JSON.stringify(payload);
        const baseUrl = window.location.origin + window.location.pathname;
        const importLink = `${baseUrl}#import_data=${encodeURIComponent(jsonString)}`;
        
        navigator.clipboard.writeText(importLink).then(() => {
            alert("Deep Link copied! You can paste this anywhere.");
        });
  };

  if (loading) return <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-950 text-slate-500">Loading...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Header */}
      <header className={`${invoiceId ? 'bg-orange-600 dark:bg-amber-950/45 dark:border-amber-900/30' : 'bg-[#4f46e5] dark:bg-[#131b2e] dark:border-slate-800'} text-white dark:text-slate-100 p-3 pt-[max(env(safe-area-inset-top),48px)] flex justify-between items-center shadow-md dark:shadow-none z-20 border-b border-white/10 dark:border-slate-800 transition-all`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold leading-tight flex items-center gap-2">
                {invoiceId && !isOnlineImported && <Edit size={18} />}
                {displayType} {isOnlineImported ? (language === 'hi' ? 'विवरण' : 'Details') : invoiceId ? (language === 'hi' ? 'सुधारें' : 'Modify') : (language === 'hi' ? 'एंट्री' : 'Entry')}
            </h1>
            <div className="flex items-center gap-2">
                {/* Functional Date Picker in Header - Under the Title */}
                <div className="relative group cursor-pointer w-fit">
                    <p className="text-xs opacity-80 flex items-center gap-1 hover:underline">
                        {new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(today)}
                        {!isOnlineImported && <ChevronDown size={10} />}
                    </p>
                    {!isOnlineImported && (
                    <input 
                        type="date" 
                        value={today.toLocalDateString()} 
                        onChange={(e) => e.target.value && setToday(Date.fromLocalDateString(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    )}
                </div>
                {isOnlineImported && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-yellow-400 text-yellow-900 rounded-sm">
                        {language === 'hi' ? 'ऑनलाइन प्राप्त (सिर्फ पढ़ने के लिए)' : 'Received Online (Read Only)'}
                    </span>
                )}
                {((transactionType === 'Sale' || transactionType === 'Sale Return') && companyProfile) && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-black/20 rounded-sm">
                        {companyProfile.isGstRegistered ? 'Tax Invoice' : 'Bill of Supply'}
                    </span>
                )}
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <button onClick={copyDeepLink} className="hover:bg-white/10 rounded-full p-1 transition-colors" title="Copy Deep Link">
             <Copy size={20} className="opacity-90" />
          </button>
          
          <div className="relative group cursor-pointer">
              <Calendar size={22} className={`cursor-pointer opacity-90 transition-opacity ${!isOnlineImported ? 'hover:opacity-100' : ''}`} />
              {!isOnlineImported && (
              <input 
                  type="date" 
                  value={today.toLocalDateString()} 
                  onChange={(e) => e.target.value && setToday(Date.fromLocalDateString(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              )}
          </div>
          
          <button onClick={handlePaymentNavigation} className="hover:bg-white/10 rounded-full p-1 transition-colors">
             <ArrowRight size={22} className="cursor-pointer opacity-90" />
          </button>
        </div>
      </header>

      {/* Scanner Overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center pb-[max(env(safe-area-inset-bottom),0px)]">
            {/* NEW BACK BUTTON */}
            <button 
                onClick={stopScanner}
                className="absolute top-6 left-6 z-[70] p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                id="btn-back-scanner"
            >
                <ArrowLeft size={24} />
            </button>

            <div id="invoice-reader" className="w-full max-w-sm h-full max-h-[60vh] bg-black"></div>
            <p className="text-white mt-4 animate-pulse">Scanning...</p>
            <button 
                onClick={stopScanner}
                className="mt-6 bg-white text-black px-8 py-3 rounded-full font-bold shadow-lg"
                id="btn-cancel-scanner"
            >
                Cancel
            </button>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-44 bg-[var(--bg-app)] dark:bg-[var(--bg-app)] text-slate-900 dark:text-white transition-colors">
        <div className="p-3 space-y-4 max-w-4xl mx-auto">

          {/* Card 1: General Info & Party / Customer Selection */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-xl p-4 shadow-sm relative transition-all">
            <div className="grid grid-cols-12 gap-3 relative">
               {/* Row 1: No & Customer Selector */}
               <div className="col-span-12 md:col-span-4 relative z-[60]">
                 <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{displayType} {labels.no}</label>
                 <input 
                   type="text" 
                   value={saleNo} 
                   onChange={(e) => setSaleNo(e.target.value)}
                   readOnly={isOnlineImported || !['Purchase', 'Purchase Return'].includes(transactionType)} 
                   className={`w-full h-[42px] px-3 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-slate-50/50 dark:bg-slate-900 font-bold text-slate-900 dark:text-white focus:outline-none transition-all ${isOnlineImported || !['Purchase', 'Purchase Return'].includes(transactionType) ? 'cursor-not-allowed opacity-80' : 'focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'}`}
                 />
               </div>
               <div className="col-span-12 md:col-span-8 relative z-[60]">
                 <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{labels.customer}</label>
                 {selectedParty ? (
                   <div 
                     onClick={() => !isOnlineImported && setSelectedParty(null)} 
                      className={`w-full h-[42px] px-3.5 border border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-900/50 rounded-lg text-sm flex justify-between items-center transition-all duration-150 group hover:border-indigo-300 dark:hover:border-indigo-800 ${!isOnlineImported ? 'cursor-pointer' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-indigo-700 dark:text-indigo-300 truncate">{selectedParty.name}</div>
                      </div>
                      {!isOnlineImported && (
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-black tracking-wide bg-white dark:bg-slate-950 px-2 py-1 rounded shadow-sm border border-indigo-100 dark:border-indigo-900/40 group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-600 dark:group-hover:text-white transition-colors">
                          {labels.change}
                        </span>
                      )}
                    </div>
                  ) : (
                    <PartySearch selectedParty={null} onSelect={setSelectedParty} />
                  )}
                </div>
            </div>
          </div>

          {/* Card 2: Item Add & Edit Panel (Only when not online-imported read-only) */}
          {!isOnlineImported && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative transition-all">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-4 flex items-center gap-2">
                <Receipt size={16} className="text-indigo-600 dark:text-indigo-400" />
                {editingItemId ? (language === 'hi' ? 'आइटम संशोधित करें' : 'Edit Item Details') : (language === 'hi' ? 'आइटम प्रविष्ट करें' : 'Enter Item Details')}
              </h3>

              <div className="grid grid-cols-12 gap-3 relative">
                {/* Row 2: Item Code & Name */}
                <div className="col-span-12 md:col-span-4 relative z-[50]">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{labels.itemCode}</label>
                  <input 
                    type="text"
                    value={entryItem.code}
                    onChange={e => handleCodeChange(e.target.value)}
                    onFocus={handleFocus}
                    className="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-950 font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 transition-all duration-200 shadow-sm placeholder-slate-400 dark:placeholder-slate-600"
                  />
                </div>
                
                <div className="col-span-12 md:col-span-8 relative z-[50]">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{labels.itemName}</label>
                  <div className="relative flex items-center h-[42px]">
                    <input 
                      type="text" 
                      value={entryItem.name}
                      onChange={e => setEntryItem({...entryItem, name: e.target.value, itemRef: null})}
                      onFocus={handleFocus}
                      className={`w-full h-[42px] pl-3 ${localStorage.getItem('showBarcodeScanner') !== 'false' ? 'pr-10' : 'pr-3'} border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-950 font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 transition-all duration-200 shadow-sm placeholder-slate-400 dark:placeholder-slate-605`}
                      placeholder={labels.searchPlaceholder}
                    />
                    {localStorage.getItem('showBarcodeScanner') !== 'false' && (
                        <button 
                            type="button"
                            onClick={startScanner}
                            className="absolute right-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Scan Barcode"
                        >
                          <ScanBarcode size={18} />
                        </button>
                    )}
                  </div>

                  {/* Autocomplete Dropdown - Theme/Align Aware */}
                  {showSuggestions && itemSuggestions.length > 0 && (
                     <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl max-h-48 overflow-y-auto rounded-lg mt-1 z-50">
                        {itemSuggestions.map(item => (
                          <div 
                            key={item.id}
                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-base border-b last:border-0 border-slate-100 dark:border-slate-700"
                            onClick={() => handleSelectItem(item)}
                          >
                            <div className="font-bold text-slate-900 dark:text-white text-base">{item.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex justify-between font-medium mt-1">
                              <span>Code: {item.id}</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">Rate: ₹{item.saleRate}</span>
                            </div>
                          </div>
                        ))}
                     </div>
                  )}
                </div>

                {/* Row 3: MRP, Rate, Qty, and Discount % */}
                <div className="col-span-6 md:col-span-3 relative z-[40]">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{labels.mrp}</label>
                    <input 
                      type="number" 
                      value={entryItem.mrp}
                      onChange={e => setEntryItem({...entryItem, mrp: parseFloat(e.target.value) || 0})}
                      onFocus={handleFocus}
                      className="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-950 font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 transition-all duration-200 shadow-sm"
                    />
                </div>
                <div className="col-span-6 md:col-span-3 relative z-[45]">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{labels.rate}</label>
                    <input 
                      type="number" 
                      value={entryItem.rate}
                      onChange={e => setEntryItem({...entryItem, rate: parseFloat(e.target.value) || 0})}
                      onFocus={handleFocus}
                      className="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-955 font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 transition-all duration-200 shadow-sm"
                    />
                </div>
                <div className="col-span-4 md:col-span-2 relative z-[40]">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 text-center">{labels.qty}</label>
                    <input 
                      ref={qtyInputRef} 
                      type="number" 
                      value={entryItem.qty}
                      onChange={e => setEntryItem({...entryItem, qty: parseFloat(e.target.value) || 0})}
                      onFocus={handleFocus}
                      className="w-full h-[42px] px-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-center bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 transition-all duration-200 shadow-sm"
                    />
                </div>
                <div className="col-span-8 md:col-span-4 relative z-[40]">
                    <div className="flex justify-between items-end mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none truncate">{labels.disc}(%)</label>
                        {entryItem.discPercent > 0 && (
                            <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800/40 leading-none">
                                ₹{(entryItem.rate - (entryItem.rate * (entryItem.discPercent || 0) / 100)).toFixed(2)}
                            </span>
                        )}
                    </div>
                    <input 
                      type="number"
                      value={entryItem.discPercent}
                      onChange={e => setEntryItem({...entryItem, discPercent: parseFloat(e.target.value) || 0})}
                      onFocus={handleFocus}
                      className="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-950 font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 transition-all duration-200 shadow-sm"
                    />
                </div>

                {/* Row 4: Tax Type, Purchase Rate, Add Button */}
                {companyProfile?.isGstRegistered ? (
                     <>
                         <div className="col-span-6 md:col-span-4 relative z-[30]">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{labels.taxType}</label>
                            <div className="relative h-[42px]">
                               <select 
                                 value={entryItem.taxType}
                                 onChange={e => setEntryItem({...entryItem, taxType: e.target.value as any})}
                                 className="w-full h-[42px] pl-3 pr-8 border border-slate-200 dark:border-slate-800 rounded-lg text-sm appearance-none bg-white dark:bg-slate-955 font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 transition-all duration-200 shadow-sm"
                               >
                                 <option value="Excluded">{labels.excluded}</option>
                                 <option value="Included">{labels.included}</option>
                               </select>
                               <ChevronDown size={14} className="absolute right-3 top-3.5 pointer-events-none text-slate-400" />
                            </div>
                         </div>
                         <div className="col-span-6 md:col-span-4 relative z-[30]">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 truncate">{language === 'hi' ? 'परचेस रेट' : 'Purchase Rate'}</label>
                            <input 
                              type="number"
                              value={entryItem.purchaseRate || ''}
                              onChange={e => setEntryItem({...entryItem, purchaseRate: parseFloat(e.target.value) || 0})}
                              onFocus={handleFocus}
                              className="w-full h-[42px] px-3 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-950 font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 transition-all duration-200 shadow-sm"
                            />
                         </div>
                         <div className="col-span-12 md:col-span-4 relative z-[30] flex items-end">
                             {editingItemId ? (
                                 <div className="flex gap-1.5 w-full h-[42px]">
                                    <button 
                                       type="button"
                                       onClick={cancelEdit}
                                       className="bg-red-500 hover:bg-red-650 text-white rounded-lg px-3 h-full shadow border border-red-500 flex items-center justify-center flex-1 active:scale-95 transition-transform"
                                       title="Cancel Edit"
                                    >
                                       <X size={18} />
                                    </button>
                                    <button 
                                       type="button"
                                       onClick={handleAddItem}
                                       className="bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold rounded-lg px-4 h-full text-sm shadow border border-[#4338ca] dark:bg-indigo-600/15 dark:text-indigo-400 dark:border dark:border-indigo-500/30 dark:hover:bg-indigo-600/25 flex items-center justify-center flex-[2] active:scale-95 transition-all"
                                    >
                                       {labels.update}
                                    </button>
                                 </div>
                             ) : (
                                 <button 
                                   type="button"
                                   onClick={handleAddItem}
                                   className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold rounded-lg h-[42px] text-sm shadow border border-[#4338ca] dark:bg-indigo-600/15 dark:text-indigo-400 dark:border dark:border-indigo-500/30 dark:hover:bg-indigo-600/25 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                                 >
                                   <Plus size={16} /> {labels.add}
                                 </button>
                             )}
                         </div>
                     </>
                  ) : (
                      <div className="col-span-12 md:col-span-4 md:col-start-9 relative z-[30] flex items-end">
                          {editingItemId ? (
                              <div className="flex gap-1.5 w-full h-[42px]">
                                 <button 
                                    type="button"
                                    onClick={cancelEdit}
                                    className="bg-red-500 hover:bg-red-650 text-white rounded-lg px-3 h-full shadow border border-red-500 flex items-center justify-center flex-1 active:scale-95 transition-transform"
                                    title="Cancel Edit"
                                 >
                                    <X size={18} />
                                 </button>
                                 <button 
                                    type="button"
                                    onClick={handleAddItem}
                                    className="bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold rounded-lg px-4 h-full text-sm shadow border border-[#4338ca] dark:bg-indigo-600/15 dark:text-indigo-400 dark:border dark:border-indigo-500/30 dark:hover:bg-indigo-600/25 flex items-center justify-center flex-[2] active:scale-95 transition-all"
                                 >
                                    {labels.update}
                                 </button>
                              </div>
                          ) : (
                              <button 
                                type="button"
                                onClick={handleAddItem}
                                className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-extrabold rounded-lg h-[42px] text-sm shadow border border-[#4338ca] dark:bg-indigo-600/15 dark:text-indigo-400 dark:border dark:border-indigo-500/30 dark:hover:bg-indigo-600/25 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                              >
                                <Plus size={16} /> {labels.add}
                              </button>
                          )}
                      </div>
                  )}
              </div>
            </div>
          )}

          {/* Real-time banner with stats & live totals calculations */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center p-4 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800/60 rounded-xl gap-3 shadow-inner">
             <div className="flex flex-wrap gap-2 items-center">
                 {/* Stock badge */}
                 <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors shadow-sm ${
                    entryItem.itemRef 
                      ? (entryItem.itemRef.openingStock || 0) <= 5
                        ? 'bg-amber-50 dark:bg-amber-955 text-amber-700 dark:text-amber-405 border-amber-200 dark:border-amber-900/40'
                        : 'bg-emerald-50 dark:bg-emerald-955 text-emerald-700 dark:text-emerald-405 border-emerald-200 dark:border-emerald-900/40'
                      : 'bg-slate-50/50 dark:bg-slate-850/60 text-slate-500 dark:text-slate-445 border-slate-205 dark:border-slate-800'
                 }`}>
                     <span className={`w-1.5 h-1.5 rounded-full ${
                        entryItem.itemRef
                          ? (entryItem.itemRef.openingStock || 0) <= 5
                            ? 'bg-amber-500 animate-pulse'
                            : 'bg-emerald-500'
                          : 'bg-slate-400'
                     }`} />
                     {labels.stock} : {entryItem.itemRef ? (entryItem.itemRef.openingStock || 0) : '0'}
                 </span>
                 
                 {/* Sale Rate Badge */}
                 {entryItem.itemRef && (
                     <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-705 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-805 shadow-sm">
                         {language === 'hi' ? 'सेल रेट' : 'Sale Rate'} : ₹{entryItem.itemRef.saleRate || 0}
                     </span>
                 )}
             </div>
             
             {/* Big Display Display Line Total */}
             <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-200 dark:border-slate-800/60">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest sm:hidden">{labels.lineTotal}</span>
                 <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                     <span className="text-sm font-bold text-slate-400 hidden sm:inline">{labels.lineTotal}:</span>
                     <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">₹{lineTotal.toFixed(2)}</span>
                 </span>
             </div>
          </div>


        {/* Item List Table - Theme Aware */}
        <div className="mt-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                        <th className="p-2 pl-3 w-[30%]">{labels.item}</th>
                        <th className="p-2 text-center w-[10%]">{labels.qty}</th>
                        <th className="p-2 text-right w-[15%]">{labels.rate}</th>
                        <th className="p-2 text-center w-[10%]">{labels.disc}</th>
                        {companyProfile?.isGstRegistered && (
                            <th className="p-2 text-center w-[15%]">GST%</th>
                        )}
                        <th className="p-2 text-right w-[20%]">{labels.total}</th>
                        <th className="p-2 pr-3 w-[5%]"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan={companyProfile?.isGstRegistered ? 6 : 5} className="p-8 text-center text-slate-500 italic">
                                {labels.noItems}
                            </td>
                        </tr>
                    ) : (
                        items.map((item) => {
                            const itemName = item.item ? item.item.name : 'Unknown Item';
                            const itemTotal = calculateItemTotal(
                                item.qty, 
                                item.rate, 
                                item.taxPercent, 
                                item.taxType, 
                                item.discountPercent
                            );
                            return (
                                <tr 
                                    key={item.id}
                                    onClick={() => !isOnlineImported && handleEditItem(item)}
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${!isOnlineImported ? 'cursor-pointer' : ''} ${editingItemId === item.id ? 'bg-blue-100 dark:bg-blue-900/40 border-l-4 border-blue-500' : ''}`}
                                >
                                    <td className="p-2 pl-3 align-top pt-3">
                                        <div className="font-bold text-base text-slate-900 dark:text-white line-clamp-2">
                                            {itemName}
                                        </div>
                                        {item.item && (
                                            <div 
                                                className="mt-0.5 text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-sm border border-blue-100 dark:border-blue-800"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onNavigate) {
                                                        onNavigate('itemList', undefined, undefined, undefined, invoiceId, { itemId: item.item!.id });
                                                    }
                                                }}
                                                title={language === 'hi' ? 'आइटम सेटिंग्स खोलें' : 'Open Item Settings'}
                                            >
                                                {language === 'hi' ? 'सेल रेट' : 'Sale Rate'}: ₹{item.item.saleRate || 0} <Edit size={10} />
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-2 text-center font-bold text-base text-slate-900 dark:text-white align-top pt-3">
                                        {item.qty}
                                    </td>
                                    <td className="p-2 text-right text-base text-slate-900 dark:text-white align-top pt-3">
                                        ₹{item.rate}
                                    </td>
                                    <td className="p-2 text-center text-sm text-green-600 dark:text-green-400 font-bold align-top pt-3">
                                        {item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}
                                    </td>
                                    {companyProfile?.isGstRegistered && (
                                        <td className="p-2 text-center text-sm text-slate-500 dark:text-slate-400 align-top pt-3">
                                            {item.taxPercent > 0 ? `${item.taxPercent}%` : '-'}
                                        </td>
                                    )}
                                    <td className="p-2 text-right align-top pt-3 font-bold text-base text-slate-900 dark:text-white">
                                        ₹{formatNumber(itemTotal)}
                                    </td>
                                    <td className="p-2 pr-3 align-top pt-2.5 text-right">
                                        {!isOnlineImported && (
                                        <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors inline-flex">
                                            <X size={18} />
                                        </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>

        {/* --- PAYMENT HISTORY SECTION (Only in Edit Mode) --- */}
        {invoiceId && (
            <div className="mt-4 bg-white dark:bg-slate-900 border-t border-b border-slate-200 dark:border-slate-800 mb-4">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <Receipt size={18} /> {labels.payments}
                    </h3>
                    {!isOnlineImported && (
                    <button 
                        onClick={() => setShowPaymentModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                        <Plus size={14} /> Add Receipt
                    </button>
                    )}
                </div>
                
                {linkedPayments.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm italic">
                        No payments received for this invoice yet.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {linkedPayments.map(pay => (
                            <div key={pay.id} className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800">
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white text-sm">₹{pay.amount}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                        <span>{pay.date}</span>
                                        <span className="bg-slate-200 dark:bg-slate-700 px-1.5 rounded">{pay.mode}</span>
                                    </div>
                                </div>
                                {!pay.isSyncedToCloud && (
                                    <PermissionWrapper requiredRole="admin" requiredPermission="can_delete_invoice" fallback="hide">
                                        <button 
                                            onClick={() => handleDeletePayment(pay.id)}
                                            className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </PermissionWrapper>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.5)] z-30 transition-colors">
        
        {/* Total Summary Row */}
        <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-sm">
            <div className="flex justify-between items-center mb-1">
                <span className="text-slate-500 dark:text-slate-400 font-bold">{labels.total}</span>
                <span className="text-slate-900 dark:text-white font-bold text-xl">₹{formatNumber(totalAmount)}</span>
            </div>
            {invoiceId && (
                <div className="flex justify-between items-center">
                    <span className="text-green-600 dark:text-green-400 font-bold text-xs">{labels.received}: ₹{formatNumber(totalPaid)}</span>
                    <span className={`font-bold text-xs ${balanceDue > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {labels.due}: ₹{formatNumber(balanceDue)}
                    </span>
                </div>
            )}
        </div>

        {/* Action Buttons - Adjusted for mobile */}
        {!isOnlineImported && (
        <div className="flex p-2 gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/40">
           <button 
                onClick={() => handleSave(true)}
                className="flex-1 bg-emerald-600 dark:bg-emerald-600/15 dark:text-emerald-400 dark:border dark:border-emerald-500/30 hover:bg-emerald-700 dark:hover:bg-emerald-600/25 text-white py-3 sm:py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
           >
              <Share2 size={18} />
              {labels.saveAndShare}
           </button>
           <button 
                onClick={() => handleSave(false)}
                className="flex-1 bg-[#4f46e5] dark:bg-indigo-600/15 dark:text-indigo-400 dark:border dark:border-indigo-500/30 hover:bg-[#4338ca] dark:hover:bg-indigo-600/25 text-white py-3 sm:py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
           >
              <Save size={18} />
              {invoiceId ? 'Update' : labels.save}
           </button>
        </div>
        )}
      </div>

      {/* Add Payment Modal */}
      {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Payment</h3>
                  
                  <div className="mb-4">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                      <input 
                        type="number" 
                        autoFocus
                        className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter Amount"
                        value={newPaymentAmount}
                        onChange={e => setNewPaymentAmount(e.target.value)}
                      />
                  </div>

                  <div className="mb-6">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mode</label>
                      <div className="flex gap-2">
                          {['Cash', 'Bank', 'Online'].map(m => (
                              <button 
                                key={m}
                                onClick={() => setNewPaymentMode(m as any)}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold border ${newPaymentMode === m ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                              >
                                  {m}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Cancel</button>
                      <button onClick={handleAddPayment} className="flex-1 py-3 rounded-xl font-bold bg-green-600 text-white hover:bg-green-700 shadow-lg">Save</button>
                  </div>
              </div>
          </div>
      )}

      {/* Date Selection Modal for Multi-Date Orders */}
      {showDateModal && (
          <div className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-slate-900 animate-in slide-in-from-right pb-[max(env(safe-area-inset-bottom),0px)]">
              {/* Modal Header */}
              <header className="bg-[#3b5998] text-white p-4 flex items-center justify-between shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
                  <div className="flex items-center gap-3">
                      <button onClick={() => setShowDateModal(false)}><ArrowLeft size={24} /></button>
                      <div>
                          <h2 className="text-lg font-bold leading-tight">Select Date</h2>
                          <div className="text-xs opacity-80">Selected : {selectedDates.length}</div>
                      </div>
                  </div>
                  <button 
                      onClick={() => {
                          setShowDateModal(false);
                          processSave(selectedDates, pendingShare);
                      }} 
                      className="p-1 active:scale-95 transition-transform"
                      disabled={selectedDates.length === 0}
                  >
                      <Check size={28} className={selectedDates.length === 0 ? "opacity-50" : ""} />
                  </button>
              </header>

              {/* Month Navigation */}
              <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <button 
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                      className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                      <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
                  </button>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                      {calendarMonth.toLocaleString('en-US', { month: 'short' })} {calendarMonth.getFullYear()}
                  </h3>
                  <button 
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                      className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                      <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300 transform rotate-180" />
                  </button>
              </div>

              {/* Calendar Grid */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900">
                  <div className="grid grid-cols-7 gap-2 text-center max-w-md mx-auto">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                          <div key={d} className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">{d}</div>
                      ))}
                      
                      {getDaysInMonth(calendarMonth).map((d, index) => {
                          if (!d) return <div key={`empty-${index}`} />;
                          
                          const isSelected = selectedDates.some(selDate => 
                              selDate.getDate() === d.getDate() && 
                              selDate.getMonth() === d.getMonth() && 
                              selDate.getFullYear() === d.getFullYear()
                          );
                          
                          return (
                              <button
                                  key={d.toISOString()}
                                  onClick={() => {
                                      if (isSelected) {
                                          setSelectedDates(prev => prev.filter(sel => sel.getTime() !== d.getTime()));
                                      } else {
                                          setSelectedDates(prev => [...prev, d]);
                                      }
                                  }}
                                  className={`aspect-square sm:aspect-auto sm:py-3 rounded-lg font-bold text-sm flex items-center justify-center transition-all ${
                                      isSelected 
                                          ? 'bg-[#cb4c32] text-white shadow-md transform scale-105' 
                                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                  }`}
                              >
                                  {d.getDate()}
                              </button>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}

      {shareDetails && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 text-center shadow-2xl relative overflow-hidden">
                <div className="text-4xl mb-4 p-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full inline-block">
                    <Check size={48} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Saved Successfully!</h2>
                <p className="text-slate-500 mb-8 font-medium px-4">
                    Bill is saved. Click below to send it to customer via WhatsApp.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => {
                            setShareDetails(null);
                            if (onNavigate) {
                                if (transactionType.includes('Order')) onNavigate('orderList', transactionType);
                                else onNavigate('businessReport', transactionType);
                            } else onBack();
                        }} 
                        className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                        Skip
                    </button>
                    <a 
                        href={shareDetails.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={() => {
                            setTimeout(() => {
                                setShareDetails(null);
                                if (onNavigate) {
                                    if (transactionType.includes('Order')) onNavigate('orderList', transactionType);
                                    else onNavigate('businessReport', transactionType);
                                } else onBack();
                            }, 500);
                        }}
                        className="flex-1 py-3 rounded-xl font-bold bg-[#25D366] text-white flex justify-center items-center gap-2 shadow-lg hover:bg-[#20bd5a]"
                    >
                        <MessageCircle size={20} /> Share
                    </a>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
