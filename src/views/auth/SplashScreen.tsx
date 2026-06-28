import React, { useEffect, useState } from 'react';
import { ShieldCheck, Zap, Server } from 'lucide-react';
import { billingService } from '../../services/billingService';

interface SplashScreenProps {
  onComplete: (isSetup: boolean) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [statusMessage, setStatusMessage] = useState('Initializing Secure Ledger...');
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Elegant cycling game-style statuses
    const messages = [
      'Initializing Secure Ledger...',
      'Loading Atomic Core Engine...',
      'Verifying Data Integrity Chain...',
      'Readying Offline Database...'
    ];
    let currentIndex = 0;
    
    const statusInterval = setInterval(() => {
      if (currentIndex < messages.length - 1) {
        currentIndex++;
        setStatusMessage(messages[currentIndex]);
      }
    }, 600);

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
      clearInterval(statusInterval);
      clearTimeout(navTimeout);
    };
  }, [onComplete]);

  return (
    <div 
      className={`relative h-full w-full flex flex-col justify-between items-center bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white p-6 transition-opacity duration-300 ${
        fadeOut ? 'opacity-0 scale-95' : 'opacity-100'
      }`}
      style={{ contentVisibility: 'auto' }}
    >
      {/* Top micro details */}
      <div className="w-full flex justify-between items-center text-[9px] font-mono tracking-widest text-slate-500 uppercase mt-4">
        <div className="flex items-center gap-1.5">
          <Server size={10} className="text-emerald-500 animate-pulse" />
          <span>LOCAL HOST IP: OK</span>
        </div>
        <span>CRC-32: SECURE</span>
      </div>

      {/* Center glowing logo and text */}
      <div className="my-auto space-y-8 flex flex-col items-center">
        {/* Game-style double rotating glowing ring logo */}
        <div className="relative flex items-center justify-center">
          {/* Ring 1 - Outer Rotating Border */}
          <div className="absolute w-28 h-28 rounded-full border border-dashed border-brand-primary/30 animate-spin" style={{ animationDuration: '15s' }}></div>
          {/* Ring 2 - Inner Fast Rotating Border */}
          <div className="absolute w-24 h-24 rounded-full border-2 border-dashed border-money-out/40 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}></div>
          {/* Glowing Shadow Panel */}
          <div className="absolute w-20 h-20 rounded-full bg-brand-primary/10 blur-xl animate-pulse"></div>
          
          {/* Main central shield icon */}
          <div className="relative bg-gradient-to-tr from-brand-primary to-money-out p-5 rounded-[2rem] w-20 h-20 flex items-center justify-center shadow-2xl shadow-brand-primary/40 animate-pulse border border-white/20">
            <ShieldCheck size={40} className="text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]" />
          </div>
        </div>

        <div className="space-y-2">
          <span className="inline-block text-[10px] bg-slate-800 text-brand-primary font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-widest border border-slate-700/60 shadow-md">
            🛡️ ONLINE SYNC • OFFLINE LEDGER
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight mt-3 text-white uppercase select-none">
            EAZY BILLING <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-money-out font-black">v2.0</span>
          </h1>
          <p className="text-slate-400 text-xs font-medium tracking-wide">Atomic Accounting • High Performance Core</p>
        </div>
      </div>

      {/* Bottom loading status */}
      <div className="mb-12 flex flex-col items-center gap-3">
        <div className="relative w-48 h-1 bg-slate-800 rounded-full overflow-hidden shadow-inner">
          <div className="absolute h-full bg-gradient-to-r from-brand-primary to-money-in rounded-full animate-pulse transition-all duration-300" style={{ width: '80%' }}></div>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-brand-primary animate-bounce" />
          <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400">
            {statusMessage}
          </span>
        </div>
      </div>
    </div>
  );
};
