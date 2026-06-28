import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Plus, Truck, ShoppingCart, List, Search, 
  ArrowRightLeft, MessageCircle, Trash2, CheckSquare, Square, Check, AlertCircle, Download, Edit
} from 'lucide-react';
import { TransactionType } from '../types';
import { billingService, Order } from '../src/services/billingService';
import { sqliteService } from '../src/services/sqliteService';


interface OrderListScreenProps {
  onBack: () => void;
  onCreate: (type: TransactionType) => void;
  onEdit: (id: string, type: TransactionType) => void;
  initialTab?: 'receive' | 'send';
}

const formatNumber = (val: number) => {
    return Number(val.toFixed(2)).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export const OrderListScreen: React.FC<OrderListScreenProps> = ({ onBack, onCreate, onEdit, initialTab }) => {
  // Logic Update: 'receive' = Orders from Customers (Sale Orders), 'send' = Orders to Suppliers (Purchase Orders)
  const [tab, setTab] = useState<'receive' | 'send'>(initialTab || 'receive'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'month' | 'year'>('today'); // <-- Added timeFilter state
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showItemSummary, setShowItemSummary] = useState(false); // <-- Added state for Item Summary Modal

  useEffect(() => {
      loadOrders();
  }, []);

  const loadOrders = async () => {
      setLoading(true);
      const data = await billingService.getAllOrders();
      
      // Auto-migrate orders that were synced in 'invoices' but missing flag in 'orders'
      for (const order of data) {
          if (!order.isSyncedToCloud) {
              const invoiceRecord = await billingService.getInvoiceById(order.id);
              if (invoiceRecord && invoiceRecord.isSyncedToCloud) {
                  await sqliteService.saveOrder({ ...order, isSyncedToCloud: true });
                  order.isSyncedToCloud = true;
              }
          }
      }
      
      setOrders(data);
      setLoading(false);
  }

  const confirmDelete = async () => {
      if (deleteId) {
          await billingService.deleteOrder(deleteId);
          setDeleteId(null);
          setSelectedOrderIds(prev => prev.filter(id => id !== deleteId));
          loadOrders();
      }
  };

  const toggleSelectOrder = (id: string, isConverted: boolean) => {
      if (isConverted) return; // Prevent selecting already converted orders
      
      setSelectedOrderIds(prev => {
          if (prev.includes(id)) return prev.filter(oid => oid !== id);
          return [...prev, id];
      });
  };

  const handleSelectAll = () => {
      const activeOrders = filteredOrders.filter(o => !o.convertedToInvoiceId);
      if (selectedOrderIds.length === activeOrders.length && activeOrders.length > 0) {
          setSelectedOrderIds([]); // Deselect all
      } else {
          setSelectedOrderIds(activeOrders.map(o => o.id)); // Select all valid
      }
  };

  const handleConvertClick = () => {
      if (selectedOrderIds.length === 0) return;
      setShowConvertModal(true);
  };

  const processConversion = async () => {
      try {
          setLoading(true);
          // Small delay to show loading state if instant
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const count = await billingService.convertOrdersToSaleBills(selectedOrderIds);
          
          setLoading(false);
          setShowConvertModal(false);
          
          if (count > 0) {
              const targetType = tab === 'receive' ? 'Sale Bill' : 'Purchase Bill';
              setTimeout(() => alert(`🎉 Success! ${count} Order(s) converted to ${targetType}.`), 100);
              setSelectedOrderIds([]);
              loadOrders();
          } else {
              alert("No orders were converted. They might have been converted already.");
          }
      } catch (error) {
          console.error("Conversion failed", error);
          setLoading(false);
          setShowConvertModal(false);
          alert("Failed to convert orders. Please try again.");
      }
  };

  const handleEditClick = (e: React.MouseEvent, order: Order) => {
      e.stopPropagation(); // Prevent row selection
      const transactionType = order.type === 'receive' ? 'Sale Order' : 'Purchase Order';
      onEdit(order.id, transactionType);
  };

  // Helper function to check if a date matches the selected filter
  const isDateMatchingFilter = (dateString: string, filter: 'all' | 'today' | 'month' | 'year') => {
      if (filter === 'all') return true;

      const orderDate = new Date(dateString);
      const today = new Date();

      if (filter === 'today') {
          return orderDate.getDate() === today.getDate() &&
                 orderDate.getMonth() === today.getMonth() &&
                 orderDate.getFullYear() === today.getFullYear();
      }
      if (filter === 'month') {
          return orderDate.getMonth() === today.getMonth() &&
                 orderDate.getFullYear() === today.getFullYear();
      }
      if (filter === 'year') {
          return orderDate.getFullYear() === today.getFullYear();
      }
      return true;
  };

  const filteredOrders = orders.filter(o => 
    o.type === tab && 
    isDateMatchingFilter(o.date, timeFilter) && // Apply time filter
    (o.partyName.toLowerCase().includes(searchTerm.trim().toLowerCase()) || 
     o.orderNumber.toLowerCase().includes(searchTerm.trim().toLowerCase()))
  ).sort((a, b) => {
      const dateA = Date.fromLocalDateString(a.date).getTime();
      const dateB = Date.fromLocalDateString(b.date).getTime();
      if (dateB !== dateA) return dateB - dateA; // Sort sequentially by day
      
      const createdA = a.createdAt || 0;
      const createdB = b.createdAt || 0;
      if (createdB !== createdA) {
          return createdB - createdA; // Sort by creation time descending if possible
      }
      
      const numA = parseInt(a.orderNumber.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.orderNumber.replace(/\D/g, '')) || 0;
      if (numA !== numB) {
          return numB - numA;
      }
      return b.orderNumber.localeCompare(a.orderNumber);
  });

  // Dynamic labels for current month and year
  const currentMonthName = new Date().toLocaleString('en-US', { month: 'short' });
  const currentYear = new Date().getFullYear();

  // Compute Item Summary based on CURRENT Time Filter
  const currentItemSummary = useMemo(() => {
      const summary: { [itemName: string]: { qty: number, amount: number } } = {};
      
      orders.forEach(o => {
          // We include all orders that match the current tab and time filter
          // We can optionally check convertedToInvoiceId, but based on user request, it's a general report
          if (o.type === tab && isDateMatchingFilter(o.date, timeFilter)) { 
             if (o.items) {
                 o.items.forEach(invoiceItem => {
                     const itemName = invoiceItem?.item?.name || 'Unknown Item';
                     const name = itemName.trim();
                     if (!summary[name]) summary[name] = { qty: 0, amount: 0 };
                     
                     const qty = invoiceItem.qty || 0;
                     const rate = invoiceItem.rate || 0;
                     const discount = (invoiceItem.discountPercent || 0) / 100;
                     const gross = qty * rate;
                     const net = gross - (gross * discount);
                     
                     let finalAmount = net;
                     if (invoiceItem.taxType === 'Excluded') {
                         finalAmount += net * ((invoiceItem.taxPercent || 0) / 100);
                     }
                     
                     summary[name].qty += qty;
                     summary[name].amount += finalAmount;
                 });
             }
         }
      });
      return Object.entries(summary)
          .map(([name, data]) => ({ name, qty: data.qty, amount: data.amount }))
          .sort((a, b) => b.qty - a.qty);
  }, [orders, tab, timeFilter]);

  const getFilterLabel = () => {
      if (timeFilter === 'today') return "Today's";
      if (timeFilter === 'month') return `${new Date().toLocaleString('en-US', { month: 'short' })} Month's`;
      if (timeFilter === 'year') return `${new Date().getFullYear()} Year's`;
      return "All Time";
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Header */}
      <header className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 flex items-center justify-between shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <div className="flex items-center gap-3">
            <button onClick={onBack}><ArrowLeft size={24} /></button>
            <h1 className="text-xl font-bold">Order Management</h1>
        </div>
        <button 
            onClick={() => onCreate(tab === 'receive' ? 'Sale Order' : 'Purchase Order')}
            className="hover:bg-white/10 p-1 rounded-full transition-colors"
        >
            <Plus size={24} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Action Buttons (Shortcut) - SWAPPED LOGIC */}
        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={() => onCreate('Sale Order')}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md active:scale-95 transition-all text-base"
            >
                <Download size={22} className="rotate-180" /> Receive Order
                <span className="text-[10px] block opacity-70">(Sale Order)</span>
            </button>
            <button 
                onClick={() => onCreate('Purchase Order')}
                className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-4 rounded-xl shadow-md active:scale-95 transition-all text-base"
            >
                <Truck size={22} /> Send Order
                <span className="text-[10px] block opacity-70">(Purchase Order)</span>
            </button>
        </div>

        {/* Status Tabs */}
        <div className="grid grid-cols-2 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
            <button 
                onClick={() => { setTab('receive'); setSelectedOrderIds([]); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${tab === 'receive' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
                <ShoppingCart size={18} /> Received Orders
            </button>
            <button 
                onClick={() => { setTab('send'); setSelectedOrderIds([]); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${tab === 'send' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
                <List size={18} /> Sent Orders
            </button>
        </div>

        {/* Time Filters */}
        <div className="flex bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-1 shadow-sm overflow-x-auto hide-scrollbar">
            <button 
                onClick={() => { setTimeFilter('today'); setSelectedOrderIds([]); }}
                className={`flex-1 min-w-max px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${timeFilter === 'today' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                Today
            </button>
            <button 
                onClick={() => { setTimeFilter('month'); setSelectedOrderIds([]); }}
                className={`flex-1 min-w-max px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${timeFilter === 'month' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                {currentMonthName}
            </button>
            <button 
                onClick={() => { setTimeFilter('year'); setSelectedOrderIds([]); }}
                className={`flex-1 min-w-max px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${timeFilter === 'year' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                {currentYear}
            </button>
            <button 
                onClick={() => { setTimeFilter('all'); setSelectedOrderIds([]); }}
                className={`flex-1 min-w-max px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${timeFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                All Time
            </button>
        </div>

        {/* Search & Select All */}
        <div className="flex gap-2 items-center">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search Order..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-base placeholder-slate-400"
                />
            </div>
            {/* Show Select All mainly in Receive Tab as per requirement */}
            {tab === 'receive' && (
                <button 
                    onClick={handleSelectAll}
                    className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-3 rounded-xl shadow-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800"
                    title="Select All Unconverted"
                >
                    <CheckSquare size={24} />
                </button>
            )}
        </div>

        {/* List */}
        <div className="space-y-3 pb-24">
            {loading ? (
                <div className="text-center py-10 text-gray-400 text-lg flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    Loading...
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-lg">No orders found</div>
            ) : (
                filteredOrders.map(order => {
                    const isConverted = !!order.convertedToInvoiceId;
                    const isSelected = selectedOrderIds.includes(order.id);
                    const isSynced = order.isSyncedToCloud && order.type === 'send';
                    const syncedBgClass = isSynced ? '!bg-[#5ad368] text-black dark:!bg-[#3fac4a] dark:text-white !border-[#4cc459] dark:!border-[#3fac4a]' : '';
                    
                    return (
                        <div 
                            key={order.id}
                            onClick={() => {
                                if (tab === 'receive') {
                                    toggleSelectOrder(order.id, isConverted);
                                }
                            }}
                            className={`relative bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border transition-all ${
                                isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-slate-800'
                            } ${isConverted ? 'opacity-70 grayscale-[0.5]' : tab === 'receive' ? 'cursor-pointer hover:border-indigo-300' : ''} ${syncedBgClass}`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Checkbox Column - Only for receive orders */}
                                {tab === 'receive' && (
                                    <div className="pt-1">
                                        {isConverted ? (
                                            <div className="text-green-500"><Check size={24} strokeWidth={3} /></div>
                                        ) : (
                                            <div className={isSelected ? 'text-indigo-600' : 'text-gray-300'}>
                                                {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`font-bold text-xl ${isSynced ? '!text-black dark:!text-white' : 'text-gray-800 dark:text-white'}`}>{order.orderNumber}</span>
                                                {isConverted ? (
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isSynced ? 'bg-black/10 text-black dark:bg-white/20 dark:text-white' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                                        Converted
                                                    </span>
                                                ) : (
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                        isSynced ? 'bg-black/10 text-black dark:bg-white/20 dark:text-white' :
                                                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {order.status}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`text-lg font-semibold ${isSynced ? '!text-black dark:!text-white' : 'text-gray-700 dark:text-slate-200'}`}>{order.partyName}</div>
                                            <div className={`text-sm mt-1 ${isSynced ? '!text-slate-800 dark:!text-slate-200' : 'text-gray-400 dark:text-slate-500'}`}>{order.date}</div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-2">
                                            <div className={`text-2xl font-bold ${isSynced ? '!text-black dark:!text-white' : 'text-indigo-700 dark:text-indigo-400'}`}>₹{formatNumber(order.grandTotal)}</div>
                                            <div className="flex gap-2">
                                                {!isConverted && (
                                                    <>
                                                        <button 
                                                            onClick={(e) => handleEditClick(e, order)}
                                                            className={`p-2 transition-colors rounded-lg ${isSynced ? 'text-blue-800 hover:text-blue-900 hover:bg-black/5 dark:text-blue-200 dark:hover:bg-white/10' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                                                            title="Edit Order"
                                                        >
                                                            <Edit size={20} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setDeleteId(order.id); }} 
                                                            className={`p-2 transition-colors rounded-lg ${isSynced ? 'text-red-800 hover:text-red-900 hover:bg-black/5 dark:text-red-200 dark:hover:bg-white/10' : 'text-red-400 hover:text-red-600 hover:bg-red-50'}`}
                                                            title="Delete Order"
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      </div>

      {/* Floating Action Bar for Conversion (Hidden if empty) */}
      {selectedOrderIds.length > 0 ? (
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_15px_rgba(0,0,0,0.1)] z-30 animate-in slide-in-from-bottom duration-200">
              <div className="flex justify-between items-center max-w-lg mx-auto">
                  <div className="font-bold text-gray-600 dark:text-slate-300 text-lg">
                      {selectedOrderIds.length} Order(s) Selected
                  </div>
                  <button 
                    onClick={handleConvertClick}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 active:scale-95 transition-all text-lg"
                  >
                      <ArrowRightLeft size={24} />
                      Convert
                  </button>
              </div>
          </div>
      ) : (
          /* Item Summary FAB (Red Button from screenshot) */
          <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 z-30">
              <button 
                onClick={() => setShowItemSummary(true)}
                className="w-16 h-16 rounded-full bg-red-500 text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all border-4 border-white dark:border-slate-800"
                title="View Item Summary"
              >
                  <List size={28} />
              </button>
          </div>
      )}

      {/* Item Summary Modal based on screenshot design */}
      {showItemSummary && (
          <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-right pb-[max(env(safe-area-inset-bottom),0px)]">
              {/* Modal Header */}
              <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 flex items-center gap-3 shrink-0 shadow-md pt-[max(env(safe-area-inset-top),48px)]">
                  <button onClick={() => setShowItemSummary(false)}><ArrowLeft size={24} /></button>
                  <div>
                      <h1 className="text-lg font-bold">{tab === 'receive' ? 'Items to Deliver (Received Orders)' : 'Items to Purchase (Sent Orders)'}</h1>
                      <div className="text-xs text-slate-300">Unconverted Orders Item Summary</div>
                  </div>
              </header>

              <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto p-4 space-y-6">
                  {/* Single Summary Section based on time filter */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden pb-8">
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-bold p-3 border-b border-indigo-100 dark:border-indigo-900/30 flex justify-between">
                          <span>{getFilterLabel()} Total Items</span>
                          <span>{currentItemSummary.reduce((sum, item) => sum + item.qty, 0)} Items</span>
                      </div>
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              <tr>
                                  <th className="p-3 font-semibold">Item</th>
                                  <th className="p-3 text-center font-semibold">Qty</th>
                                  <th className="p-3 text-right font-semibold">Amount</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {currentItemSummary.length === 0 ? (
                                  <tr><td colSpan={3} className="p-4 text-center text-slate-400">No items found for {getFilterLabel()}</td></tr>
                              ) : (
                                  currentItemSummary.map(item => (
                                      <tr key={item.name} className="dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                          <td className="p-3 truncate max-w-[150px]" title={item.name}>{item.name}</td>
                                          <td className="p-3 text-center text-indigo-600 dark:text-indigo-400 font-bold text-base">{item.qty}</td>
                                          <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">₹{formatNumber(item.amount)}</td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                          {currentItemSummary.length > 0 && (
                              <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700">
                                  <tr>
                                      <td className="p-3 uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400">Grand Total</td>
                                      <td className="p-3 text-center text-indigo-600 dark:text-indigo-400 font-extrabold text-base">
                                          {currentItemSummary.reduce((sum, item) => sum + item.qty, 0)}
                                      </td>
                                      <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
                                          ₹{formatNumber(currentItemSummary.reduce((sum, item) => sum + item.amount, 0))}
                                      </td>
                                  </tr>
                              </tfoot>
                          )}
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-900/50">
                    <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Order?</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">
                    Are you sure you want to delete this order? This action cannot be undone.
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

      {/* Convert Confirmation Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200 dark:border-green-900/50">
                    <ArrowRightLeft size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Convert to {tab === 'receive' ? 'Sale' : 'Purchase'}?</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">
                    Are you sure you want to convert {selectedOrderIds.length} selected order(s)? This will generate new {tab === 'receive' ? 'Sale' : 'Purchase'} invoices.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowConvertModal(false)} 
                        className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={processConversion} 
                        className="flex-1 py-3 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30 transition-colors"
                    >
                        Convert
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};