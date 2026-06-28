import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('appTheme');
      if (saved === 'dark' || saved === 'light') return saved;
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('appTheme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('appTheme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <button
      id="theme-toggle-btn"
      onClick={toggleTheme}
      className="p-2.5 rounded-xl border border-border-ui bg-bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-text-main transition-all duration-300 shadow-sm flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary active:scale-95"
      title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? (
        <Moon size={18} className="text-indigo-600" />
      ) : (
        <Sun size={18} className="text-amber-400" />
      )}
    </button>
  );
};
