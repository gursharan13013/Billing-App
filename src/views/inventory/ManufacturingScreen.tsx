import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Factory, Package, Edit2 } from 'lucide-react';
import { billingService } from '../../services/billingService';
import { Item, ManufacturingEntry, RawMaterialConsumption, Language } from '../../core/types/';
import { motion } from 'motion/react';

interface ManufacturingScreenProps {
  onBack: () => void;
  language?: Language;
}

export const ManufacturingScreen: React.FC<ManufacturingScreenProps> = ({ onBack, language }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [date, setDate] = useState(new Date().toLocalDateString());
  
  const [finishedItemName, setFinishedItemName] = useState('');
  const [finishedItemId, setFinishedItemId] = useState('');
  const [finishedQuantity, setFinishedQuantity] = useState<number | ''>('');
  const [showFinishedSuggestions, setShowFinishedSuggestions] = useState(false);
  const [lastRecipe, setLastRecipe] = useState<ManufacturingEntry | null>(null);

  const [rmName, setRmName] = useState('');
  const [rmItemId, setRmItemId] = useState('');
  const [rmQuantity, setRmQuantity] = useState<number | ''>('');
  const [rmCost, setRmCost] = useState<number | ''>('');
  const [showRmSuggestions, setShowRmSuggestions] = useState(false);
  const [editingRmIndex, setEditingRmIndex] = useState<number | null>(null);

  const [rawMaterials, setRawMaterials] = useState<RawMaterialConsumption[]>([]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isHi = language === 'hi';

  // Dynamic Bilingual Localization Dictionary Data Object
  const t = {
    title: isHi ? 'मैन्युफैक्चरिंग प्रविष्टि' : 'Manufacturing Entry',
    finishedGood: isHi ? 'तैयार माल आउटपुट' : 'Finished Good Output',
    date: isHi ? 'तिथि' : 'Date',
    itemNameLabel: isHi ? 'आइटम का नाम (खोजें या नया दर्ज करें)' : 'Item Name (Select or Type New)',
    autoRecipe: isHi ? 'ऑटो-रेसिपी सक्रिय' : 'Auto-Recipe Active',
    searchPlaceholder: isHi ? 'खोजें या नया आइटम दर्ज करें...' : 'Search or enter new item...',
    stock: isHi ? 'स्टॉक' : 'Stock',
    qtyProduced: isHi ? 'उत्पादित मात्रा' : 'Quantity Produced',
    addRawMaterial: isHi ? 'कच्चा माल जोड़ें' : 'Add Raw Material',
    rmPlaceholder: isHi ? 'खोजें या नया दर्ज करें...' : 'Search or enter new...',
    qty: isHi ? 'मात्रा' : 'Qty',
    costUnit: isHi ? 'लागत/इकाई' : 'Cost/Unit',
    updateMaterial: isHi ? 'सामग्री अपडेट करें' : 'Update Material',
    addMaterial: isHi ? 'सामग्री जोड़ें' : 'Add Material',
    cancelEdit: isHi ? 'संपादन रद्द करें' : 'Cancel Edit',
    itemHeader: isHi ? 'आइटम' : 'Item',
    totalCostLabel: isHi ? 'कुल कच्चा माल लागत:' : 'Total Raw Material Cost:',
    notesLabel: isHi ? 'नोट्स (वैकल्पिक)' : 'Notes (Optional)',
    notesPlaceholder: isHi ? 'इस बैच के बारे में कोई विवरण...' : 'Any details about this batch...',
    saving: isHi ? 'सहेज रहा है...' : 'Saving...',
    saveEntry: isHi ? 'मैन्युफैक्चरिंग प्रविष्टि सहेजें' : 'Save Manufacturing Entry',
    errValidFinished: isHi ? 'कृपया एक वैध तैयार माल का नाम और मात्रा दर्ज करें।' : 'Please enter a finished good name and a valid quantity.',
    errAddRm: isHi ? 'कृपया कम से कम एक कच्चा माल जोड़ें।' : 'Please add at least one raw material.',
    errRmValid: isHi ? 'कृपया एक वैध कच्चे माल का नाम और मात्रा दर्ज करें।' : 'Please enter a valid raw material name and quantity.',
    successSave: isHi ? 'मैन्युफैक्चरिंग प्रविष्टि सफलतापूर्वक सहेजी गई!' : 'Manufacturing entry saved successfully!',
    failSave: isHi ? 'सहेजने में विफल। कृपया पुन: प्रयास करें।' : 'Failed to save. Please try again.'
  };

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const data = await billingService.getAllItems();
    setItems(data);
  };

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
          alert(t.errRmValid);
          return;
      }

      const newRm: RawMaterialConsumption = {
          itemId: rmItemId || `temp_${Date.now()}`, 
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
        alert(t.errValidFinished);
        return;
    }
    if (rawMaterials.length === 0) {
        alert(t.errAddRm);
        return;
    }

    setIsSaving(true);
    try {
        const processedRawMaterials = [];
        for (const rm of rawMaterials) {
            let finalItemId = rm.itemId;
            if (finalItemId.startsWith('temp_')) {
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
                    openingStock: 0, 
                    taxPercent: 0,
                    taxType: 'Excluded'
                };
                await billingService.saveItem(newItem);
                finalFinishedItemId = newItem.id;
            }
        }

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
        alert(t.successSave);
        onBack();
    } catch (error) {
        console.error("Failed to save manufacturing entry", error);
        alert(t.failSave);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', ease: [0.25, 1, 0.5, 1], duration: 0.35 }}
      style={{ willChange: 'transform' }}
      className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-[max(env(safe-area-inset-bottom),0px)] relative overflow-hidden transition-colors font-sans"
    >
      {/* Premium Top Header */}
      <header className="bg-white dark:bg-slate-900 p-4 flex items-center justify-between shadow-sm shrink-0 border-b border-gray-200 dark:border-slate-800 pt-[max(env(safe-area-inset-top),48px)] transition-colors">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white p-2 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90"
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2.5">
            <Factory size={22} className="text-indigo-650 dark:text-indigo-400" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {t.title}
            </h1>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Finished Good Section */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs transition-colors">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
            <Package size={16} className="text-indigo-500" /> {t.finishedGood}
          </h2>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.date}</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 border border-gray-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold outline-none focus-active-light dark:focus-active-dark min-h-[44px]"
              />
            </div>
            <div className="col-span-2 relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex justify-between">
                <span>{t.itemNameLabel}</span>
                {lastRecipe && <span className="text-indigo-600 dark:text-indigo-400 font-bold">{t.autoRecipe}</span>}
              </label>
              <input 
                type="text" 
                value={finishedItemName} 
                onChange={(e) => {
                  setFinishedItemName(e.target.value);
                  setFinishedItemId('');
                  setLastRecipe(null); 
                  setShowFinishedSuggestions(true);
                }}
                onFocus={() => setShowFinishedSuggestions(true)}
                onBlur={() => setTimeout(() => setShowFinishedSuggestions(false), 200)}
                placeholder={t.searchPlaceholder}
                className="w-full p-2.5 border border-gray-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold outline-none focus-active-light dark:focus-active-dark min-h-[44px]"
              />
              {showFinishedSuggestions && finishedSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl max-h-40 overflow-y-auto rounded-xl mt-1.5 z-50 divide-y divide-gray-100 dark:divide-slate-800">
                  {finishedSuggestions.map(item => (
                    <div 
                      key={item.id}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer text-xs flex justify-between items-center"
                      onMouseDown={() => handleSelectFinishedItem(item)}
                    >
                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">{t.stock}: {item.openingStock || 0}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.qtyProduced}</label>
              <input 
                type="number" 
                value={finishedQuantity} 
                onChange={(e) => handleFinishedQuantityChange(e.target.value)}
                placeholder="Qty"
                className="w-full p-2.5 border border-gray-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold outline-none focus-active-light dark:focus-active-dark min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Raw Materials Entry Form */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs transition-colors">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">{t.addRawMaterial}</h2>
          <div className="grid grid-cols-12 gap-3.5">
            <div className="col-span-12 relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.itemHeader}</label>
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
                placeholder={t.rmPlaceholder}
                className="w-full p-2.5 border border-gray-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold outline-none focus-active-light dark:focus-active-dark min-h-[44px]"
              />
              {showRmSuggestions && rmSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl max-h-40 overflow-y-auto rounded-xl mt-1.5 z-50 divide-y divide-gray-100 dark:divide-slate-800">
                  {rmSuggestions.map(item => (
                    <div 
                      key={item.id}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer text-xs flex justify-between items-center"
                      onMouseDown={() => handleSelectRmItem(item)}
                    >
                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">{t.stock}: {item.openingStock || 0}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="col-span-6">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.qty}</label>
              <input 
                type="number" 
                value={rmQuantity} 
                onChange={(e) => setRmQuantity(e.target.value ? Number(e.target.value) : '')}
                placeholder="Qty"
                className="w-full p-2.5 border border-gray-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold outline-none focus-active-light dark:focus-active-dark min-h-[44px]"
              />
            </div>
            <div className="col-span-6">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.costUnit}</label>
              <input 
                type="number" 
                value={rmCost} 
                onChange={(e) => setRmCost(e.target.value ? Number(e.target.value) : '')}
                placeholder="₹"
                className="w-full p-2.5 border border-gray-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold outline-none focus-active-light dark:focus-active-dark min-h-[44px]"
              />
            </div>
            <div className="col-span-12 mt-2">
              <button 
                onClick={handleAddRawMaterial}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider shadow-sm min-h-[44px] active:scale-98 cursor-pointer"
              >
                {editingRmIndex !== null ? <>{t.updateMaterial}</> : <>{t.addMaterial}</>}
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
                  className="w-full mt-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors min-h-[44px] cursor-pointer"
                >
                  {t.cancelEdit}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Raw Materials List */}
        {rawMaterials.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest grid grid-cols-12 gap-2 border-b border-gray-200 dark:border-slate-800">
              <div className="col-span-5 pl-2">{t.itemHeader}</div>
              <div className="col-span-2 text-center">{t.qty}</div>
              <div className="col-span-3 text-right">{t.value}</div>
              <div className="col-span-2"></div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {rawMaterials.map((rm, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 p-3.5 items-center text-xs">
                  <div className="col-span-5 pl-2 font-bold text-slate-900 dark:text-white truncate">{rm.itemName}</div>
                  <div className="col-span-2 text-center text-slate-500 dark:text-slate-400 font-bold">{rm.quantity}</div>
                  <div className="col-span-3 text-right font-extrabold text-slate-900 dark:text-white">₹{(rm.quantity * rm.costPerUnit).toLocaleString('en-IN')}</div>
                  <div className="col-span-2 flex justify-end gap-1 pr-1">
                    <button onClick={() => handleEditRawMaterial(index)} className="p-1.5 text-indigo-500 hover:bg-indigo-500/10 rounded-lg min-w-[34px] min-h-[34px] flex items-center justify-center active:scale-90 transition-all"><Edit2 size={14} /></button>
                    <button onClick={() => handleRemoveRawMaterial(index)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg min-w-[34px] min-h-[34px] flex items-center justify-center active:scale-90 transition-all"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-indigo-500/5 border-t border-indigo-500/10 dark:border-indigo-800/20 flex justify-between items-center">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">{t.totalCostLabel}</span>
              <span className="text-base font-black text-indigo-650 dark:text-indigo-455">₹{totalCost.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs transition-colors">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.notesLabel}</label>
          <textarea 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full p-2.5 border border-gray-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold outline-none focus-active-light dark:focus-active-dark"
            placeholder={t.notesPlaceholder}
          />
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shrink-0">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md min-h-[48px] uppercase tracking-wider text-xs cursor-pointer"
        >
          <Save size={18} /> {isSaving ? t.saving : t.saveEntry}
        </button>
      </div>
    </motion.div>
  );
};
