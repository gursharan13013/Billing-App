import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Check, QrCode, X } from 'lucide-react';
import { billingService } from '../src/services/billingService';
import { Item, Party } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { PermissionWrapper } from './PermissionWrapper';


interface OpeningStockScreenProps {
  onBack: () => void;
}

export const OpeningStockScreen: React.FC<OpeningStockScreenProps> = ({ onBack }) => {
  const [date, setDate] = useState(new Date().toLocalDateString());
  const [itemName, setItemName] = useState('');
  const [mrp, setMrp] = useState<number | ''>('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [openingStock, setOpeningStock] = useState<number | ''>('');
  const [items, setItems] = useState<Item[]>([]);
  const [capitalLedger, setCapitalLedger] = useState('OPENING CAPITAL');
  
  const [addedItems, setAddedItems] = useState<{item: Item, qty: number, price: number}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScannerRunning = useRef(false);

  useEffect(() => {
    loadItems();
    return () => {
        if (scannerRef.current && isScannerRunning.current) {
            scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
        }
    };
  }, []);

  const loadItems = async () => {
    const data = await billingService.getAllItems();
    setItems(data);
  };

  const suggestions = items.filter(i => i.name && i.name.toLowerCase().includes(itemName.toLowerCase()) && itemName.trim() !== '');

  const handleSelectItem = (item: Item) => {
    setItemName(item.name);
    setMrp(item.mrp || '');
    setPurchasePrice(item.purchaseRate || '');
    setSalePrice(item.saleRate || '');
    setOpeningStock(item.openingStock || '');
    setShowSuggestions(false);
  };

  const handleAdd = () => {
    if (!itemName.trim() || !openingStock) {
      alert("Please enter item name and opening stock.");
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

  const handleSave = async () => {
    if (addedItems.length === 0) {
      alert("Please add at least one item.");
      return;
    }

    try {
      for (const added of addedItems) {
        await billingService.saveItem(added.item);
      }
      alert("Opening stock saved successfully!");
      onBack();
    } catch (error) {
      console.error("Failed to save opening stock", error);
      alert("Failed to save. Please try again.");
    }
  };

  // --- Scanner Functions ---
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
          const html5QrCode = new Html5Qrcode(elementId);
          scannerRef.current = html5QrCode;
          try {
              await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, 
                  (decodedText) => handleScanSuccess(decodedText), () => {});
              isScannerRunning.current = true;
          } catch (err: any) {
              setIsScanning(false);
              alert("Camera error: " + err.message);
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
      
      // Find item by barcode
      const foundItem = items.find(i => i.barcode === decodedText);
      if (foundItem) {
          handleSelectItem(foundItem);
      } else {
          // If not found, just set the name to the barcode so they can create it
          setItemName(decodedText);
          alert("Item not found. You can add it as a new item.");
      }
  };

  const totalAmount = addedItems.reduce((sum, item) => sum + (item.qty * item.price), 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Scanner Overlay */}
      {isScanning && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col">
              <div className="p-4 flex justify-between items-center bg-black text-white">
                  <h3 className="font-bold">Scan Barcode</h3>
                  <button onClick={stopScanner} className="p-2 bg-white/20 rounded-full"><X size={24} /></button>
              </div>
              <div className="flex-1 flex items-center justify-center">
                  <div id="opening-stock-reader" className="w-full max-w-sm"></div>
              </div>
          </div>
      )}

      <header className="bg-[#3b5998] text-white p-4 shadow-md flex justify-between items-center shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="active:scale-95 transition-transform"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-medium">Add Opening Stock</h1>
        </div>
        <PermissionWrapper requiredRole="admin" fallback="hide">
          <button onClick={handleSave} className="active:scale-95 transition-transform"><Check size={24} /></button>
        </PermissionWrapper>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-1">Select Date</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 border-2 border-slate-400 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-1">Item Name</label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={itemName}
                onChange={(e) => {
                  setItemName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Item Name"
                className="w-full p-2 border-2 border-slate-400 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              />
              {localStorage.getItem('showBarcodeScanner') !== 'false' && (
                  <button onClick={startScanner} className="p-2 bg-slate-200 dark:bg-slate-700 rounded"><QrCode size={20} /></button>
              )}
            </div>
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl max-h-40 overflow-y-auto rounded-b-lg mt-1 z-50">
                    {suggestions.map(item => (
                        <div 
                            key={item.id}
                            className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm border-b last:border-0 border-slate-100 dark:border-slate-700 flex justify-between items-center"
                            onMouseDown={() => handleSelectItem(item)}
                        >
                            <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                            <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Stock: {item.openingStock || 0}</span>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-1">MRP</label>
            <input 
              type="number" 
              value={mrp}
              onChange={(e) => setMrp(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border-2 border-slate-400 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-1">Purchase Price</label>
            <input 
              type="number" 
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border-2 border-slate-400 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-1">Sale Price</label>
            <input 
              type="number" 
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value ? Number(e.target.value) : '')}
              className="w-full p-2 border-2 border-slate-400 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-bold text-slate-900 dark:text-white mb-1">Opening Stock</label>
              <input 
                type="number" 
                value={openingStock}
                onChange={(e) => setOpeningStock(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2 border-2 border-blue-600 dark:border-blue-500 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <button 
              onClick={handleAdd}
              className="bg-[#3b5998] hover:bg-blue-800 text-white px-4 py-2 rounded font-bold h-[42px]"
            >
              ADD
            </button>
          </div>
        </div>

        {/* Added Items List */}
        <div className="border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 min-h-[200px] flex flex-col">
          <div className="grid grid-cols-3 p-2 border-b border-slate-200 dark:border-slate-700 font-bold text-sm">
            <div>Item</div>
            <div className="text-center">Qty</div>
            <div className="text-right">Price</div>
          </div>
          <div className="flex-1 p-2 space-y-2">
            {addedItems.map((added, idx) => (
              <div key={idx} className="grid grid-cols-3 text-sm">
                <div>{added.item.name}</div>
                <div className="text-center">{added.qty}</div>
                <div className="text-right">{added.price}</div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm">
            <div>Items : {addedItems.length}</div>
            <div>{totalAmount.toFixed(2)}</div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-900 dark:text-white mb-1">Select Capital Ledger</label>
          <input 
            type="text" 
            value={capitalLedger}
            onChange={(e) => setCapitalLedger(e.target.value)}
            className="w-full p-2 border-2 border-slate-400 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
          />
        </div>

        <PermissionWrapper requiredRole="admin" fallback="lock" className="w-full flex justify-center mt-2">
            <button 
              onClick={handleSave}
              className="w-full bg-[#3b5998] hover:bg-blue-800 text-white py-3 rounded font-bold transition-colors"
            >
              SAVE
            </button>
        </PermissionWrapper>

      </div>
    </div>
  );
};
