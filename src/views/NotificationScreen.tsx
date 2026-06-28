
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, AlertTriangle, IndianRupee, MessageCircle, Package, CheckCircle2 } from 'lucide-react';
import { billingService } from '../services/billingService';
import { Party, Item } from '../core/types/';


interface NotificationScreenProps {
  onBack: () => void;
}

export const NotificationScreen: React.FC<NotificationScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'payments' | 'stock'>('payments');
  const [dues, setDues] = useState<Party[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
        const [parties, items] = await Promise.all([
            billingService.getAllParties(),
            billingService.getAllItems()
        ]);

        // 1. Filter Payment Dues (Customers with Positive Balance = They owe us)
        const pendingPayments = parties.filter(p => p.type === 'Customer' && p.currentBalance > 0);
        setDues(pendingPayments.sort((a, b) => b.currentBalance - a.currentBalance));

        // 2. Filter Low Stock (Stock <= 10)
        const lowStock = items.filter(i => (i.openingStock || 0) <= 10);
        setLowStockItems(lowStock.sort((a, b) => (a.openingStock || 0) - (b.openingStock || 0)));

    } catch (error) {
        console.error("Failed to load notifications", error);
    } finally {
        setLoading(false);
    }
  };

  const sendPaymentReminder = (party: Party) => {
      if (!party.mobile) {
          alert("Mobile number not found for this customer.");
          return;
      }

      const message = `Namaste ${party.name},\nYour payment of ₹${Number(party.currentBalance.toFixed(2)).toLocaleString('en-IN')} is pending. Please clear it at your earliest convenience.\n\n- Sent via QuickBill`;
      
      let cleanNumber = party.mobile.replace(/\D/g, '');
      if (cleanNumber.length === 10) cleanNumber = '91' + cleanNumber;

      const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-orange-600 text-white p-4 flex items-center gap-3 shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack}><ArrowLeft size={24} /></button>
        <div>
            <h1 className="text-xl font-bold">Notification Center</h1>
            <p className="text-xs opacity-90">Alerts & Reminders</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-800">
          <button 
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-4 transition-all ${activeTab === 'payments' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-gray-500'}`}
          >
              <IndianRupee size={18} /> 
              Payment Dues
              <span className="bg-red-100 text-red-600 text-[10px] px-1.5 rounded-full ml-1">{dues.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab('stock')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-4 transition-all ${activeTab === 'stock' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-gray-500'}`}
          >
              <Package size={18} /> 
              Low Stock
              <span className="bg-red-100 text-red-600 text-[10px] px-1.5 rounded-full ml-1">{lowStockItems.length}</span>
          </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100 dark:bg-slate-950">
          {loading ? (
              <div className="text-center py-10 text-slate-500">Scanning data...</div>
          ) : (
              <>
                {/* PAYMENT DUES TAB */}
                {activeTab === 'payments' && (
                    dues.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <CheckCircle2 size={48} className="mb-2 text-green-500 opacity-50" />
                            <p>No pending payments!</p>
                        </div>
                    ) : (
                        dues.map(party => (
                            <div key={party.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border-l-4 border-red-500 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">{party.name}</h3>
                                    <p className="text-xs text-slate-500 font-medium">{party.mobile || 'No Mobile'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-red-600 text-lg">₹{Number(party.currentBalance.toFixed(2)).toLocaleString('en-IN')}</p>
                                    <button 
                                        onClick={() => sendPaymentReminder(party)}
                                        className="mt-1 flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors"
                                    >
                                        <MessageCircle size={14} /> Remind
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                )}

                {/* LOW STOCK TAB */}
                {activeTab === 'stock' && (
                    lowStockItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <CheckCircle2 size={48} className="mb-2 text-green-500 opacity-50" />
                            <p>All items are well stocked!</p>
                        </div>
                    ) : (
                        lowStockItems.map(item => (
                            <div key={item.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border-l-4 border-orange-500 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white">{item.name}</h3>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">Unit: {item.unit}</span>
                                        {item.code && <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">Code: {item.code}</span>}
                                    </div>
                                </div>
                                <div className="text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg min-w-[70px]">
                                    <p className="text-[10px] text-red-500 font-bold uppercase">Stock</p>
                                    <p className="font-extrabold text-red-700 dark:text-red-400 text-xl">{item.openingStock || 0}</p>
                                </div>
                            </div>
                        ))
                    )
                )}
              </>
          )}
      </div>
    </div>
  );
};
