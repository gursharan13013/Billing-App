import React, { useEffect, useState } from 'react';
import { ShieldCheck, Zap, Server, Wifi } from 'lucide-react';
import { motion } from 'motion/react';
import { billingService } from '../../services/billingService';

interface SplashScreenProps {
  onComplete: (isSetup: boolean) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [statusMessage, setStatusMessage] = useState('Initializing Secure Ledger...');
  const [progress, setProgress] = useState(0);
  const [bootLogs, setBootLogs] = useState<string[]>(['[SYSTEM] Core boot initialized...']);
  const [fadeOut, setFadeOut] = useState(false);

  // Detect and listen to system preference (prefers-color-scheme: dark) directly
  const [isSystemDark, setIsSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      setIsSystemDark(e.matches);
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

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

    // After 2.5 seconds, initiate fade out and navigate
    const navTimeout = setTimeout(async () => {
      setFadeOut(true);
      
      // Let fade transition complete (300ms) before changing screen
      setTimeout(async () => {
        try {
          const profile = await billingService.getCompanyProfile();
          const hasSetup = !!(profile && profile.name && profile.mobile) || localStorage.getItem('companyProfileSetup') === 'true';
          onComplete(hasSetup);
        } catch (e) {
          console.warn('Splash navigation state fetch failed, defaulting to setup', e);
          onComplete(false);
        }
      }, 300);
    }, 2500);

    return () => {
      clearInterval(msgInterval);
      clearInterval(logInterval);
      clearInterval(progressInterval);
      clearTimeout(navTimeout);
    };
  }, [onComplete]);

  // Color variables determined by system preference bypassing stylesheet overrides
  const canvasStyle = {
    backgroundColor: isSystemDark ? '#090D16' : '#F9F6F0',
    color: isSystemDark ? '#F1F5F9' : '#0F172A'
  };

  const logPanelStyle = {
    backgroundColor: isSystemDark ? 'rgba(19, 27, 46, 0.85)' : '#FFFFFF',
    borderColor: isSystemDark ? '#1E293B' : '#CBD5E1',
    color: isSystemDark ? '#94A3B8' : '#475569'
  };

  const badgeStyle = {
    backgroundColor: isSystemDark ? '#131B2E' : '#FFFFFF',
    borderColor: isSystemDark ? '#1E293B' : '#CBD5E1',
    color: isSystemDark ? '#6366F1' : '#4F46E5'
  };

  const titleStyle = {
    color: isSystemDark ? '#FFFFFF' : '#0F172A'
  };

  const labelStyle = {
    color: isSystemDark ? '#94A3B8' : '#475569'
  };

  const progressTrackStyle = {
    backgroundColor: isSystemDark ? '#131B2E' : '#CBD5E1',
    borderColor: isSystemDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(203, 213, 225, 0.5)'
  };

  const wifiColor = isSystemDark ? '#6366F1' : '#4F46E5';

  return (
    <div 
      style={canvasStyle}
      className={`relative h-full w-full flex flex-col justify-between items-center p-6 md:p-12 overflow-hidden select-none font-sans transition-all duration-300 ${
        fadeOut ? 'opacity-0 scale-95' : 'opacity-100'
      }`}
    >
      {/* Background glowing particles/radial pattern (adaptive) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', 
          backgroundSize: '16px 1px' 
        }} 
      />

      {/* Main Responsive Wrapper Grid */}
      <div className="w-full max-w-lg mx-auto flex flex-col justify-between h-full items-center z-10 gap-6">
        
        {/* Top Header Row */}
        <div 
          style={labelStyle}
          className="w-full flex justify-between items-center text-[10px] font-mono tracking-widest uppercase shrink-0 pt-2"
        >
          <div className="flex items-center gap-1.5">
            <Server size={12} className="text-emerald-500 animate-pulse" />
            <span>LEDGER CONNECTED</span>
          </div>
          <div className="flex items-center gap-1">
            <Wifi size={12} color={wifiColor} />
            <span style={{ color: wifiColor }}>OFFLINE ENGINE ACTIVE</span>
          </div>
        </div>

        {/* Center Shield Graphic and Glowing Logo */}
        <div className="flex-1 flex flex-col justify-center items-center space-y-8 w-full max-w-md py-4">
          <div className="relative flex items-center justify-center">
            {/* Animated rings */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
              className="absolute w-36 h-36 rounded-full border border-dashed border-indigo-500/20"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
              className="absolute w-28 h-28 rounded-full border-2 border-dashed border-emerald-500/10"
            />
            <div className="absolute w-24 h-24 rounded-full bg-indigo-650/10 blur-xl animate-pulse" />
            
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
            <span 
              style={badgeStyle}
              className="inline-block text-[9px] border font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-widest shadow-xs"
            >
              🔒 SECURE LEDGER SYSTEM • VER 2.0
            </span>
            <h1 
              style={titleStyle}
              className="text-3xl sm:text-4xl font-black tracking-tight uppercase mt-3"
            >
              EAZY BILLING
            </h1>
            <p 
              style={labelStyle}
              className="text-xs font-semibold tracking-wide uppercase opacity-75"
            >
              Atomic Accounting • Hybrid PWA Client
            </p>
          </div>

          {/* Console Boot Logs stream */}
          <div 
            style={logPanelStyle}
            className="w-full h-28 rounded-xl border p-4 font-mono text-[10px] overflow-y-auto space-y-1 text-left select-text custom-scrollbar shadow-xs"
          >
            {bootLogs.map((log, idx) => (
              <div key={idx} className="truncate">
                <span style={{ color: wifiColor }} className="font-bold">&gt; </span>
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Loading Progress Bar Section */}
        <div className="w-full max-w-md pb-6 flex flex-col items-center gap-3.5 shrink-0">
          <div 
            style={progressTrackStyle}
            className="relative w-full h-1.5 rounded-full overflow-hidden border"
          >
            <div 
              className="absolute h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }} 
            />
          </div>
          
          <div 
            style={labelStyle}
            className="w-full flex justify-between items-center text-[10px] font-mono tracking-widest uppercase px-1"
          >
            <div className="flex items-center gap-1.5">
              <Zap size={11} color={wifiColor} className="animate-bounce" />
              <span style={{ color: wifiColor }}>{statusMessage}</span>
            </div>
            <span style={{ color: wifiColor }} className="font-bold">{progress}%</span>
          </div>
        </div>

      </div>
    </div>
  );
};
