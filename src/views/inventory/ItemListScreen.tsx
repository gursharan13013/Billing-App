import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Edit2, Package, X, Save, Search, ScanBarcode, Trash2, AlertTriangle, ArrowRight, Send, Check, Percent, Hash, Layers } from 'lucide-react';
import { Item, Unit, Category, TaxRate, HSNCode, Party, Language } from '../../core/types/';
import { BillingService as billingService } from '../../services/SecureBillingService';
import { InventoryService } from '../../services/inventoryService';
import { shareItemsWithClient } from '../../services/firebaseService';
import { useAuth } from '../../context/AuthContext';
import { PermissionWrapper } from '../../components/shared/PermissionWrapper';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { SwipeableRow } from '../../components/layout/SwipeableRow';


interface ItemListScreenProps {
  onBack: () => void;
  initialEditItemId?: string;
  returnScreen?: string;
  returnParams?: any;
  onReturn?: (screen: string, params?: any) => void;
  language?: Language;
}

const labels = {
  en: {
    itemMaster: 'Item Master',
    selected: 'Selected',
    searchPlaceholder: 'Search Items (Name or Code)...',
    selectAll: 'Select All',
    all: 'All',
    noItems: 'No items found.',
    loading: 'Loading items...',
    deleteItem: 'Delete Item?',
    deleteConfirm: 'Are you sure you want to delete this item? This action cannot be undone.',
    deleteSelectedTitle: 'Delete Selected Items?',
    deleteSelectedConfirm: 'Are you sure you want to delete the selected items? This action cannot be undone.',
    cancel: 'Cancel',
    delete: 'Delete',
    editItem: 'Edit Item',
    addNewItem: 'Add New Item',
    saveItem: 'Save Item',
    itemName: 'Item Name *',
    productNamePlaceholder: 'Product Name',
    itemCode: 'Item Code / Barcode',
    scanOrType: 'Scan or Type',
    saleRate: 'Sale Rate (₹) *',
    purchaseRate: 'Purchase Rate',
    mrp: 'MRP',
    taxGst: 'Tax (GST)',
    taxType: 'Tax Type',
    taxExcluded: 'Excluded (Plus Tax)',
    taxIncluded: 'Included (Inc Tax)',
    stock: 'Stock',
    unit: 'Unit',
    hsnCode: 'HSN Code',
    selectClientTitle: 'Select Client to Send Items',
    sending: 'Sending items...',
    noClients: 'No clients found.',
    code: 'Code',
    mrpLabel: 'MRP',
    gstLabel: 'GST',
    plusTax: 'Plus Tax',
    incTax: 'Inc Tax',
    scanCancel: 'Cancel Scan',
    cannotUndone: 'This action cannot be undone.'
  },
  hi: {
    itemMaster: 'आइटम मास्टर',
    selected: 'चयनित',
    searchPlaceholder: 'आइटम खोजें (नाम या कोड)...',
    selectAll: 'सभी चुनें',
    all: 'सभी',
    noItems: 'कोई आइटम नहीं मिला।',
    loading: 'आइटम लोड हो रहे हैं...',
    deleteItem: 'आइटम हटाएं?',
    deleteConfirm: 'क्या आप वाकई इस आइटम को हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।',
    deleteSelectedTitle: 'चयनित आइटम हटाएं?',
    deleteSelectedConfirm: 'क्या आप वाकई चयनित आइटमों को हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    editItem: 'आइटम संपादित करें',
    addNewItem: 'नया आइटम जोड़ें',
    saveItem: 'आइटम सुरक्षित करें',
    itemName: 'आइटम का नाम *',
    productNamePlaceholder: 'उत्पाद का नाम',
    itemCode: 'आइटम कोड / बारकोड',
    scanOrType: 'स्कैन या टाइप करें',
    saleRate: 'बिक्री दर (₹) *',
    purchaseRate: 'खरीद दर',
    mrp: 'एमआरपी (MRP)',
    taxGst: 'टैक्स (GST)',
    taxType: 'टैक्स प्रकार',
    taxExcluded: 'बिना टैक्स (प्लस टैक्स)',
    taxIncluded: 'टैक्स सहित (Inc Tax)',
    stock: 'स्टॉक',
    unit: 'यूनिट',
    hsnCode: 'एचएसएन कोड',
    selectClientTitle: 'आइटम भेजने के लिए ग्राहक चुनें',
    sending: 'आइटम भेज रहे हैं...',
    noClients: 'कोई ग्राहक नहीं मिला।',
    code: 'कोड',
    mrpLabel: 'MRP',
    gstLabel: 'GST',
    plusTax: 'प्लस टैक्स',
    incTax: 'टैक्स सहित',
    scanCancel: 'स्कैन रद्द करें',
    cannotUndone: 'यह क्रिया वापस नहीं ली जा सकती।'
  }
};

