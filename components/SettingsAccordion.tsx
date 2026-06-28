import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Lock, LucideIcon } from 'lucide-react';

interface SettingsAccordionProps {
  title: string;
  icon: LucideIcon;
  description: string;
  children: React.ReactNode;
  disabled?: boolean;
  isLocked?: boolean;
}

export const SettingsAccordion: React.FC<SettingsAccordionProps> = ({
  title,
  icon: Icon,
  description,
  children,
  disabled = false,
  isLocked = false
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    if (disabled || isLocked) return;
    setIsOpen(prev => !prev);
  };

  return (
    <div 
      className={`border border-slate-250/60 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden transition-all duration-200 ${
        isOpen 
          ? 'shadow-md border-indigo-200 dark:border-[#3b5998]/40 ring-1 ring-indigo-100/50 dark:ring-indigo-950/20' 
          : 'shadow-sm hover:shadow-md'
      }`}
    >
      {/* Header Selector Bar */}
      <div
        onClick={handleToggle}
        className={`p-4 flex items-center justify-between cursor-pointer select-none transition-colors duration-150 ${
          isLocked || disabled 
            ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/30 cursor-not-allowed' 
            : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-start gap-4 flex-1 min-w-0 mr-4">
          {/* Circular/Rounded Icon container */}
          <div className={`p-2.5 rounded-xl shrink-0 ${
            isLocked || disabled
              ? 'bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-500'
              : isOpen
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
          }`}>
            <Icon size={20} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-extrabold text-slate-850 dark:text-white flex items-center gap-1.5 leading-snug">
              {title}
              {isLocked && (
                <span className="text-[10px] text-amber-500 font-extrabold flex items-center gap-0.5 bg-amber-50 dark:bg-amber-900/10 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/30 font-sans tracking-wide">
                  <Lock size={10} /> LOCK
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5 font-sans">
              {description}
            </p>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {isLocked ? (
            <Lock size={16} className="text-amber-500 shrink-0" />
          ) : (
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="text-slate-400 dark:text-slate-500 shrink-0"
            >
              <ChevronDown size={20} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Accordion Content with Framer Motion slide-down */}
      <AnimatePresence initial={false}>
        {isOpen && !isLocked && !disabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-slate-100 dark:border-slate-800/50 bg-[#fafbfc] dark:bg-slate-900/40"
          >
            {/* slightly indented content with a subtle left-border accent and symmetric right padding/margin to prevent right-edge clipping */}
            <div className="p-4 pl-6 pr-6 ml-4 mr-4 border-l-2 border-indigo-400/70 dark:border-emerald-500/50 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
