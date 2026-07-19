
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, AlertTriangle, IndianRupee, MessageCircle, Package, CheckCircle2 } from 'lucide-react';
import { billingService } from '../../../services/billingService';
import { Party, Item } from '../../../core/types/';


interface NotificationScreenProps {
  onBack: () => void;
}

export const NotificationScreen: React.FC<NotificationScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'payments' | 'stock'>('payments');
  const [dues, setDues] = useState<Party[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const lang = (localStorage.getItem('language') || 'en') as 'en' | 'hi';
  const isHi = lang === 'hi';
  const t = {
    title: isHi ? 'अधिसूचना केंद्र' : 'Notification Center',
    subtitle: isHi ? 'अलर्ट और अनुस्मारक' : 'Alerts & Reminders',
    paymentDues: isHi ? 'भुगतान बकाया' : 'Payment Dues',
    lowStock: isHi ? 'कम स्टॉक' : 'Low Stock',
    loading: isHi ? 'डेटा स्कैन किया जा रहा है...' : 'Scanning data...',
    noDues: isHi ? 'कोई बकाया भुगतान नहीं है!' : 'No pending payments!',
    allStocked: isHi ? 'सभी आइटम अच्छी मात्रा में स्टॉक हैं!' : 'All items are well stocked!',
    noMobile: isHi ? 'मोबाइल नहीं' : 'No Mobile',
    remindBtn: isHi ? 'रिमाइंडर' : 'Remind',
    mobileNotFound: isHi ? 'इस ग्राहक के लिए मोबाइल नंबर नहीं मिला।' : 'Mobile number not found for this customer.',
    whatsappMessage: (name: string, amt: string) => isHi 
      ? `नमस्ते ${name},\nआपका ₹${amt} का भुगतान लंबित है। कृपया इसे जल्द से जल्द चुकाने का प्रयास करें।\n\n- क्विकबिल के माध्यम से भेजा गया`
      : `Namaste ${name},\nYour payment of ₹${amt} is pending. Please clear it at your earliest convenience.\n\n- Sent via QuickBill`,
    unit: isHi ? 'इकाई' : 'Unit',
    code: isHi ? 'कोड' : 'Code',
    stock: isHi ? 'स्टॉक' : 'Stock'
  };

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
          alert(t.mobileNotFound);
          return;
      }

      const balanceStr = Number(party.currentBalance.toFixed(2)).toLocaleString('en-IN');
      const message = t.whatsappMessage(party.name, balanceStr);
      
      let cleanNumber = party.mobile.replace(/\D/g, '');
      if (cleanNumber.length === 10) cleanNumber = '91' + cleanNumber;

      const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-main)] transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      <header className="bg-[var(--bg-card)] border-b border-[var(--border-ui)] text-[var(--text-main)] p-4 flex items-center gap-3 shadow-sm shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft size={24} /></button>
        <div>
            <h1 className="text-lg font-black tracking-tight">{t.title}</h1>
            <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider">{t.subtitle}</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-[var(--bg-card)] shadow-sm border-b border-[var(--border-ui)]">
          <button 
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-3.5 text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 border-b-4 transition-all ${activeTab === 'payments' ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'border-transparent text-[var(--text-secondary)] opacity-60'}`}
          >
              <IndianRupee size={16} /> 
              <span>{t.paymentDues}</span>
              <span className="bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-mono px-2 py-0.5 rounded-full ml-1 font-black">{dues.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab('stock')}
            className={`flex-1 py-3.5 text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 border-b-4 transition-all ${activeTab === 'stock' ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'border-transparent text-[var(--text-secondary)] opacity-60'}`}
          >
              <Package size={16} /> 
              <span>{t.lowStock}</span>
              <span className="bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-mono px-2 py-0.5 rounded-full ml-1 font-black">{lowStockItems.length}</span>
          </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--bg-app)]">
          {loading ? (
              <div className="text-center py-10 text-[var(--text-secondary)] font-bold text-xs uppercase tracking-widest">{t.loading}</div>
          ) : (
              <>
                {/* PAYMENT DUES TAB */}
                {activeTab === 'payments' && (
                    dues.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)] opacity-60">
                            <CheckCircle2 size={48} className="mb-2 text-emerald-500 opacity-60" />
                            <p className="text-sm font-bold uppercase tracking-wider">{t.noDues}</p>
                        </div>
                    ) : (
                        dues.map(party => (
                            <div key={party.id} className="bg-[var(--bg-card)] p-4 rounded-2xl shadow-xs border border-[var(--border-ui)] border-l-4 border-l-rose-500 flex justify-between items-center">
                                <div>
                                    <h3 className="font-extrabold text-[var(--text-main)] text-sm">{party.name}</h3>
                                    <p className="text-xs text-[var(--text-secondary)] font-semibold mt-0.5">{party.mobile || t.noMobile}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-rose-500 text-base">₹{Number(party.currentBalance.toFixed(2)).toLocaleString('en-IN')}</p>
                                    <button 
                                        onClick={() => sendPaymentReminder(party)}
                                        className="mt-1.5 flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 shadow-sm"
                                    >
                                        <MessageCircle size={13} /> {t.remindBtn}
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                )}

                {/* LOW STOCK TAB */}
                {activeTab === 'stock' && (
                    lowStockItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)] opacity-60">
                            <CheckCircle2 size={48} className="mb-2 text-emerald-500 opacity-60" />
                            <p className="text-sm font-bold uppercase tracking-wider">{t.allStocked}</p>
                        </div>
                    ) : (
                        lowStockItems.map(item => (
                            <div key={item.id} className="bg-[var(--bg-card)] p-4 rounded-2xl shadow-xs border border-[var(--border-ui)] border-l-4 border-l-amber-500 flex justify-between items-center">
                                <div>
                                    <h3 className="font-extrabold text-[var(--text-main)] text-sm">{item.name}</h3>
                                    <div className="flex gap-2 mt-1.5">
                                        <span className="text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-[var(--text-secondary)] px-2 py-0.5 rounded-lg">{t.unit}: {item.unit}</span>
                                        {item.code && <span className="text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-[var(--text-secondary)] px-2 py-0.5 rounded-lg">{t.code}: {item.code}</span>}
                                    </div>
                                </div>
                                <div className="text-center bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/10 p-2 rounded-xl min-w-[75px]">
                                    <p className="text-[9px] text-rose-500 font-extrabold uppercase tracking-wider">{t.stock}</p>
                                    <p className="font-black text-rose-600 dark:text-rose-400 text-lg">{item.openingStock || 0}</p>
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
