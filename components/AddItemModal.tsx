import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Search } from 'lucide-react';
import { Item, InvoiceItem } from '../types';
import { billingService } from '../src/services/billingService';


interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: InvoiceItem) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [rate, setRate] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [taxType, setTaxType] = useState<'Excluded' | 'Included'>('Excluded');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  
  // Ref for the quantity input in the detail view
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Load items when modal opens
  useEffect(() => {
    if (isOpen) {
      billingService.getAllItems().then(setItems);
      // Reset state
      setSelectedItem(null);
      setQty(1);
      setRate(0);
      setTaxPercent(0);
      setTaxType('Excluded');
      setDiscountPercent(0);
      setSearchTerm('');
    }
  }, [isOpen]);

  // Autofocus logic for the second stage
  useEffect(() => {
      if (selectedItem && qtyInputRef.current) {
          qtyInputRef.current.focus();
          qtyInputRef.current.select();
      }
  }, [selectedItem]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter(i => i.name && i.name.toLowerCase().includes(searchTerm.trim().toLowerCase()));
  }, [items, searchTerm]);

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
    setRate(item.saleRate);
    setTaxType(item.taxType || 'Excluded');
    setTaxPercent(item.taxPercent || 0);
    setSearchTerm(''); 
  };
  
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      const target = e.target;
      setTimeout(() => {
          target.select();
      }, 10);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
  };

  const handleAdd = () => {
    if (selectedItem && qty > 0) {
      onAdd({
        id: Math.random().toString(36).substr(2, 9),
        item: selectedItem,
        qty,
        rate,
        mrp: selectedItem.mrp || (selectedItem.saleRate * 1.2),
        taxType: taxType,
        taxPercent: taxPercent,
        discountPercent: discountPercent
      });
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && selectedItem) {
          handleAdd();
      }
  };

  const calculateLineTotal = () => {
      const base = qty * rate;
      const discountAmount = base * (discountPercent / 100);
      const subTotal = base - discountAmount;

      if (taxType === 'Excluded') {
          return subTotal + (subTotal * taxPercent / 100);
      }
      return subTotal;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        
        <div className="fixed inset-0 bg-black/80 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-slate-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-slate-800">
          <div className="bg-slate-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-white" id="modal-title">
                आइटम जोड़ें
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Selection Stage */}
            {!selectedItem ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="आइटम खोजें..."
                            className="w-full pl-9 p-2 border border-slate-700 bg-slate-800 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white placeholder-slate-500"
                            value={searchTerm}
                            onFocus={handleFocus}
                            onChange={e => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="w-24">
                        <input
                            type="number"
                            min="1"
                            placeholder="मात्रा"
                            value={qty}
                            onFocus={handleFocus}
                            onChange={(e) => setQty(Number(e.target.value))}
                            className="w-full p-2 border border-slate-700 bg-slate-800 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center text-white placeholder-slate-500"
                        />
                    </div>
                </div>
                
                <div className="max-h-60 overflow-y-auto border rounded-md border-slate-700">
                    {filteredItems.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">कोई आइटम नहीं मिला</div>
                    ) : (
                        filteredItems.map(item => (
                            <div 
                                key={item.id} 
                                onClick={() => handleItemSelect(item)}
                                className="p-3 hover:bg-slate-800 cursor-pointer border-b last:border-0 border-slate-800 flex justify-between items-center group"
                            >
                                <div>
                                    <div className="font-medium text-white">{item.name}</div>
                                    <div className="text-xs text-slate-400">HSN: {item.hsnCode || 'N/A'}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="font-semibold text-slate-300">₹{item.saleRate}</div>
                                    <div className="hidden group-hover:block text-blue-400">
                                        <Plus size={18} />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
              </div>
            ) : (
              // Quantity Stage
              <div className="space-y-4" onKeyDown={handleKeyDown}>
                <div className="bg-slate-800 p-3 rounded-md flex justify-between items-center border border-slate-700">
                    <div>
                        <p className="font-semibold text-white">{selectedItem.name}</p>
                        <p className="text-xs text-slate-400">HSN: {selectedItem.hsnCode}</p>
                    </div>
                    <button onClick={() => setSelectedItem(null)} className="text-xs text-blue-400 hover:text-blue-300 underline">
                        बदलें
                    </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300">मात्रा</label>
                        <input
                            ref={qtyInputRef}
                            type="number"
                            min="1"
                            value={qty}
                            onFocus={handleFocus}
                            onChange={(e) => setQty(Number(e.target.value))}
                            className="mt-1 block w-full border border-slate-700 bg-slate-800 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300">रेट (₹)</label>
                        <input
                            type="number"
                            min="0"
                            value={rate}
                            onFocus={handleFocus}
                            onChange={(e) => setRate(Number(e.target.value))}
                            className="mt-1 block w-full border border-slate-700 bg-slate-800 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300">छूट (Disc) %</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={discountPercent}
                            onFocus={handleFocus}
                            onChange={(e) => setDiscountPercent(Number(e.target.value))}
                            className="mt-1 block w-full border border-slate-700 bg-slate-800 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300">टैक्स %</label>
                        <input
                            type="number"
                            min="0"
                            value={taxPercent}
                            onFocus={handleFocus}
                            onChange={(e) => setTaxPercent(Number(e.target.value))}
                            className="mt-1 block w-full border border-slate-700 bg-slate-800 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300">टैक्स प्रकार</label>
                        <select
                            value={taxType}
                            onChange={(e) => setTaxType(e.target.value as 'Excluded' | 'Included')}
                            className="mt-1 block w-full border border-slate-700 bg-slate-800 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white"
                        >
                            <option value="Excluded">अलग से (Exc)</option>
                            <option value="Included">शामिल (Inc)</option>
                        </select>
                    </div>
                </div>
                
                <div className="pt-2 flex justify-between items-center text-slate-300 border-t border-slate-700 mt-2">
                    <span>लाइन टोटल:</span>
                    <span className="font-bold text-lg text-white">₹{calculateLineTotal().toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-800">
            {selectedItem ? (
                 <button
                 type="button"
                 onClick={handleAdd}
                 className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
               >
                 जोड़ें
               </button>
            ) : (
                <button disabled className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-slate-700 text-base font-medium text-slate-400 cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm">
                   आइटम चुनें
                </button>
            )}
           
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-600 shadow-sm px-4 py-2 bg-slate-800 text-base font-medium text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              रद्द करें
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};