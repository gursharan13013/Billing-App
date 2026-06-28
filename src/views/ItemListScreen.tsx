import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Edit2, Package, X, Save, Search, ScanBarcode, Trash2, AlertTriangle, ArrowRight, Send, Check } from 'lucide-react';
import { Item, Unit, Category, TaxRate, HSNCode, Party } from '../core/types/';
import { BillingService as billingService } from '../services/SecureBillingService';
import { InventoryService } from '../services/inventoryService';
import { shareItemsWithClient } from '../services/firebaseService';
import { useAuth } from '../context/AuthContext';
import { PermissionWrapper } from '../components/shared/PermissionWrapper';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';


interface ItemListScreenProps {
  onBack: () => void;
  initialEditItemId?: string;
  returnScreen?: string;
  returnParams?: any;
  onReturn?: (screen: string, params?: any) => void;
}

export const ItemListScreen: React.FC<ItemListScreenProps> = ({ onBack, initialEditItemId, returnScreen, returnParams, onReturn }) => {
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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white p-4 flex items-center justify-between shadow-lg shrink-0 z-20 border-b border-white/10 dark:border-slate-800 pt-[max(env(safe-area-inset-top),48px)]">
        <div className="flex items-center gap-3">
            <button onClick={() => {
                if (isSelectionMode) {
                    setSelectedItems(new Set());
                } else {
                    onBack();
                }
            }} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                {isSelectionMode ? <X size={24} /> : <ArrowLeft size={24} />}
            </button>
            <h1 className="text-xl font-bold tracking-wide">
                {isSelectionMode ? `${selectedItems.size} Selected` : 'Item Master'}
            </h1>
        </div>
        <div className="flex items-center gap-2">
            {isSelectionMode ? (
                <>
                    <PermissionWrapper requiredRole="admin" fallback="hide">
                        <button onClick={() => setDeleteSelectedModal(true)} className="hover:bg-white/10 p-1 rounded-full transition-colors text-red-400" title="Delete Selected">
                            <Trash2 size={24} />
                        </button>
                    </PermissionWrapper>
                    <button onClick={handleShareClick} className="hover:bg-white/10 p-1 rounded-full transition-colors" title="Send Selected Items">
                        <ArrowRight size={24} />
                    </button>
                </>
            ) : (
                <>
                    <button onClick={handleShareClick} className="hover:bg-white/10 p-1 rounded-full transition-colors" title="Send All Items to Client">
                        <ArrowRight size={24} />
                    </button>
                    <button onClick={handleAddNew} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                        <Plus size={24} />
                    </button>
                </>
            )}
        </div>
      </header>

      <div className="p-4 pb-0 z-10 flex gap-2">
        <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search Items (Name or Code)..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-700 rounded-lg leading-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
        </div>
        {filteredItems.length > 0 && (
            <button 
                onClick={selectAll} 
                className={`py-3 px-4 rounded-lg font-bold border transition-colors flex items-center gap-2 shrink-0 ${selectedItems.size === filteredItems.length && filteredItems.length > 0 ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-gray-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
            >
                {selectedItems.size === filteredItems.length && filteredItems.length > 0 ? (
                     <><Check size={18} /> All</>
                ) : (
                     "Select All"
                )}
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {loading ? (
            <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Package size={48} className="opacity-20 mb-2" />
                <p>No items found.</p>
            </div>
        ) : (
            <div className="grid gap-3">
                {filteredItems.map(item => (
                    <div 
                        key={item.id} 
                        onClick={(e) => isSelectionMode && toggleItemSelection(item.id, e)}
                        className={`bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center group transition-all border ${selectedItems.has(item.id) ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-100 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-700'} ${isSelectionMode ? 'cursor-pointer' : ''}`}
                    >
                        <div className="flex items-start gap-3 w-full">
                            {/* Selection Checkbox Area */}
                            <div className="pt-1 mt-0.5 shrink-0" onClick={(e) => {
                                e.stopPropagation();
                                toggleItemSelection(item.id, e);
                            }}>
                                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors cursor-pointer ${selectedItems.has(item.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-400 bg-transparent text-transparent hover:border-blue-500'}`}>
                                    <Check size={14} strokeWidth={3} />
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{item.name}</h3>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-sm text-slate-500 dark:text-slate-400 font-medium">
                                    {item.code && <span className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-600 dark:text-slate-300">Code: {item.code}</span>}
                                    <span>Stock: {item.openingStock} {item.unit}</span>
                                    {item.mrp && <span>MRP: ₹{item.mrp}</span>}
                                    {item.hsnCode && <span>HSN: {item.hsnCode}</span>}
                                    {item.taxPercent && <span>GST: {item.taxPercent}%</span>}
                                </div>
                            </div>
                            
                            <div className="text-right shrink-0 flex flex-col items-end gap-2 ml-2">
                                <div>
                                    <div className="font-bold text-blue-600 dark:text-blue-400 text-lg">₹{item.saleRate}</div>
                                    <div className="text-xs text-slate-400 font-medium whitespace-nowrap">Sale Rate</div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"><Edit2 size={18} /></button>
                                    <PermissionWrapper requiredRole="admin" fallback="hide">
                                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                    </PermissionWrapper>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-900/50">
                    <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Item?</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">
                    Are you sure you want to delete this item? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeleteId(null)} 
                        className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete} 
                        className="flex-1 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Delete Multiple Confirmation Modal */}
      {deleteSelectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-900/50">
                    <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete {selectedItems.size} Items?</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">
                    Are you sure you want to delete these {selectedItems.size} items? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeleteSelectedModal(false)} 
                        className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDeleteSelected} 
                        className="flex-1 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
              <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => !isScanning && setIsModalOpen(false)}></div>
              
              {/* Scanner Overlay */}
              {isScanning ? (
                  <div className="bg-black relative z-50 w-full h-full sm:w-[400px] sm:h-[600px] sm:rounded-2xl flex flex-col items-center justify-center">
                      {/* NEW BACK BUTTON */}
                      <button 
                        onClick={stopScanner}
                        className="absolute top-6 left-6 z-[70] p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                      >
                        <ArrowLeft size={24} />
                      </button>

                      <div id="reader" className="w-full h-full bg-black"></div>
                      <button 
                        onClick={stopScanner}
                        className="absolute bottom-10 bg-white text-black px-6 py-2 rounded-full font-bold shadow-lg z-[60]"
                      >
                        Cancel Scan
                      </button>
                  </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden max-h-[90vh] flex flex-col border-t border-slate-200 dark:border-slate-800">
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingId ? 'Edit Item' : 'Add New Item'}</h2>
                      <div className="flex items-center gap-1">
                          <button type="button" onClick={handleSave} className="text-green-600 dark:text-green-500 hover:bg-green-100 dark:hover:bg-green-900/40 p-2 rounded-full transition-colors" title="Save" aria-label="Save Item">
                              <Check size={28} strokeWidth={3} />
                          </button>
                          <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 p-2 rounded-full transition-colors" title="Close" aria-label="Close">
                              <X size={24} />
                          </button>
                      </div>
                  </div>
                  
                  <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Item Name *</label>
                          <input type="text" required className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none text-lg text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} onFocus={handleFocus} placeholder="Product Name" />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Item Code / Barcode</label>
                          <div className="relative">
                              <input type="text" className={`w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 ${localStorage.getItem('showBarcodeScanner') !== 'false' ? 'pr-10' : ''} outline-none text-lg text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500`} value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} onFocus={handleFocus} placeholder="Scan or Type" />
                              {localStorage.getItem('showBarcodeScanner') !== 'false' && (
                                  <button type="button" onClick={startScanner} className="absolute right-2 top-2 p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Open Camera Scanner">
                                      <ScanBarcode size={24} />
                                  </button>
                              )}
                          </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-1">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Sale Rate (₹) *</label>
                            <input type="number" required className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 font-bold text-slate-900 dark:text-white outline-none text-lg" value={formData.saleRate} onChange={e => setFormData({...formData, saleRate: Number(e.target.value)})} onFocus={handleFocus} />
                          </div>
                          <div className="col-span-1">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Purchase Rate</label>
                            <input type="number" className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none text-lg text-slate-900 dark:text-white font-medium" value={formData.purchaseRate} onChange={e => setFormData({...formData, purchaseRate: Number(e.target.value)})} onFocus={handleFocus} />
                          </div>
                           <div className="col-span-1">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">MRP</label>
                            <input type="number" className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none text-lg text-slate-900 dark:text-white font-medium" value={formData.mrp} onChange={e => setFormData({...formData, mrp: Number(e.target.value)})} onFocus={handleFocus} />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Tax (GST)</label>
                             <select 
                                className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none text-lg text-slate-900 dark:text-white font-medium" 
                                value={formData.taxPercent} 
                                onChange={e => setFormData({...formData, taxPercent: Number(e.target.value)})}
                             >
                                <option value="0">0%</option>
                                {taxes.map(t => <option key={t.id} value={t.rate}>{t.name} ({t.rate}%)</option>)}
                             </select>
                          </div>
                           <div>
                             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Tax Type</label>
                             <select className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none text-lg text-slate-900 dark:text-white font-medium" value={formData.taxType || 'Excluded'} onChange={e => setFormData({...formData, taxType: e.target.value as any})}>
                                <option value="Excluded">Excluded (Plus Tax)</option>
                                <option value="Included">Included (Inc Tax)</option>
                             </select>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-1">
                             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-1 flex items-center gap-1">
                               Stock {authContext.currentUser?.role !== 'admin' && '🔒'}
                             </label>
                             <input 
                                type="number" 
                                disabled={authContext.currentUser?.role !== 'admin'}
                                className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none text-lg text-slate-900 dark:text-white font-medium disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900 cursor-not-allowed" 
                                value={formData.openingStock} 
                                onChange={e => setFormData({...formData, openingStock: Number(e.target.value)})} 
                                onFocus={handleFocus} 
                             />
                          </div>
                          <div className="col-span-1">
                             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Unit</label>
                             <select className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none text-lg text-slate-900 dark:text-white font-medium" value={formData.unit || ''} onChange={e => setFormData({...formData, unit: e.target.value})}>
                                <option value="">-</option>
                                {units.map(u => <option key={u.id} value={u.code}>{u.code}</option>)}
                             </select>
                          </div>
                           <div className="col-span-1">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">HSN Code</label>
                            <select 
                                className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3 outline-none text-lg text-slate-900 dark:text-white font-medium" 
                                value={formData.hsnCode || ''} 
                                onChange={handleHSNChange}
                            >
                                <option value="">- Select -</option>
                                {hsnCodes.map(h => <option key={h.id} value={h.code}>{h.code}</option>)}
                            </select>
                          </div>
                      </div>

                      <div className="pt-2">
                          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl shadow hover:bg-blue-700 flex justify-center gap-2 text-lg">
                              <Save size={24} /> Save Item
                          </button>
                      </div>
                  </form>
                </div>
              )}
          </div>
      )}

      {/* Share Items Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => !isSharing && setShowShareModal(false)}></div>
            <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden max-h-[90vh] flex flex-col border-t border-slate-200 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Select Client to Send Items</h2>
                    <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 p-1 rounded-full"><X size={24} /></button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    {isSharing ? (
                        <div className="flex flex-col items-center py-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                            <p className="text-slate-600 dark:text-slate-400 font-medium">Sending items...</p>
                        </div>
                    ) : shareParties.length === 0 ? (
                        <p className="text-center text-slate-500 py-10">No clients found.</p>
                    ) : (
                        <div className="space-y-2">
                            {shareParties.map(party => (
                                <button
                                    key={party.id}
                                    onClick={() => handlePartySelectToShare(party)}
                                    className="w-full text-left p-4 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex justify-between items-center"
                                >
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">{party.name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{party.mobile || 'No mobile number'}</p>
                                    </div>
                                    <Send size={20} className="text-blue-500" />
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