export const ItemListScreen: React.FC<ItemListScreenProps> = ({ onBack, initialEditItemId, returnScreen, returnParams, onReturn, language }) => {
  const appLang = language || (localStorage.getItem('appLanguage') as Language) || 'en';
  const t = labels[appLang] || labels['en'];
  const authContext = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [taxes, setTaxes] = useState<TaxRate[]>([]);
  const [hsnCodes, setHsnCodes] = useState<HSNCode[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Share State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareParties, setShareParties] = useState<Party[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Item>>({});

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScannerRunning = useRef(false);

  // Selection State
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [deleteSelectedModal, setDeleteSelectedModal] = useState(false);
  const isSelectionMode = selectedItems.size > 0;

  const toggleItemSelection = (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const newSelection = new Set(selectedItems);
      if (newSelection.has(id)) {
          newSelection.delete(id);
      } else {
          newSelection.add(id);
      }
      setSelectedItems(newSelection);
  };

  const confirmDeleteSelected = async () => {
      try {
          await billingService.deleteItems(Array.from(selectedItems));
      } catch (error) {
          console.error("Error deleting items:", error);
      }
      setSelectedItems(new Set());
      setDeleteSelectedModal(false);
      await loadData();
  };

  useEffect(() => {
    loadData().then((fetchedItems) => {
        if (initialEditItemId && fetchedItems) {
            const initialItem = fetchedItems.find(i => i.id === initialEditItemId);
            if (initialItem) {
                handleEdit(initialItem);
            }
        }
    });
  }, []);

  // Cleanup scanner on unmount
  useEffect(() => {
      return () => {
          if (scannerRef.current) {
              if (isScannerRunning.current) {
                  scannerRef.current.stop().catch(err => {})
                  .finally(() => {
                      try { scannerRef.current?.clear(); } catch(e) {}
                  });
              } else {
                  try { scannerRef.current.clear(); } catch(e) {}
              }
          }
      };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsData, unitsData, catData, taxData, hsnData] = await Promise.all([
        billingService.getAllItems(),
        billingService.getAllUnits(),
        billingService.getAllCategories(),
        billingService.getAllTaxes(),
        billingService.getAllHSN()
      ]);
      setItems(itemsData);
      setUnits(unitsData);
      setCategories(catData);
      setTaxes(taxData);
      setHsnCodes(hsnData);
      return itemsData;
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
      if (deleteId) {
          await billingService.deleteItem(deleteId);
          setDeleteId(null);
          loadData();
      }
  };

  const handleAddNew = () => {
      setEditingId(null);
      setFormData({ 
          name: '', 
          code: '', 
          saleRate: 0, 
          purchaseRate: 0, 
          mrp: 0,
          taxPercent: 0, 
          taxType: 'Excluded',
          openingStock: 0,
          unit: units.length > 0 ? units[0].code : '',
          category: ''
      });
      setIsModalOpen(true);
  };

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
      
      // Allow UI to render the reader div first
      setTimeout(async () => {
        const elementId = "reader";
        if (!document.getElementById(elementId)) {
            console.warn("Reader element not found");
            setIsScanning(false);
            return;
        }
        
        // Robust cleanup of previous instance
        if (scannerRef.current) {
             try {
                 if (isScannerRunning.current) {
                     await scannerRef.current.stop();
                 }
                 await scannerRef.current.clear();
             } catch(e) {}
             scannerRef.current = null;
             isScannerRunning.current = false;
        }

        const html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        try {
            await html5QrCode.start(
                { facingMode: "environment" }, 
                config, 
                (decodedText) => {
                    // Success
                    setFormData(prev => ({ ...prev, code: decodedText }));
                    stopScanner();
                },
                (errorMessage) => {
                    // parse error, ignore it.
                }
            );
            isScannerRunning.current = true;
        } catch (err: any) {
             console.error("Error starting scanner", err);
            setIsScanning(false);
            scannerRef.current = null;
            isScannerRunning.current = false;
            
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError" || err.name === "PermissionDismissedError") {
                alert("Permission denied: Please enable camera access in your browser settings to use the scanner.");
            } else if (err.name === "NotFoundError") {
                alert("No camera found on this device.");
            } else {
                alert(`Failed to start camera: ${err.message || 'Unknown error'}`);
            }
        }
      }, 100);
  };

  const stopScanner = () => {
      if (scannerRef.current && isScannerRunning.current) {
          scannerRef.current.stop()
            .then(() => {
                isScannerRunning.current = false;
                try { scannerRef.current?.clear(); } catch(e) {}
                setIsScanning(false);
                scannerRef.current = null;
            })
            .catch(err => {
                console.warn("Failed to stop scanner", err);
                isScannerRunning.current = false;
                setIsScanning(false);
                scannerRef.current = null;
            });
      } else {
          setIsScanning(false);
      }
  };

  const handleHSNChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedCode = e.target.value;
      const hsnObj = hsnCodes.find(h => h.code === selectedCode);
      
      // Auto-fill tax rate if HSN has one
      if (hsnObj && hsnObj.taxRate) {
          setFormData({
              ...formData, 
              hsnCode: selectedCode, 
              taxPercent: hsnObj.taxRate
          });
      } else {
          setFormData({...formData, hsnCode: selectedCode});
      }
  };

  // Helper to select all text on focus
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (e.target instanceof HTMLInputElement) {
          const target = e.target;
          setTimeout(() => {
              target.select();
          }, 10);
      }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name) return;

      const item: Item = {
          id: editingId || Math.random().toString(36).substr(2, 9),
          name: formData.name,
          code: formData.code,
          hsnCode: formData.hsnCode,
          saleRate: Number(formData.saleRate) || 0,
          purchaseRate: Number(formData.purchaseRate) || 0,
          mrp: Number(formData.mrp) || 0,
          taxPercent: Number(formData.taxPercent) || 0,
          taxType: formData.taxType as 'Excluded' | 'Included',
          openingStock: Number(formData.openingStock) || 0,
          unit: formData.unit,
          category: formData.category
      };

      await InventoryService.addItem(item);
      setIsModalOpen(false);
      
      if (returnScreen) {
          onBack();
          return;
      }
      
      loadData();
  };

  const handleShareClick = async () => {
      // Load all parties to show in modal
      const parties = await billingService.getAllParties();
      setShareParties(parties);
      setShowShareModal(true);
  };

  const handlePartySelectToShare = async (party: Party) => {
      if (!party.mobile) {
          alert('This customer does not have a mobile number.');
          return;
      }
      
      const itemsToShare = isSelectionMode 
          ? items.filter(i => selectedItems.has(i.id))
          : filteredItems;

      if (itemsToShare.length === 0) {
          alert('No items available to share.');
          return;
      }

      setIsSharing(true);
      const success = await shareItemsWithClient(itemsToShare, party.mobile);
      setIsSharing(false);
      
      if (success) {
          alert(`Success! Shared ${itemsToShare.length} items to ${party.name}`);
          setShowShareModal(false);
          setSelectedItems(new Set());
      } else {
          alert(`Failed to share items. Please try again or check Firebase configuration.`);
      }
  };

  const filteredItems = items.filter(i => {
    const nameMatch = i.name ? i.name && i.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) : false;
    const codeMatch = i.code ? i.code.toLowerCase().includes(searchQuery.trim().toLowerCase()) : false;
    return nameMatch || codeMatch;
  });

  const selectAll = () => {
      if (selectedItems.size === filteredItems.length && filteredItems.length > 0) {
          setSelectedItems(new Set());
      } else {
          setSelectedItems(new Set(filteredItems.map(i => i.id)));
      }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-main)] transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-[var(--bg-card)] text-[var(--text-main)] p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0 z-20 pt-[max(env(safe-area-inset-top),48px)] transition-colors">
        <div className="flex items-center gap-3 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (isSelectionMode) {
                    setSelectedItems(new Set());
                } else {
                    onBack();
                }
              }} 
              className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] active:scale-95 p-1.5 rounded-full transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              {isSelectionMode ? <X size={24} /> : <ArrowLeft size={24} />}
            </button>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)]">
                {isSelectionMode ? `${selectedItems.size} ${t.selected}` : t.itemMaster}
              </h1>
              <p className="text-[9px] font-black text-[var(--text-secondary)]/80 mt-0.5 uppercase tracking-widest">
                {appLang === 'hi' ? 'आइटम कैटलॉग प्रबंधन' : 'Products & Services Master'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSelectionMode ? (
                <>
                    <PermissionWrapper requiredRole="admin" fallback="hide">
                        <button 
                          onClick={() => setDeleteSelectedModal(true)} 
                          className="hover:bg-red-500/10 text-[var(--money-out)] active:scale-95 p-1.5 rounded-full transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer" 
                          title={t.delete}
                        >
                            <Trash2 size={24} />
                        </button>
                    </PermissionWrapper>
                    <button 
                      onClick={handleShareClick} 
                      className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] active:scale-95 p-1.5 rounded-full transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer" 
                      title="Send Selected Items"
                    >
                        <ArrowRight size={24} />
                    </button>
                </>
            ) : (
                <>
                    <button 
                      onClick={handleShareClick} 
                      className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] active:scale-95 p-1.5 rounded-full transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer" 
                      title="Send All Items to Client"
                    >
                        <ArrowRight size={24} />
                    </button>
                    <button 
                      onClick={handleAddNew} 
                      className="hover:bg-[var(--brand-light)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] active:scale-95 p-1.5 rounded-full transition-all duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                    >
                        <Plus size={24} />
                    </button>
                </>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 pb-0 z-10 flex gap-2 items-center max-w-2xl mx-auto w-full">
        <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-[var(--text-secondary)]/50" />
            </div>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              className="block w-full h-12 pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-card)] text-[var(--text-main)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all shadow-3xs text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
        </div>
        {filteredItems.length > 0 && (
            <button 
                onClick={selectAll} 
                className={`h-12 px-4 rounded-xl font-black text-xs tracking-wider uppercase border transition-all duration-150 flex items-center justify-center gap-2 shrink-0 cursor-pointer ${selectedItems.size === filteredItems.length && filteredItems.length > 0 ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-md active:scale-95" : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-slate-200 dark:border-slate-800 hover:bg-[var(--brand-light)] hover:text-[var(--brand-primary)] active:scale-95"}`}
            >
                {selectedItems.size === filteredItems.length && filteredItems.length > 0 ? (
                     <><Check size={14} strokeWidth={3} /> {t.all}</>
                ) : (
                     t.selectAll
                )}
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 max-w-2xl mx-auto w-full custom-scrollbar">
        {loading ? (
            <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]"></div>
            </div>
        ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)]">
                <Package size={48} className="opacity-20 mb-2" />
                <p>{t.noItems}</p>
            </div>
        ) : (
            <div className="grid gap-3">
                {filteredItems.map(item => (
                    <SwipeableRow 
                        key={item.id}
                        enabled={!isSelectionMode}
                        onEdit={() => handleEdit(item)}
                        onDelete={() => setDeleteId(item.id)}
                    >
                        <div 
                            onClick={(e) => isSelectionMode && toggleItemSelection(item.id, e)}
                            className={`bg-[var(--bg-card)] p-4 rounded-2xl shadow-3xs flex flex-col sm:flex-row sm:justify-between sm:items-center group transition-all duration-150 border ${
                                selectedItems.has(item.id) 
                                    ? 'border-[var(--brand-primary)] bg-[var(--brand-light)] dark:bg-indigo-950/20 shadow-2xs pl-3 border-l-4' 
                                    : 'border-slate-200 dark:border-slate-800 hover:border-[var(--brand-primary)]/80 hover:shadow-2xs'
                            } ${isSelectionMode ? 'cursor-pointer' : ''}`}
                        >
                            <div className="flex items-start gap-3.5 w-full">
                                {/* Selection Checkbox Area */}
                                <div className="pt-1 mt-0.5 shrink-0" onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemSelection(item.id, e);
                                }}>
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all duration-150 cursor-pointer ${selectedItems.has(item.id) ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white scale-110 shadow-4xs' : 'border-slate-300 dark:border-slate-700 bg-transparent text-transparent hover:border-[var(--brand-primary)] hover:scale-105'}`}>
                                        <Check size={13} strokeWidth={3} />
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base md:text-lg leading-tight transition-colors group-hover:text-[var(--brand-primary)]">{item.name}</h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {item.code && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--bg-app)] text-[var(--text-main)] border border-slate-200 dark:border-slate-800 shadow-4xs">
                                                <ScanBarcode size={12} className="text-[var(--text-secondary)]/70" />
                                                <span className="text-[10px] uppercase text-[var(--text-secondary)]/70 font-bold mr-0.5">{t.code}:</span>
                                                {item.code}
                                            </span>
                                        )}
                                        
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-4xs ${
                                            (item.openingStock || 0) > 0 
                                                ? 'bg-[var(--money-in)]/10 text-[var(--money-in)] border border-[var(--money-in)]/20' 
                                                : 'bg-[var(--money-out)]/10 text-[var(--money-out)] border border-[var(--money-out)]/20'
                                        }`}>
                                            <Package size={12} />
                                            <span className="text-[10px] uppercase opacity-75 font-bold">{t.stock}:</span>
                                            {item.openingStock || 0} {item.unit || ''}
                                        </span>

                                        {item.mrp && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 shadow-4xs">
                                                <span className="text-[10px] uppercase font-bold tracking-wider mr-0.5">{t.mrpLabel}:</span>
                                                ₹{(+item.mrp).toFixed(2)}
                                            </span>
                                        )}

                                        {item.taxPercent !== undefined && item.taxPercent > 0 && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-4xs">
                                                <Percent size={12} />
                                                <span className="text-[10px] uppercase font-bold mr-0.5">{t.gstLabel}:</span>
                                                {item.taxPercent}% {item.taxType === 'Included' ? t.incTax : t.plusTax}
                                            </span>
                                        )}

                                        {item.hsnCode && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-4xs">
                                                <Hash size={12} />
                                                <span className="text-[10px] uppercase font-bold mr-0.5">{t.hsnCode}:</span>
                                                {item.hsnCode}
                                            </span>
                                        )}

                                        {item.category && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-4xs">
                                                <Layers size={12} />
                                                {item.category}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="text-right shrink-0 flex flex-col items-end gap-2.5 ml-2">
                                    <div>
                                        <div className="font-extrabold text-[var(--brand-primary)] text-xl tracking-tight">₹{(+item.saleRate).toFixed(2)}</div>
                                        <div className="text-[10px] uppercase text-[var(--text-secondary)] font-extrabold tracking-wider whitespace-nowrap opacity-80">{t.saleRate.replace(' *', '').replace(' (₹)', '')}</div>
                                    </div>
                                    <div className="flex gap-1.5 pt-0.5">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleEdit(item); }} 
                                            className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-light)] bg-[var(--bg-app)] rounded-xl border border-slate-200 dark:border-slate-800 transition-all duration-150 active:scale-95 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer" 
                                            title={t.editItem}
                                        >
                                            <Edit2 size={15} />
                                        </button>
                                        <PermissionWrapper requiredRole="admin" fallback="hide">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} 
                                                className="p-2 text-[var(--text-secondary)] hover:text-[var(--money-out)] hover:bg-red-500/10 bg-[var(--bg-app)] rounded-xl border border-slate-200 dark:border-slate-800 transition-all duration-150 active:scale-95 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer" 
                                                title={t.delete}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </PermissionWrapper>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SwipeableRow>
                ))}
            </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-3xs">
            <div className="bg-[var(--bg-card)] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
                <div className="w-14 h-14 bg-red-500/10 text-[var(--money-out)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20 shadow-4xs">
                    <Trash2 size={26} />
                </div>
                <h3 className="text-base font-black text-[var(--text-main)] mb-1.5">{t.deleteItem}</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-6 font-semibold leading-relaxed px-2">
                    {t.deleteConfirm}
                </p>
                <div className="flex gap-2.5">
                    <button 
                        type="button"
                        onClick={() => setDeleteId(null)} 
                        className="flex-1 py-3 bg-[var(--bg-app)] hover:bg-slate-100 dark:hover:bg-slate-800/50 text-[var(--text-secondary)] font-black text-xs tracking-wider uppercase rounded-2xl transition-all shadow-4xs active:scale-[0.97] cursor-pointer text-center border border-slate-200 dark:border-slate-800"
                    >
                        {t.cancel}
                    </button>
                    <button 
                        type="button"
                        onClick={confirmDelete} 
                        className="flex-1 py-3 bg-[var(--money-out)] hover:bg-red-600 text-white font-black text-xs tracking-wider uppercase rounded-2xl transition-all shadow-4xs hover:shadow-2xs active:scale-[0.97] cursor-pointer"
                    >
                        {t.delete}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Delete Multiple Confirmation Modal */}
      {deleteSelectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-3xs">
            <div className="bg-[var(--bg-card)] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
                <div className="w-14 h-14 bg-red-500/10 text-[var(--money-out)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20 shadow-4xs">
                    <Trash2 size={26} />
                </div>
                <h3 className="text-base font-black text-[var(--text-main)] mb-1.5">{t.deleteSelectedTitle}</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-6 font-semibold leading-relaxed px-2">
                    {t.deleteSelectedConfirm}
                </p>
                <div className="flex gap-2.5">
                    <button 
                        type="button"
                        onClick={() => setDeleteSelectedModal(false)} 
                        className="flex-1 py-3 bg-[var(--bg-app)] hover:bg-slate-100 dark:hover:bg-slate-800/50 text-[var(--text-secondary)] font-black text-xs tracking-wider uppercase rounded-2xl transition-all shadow-4xs active:scale-[0.97] cursor-pointer text-center border border-slate-200 dark:border-slate-800"
                    >
                        {t.cancel}
                    </button>
                    <button 
                        type="button"
                        onClick={confirmDeleteSelected} 
                        className="flex-1 py-3 bg-[var(--money-out)] hover:bg-red-600 text-white font-black text-xs tracking-wider uppercase rounded-2xl transition-all shadow-4xs hover:shadow-2xs active:scale-[0.97] cursor-pointer"
                    >
                        {t.delete}
                    </button>
                </div>
            </div>
        </div>
      )}

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
              <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-3xs" onClick={() => !isScanning && setIsModalOpen(false)}></div>
              
              {/* Scanner Overlay */}
              {isScanning ? (
                  <div className="bg-black relative z-50 w-full h-full sm:w-[400px] sm:h-[600px] sm:rounded-2xl flex flex-col items-center justify-center">
                      <button 
                        type="button"
                        onClick={stopScanner}
                        className="absolute top-6 left-6 z-[70] p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors cursor-pointer"
                      >
                        <ArrowLeft size={24} />
                      </button>

                      <div id="reader" className="w-full h-full bg-black"></div>
                      <button 
                        type="button"
                        onClick={stopScanner}
                        className="absolute bottom-10 bg-white text-black px-6 py-2 rounded-full font-bold shadow-lg z-[60] cursor-pointer"
                      >
                        {t.scanCancel}
                      </button>
                  </div>
              ) : (
                <div className="bg-[var(--bg-card)] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
                  <div className="bg-[var(--bg-app)] p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                      <h3 className="text-base font-black text-[var(--text-main)]">{editingId ? t.editItem : t.addNewItem}</h3>
                      <div className="flex items-center gap-1">
                          <button type="button" onClick={handleSave} className="text-green-600 dark:text-green-500 hover:bg-green-100 dark:hover:bg-green-900/40 p-2 rounded-full transition-all cursor-pointer" title="Save" aria-label="Save Item">
                              <Check size={22} strokeWidth={3} />
                          </button>
                          <button type="button" onClick={() => setIsModalOpen(false)} className="text-[var(--text-secondary)] hover:bg-slate-100 dark:hover:bg-slate-800/50 p-2 rounded-full transition-all cursor-pointer" title="Close" aria-label="Close">
                              <X size={18} />
                          </button>
                      </div>
                  </div>
                  
                  <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
                      <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">{t.itemName}</label>
                          <input type="text" required className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-semibold text-xs text-center" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} onFocus={handleFocus} placeholder={t.productNamePlaceholder} />
                      </div>
                      
                      <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">{t.itemCode}</label>
                          <div className="relative">
                              <input type="text" className={`block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-semibold text-xs text-center ${localStorage.getItem('showBarcodeScanner') !== 'false' ? 'pr-10' : ''}`} value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} onFocus={handleFocus} placeholder={t.scanOrType} />
                              {localStorage.getItem('showBarcodeScanner') !== 'false' && (
                                  <button type="button" onClick={startScanner} className="absolute right-2 top-1.5 p-1 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-light)] rounded-lg transition-all" title="Open Camera Scanner">
                                      <ScanBarcode size={20} />
                                  </button>
                              )}
                          </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">{t.saleRate}</label>
                            <input type="number" required className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-bold text-xs text-center" value={formData.saleRate || ''} onChange={e => setFormData({...formData, saleRate: Number(e.target.value)})} onFocus={handleFocus} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">{t.purchaseRate}</label>
                            <input type="number" className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-semibold text-xs text-center" value={formData.purchaseRate || ''} onChange={e => setFormData({...formData, purchaseRate: Number(e.target.value)})} onFocus={handleFocus} />
                          </div>
                           <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">{t.mrp}</label>
                            <input type="number" className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-semibold text-xs text-center" value={formData.mrp || ''} onChange={e => setFormData({...formData, mrp: Number(e.target.value)})} onFocus={handleFocus} />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                             <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">{t.taxGst}</label>
                             <select 
                                className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-semibold text-xs text-center appearance-none cursor-pointer" 
                                value={formData.taxPercent || 0} 
                                onChange={e => setFormData({...formData, taxPercent: Number(e.target.value)})}
                             >
                                <option value="0">0%</option>
                                {taxes.map(t => <option key={t.id} value={t.rate}>{t.name} ({t.rate}%)</option>)}
                             </select>
                          </div>
                           <div className="space-y-1.5">
                             <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">{t.taxType}</label>
                             <select className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-semibold text-xs text-center appearance-none cursor-pointer" value={formData.taxType || 'Excluded'} onChange={e => setFormData({...formData, taxType: e.target.value as any})}>
                                <option value="Excluded">{t.taxExcluded}</option>
                                <option value="Included">{t.taxIncluded}</option>
                             </select>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                             <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider flex items-center justify-center gap-1">
                               {t.stock} {authContext.currentUser?.role !== 'admin' && '🔒'}
                             </label>
                             <input 
                                type="number" 
                                disabled={authContext.currentUser?.role !== 'admin'}
                                className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-semibold text-xs text-center disabled:opacity-50 disabled:bg-[var(--bg-app)] cursor-not-allowed" 
                                value={formData.openingStock || ''} 
                                onChange={e => setFormData({...formData, openingStock: Number(e.target.value)})} 
                                onFocus={handleFocus} 
                             />
                          </div>
                          <div className="space-y-1.5">
                             <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">{t.unit}</label>
                             <select className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-semibold text-xs text-center appearance-none cursor-pointer" value={formData.unit || ''} onChange={e => setFormData({...formData, unit: e.target.value})}>
                                <option value="">-</option>
                                {units.map(u => <option key={u.id} value={u.code}>{u.code}</option>)}
                             </select>
                          </div>
                           <div className="space-y-1.5">
                             <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">{t.hsnCode}</label>
                             <select 
                                className="block w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/25 focus:border-[var(--brand-primary)] transition-all font-sans font-semibold text-xs text-center appearance-none cursor-pointer" 
                                value={formData.hsnCode || ''} 
                                onChange={handleHSNChange}
                             >
                                <option value="">- Select -</option>
                                {hsnCodes.map(h => <option key={h.id} value={h.code}>{h.code}</option>)}
                             </select>
                          </div>
                      </div>

                      <button 
                        type="submit" 
                        className="w-full h-12 bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white font-black text-xs tracking-wider uppercase rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer mt-2 flex justify-center items-center gap-2"
                      >
                        <Save size={16} /> {t.saveItem}
                      </button>
                  </form>
                </div>
              )}
          </div>
      )}

      {/* Share Items Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-3xs">
            <div className="absolute inset-0" onClick={() => !isSharing && setShowShareModal(false)}></div>
            <div className="bg-[var(--bg-card)] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
                <div className="bg-[var(--bg-app)] p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <h3 className="text-base font-black text-[var(--text-main)]">{t.selectClientTitle}</h3>
                    <button onClick={() => setShowShareModal(false)} className="hover:bg-slate-100 dark:hover:bg-slate-800/50 text-[var(--text-secondary)] p-1.5 rounded-full transition-all cursor-pointer"><X size={18} /></button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    {isSharing ? (
                        <div className="flex flex-col items-center py-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand-primary)] mb-4"></div>
                            <p className="text-[var(--text-secondary)] font-medium text-xs uppercase tracking-wider">{t.sending}</p>
                        </div>
                    ) : shareParties.length === 0 ? (
                        <p className="text-center text-[var(--text-secondary)] py-10 font-black text-xs uppercase tracking-wider">{t.noClients}</p>
                    ) : (
                        <div className="space-y-2">
                            {shareParties.map(party => (
                                <button
                                    key={party.id}
                                    onClick={() => handlePartySelectToShare(party)}
                                    className="w-full text-left p-4 bg-[var(--bg-app)] hover:bg-[var(--brand-light)] hover:text-[var(--brand-primary)] rounded-2xl border border-slate-200 dark:border-slate-800 transition-all flex justify-between items-center cursor-pointer group active:scale-[0.99]"
                                >
                                    <div>
                                        <h4 className="font-bold text-[var(--text-main)] text-sm group-hover:text-[var(--brand-primary)]">{party.name}</h4>
                                        <p className="text-xs text-[var(--text-secondary)] font-semibold mt-1">{party.mobile || 'No mobile number'}</p>
                                    </div>
                                    <Send size={18} className="text-[var(--brand-primary)]" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};