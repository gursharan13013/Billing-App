import React from 'react';
import { X, Copy, Check, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface UpiQrModalProps {
  isOpen?: boolean;
  onClose: () => void;
  upiId?: string;
  upiVpa?: string;
  businessName?: string;
  companyName?: string;
  amount: number;
  invoiceNumber?: string;
}

export const UpiQrModal: React.FC<UpiQrModalProps> = ({
  isOpen = true,
  onClose,
  upiId,
  upiVpa,
  businessName,
  companyName,
  amount,
  invoiceNumber = 'QUICK-BILL',
}) => {
  const [copied, setCopied] = React.useState(false);

  const activeVpa = upiId || upiVpa || '';
  const activeBusinessName = businessName || companyName || 'Eazy Billing Store';

  if (!isOpen || !activeVpa) return null;

  // Standard UPI URI format: upi://pay?pa=vpa&pn=name&am=amount&tr=ref&cu=INR
  const upiUrl = `upi://pay?pa=${encodeURIComponent(activeVpa)}&pn=${encodeURIComponent(activeBusinessName)}&am=${amount.toFixed(2)}&tr=${encodeURIComponent(invoiceNumber)}&cu=INR`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(activeVpa);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="relative bg-[var(--bg-card)] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-[var(--border-ui)] animate-in fade-in zoom-in-95 duration-200 text-[var(--text-main)]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-ui)]/60 bg-[var(--bg-app)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Scan & Pay via UPI</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Invoice: {invoiceNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center justify-center">
          {/* QR Code Frame */}
          <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-200 flex items-center justify-center mb-4 transition-transform hover:scale-[1.02]">
            <QRCodeSVG value={upiUrl} size={190} level="M" />
          </div>

          {/* Amount Display */}
          <div className="text-center mb-5">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Grand Total Amount</span>
            <h2 className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">₹{amount.toFixed(2)}</h2>
          </div>

          {/* Details Card */}
          <div className="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] p-3.5 rounded-xl space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Payee Merchant</span>
              <span className="font-bold text-[var(--text-main)] truncate max-w-[170px]">{activeBusinessName}</span>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border-ui)]/50 pt-2">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Merchant VPA</span>
              <button 
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:underline active:opacity-70 transition-opacity"
              >
                <span className="truncate max-w-[140px]">{activeVpa}</span>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer info banner with app badges */}
        <div className="bg-[var(--bg-app)] px-4 py-3 border-t border-[var(--border-ui)] text-center text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center gap-2">
          <span>Supported Apps:</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">BHIM • GPay • PhonePe • Paytm</span>
        </div>
      </div>
    </div>
  );
};
