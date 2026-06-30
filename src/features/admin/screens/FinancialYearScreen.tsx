import React, { useState, useEffect } from 'react';
import { Database, Calendar, ChevronRight, Sun, Moon, ArrowLeft } from 'lucide-react';
import { Theme } from '../../../App';
import { safeLocalStorage } from '../../../core/utils/storage';

interface FY {
    id: string;
    label: string;
}

interface FinancialYearScreenProps {
    onSelect: (fyId: string) => void;
    language?: 'en' | 'hi';
    currentTheme?: Theme;
    onThemeChange?: (theme: Theme) => void;
    onBack?: () => void;
}

export const FinancialYearScreen: React.FC<FinancialYearScreenProps> = ({ 
    onSelect, 
    language,
    currentTheme = 'system',
    onThemeChange,
    onBack
}) => {
    const [availableFYs, setAvailableFYs] = useState<FY[]>([]);
    const [selected, setSelected] = useState<string>('BillingDB');

    useEffect(() => {
        const storedFYs = localStorage.getItem('availableFYs');
        const currentActive = localStorage.getItem('activeFY') || 'BillingDB';
        setSelected(currentActive);

        if (storedFYs) {
            setAvailableFYs(JSON.parse(storedFYs));
        } else {
            // Default initialization
            const defaultFY = [{ id: 'BillingDB', label: 'Current FY' }];
            localStorage.setItem('availableFYs', JSON.stringify(defaultFY));
            setAvailableFYs(defaultFY);
        }
    }, []);

    const appLang = language || (localStorage.getItem('appLanguage') || 'en');
    const isHi = appLang === 'hi';

    // Calculate active dark state based on system or explicit theme props
    const [isDark, setIsDark] = useState(() => {
        if (currentTheme === 'dark') return true;
        if (currentTheme === 'light') return false;
        return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // Keep dark state in sync with changes to currentTheme
    useEffect(() => {
        if (currentTheme === 'dark') {
            setIsDark(true);
        } else if (currentTheme === 'light') {
            setIsDark(false);
        } else {
            setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
    }, [currentTheme]);

    // Listen to system prefers-color-scheme changes if theme is set to 'system'
    useEffect(() => {
        if (currentTheme !== 'system') return;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = (e: MediaQueryListEvent) => {
            setIsDark(e.matches);
        };
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
    }, [currentTheme]);

    const toggleTheme = () => {
        const nextTheme = isDark ? 'light' : 'dark';
        if (onThemeChange) {
            onThemeChange(nextTheme);
        }
    };

    const handleProceed = () => {
        onSelect(selected);
    };

    // Styling configurations synced with the premium onboarding flow layouts
    const canvasStyle = {
        background: isDark 
            ? 'linear-gradient(to bottom, var(--bg-app) 0%, #020617 100%)' 
            : 'linear-gradient(to bottom, var(--bg-app) 0%, #EFEBE4 100%)',
        color: 'var(--text-main)'
    };

    const cardStyle = {
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-ui)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)'
    };

    const headerBtnStyle = {
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-ui)',
        color: isDark ? '#F59E0B' : 'var(--brand-primary)'
    };

    const subBadgeStyle = {
        backgroundColor: 'var(--brand-light)',
        borderColor: 'var(--border-ui)',
        color: isDark ? '#818cf8' : 'var(--brand-primary)'
    };

    const textSecondaryStyle = {
        color: 'var(--text-secondary)'
    };

    const brandColor = '#6366F1';

    return (
        <div 
            style={canvasStyle}
            className="relative h-screen w-full flex flex-col justify-between p-5 md:p-8 overflow-hidden select-none font-sans transition-colors duration-200"
        >
            {/* Background glowing particles/radial pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)] pointer-events-none" />
            <div 
                className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none" 
                style={{ 
                    backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', 
                    backgroundSize: '16px 16px' 
                }} 
            />

            {/* Top floating action bar with back and theme toggle */}
            <div className="w-full max-w-md mx-auto flex items-center justify-between z-10 shrink-0">
                {onBack ? (
                    <button
                        onClick={onBack}
                        style={headerBtnStyle}
                        className="flex items-center gap-1.5 text-[11px] font-bold py-2 px-3.5 rounded-full border shadow-3xs cursor-pointer active:scale-95 hover:scale-105 min-h-[44px]"
                    >
                        <ArrowLeft size={14} /> {isHi ? 'पीछे जाएँ' : 'Back'}
                    </button>
                ) : <div />}

                <button
                    id="fy-theme-toggle-btn"
                    type="button"
                    onClick={toggleTheme}
                    style={headerBtnStyle}
                    className="p-3 rounded-2xl border transition-all duration-300 flex items-center justify-center cursor-pointer shadow-3xs active:scale-95 hover:scale-105 min-w-[44px] min-h-[44px]"
                    aria-label="Toggle theme"
                >
                    {isDark ? <Sun size={18} className="stroke-[2.5px]" /> : <Moon size={18} className="stroke-[2.5px]" />}
                </button>
            </div>

            {/* Centered Scrollable Core Form Container */}
            <div className="flex-1 w-full flex items-center justify-center overflow-y-auto my-3 py-2 z-10 scrollbar-none">
                <main className="w-full max-w-md">
                    <div 
                        style={cardStyle}
                        className="w-full border p-6 sm:p-8 rounded-[2rem] transition-all duration-500 space-y-6 shadow-2xl"
                    >
                        {/* Header Section */}
                        <div className="text-center space-y-4">
                            <div 
                                className="mx-auto p-4 rounded-2xl w-14 h-14 flex items-center justify-center shadow-md text-white bg-gradient-to-tr from-brand-primary/80 to-brand-primary"
                                style={{
                                    background: 'linear-gradient(to top right, #6366F1, #4F46E5)'
                                }}
                            >
                                <Database size={28} className="stroke-[2.5px] animate-pulse" />
                            </div>

                            <div className="pt-1">
                                <span 
                                    style={subBadgeStyle}
                                    className="inline-block text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border shadow-4xs"
                                >
                                    ⚡ {isHi ? 'सक्रिय बहीखाता सत्र' : 'Active Session'}
                                </span>
                            </div>

                            <div className="space-y-1">
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase font-sans">
                                    {isHi ? 'ईज़ी बिलिंग ' : 'Eazy Billing '}
                                    <span style={{ color: brandColor }} className="font-black">
                                        v2.0
                                    </span>
                                </h1>
                                <p 
                                    style={textSecondaryStyle}
                                    className="text-[10px] uppercase tracking-widest font-bold"
                                >
                                    {isHi ? 'वित्तीय वर्ष का चयन करें' : 'Select Financial Year'}
                                </p>
                            </div>
                        </div>

                        {/* Financial Year Selection List */}
                        <div className="space-y-4 pt-1">
                            <div 
                                className="flex items-center gap-2 mb-1 pb-3 border-b"
                                style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2E8F0' }}
                            >
                                <Calendar size={15} className="stroke-[2.5px] text-brand-primary" />
                                <span 
                                    className="font-black text-xs tracking-wider uppercase font-sans text-brand-primary"
                                >
                                    {isHi ? 'उपलब्ध वित्तीय वर्ष' : 'Available Sessions'}
                                </span>
                            </div>

                            <p 
                                style={textSecondaryStyle}
                                className="text-[11px] leading-relaxed font-bold"
                            >
                                {isHi 
                                    ? 'चुना हुआ वित्तीय वर्ष ही आपके लेनदेन प्रविष्टियों, डेटा विश्लेषण और रिपोर्ट के लिए सक्रीय किया जाएगा:' 
                                    : 'Every financial session serves as a partition to separate bookkeeping, balances, and ledger invoices:'}
                            </p>

                            <div className="grid grid-cols-1 gap-3 max-h-[220px] overflow-y-auto pr-1">
                                {availableFYs.map((fy) => {
                                    const isSelected = selected === fy.id;
                                    
                                    const optionStyle = {
                                        backgroundColor: isSelected 
                                            ? 'var(--brand-light)' 
                                            : 'var(--bg-card)',
                                        borderColor: isSelected ? 'var(--brand-primary)' : 'var(--border-ui)',
                                        color: 'var(--text-main)'
                                    };

                                    return (
                                        <button
                                            key={fy.id}
                                            id={`fy-btn-${fy.id}`}
                                            onClick={() => setSelected(fy.id)}
                                            style={optionStyle}
                                            className={`p-4 rounded-2xl text-left border transition-all duration-300 flex items-center justify-between cursor-pointer focus:outline-none min-h-[44px] ${
                                                isSelected ? 'font-bold scale-[1.01] shadow-xs' : 'hover:scale-[1.005]'
                                            }`}
                                        >
                                            <div className="space-y-0.5">
                                                <span className="text-sm font-black block">{fy.label}</span>
                                                <span 
                                                    className="text-[10px] font-semibold block transition-colors duration-300"
                                                    style={{ color: isSelected ? '#6366F1' : '#64748B' }}
                                                >
                                                    {fy.id === 'BillingDB' 
                                                        ? (isHi ? 'डिफ़ॉल्ट सक्रिय बहीखाता सत्र' : 'Default active accounting workspace')
                                                        : (isHi ? `${fy.label} सत्र का डेटाबेस` : `Partition for ${fy.label} active data`)}
                                                </span>
                                            </div>
                                            <div 
                                                className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0"
                                                style={{ borderColor: isSelected ? '#6366F1' : '#94A3B8' }}
                                            >
                                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" style={{ backgroundColor: '#6366F1' }} />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Select Button */}
                        <div className="pt-2">
                            <button
                                id="proceed-fy-btn"
                                onClick={handleProceed}
                                className="w-full font-black py-3.5 rounded-2xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-xs hover:-translate-y-0.5 cursor-pointer text-white focus:outline-none min-h-[44px]"
                                style={{
                                    background: 'linear-gradient(to right, #6366F1, #4F46E5)',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                }}
                            >
                                {isHi ? 'चयन करें और आगे बढ़ें' : 'Select & Continue'}
                                <ChevronRight size={14} className="stroke-[3px]" />
                            </button>
                        </div>
                    </div>
                </main>
            </div>

            {/* Bottom Footer Credits */}
            <footer 
                style={textSecondaryStyle}
                className="text-center text-[10px] pb-2 transition-colors duration-500 shrink-0 w-full max-w-md mx-auto"
            >
                Eazy Billing Client Core • v2.1.0 • Offline Ready
            </footer>
        </div>
    );
};
