import React, { useEffect, useState } from 'react';
import { ShieldCheck, Zap, Server, Wifi } from 'lucide-react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: (isSetup: boolean) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [statusMessage, setStatusMessage] = useState('Initializing Secure Ledger...');
  const [progress, setProgress] = useState(0);
  const [bootLogs, setBootLogs] = useState<string[]>(['[SYSTEM] Core boot initialized...']);

  useEffect(() => {
    const messages = [
      'Initializing Secure Ledger...',
      'Loading Atomic Core Engine...',
      'Verifying Data Integrity Chain...',
      'Syncing Offline IndexedDB...',
      'Readying Secure Ledger Console...'
    ];
    
    const logs = [
      '[OK] Database instances resolved.',
      '[OK] Security encryption protocols active.',
      '[OK] Dexie sync client handshake completed.',
      '[SYSTEM] Boot flow finalized.'
    ];

    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      if (msgIndex < messages.length - 1) {
        msgIndex++;
        setStatusMessage(messages[msgIndex]);
        setBootLogs(prev => [...prev, `[INFO] ${messages[msgIndex]}`]);
      }
    }, 600);

    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < logs.length) {
        setBootLogs(prev => [...prev, logs[logIndex]]);
        logIndex++;
      }
    }, 800);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => {
      clearInterval(msgInterval);
      clearInterval(logInterval);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  return (
    <div className="relative h-full w-full flex flex-col justify-between items-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 md:p-12 overflow-hidden select-none font-sans transition-colors duration-200">
      {/* Background glowing particles/radial pattern (adaptive) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', 
          backgroundSize: '16px 16px' 
        }} 
      />

      {/* Main Responsive Wrapper Grid */}
      <div className="w-full max-w-lg mx-auto flex flex-col justify-between h-full items-center z-10 gap-6">
        
        {/* Top Header Row */}
        <div className="w-full flex justify-between items-center text-[10px] font-mono tracking-widest text-slate-500 dark:text-slate-450 uppercase shrink-0 pt-2">
          <div className="flex items-center gap-1.5">
            <Server size={12} className="text-emerald-500 animate-pulse" />
            <span>LEDGER CONNECTED</span>
          </div>
          <div className="flex items-center gap-1">
            <Wifi size={12} className="text-indigo-600 dark:text-indigo-400" />
            <span>OFFLINE ENGINE ACTIVE</span>
          </div>
        </div>

        {/* Center Shield Graphic and Glowing Logo */}
        <div className="flex-1 flex flex-col justify-center items-center space-y-8 w-full max-w-md py-4">
          <div className="relative flex items-center justify-center">
            {/* Animated rings */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
              className="absolute w-36 h-36 rounded-full border border-dashed border-indigo-500/20 dark:border-indigo-400/20"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
              className="absolute w-28 h-28 rounded-full border-2 border-dashed border-emerald-500/10 dark:border-emerald-500/10"
            />
            <div className="absolute w-24 h-24 rounded-full bg-indigo-600/5 dark:bg-indigo-650/10 blur-xl animate-pulse" />
            
            {/* Main Shield Icon */}
            <motion.div 
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="relative bg-gradient-to-tr from-indigo-600 to-indigo-800 p-5 rounded-[2.2rem] w-20 h-20 flex items-center justify-center shadow-2xl shadow-indigo-500/30 border border-white/10"
            >
              <ShieldCheck size={40} className="text-white drop-shadow-[0_4px_10px_rgba(255,255,255,0.25)]" />
            </motion.div>
          </div>

          {/* Text Details */}
          <div className="space-y-2.5 text-center">
            <span className="inline-block text-[9px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-widest shadow-xs">
              🔒 SECURE LEDGER SYSTEM • VER 2.0
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white uppercase mt-3">
              EAZY BILLING
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold tracking-wide uppercase opacity-75">Atomic Accounting • Hybrid PWA Client</p>
          </div>

          {/* Console Boot Logs stream */}
          <div className="w-full h-28 bg-white dark:bg-slate-950/80 rounded-xl border border-gray-200 dark:border-slate-900 p-4 font-mono text-[10px] text-slate-500 dark:text-slate-400 overflow-y-auto space-y-1 text-left select-text custom-scrollbar shadow-xs">
            {bootLogs.map((log, idx) => (
              <div key={idx} className="truncate">
                <span className="text-indigo-600 dark:text-indigo-500 font-bold">&gt; </span>
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Loading Progress Bar Section */}
        <div className="w-full max-w-md pb-6 flex flex-col items-center gap-3.5 shrink-0">
          <div className="relative w-full h-1.5 bg-gray-200 dark:bg-slate-900 rounded-full overflow-hidden border border-gray-200/50 dark:border-slate-900/50">
            <div 
              className="absolute h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }} 
            />
          </div>
          
          <div className="w-full flex justify-between items-center text-[10px] font-mono tracking-widest uppercase text-slate-500 dark:text-slate-450 px-1">
            <div className="flex items-center gap-1.5">
              <Zap size={11} className="text-indigo-600 dark:text-indigo-400 animate-bounce" />
              <span>{statusMessage}</span>
            </div>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{progress}%</span>
          </div>
        </div>

      </div>
    </div>
  );
};
