import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Factory, Package, Edit2, X } from 'lucide-react';
import { billingService } from '../src/services/billingService';
import { Item, ManufacturingEntry, RawMaterialConsumption } from '../types';


interface ManufacturingScreenProps {
  onBack: () => void;
}

export const ManufacturingScreen: React.FC<ManufacturingScreenProps> = ({ onBack }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [date, setDate] = useState(new Date().toLocalDateString());
  
  // Finished Good State
  const [finishedItemName, setFinishedItemName] = useState('');
  const [finishedItemId, setFinishedItemId] = useState('');
  const [finishedQuantity, setFinishedQuantity] = useState<number | ''>('');
  const [showFinishedSuggestions, setShowFinishedSuggestions] = useState(false);
  const [lastRecipe, setLastRecipe] = useState<ManufacturingEntry | null>(null);

  // Raw Material Entry State
  const [rmName, setRmName] = useState('');
  const [rmItemId, setRmItemId] = useState('');
  const [rmQuantity, setRmQuantity] = useState<number | ''>('');
  const [rmCost, setRmCost] = useState<number | ''>('');
  const [showRmSuggestions, setShowRmSuggestions] = useState(false);
  const [editingRmIndex, setEditingRmIndex] = useState<number | null>(null);

  // List of added raw materials
  const [rawMaterials, setRawMaterials] = useState<RawMaterialConsumption[]>([]);
  
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const data = await billingService.getAllItems();
    setItems(data);
  };

  // Autocomplete logic
  const finishedSuggestions = items.filter(i => i.name && i.name.toLowerCase().includes(finishedItemName.toLowerCase()) && finishedItemName.trim() !== '');
  const rmSuggestions = items.filter(i => i.name && i.name.toLowerCase().includes(rmName.toLowerCase()) && rmName.trim() !== '');

  const applyRecipe = async (recipe: ManufacturingEntry, newQty: number) => {
      if (recipe.finishedQuantity <= 0) return;
      const ratio = newQty / recipe.finishedQuantity;
      
      const allItems = await billingService.getAllItems();
      
      const newRawMaterials = recipe.rawMaterials.map(rm => {
          const currentItem = allItems.find(i => i.id === rm.itemId);
          const cost = currentItem ? (currentItem.purchaseRate || rm.costPerUnit) : rm.costPerUnit;
          return {
              ...rm,
              quantity: Number((rm.quantity * ratio).toFixed(4)),
              costPerUnit: cost
          };
      });
      setRawMaterials(newRawMaterials);
  };

  const handleSelectFinishedItem = async (item: Item) => {
      setFinishedItemName(item.name);
      setFinishedItemId(item.id);
      setShowFinishedSuggestions(false);
      
      const recipe = await billingService.getLastRecipeForItem(item.id);
      if (recipe) {
          setLastRecipe(recipe);
          if (finishedQuantity && Number(finishedQuantity) > 0) {
              applyRecipe(recipe, Number(finishedQuantity));
          }
      } else {
          setLastRecipe(null);
      }
  };

  const handleFinishedQuantityChange = (val: string) => {
      const numVal = val ? Number(val) : '';
      setFinishedQuantity(numVal);
      if (numVal && numVal > 0 && lastRecipe) {
          applyRecipe(lastRecipe, numVal);
      }
  };

  const handleSelectRmItem = (item: Item) => {
      setRmName(item.name);
      setRmItemId(item.id);
      setRmCost(item.purchaseRate || 0);
      setShowRmSuggestions(false);
  };

  const handleAddRawMaterial = () => {
      if (!rmName.trim() || !rmQuantity || Number(rmQuantity) <= 0) {
          alert("Please enter a valid raw material name and quantity.");
          return;
      }

      const newRm: RawMaterialConsumption = {
          itemId: rmItemId || `temp_${Date.now()}`, // If new item, we'll create it on save
          itemName: rmName.trim(),
          quantity: Number(rmQuantity),
          costPerUnit: Number(rmCost) || 0
      };

      if (editingRmIndex !== null) {
          const updated = [...rawMaterials];
          updated[editingRmIndex] = newRm;
          setRawMaterials(updated);
          setEditingRmIndex(null);
      } else {
          setRawMaterials([...rawMaterials, newRm]);
      }

      // Reset RM form
      setRmName('');
      setRmItemId('');
      setRmQuantity('');
      setRmCost('');
  };

  const handleEditRawMaterial = (index: number) => {
      const rm = rawMaterials[index];
      setRmName(rm.itemName);
      setRmItemId(rm.itemId.startsWith('temp_') ? '' : rm.itemId);
      setRmQuantity(rm.quantity);
      setRmCost(rm.costPerUnit);
      setEditingRmIndex(index);
  };

  const handleRemoveRawMaterial = (index: number) => {
    setRawMaterials(rawMaterials.filter((_, i) => i !== index));
    if (editingRmIndex === index) {
        setEditingRmIndex(null);
        setRmName('');
        setRmItemId('');
        setRmQuantity('');
        setRmCost('');
    }
  };

  const totalCost = rawMaterials.reduce((sum, rm) => sum + (rm.quantity * rm.costPerUnit), 0);

  const handleSave = async () => {
    if (!finishedItemName.trim() || !finishedQuantity || Number(finishedQuantity) <= 0) {
        alert("Please enter a finished good name and a valid quantity.");
        return;
    }
    if (rawMaterials.length === 0) {
        alert("Please add at least one raw material.");
        return;
    }

    setIsSaving(true);
    try {
        // 1. Process Raw Materials (Create new items if they don't exist)
        const processedRawMaterials = [];
        for (const rm of rawMaterials) {
            let finalItemId = rm.itemId;
            if (finalItemId.startsWith('temp_')) {
                // Check if it exists by name just in case
                const existing = items.find(i => i.name.toLowerCase() === rm.itemName.toLowerCase());
                if (existing) {
                    finalItemId = existing.id;
                } else {
                    const newItem: Item = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        name: rm.itemName,
                        saleRate: 0,
                        purchaseRate: rm.costPerUnit,
                        openingStock: 0,
                        taxPercent: 0,
                        taxType: 'Excluded'
                    };
                    await billingService.saveItem(newItem);
                    finalItemId = newItem.id;
                }
            }
            processedRawMaterials.push({ ...rm, itemId: finalItemId });
        }

        // 2. Process Finished Good
        let finalFinishedItemId = finishedItemId;
        if (!finalFinishedItemId) {
            const existing = items.find(i => i.name.toLowerCase() === finishedItemName.trim().toLowerCase());
            if (existing) {
                finalFinishedItemId = existing.id;
            } else {
                const newItem: Item = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    name: finishedItemName.trim(),
                    saleRate: 0,
                    purchaseRate: totalCost / Number(finishedQuantity),
                    openingStock: 0, // saveManufacturingEntry handles the stock addition
                    taxPercent: 0,
                    taxType: 'Excluded'
                };
                await billingService.saveItem(newItem);
                finalFinishedItemId = newItem.id;
            }
        }

        // 3. Save Entry
        const entry: ManufacturingEntry = {
            id: Date.now().toString(),
            date,
            finishedItemId: finalFinishedItemId,
            finishedItemName: finishedItemName.trim(),
            finishedQuantity: Number(finishedQuantity),
            rawMaterials: processedRawMaterials,
            totalCost,
            notes
        };

        await billingService.saveManufacturingEntry(entry);
        alert("Manufacturing entry saved successfully!");
        onBack();
    } catch (error) {
        console.error("Failed to save manufacturing entry", error);
        alert("Failed to save. Please try again.");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-purple-700 text-white p-4 shadow-md flex items-center gap-3 shrink-0 z-20 relative pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack} className="active:scale-95 transition-transform"><ArrowLeft size={24} /></button>
        <div className="flex items-center gap-2">
            <Factory size={20} />
            <h1 className="text-xl font-bold">Manufacturing Entry</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Finished Good Section */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Package size={16} /> Finished Good Output
              </h2>
              <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                      <input 
                          type="date" 
                          value={date} 
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                  </div>
                  <div className="col-span-2 relative">
                      <label className="block text-xs font-medium text-slate-500 mb-1 flex justify-between">
                          <span>Item Name (Select or Type New)</span>
                          {lastRecipe && <span className="text-purple-600 dark:text-purple-400 font-bold">Auto-Recipe Active</span>}
                      </label>
                      <input 
                          type="text" 
                          value={finishedItemName} 
                          onChange={(e) => {
                              setFinishedItemName(e.target.value);
                              setFinishedItemId('');
                              setLastRecipe(null); // Reset recipe if they type something else
                              setShowFinishedSuggestions(true);
                          }}
                          onFocus={() => setShowFinishedSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowFinishedSuggestions(false), 200)}
                          placeholder="Search or enter new item..."
                          className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                      />
                      {showFinishedSuggestions && finishedSuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl max-h-40 overflow-y-auto rounded-b-lg mt-1 z-50">
                              {finishedSuggestions.map(item => (
                                  <div 
                                      key={item.id}
                                      className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm border-b last:border-0 border-slate-100 dark:border-slate-700 flex justify-between items-center"
                                      onMouseDown={() => handleSelectFinishedItem(item)}
                                  >
                                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                                      <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Stock: {item.openingStock || 0}</span>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Quantity Produced</label>
                      <input 
                          type="number" 
                          value={finishedQuantity} 
                          onChange={(e) => handleFinishedQuantityChange(e.target.value)}
                          placeholder="Qty"
                          className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                      />
                  </div>
              </div>
          </div>

          {/* Raw Materials Entry Form */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Add Raw Material</h2>
              <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-12 relative">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Item Name</label>
                      <input 
                          type="text" 
                          value={rmName} 
                          onChange={(e) => {
                              setRmName(e.target.value);
                              setRmItemId('');
                              setShowRmSuggestions(true);
                          }}
                          onFocus={() => setShowRmSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowRmSuggestions(false), 200)}
                          placeholder="Search or enter new..."
                          className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                      />
                      {showRmSuggestions && rmSuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl max-h-40 overflow-y-auto rounded-b-lg mt-1 z-50">
                              {rmSuggestions.map(item => (
                                  <div 
                                      key={item.id}
                                      className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm border-b last:border-0 border-slate-100 dark:border-slate-700 flex justify-between items-center"
                                      onMouseDown={() => handleSelectRmItem(item)}
                                  >
                                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                                      <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Stock: {item.openingStock || 0}</span>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  <div className="col-span-6">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Qty</label>
                      <input 
                          type="number" 
                          value={rmQuantity} 
                          onChange={(e) => setRmQuantity(e.target.value ? Number(e.target.value) : '')}
                          placeholder="Qty"
                          className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                      />
                  </div>
                  <div className="col-span-6">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Cost/Unit</label>
                      <input 
                          type="number" 
                          value={rmCost} 
                          onChange={(e) => setRmCost(e.target.value ? Number(e.target.value) : '')}
                          placeholder="₹"
                          className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                      />
                  </div>
                  <div className="col-span-12 mt-2">
                      <button 
                          onClick={handleAddRawMaterial}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-bold flex items-center justify-center gap-2 transition-colors text-sm shadow-sm"
                      >
                          {editingRmIndex !== null ? <><Save size={16} /> Update Material</> : <><Plus size={16} /> Add Material</>}
                      </button>
                      {editingRmIndex !== null && (
                          <button 
                              onClick={() => {
                                  setEditingRmIndex(null);
                                  setRmName('');
                                  setRmItemId('');
                                  setRmQuantity('');
                                  setRmCost('');
                              }}
                              className="w-full mt-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded font-bold text-sm transition-colors"
                          >
                              Cancel Edit
                          </button>
                      )}
                  </div>
              </div>
          </div>

          {/* Raw Materials List */}
          {rawMaterials.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-800 p-2 text-xs font-bold text-slate-500 uppercase tracking-wider grid grid-cols-12 gap-2">
                      <div className="col-span-5 pl-2">Item</div>
                      <div className="col-span-2 text-center">Qty</div>
                      <div className="col-span-3 text-right">Cost</div>
                      <div className="col-span-2"></div>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {rawMaterials.map((rm, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 p-3 items-center text-sm">
                              <div className="col-span-5 pl-2 font-medium text-slate-800 dark:text-slate-200 truncate">{rm.itemName}</div>
                              <div className="col-span-2 text-center text-slate-600 dark:text-slate-400">{rm.quantity}</div>
                              <div className="col-span-3 text-right font-medium text-slate-800 dark:text-slate-200">₹{(rm.quantity * rm.costPerUnit).toLocaleString('en-IN')}</div>
                              <div className="col-span-2 flex justify-end gap-1 pr-1">
                                  <button onClick={() => handleEditRawMaterial(index)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"><Edit2 size={14} /></button>
                                  <button onClick={() => handleRemoveRawMaterial(index)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={14} /></button>
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border-t border-purple-100 dark:border-purple-800 flex justify-between items-center">
                      <span className="text-sm font-bold text-purple-800 dark:text-purple-300">Total Raw Material Cost:</span>
                      <span className="text-lg font-extrabold text-purple-700 dark:text-purple-400">₹{totalCost.toLocaleString('en-IN')}</span>
                  </div>
              </div>
          )}

          {/* Notes */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-medium text-slate-500 mb-1">Notes (Optional)</label>
              <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="Any details about this batch..."
              />
          </div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md"
          >
              <Save size={20} /> {isSaving ? 'Saving...' : 'Save Manufacturing Entry'}
          </button>
      </div>
    </div>
  );
};
