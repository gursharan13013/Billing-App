import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, ShieldCheck, Info } from 'lucide-react';
import { OnboardingManager } from '../../../services/OnboardingManager';


interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Focus effect for security input
  useEffect(() => {
    // Basic trick to trigger mobile keyboard focus without user click when it mounts
    // Might not always work depending on browser security, but provides a better UX if it does
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setIsChecking(true);
    
    try {
      const enteredHash = await OnboardingManager.generatePinHash(password);
      const savedHash = await OnboardingManager.getHashedPin();
      const savedPin = localStorage.getItem('appPin');
      
      let isVerified = false;
      if (savedHash) {
        isVerified = (enteredHash === savedHash);
      } else if (savedPin) {
        isVerified = (password === savedPin);
      }
      
      if (isVerified) {
        setError(false);
        onUnlock(); // Success!
      } else {
        setError(true);
        setPassword(''); // Clear input on failure
      }
    } catch (err) {
      console.error('Lock security check failure:', err);
      const savedPin = localStorage.getItem('appPin');
      if (password === savedPin) {
        setError(false);
        onUnlock();
      } else {
        setError(true);
        setPassword('');
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full text-blue-600 dark:text-blue-400 mb-6 relative">
          <ShieldCheck size={40} />
          {error && (
             <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></div>
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">App Locked</h1>
        <p className="text-slate-500 dark:text-slate-400 text-center mb-8 text-sm max-w-[200px] leading-relaxed">
          Please enter your admin password to continue.
        </p>

        <form onSubmit={handleSubmit} className="w-full relative">
          <input
            type="password"
            autoFocus
            value={password}
            inputMode="text"
            onChange={(e) => {
                setPassword(e.target.value);
                if(error) setError(false);
            }}
            disabled={isChecking}
            className={`w-full text-center tracking-[0.5em] font-mono text-2xl p-4 border-2 rounded-xl outline-none transition-all ${
                error ? 'border-red-500 bg-red-50 dark:bg-red-900/10 text-red-700' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white'
            }`}
            placeholder="••••"
          />
          
          <div className="h-6 mt-2 flex items-center justify-center">
              {error && <p className="text-red-500 text-xs font-bold animate-in slide-in-from-top-1">Incorrect password</p>}
          </div>

          <button 
            type="submit" 
            disabled={isChecking || !password}
            className={`mt-4 w-full text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] ${
                isChecking || !password ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isChecking ? 'Verifying...' : 'Unlock App'}
            {!isChecking && <ArrowRight size={20} />}
          </button>
        </form>
        
        <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
            <Info size={14} />
            <span>Secured by Local Auth</span>
        </div>
      </div>
    </div>
  );
};
