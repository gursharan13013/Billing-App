/**
 * EazyBilling UI Theme Configuration (Design System Tokens)
 * Centralized styling constants to ensure complete visual harmony across the application.
 * Upgrading or modifying these tokens instantly refreshes the interface site-wide.
 */

export const THEME = {
  // Color palette definitions
  colors: {
    primary: 'indigo-600',
    primaryDark: 'indigo-500',
    primaryHover: 'indigo-500',
    primaryBg: 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700',
    primaryText: 'text-indigo-600 dark:text-indigo-400',
    
    success: 'emerald-600',
    successDark: 'emerald-400',
    successBg: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700',
    successText: 'text-emerald-600 dark:text-emerald-400',

    danger: 'red-600',
    dangerDark: 'red-500',
    dangerBg: 'bg-red-600 hover:bg-red-500 active:bg-red-700',
    dangerText: 'text-red-600 dark:text-red-400',
    
    slateText: 'text-slate-600 dark:text-slate-300',
    labelText: 'text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono font-bold',
  },

  // Central Card layouts and panels
  card: {
    base: 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm transition-all duration-200',
    inner: 'bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl',
  },

  // Modal styling
  modal: {
    overlay: 'fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200',
    panel: 'bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(99,102,241,0.05)] space-y-4 text-slate-900 dark:text-white',
    iconContainer: 'p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-full text-indigo-600 dark:text-indigo-400 ring-4 ring-indigo-500/10 dark:ring-indigo-400/5',
    title: 'text-lg font-extrabold select-none text-slate-900 dark:text-white font-sans tracking-tight',
    subtitle: 'text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold',
  },

  // Form input styles
  input: {
    base: 'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl outline-none text-slate-900 dark:text-white text-xs font-semibold focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 dark:focus:ring-indigo-400/10 transition-all font-sans',
    pin: 'w-full text-center text-2xl font-mono tracking-widest bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl outline-none focus:border-indigo-500 dark:focus:border-indigo-400 text-indigo-650 dark:text-indigo-400 font-black focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-400/5 transition-all',
  },

  // Button styles
  button: {
    primary: 'flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-550 active:bg-indigo-700 text-white font-black text-xs transition duration-200 shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-1.5 cursor-pointer',
    secondary: 'flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-bold text-xs transition duration-200 cursor-pointer',
    danger: 'w-full py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-red-600/10',
  }
};
