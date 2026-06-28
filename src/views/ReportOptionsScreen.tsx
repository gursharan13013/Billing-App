import React from 'react';
import { ArrowLeft, IndianRupee } from 'lucide-react';
import { TransactionType } from '../core/types/';


interface ReportOptionsScreenProps {
  onBack: () => void;
  type: TransactionType;
  onSelectOption: (option: 'By Party' | 'By Item' | 'By Party By Item' | 'Default') => void;
}

export const ReportOptionsScreen: React.FC<ReportOptionsScreenProps> = ({ onBack, type, onSelectOption }) => {
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <header className="bg-[#3b5998] text-white p-4 flex items-center shadow-md shrink-0 pt-[max(env(safe-area-inset-top),48px)]">
        <button onClick={onBack} className="mr-4 active:scale-95 transition-transform p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">{type} Report</h1>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-900 border-b border-t border-slate-200 dark:border-slate-800">
        {/* The textured Rupee Icon Block */}
        <div 
            className="w-48 h-48 bg-slate-900 flex justify-center items-center overflow-hidden mb-8 shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-4 border-slate-700/80 rounded" 
             style={{ 
               backgroundImage: 'radial-gradient(circle, #333 2px, transparent 2px)', 
               backgroundSize: '10px 10px' 
             }}
        >
          <IndianRupee size={120} className="text-white drop-shadow-lg" />
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="p-4 flex flex-col gap-3 bg-white dark:bg-slate-900 shrink-0 shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.1)] pb-[max(env(safe-area-inset-bottom,32px),32px)] pt-6">
         <div className="flex gap-3">
            <button 
               onClick={() => onSelectOption('By Party')}
               className="flex-1 bg-[#3b5998] hover:bg-blue-800 active:bg-blue-900 text-white py-4 rounded font-semibold text-[15px] shadow-sm transform active:scale-[0.98] transition-all"
            >
              By Party
            </button>
            <button 
               onClick={() => onSelectOption('By Item')}
               className="flex-1 bg-[#3b5998] hover:bg-blue-800 active:bg-blue-900 text-white py-4 rounded font-semibold text-[15px] shadow-sm transform active:scale-[0.98] transition-all"
            >
              By Item
            </button>
         </div>
         <button 
            onClick={() => onSelectOption('By Party By Item')}
            className="w-full bg-[#3b5998] hover:bg-blue-800 active:bg-blue-900 text-white py-4 rounded font-semibold text-[15px] shadow-sm transform active:scale-[0.98] transition-all"
         >
           By Party By Item
         </button>
      </div>
    </div>
  );
};
