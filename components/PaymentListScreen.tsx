import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Trash2, Calendar, Edit2, Share2 } from 'lucide-react';
import { PaymentRecord } from '../types';
import { billingService } from '../src/services/billingService';


interface PaymentListScreenProps {
  onBack: () => void;
  type: 'Payment' | 'Receipt';
  onCreateNew: () => void;
  onEdit?: (payment: PaymentRecord) => void;
}

const formatNumber = (val: number) => {
    return Number(val.toFixed(2)).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export const PaymentListScreen: React.FC<PaymentListScreenProps> = ({ onBack, type, onCreateNew, onEdit }) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
  const currentYear = new Date().getFullYear().toString();
  const tabs = ['Today', currentMonth, currentYear];
  
  const [period, setPeriod] = useState<string>('Today');

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, [type]);

  const loadPayments = async () => {
    setLoading(true);
    const data = await billingService.getAllPayments(type);
    setPayments(data);
    setLoading(false);
  };

  const confirmDelete = async () => {
      if (deleteId) {
          await billingService.deletePayment(deleteId);
          setDeleteId(null);
          loadPayments();
      }
  };

  const filteredPayments = payments.filter(p => 
    p.partyName.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
    p.voucherNo.toLowerCase().includes(searchQuery.trim().toLowerCase())
  ).sort((a, b) => {
    // Sort by date mostly, but if date is same, we might want newer ones first
    const dateDiff = Date.fromLocalDateString(b.date).getTime() - Date.fromLocalDateString(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    
    // Sort by createdAt descending (if exists), otherwise fallback to id comparison
    if (a.createdAt && b.createdAt) {
      return b.createdAt - a.createdAt;
    } else if (a.createdAt) {
      return -1; // a is newer
    } else if (b.createdAt) {
      return 1; // b is newer
    }
    return b.id.localeCompare(a.id); 
  });

  // To truly show newest at top regardless of same date, since they are from DB, reverse the payments

  const handleSharePayment = async (pay: PaymentRecord) => {
      try {
          const party = await billingService.getAllParties().then(parties => parties.find(p => p.id === pay.partyId));
          const company = await billingService.getCompanyProfile();
          
          let message = `*Payment Receipt*\n\n`;
          message += `Dear ${pay.partyName},\n`;
          message += `We have received a payment of *₹${formatNumber(pay.amount)}* on ${pay.date} via ${pay.mode}.\n\n`;
          if (pay.remarks) {
              message += `Remarks: ${pay.remarks}\n\n`;
          }
          if (company?.name) {
              message += `Thank You,\n*${company.name}*`;
          }

          const encodedMsg = encodeURIComponent(message);
          let whatsappUrl = `https://wa.me/?text=${encodedMsg}`;

          if (party?.mobile) {
               let cleanNumber = party.mobile.replace(/\D/g, '');
               if (cleanNumber.length === 10) cleanNumber = '91' + cleanNumber;
               whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;
          }

          // Open WhatsApp
          const link = document.createElement('a');
          link.href = whatsappUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Mark as synced/sent
          await billingService.savePayment({ ...pay, isSyncedToCloud: true }, true);
          loadPayments();
      } catch (err) {
          console.error('Error sharing payment:', err);
      }
  };

  const headerColor = type === 'Payment' ? 'bg-red-700' : 'bg-green-700';
  const buttonColor = type === 'Payment' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Header */}
      <header className={`${headerColor} text-white p-4 pt-[max(env(safe-area-inset-top),48px)] flex items-center gap-3 shadow-md shrink-0`}>
        <button onClick={onBack}><ArrowLeft size={24} /></button>
        <div>
            <h1 className="text-xl font-bold">{type}</h1>
            <p className="text-xs opacity-80">{new Date().toDateString()}</p>
        </div>
        <div className="ml-auto flex gap-4">
            <Plus size={24} onClick={onCreateNew} className="cursor-pointer" />
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 flex p-2 gap-2 border-b border-gray-200 dark:border-slate-800">
          {tabs.map((tab) => (
              <button 
                key={tab}
                onClick={() => setPeriod(tab as any)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold text-center transition-colors ${period === tab ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
              >
                  {tab}
              </button>
          ))}
      </div>

      <div className="p-4 pb-0 z-10">
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search Party or Voucher No..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-700 rounded-lg leading-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pt-4">
          {loading ? (
              <div className="p-10 text-center text-gray-500">Loading...</div>
          ) : filteredPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <h2 className="text-3xl font-bold italic mb-2">No Result !!</h2>
              </div>
          ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredPayments.map(pay => {
                      const isSynced = pay.isSyncedToCloud && pay.type === 'Receipt';
                      const rowBg = isSynced ? 'bg-[#5ad368] text-black dark:bg-[#3fac4a] dark:text-white' : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200';
                      const textClass = isSynced ? '!text-black dark:!text-white' : '';
                      const amountClass = isSynced ? '!text-black dark:!text-white' : (type === 'Payment' ? 'text-red-600' : 'text-green-600');
                      const subtitleClass = isSynced ? '!text-slate-800 dark:!text-slate-200' : 'text-slate-500';
                      
                      return (
                      <div key={pay.id} className={`p-4 transition-colors relative group ${rowBg} ${isSynced ? 'hover:bg-[#4bbf57] dark:hover:bg-[#328e3b]' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                          <div className="flex justify-between items-start">
                              <div onClick={() => onEdit && onEdit(pay)} className="cursor-pointer flex-1">
                                  <div className="flex items-center gap-2">
                                      <span className={`font-bold ${textClass}`}>{pay.partyName}</span>
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${isSynced ? 'bg-black/10 dark:bg-white/20 !text-black dark:!text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{pay.mode}</span>
                                  </div>
                                  <p className={`text-xs mt-1 ${subtitleClass}`}>{pay.date} • {pay.voucherNo}</p>
                              </div>
                              <div className="text-right flex flex-col items-end">
                                  <span className={`font-bold ${amountClass}`}>
                                      ₹{formatNumber(pay.amount)}
                                  </span>
                                  <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={(e) => { e.stopPropagation(); handleSharePayment(pay); }} className="text-green-500 p-1 hover:bg-green-50 rounded" title="Send Receipt">
                                          <Share2 size={16} />
                                      </button>
                                      {onEdit && !isSynced && (
                                          <button onClick={() => onEdit(pay)} className="text-blue-500 p-1 hover:bg-blue-50 rounded">
                                              <Edit2 size={16} />
                                          </button>
                                      )}
                                      {!isSynced && (
                                          <button onClick={(e) => { e.stopPropagation(); setDeleteId(pay.id); }} className="text-red-400 p-1 hover:bg-red-50 rounded">
                                              <Trash2 size={16} />
                                          </button>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>
                      )
                  })}
              </div>
          )}
      </div>

      {/* Floating Action Button (Optional, since header has plus) */}
      <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6">
          <button 
            onClick={onCreateNew}
            className={`${buttonColor} text-white p-4 rounded-full shadow-lg transition-transform active:scale-95`}
          >
              <Plus size={28} />
          </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-800">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-900/50">
                    <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Record?</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">Are you sure you want to delete this payment record?</p>
                <div className="flex gap-3">
                    <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Cancel</button>
                    <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700">Delete</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};