import React from 'react';
import { ArrowLeft, IndianRupee } from 'lucide-react';
import { TransactionType, Language } from '../../core/types/';
import { motion } from 'motion/react';

interface ReportOptionsScreenProps {
  onBack: () => void;
  type: TransactionType;
  onSelectOption: (option: 'By Party' | 'By Item' | 'By Party By Item' | 'Default') => void;
  language?: Language;
}

export const ReportOptionsScreen: React.FC<ReportOptionsScreenProps> = ({ onBack, type, onSelectOption, language }) => {
  const isHi = language === 'hi';

  // Dynamic Bilingual Localization Dictionary Data Object
  const t = {
    title: isHi ? `${type} रिपोर्ट विकल्प` : `${type} Report Options`,
    byParty: isHi ? 'पार्टी अनुसार' : 'By Party',
    byItem: isHi ? 'आइटम अनुसार' : 'By Item',
    byPartyByItem: isHi ? 'पार्टी और आइटम अनुसार' : 'By Party By Item'
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            {t.title}
          </h1>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800">
        {/* The textured Rupee Icon Block */}
        <div 
          className="w-48 h-48 bg-slate-900 dark:bg-slate-900 flex justify-center items-center overflow-hidden mb-8 shadow-xl border-4 border-slate-700/80 rounded-2xl" 
          style={{ 
            backgroundImage: 'radial-gradient(circle, #333 2px, transparent 2px)', 
            backgroundSize: '10px 10px' 
          }}
        >
          <IndianRupee size={120} className="text-white drop-shadow-lg" />
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="p-4 flex flex-col gap-3 bg-white dark:bg-slate-900 shrink-0 shadow-sm pb-[max(env(safe-area-inset-bottom),24px)] pt-6 border-t border-gray-200 dark:border-slate-800">
         <div className="flex gap-3">
            <button 
               onClick={() => onSelectOption('By Party')}
               className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white py-4 rounded-xl font-bold text-[15px] shadow-sm transition-all cursor-pointer"
            >
              {t.byParty}
            </button>
            <button 
               onClick={() => onSelectOption('By Item')}
               className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white py-4 rounded-xl font-bold text-[15px] shadow-sm transition-all cursor-pointer"
            >
              {t.byItem}
            </button>
         </div>
         <button 
            onClick={() => onSelectOption('By Party By Item')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white py-4 rounded-xl font-bold text-[15px] shadow-sm transition-all cursor-pointer"
         >
           {t.byPartyByItem}
         </button>
      </div>
    </motion.div>
  );
};
