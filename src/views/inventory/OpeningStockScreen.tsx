import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Check, QrCode, X, Plus, AlertCircle, Sparkles, Calendar, Tag, DollarSign, Package as BoxIcon, FileText } from 'lucide-react';
import { billingService } from '../../services/billingService';
import { Item, Language } from '../../core/types/';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { PermissionWrapper } from '../../components/shared/PermissionWrapper';
import { motion, AnimatePresence } from 'motion/react';

interface OpeningStockScreenProps {
  onBack: () => void;
  language: Language;
}

export const OpeningStockScreen: React.FC<OpeningStockScreenProps> = ({ onBack, language }) => {
  const [date, setDate] = useState(() => new Date().toLocalDateString());
  const [itemName, setItemName] = useState('');
  const [mrp, setMrp] = useState<number | ''>('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [openingStock, setOpeningStock] = useState<number | ''>('');
  const [items, setItems] = useState<Item[]>([]);
  const [capitalLedger, setCapitalLedger] = useState('OPENING CAPITAL');
  
  const [addedItems, setAddedItems] = useState<{item: Item, qty: number, price: number}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Custom Modal/Alert System
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  // Focus ref for transition
  const openingStockRef = useRef<HTMLInputElement>(null);

  // Scanner State (typed as any to support dynamic import)
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<any>(null);
  const isScannerRunning = useRef(false);

  const isHi = language === 'hi';
  const t = {
    title: isHi ? 'ओपनिंग स्टॉक' : 'Opening Stock',
    selectDate: isHi ? 'तारीख का चयन' : 'Select Date',
    itemName: isHi ? 'मद का नाम (Item)' : 'Item Name',
    mrp: isHi ? 'मार्क रेट (MRP)' : 'MRP',
    purchasePrice: isHi ? 'खरीद मूल्य' : 'Purchase Price',
    salePrice: isHi ? 'बिक्री मूल्य' : 'Sale Price',
    openingStock: isHi ? 'प्रारंभिक स्टॉक' : 'Opening Stock',
    addBtn: isHi ? 'मद जोड़ें' : 'ADD ITEM',
    itemHeader: isHi ? 'विवरण' : 'Item Description',
    qtyHeader: isHi ? 'मात्रा' : 'Qty',
    priceHeader: isHi ? 'मूल्य' : 'Price',
    totalItems: isHi ? 'कुल मद' : 'Total Items',
    capitalLedger: isHi ? 'पूंजी खाता चुनें' : 'Select Capital Ledger',
    saveBtn: isHi ? 'सहेजें (SAVE)' : 'SAVE OPENING STOCK',
    scanBarcode: isHi ? 'बारकोड स्कैन' : 'Scan Barcode',
    validationErr: isHi ? 'कृपया आइटम का नाम और ओपनिंग स्टॉक दर्ज करें।' : 'Please enter item name and opening stock.',
    emptyListErr: isHi ? 'कृपया सहेजने के लिए कम से कम एक आइटम जोड़ें।' : 'Please add at least one item before saving.',
    successMsg: isHi ? 'ओपनिंग स्टॉक सफलतापूर्वक सहेज लिया गया है!' : 'Opening stock has been saved successfully!',
    failMsg: isHi ? 'सहेजने में त्रुटि। कृपया पुनः प्रयास करें।' : 'Failed to save opening stock. Please try again.',
    close: isHi ? 'ठीक है' : 'OK',
    alertTitle: isHi ? 'सूचना' : 'Notification',
    placeholderItem: isHi ? 'खोजें या नया नाम लिखें...' : 'Type name or search existing...',
    history: isHi ? 'जोड़े गए आइटम सूची' : 'Added Inventory Log'
  };

  useEffect(() => {
    loadItems();
    return () => {
        if (scannerRef.current && isScannerRunning.current) {
            scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
        }
    };
  }, []);

  const loadItems = async () => {
    try {
      const data = await billingService.getAllItems();
      setItems(data || []);
    } catch (e) {
      console.warn("Failed to load items:", e);
    }
  };

  // Memoized suggestions list to completely eliminate input/typing lag on items load
  const suggestions = useMemo(() => {
    if (!itemName.trim()) return [];
    const search = itemName.toLowerCase();
    return items.filter(i => i.name && i.name.toLowerCase().includes(search)).slice(0, 5);
  }, [items, itemName]);

  const handleSelectItem = (item: Item) => {
    setItemName(item.name);
    setMrp(item.mrp || '');
    setPurchasePrice(item.purchaseRate || '');
    setSalePrice(item.saleRate || '');
    setOpeningStock(item.openingStock || '');
    setShowSuggestions(false);
    // Automatically focus the quantity input field to optimize typing flow
    setTimeout(() => {
      openingStockRef.current?.focus();
    }, 50);
  };

  const showNotification = (msg: string) => {
    setModalMessage(msg);
  };

  const handleAdd = () => {
    if (!itemName.trim() || !openingStock) {
      showNotification(t.validationErr);
      return;
    }

    const existingItem = items.find(i => i.name.toLowerCase() === itemName.trim().toLowerCase());
    
    const newItem: Item = existingItem ? {
      ...existingItem,
      mrp: Number(mrp) || existingItem.mrp,
      purchaseRate: Number(purchasePrice) || existingItem.purchaseRate,
      saleRate: Number(salePrice) || existingItem.saleRate,
      openingStock: Number(openingStock)
    } : {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: itemName.trim(),
      mrp: Number(mrp) || 0,
      purchaseRate: Number(purchasePrice) || 0,
      saleRate: Number(salePrice) || 0,
      openingStock: Number(openingStock),
      taxPercent: 0,
      taxType: 'Excluded'
    };

    setAddedItems([...addedItems, { item: newItem, qty: Number(openingStock), price: Number(purchasePrice) || 0 }]);
    
    // Reset form
    setItemName('');
    setMrp('');
    setPurchasePrice('');
    setSalePrice('');
    setOpeningStock('');
  };

  const removeItem = (idx: number) => {
    const target = [...addedItems];
    target.splice(idx, 1);
    setAddedItems(target);
  };

  const handleSave = async () => {
    if (addedItems.length === 0) {
      showNotification(t.emptyListErr);
      return;
    }

    try {
      for (const added of addedItems) {
        await billingService.saveItem(added.item);
      }
      showNotification(t.successMsg);
      setTimeout(() => {
        setModalMessage(null);
        onBack();
      }, 1600);
    } catch (error) {
      console.error("Failed to save opening stock", error);
      showNotification(t.failMsg);
    }
  };

  // --- Optimized Scanner Functions using Dynamic Import ---
  const startScanner = async () => {
      if (Capacitor.isNativePlatform()) {
          try {
              const status = await Camera.requestPermissions();
              if (status.camera === 'denied' || status.camera === 'prompt-with-rationale') {
                  showNotification(isHi ? "स्कैनर का उपयोग करने के लिए कैमरा अनुमति दें।" : "Please grant Camera permission to use the scanner.");
                  return;
              }
          } catch (e) {
              console.warn("Camera permission request failed", e);
          }
      }

      setIsScanning(true);
      setTimeout(async () => {
          const elementId = "opening-stock-reader";
          if (!document.getElementById(elementId)) {
              setIsScanning(false);
              return;
          }
          if (scannerRef.current) {
              try { if (isScannerRunning.current) await scannerRef.current.stop(); await scannerRef.current.clear(); } catch(e) {}
              scannerRef.current = null;
              isScannerRunning.current = false;
          }

          try {
              // Dynamically import html5-qrcode to prevent initial evaluation delays of heavy modules
              const { Html5Qrcode } = await import('html5-qrcode');
              const html5QrCode = new Html5Qrcode(elementId);
              scannerRef.current = html5QrCode;
              await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, 
                  (decodedText) => handleScanSuccess(decodedText), () => {});
              isScannerRunning.current = true;
          } catch (err: any) {
              setIsScanning(false);
              showNotification("Camera error: " + err.message);
          }
      }, 300);
  };

  const stopScanner = async () => {
      if (scannerRef.current && isScannerRunning.current) {
          try {
              await scannerRef.current.stop();
              scannerRef.current.clear();
          } catch(e) {}
          isScannerRunning.current = false;
      }
      setIsScanning(false);
  };

  const handleScanSuccess = async (decodedText: string) => {
      await stopScanner();
      
      const foundItem = items.find(i => i.barcode === decodedText || (i.code && i.code === decodedText));
      if (foundItem) {
          handleSelectItem(foundItem);
      } else {
          setItemName(decodedText);
          showNotification(isHi ? "मद नहीं मिली! आप इसे एक नए आइटम के रूप में विवरण भरकर जोड़ सकते हैं।" : "Item not found. You can add it as a new item by providing stock details.");
      }
  };

  // Memoized total amount calculation
  const totalAmount = useMemo(() => {
    return addedItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
  }, [addedItems]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Scanner Overlay */}
      {isScanning && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col">
              <div className="p-4 flex justify-between items-center bg-black text-white">
                  <h3 className="font-bold font-sans tracking-wide text-sm">{t.scanBarcode}</h3>
                  <button type="button" onClick={stopScanner} className="p-3 bg-white/10 rounded-full active:scale-95 transition-transform"><X size={20} /></button>
              </div>
              <div className="flex-1 flex items-center justify-center">
                  <div id="opening-stock-reader" className="w-full max-w-sm rounded-[2rem] overflow-hidden border border-slate-800"></div>
              </div>
          </div>
      )}

      {/* Modern Top Header (Aligned with master screen standards) */}
      <header className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white p-4 flex items-center justify-between shadow-sm shrink-0 border-b border-gray-200 dark:border-slate-800 pt-[max(env(safe-area-inset-top),48px)] transition-colors">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onBack}
            className="hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-full transition-colors"
            aria-label="Go back"
            id="opening-stock-back-btn"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white" id="opening-stock-header-title">
              {t.title}
            </h1>
          </div>
        </div>

        <PermissionWrapper requiredRole="admin" fallback="hide">
          <button 
            type="button"
            onClick={handleSave} 
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
            id="opening-stock-save-btn"
          >
            <Check size={18} />
            {isHi ? 'सहेजें' : 'Save'}
          </button>
        </PermissionWrapper>
      </header>

      {/* Main Core Body Screen Area */}
      <div className="flex-1 overflow-y-auto p-4 font-sans select-none custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start max-w-6xl mx-auto w-full">
          
          {/* Left Panel: Form Input & Capital Ledger */}
          <div className="lg:col-span-7 space-y-4 w-full">
            
            {/* Form Fields Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date Field */}
                <div className="relative col-span-1">
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Calendar size={16} className="text-slate-400" />
                    {t.selectDate}
                  </label>
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm text-sm"
                  />
                </div>

                {/* Item Name Field */}
                <div className="relative col-span-1">
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Tag size={16} className="text-slate-400" />
                    {t.itemName}
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        value={itemName}
                        onChange={(e) => {
                          setItemName(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder={t.placeholderItem}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm text-sm"
                      />
                    </div>
                    {localStorage.getItem('showBarcodeScanner') !== 'false' && (
                      <button 
                        type="button"
                        onClick={startScanner} 
                        className="p-2 text-slate-500 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center cursor-pointer h-[38px] w-[38px] shrink-0"
                        title={t.scanBarcode}
                      >
                        <QrCode size={18} />
                      </button>
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-48 overflow-y-auto rounded-lg mt-1 z-40 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden"
                      >
                        {suggestions.map(item => (
                          <div 
                            key={item.id}
                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-sm flex justify-between items-center transition-colors"
                            onMouseDown={() => handleSelectItem(item)}
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-100">{item.name}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                              Stock: {item.openingStock || 0}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* MRP */}
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <DollarSign size={16} className="text-slate-400" />
                    {t.mrp}
                  </label>
                  <input 
                    type="number" 
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value ? Number(e.target.value) : '')}
                    placeholder="₹ 0.00"
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm text-sm"
                  />
                </div>
                {/* Purchase Price */}
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <DollarSign size={16} className="text-slate-400" />
                    {t.purchasePrice}
                  </label>
                  <input 
                    type="number" 
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="₹ 0.00"
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                {/* Sale Price */}
                <div className="col-span-1">
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <DollarSign size={16} className="text-slate-400" />
                    {t.salePrice}
                  </label>
                  <input 
                    type="number" 
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="₹ 0.00"
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm text-sm"
                  />
                </div>
                
                {/* Opening Stock + ADD Button aligned horizontally inside col */}
                <div className="col-span-1 flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <BoxIcon size={16} className="text-slate-400" />
                      {t.openingStock}
                    </label>
                    <input 
                      ref={openingStockRef}
                      type="number" 
                      value={openingStock}
                      onChange={(e) => setOpeningStock(e.target.value ? Number(e.target.value) : '')}
                      placeholder="0"
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm font-bold text-blue-600 dark:text-blue-400 text-sm"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={handleAdd}
                    className="h-[38px] px-4 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-1 shrink-0"
                  >
                    <Plus size={16} />
                    {t.addBtn.split(' ')[0]}
                  </button>
                </div>
              </div>
            </div>

            {/* Capital Ledger Field */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText size={16} className="text-slate-400" />
                {t.capitalLedger}
              </label>
              <input 
                type="text" 
                value={capitalLedger}
                onChange={(e) => setCapitalLedger(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm text-center font-bold tracking-wider uppercase text-sm"
              />
            </div>

            {/* Save Button (Admin lock status check wrapper) */}
            <PermissionWrapper requiredRole="admin" fallback="lock" className="w-full flex justify-center pt-2">
                <button 
                  type="button"
                  onClick={handleSave}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-md active:scale-[0.98] cursor-pointer text-center text-sm"
                >
                  {t.saveBtn}
                </button>
            </PermissionWrapper>

          </div>

          {/* Right Panel: Added Items List Section */}
          <div className="lg:col-span-5 space-y-4 w-full lg:sticky lg:top-4">
            
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={16} className="text-blue-500" />
                  {t.history}
                </h3>
                <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                  {t.totalItems}: {addedItems.length}
                </span>
              </div>

              <div className="min-h-[120px] max-h-[350px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar">
                {addedItems.length === 0 ? (
                  <div className="h-36 flex flex-col items-center justify-center text-center text-slate-400/70 pl-1">
                    <p className="text-xs font-bold italic">{isHi ? 'कोई आइटम नहीं जोड़ा गया' : 'No items added yet'}</p>
                  </div>
                ) : (
                  addedItems.map((added, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate pr-2">
                          {added.item.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {t.mrp}: ₹{added.item.mrp?.toFixed(2)} • Sale: ₹{added.item.saleRate?.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {added.qty} Qty
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {added.price ? `₹${added.price.toFixed(2)}` : '—'}
                          </p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeItem(idx)} 
                          className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg active:scale-95 transition-all cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center font-sans">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">{isHi ? 'कुल मूल्य' : 'Total Capital Value'}</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Accessible Glassmorphic Notification/Alert Modal */}
      <AnimatePresence>
        {modalMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm select-none">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-slate-200 dark:border-slate-800"
            >
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-200 dark:border-blue-900/50">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t.alertTitle}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium leading-relaxed px-2">
                {modalMessage}
              </p>
              <div className="flex">
                <button 
                  type="button"
                  onClick={() => setModalMessage(null)} 
                  className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
