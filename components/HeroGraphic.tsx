import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface HeroGraphicProps {
  qrData?: string;
  mobile?: string;
  formattedDate: string;
}

export const HeroGraphic: React.FC<HeroGraphicProps> = ({ qrData, mobile, formattedDate }) => {
  const [showQR, setShowQR] = useState(localStorage.getItem('showDashboardQR') !== 'false');

  useEffect(() => {
    const handleStorageChange = () => {
        setShowQR(localStorage.getItem('showDashboardQR') !== 'false');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (showQR) {
    return (
      <div className="flex flex-col items-center justify-center mb-6 w-full max-w-sm mx-auto">
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-xl flex flex-col items-center w-full max-w-[200px] mt-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ 
                backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', 
                backgroundSize: '8px 8px' 
            }}></div>
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-blue-500 rounded-full blur-3xl opacity-20"></div>

              <div className="p-2 bg-white rounded-xl shadow-inner z-10 relative">
                  <QRCodeSVG value={qrData || ''} size={140} />
              </div>
              <h2 className="text-sm font-extrabold mt-3 text-white tracking-widest z-10">
                  {mobile ? `+91 ${mobile}` : 'Update Profile'}
              </h2>
          </div>
          <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold px-4 py-1.5 rounded-full mt-4 shadow-sm border border-blue-200 dark:border-blue-800">
              {formattedDate}
          </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center mb-5 w-full max-w-sm mx-auto pt-6">
        <div className="relative w-36 h-36 flex items-center justify-center z-10">
             <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-2xl overflow-visible">
                {/* Shadow underneath */}
                <ellipse cx="60" cy="110" rx="40" ry="10" fill="rgba(0,0,0,0.15)" className="dark:fill-black/30" stroke="none" />
                
                {/* Dark grey rounded square base */}
                <rect x="30" y="35" width="60" height="60" rx="12" fill="#1E293B" className="dark:fill-slate-800" strokeWidth="1" stroke="#334155" />
                
                {/* Orange Swoosh (background part) */}
                <path d="M 20 70 C 15 100, 55 110, 80 90" fill="none" stroke="#EA580C" strokeWidth="8" strokeLinecap="round" />

                {/* Orange Document Outline */}
                <path d="M 30 15 L 70 15 L 90 35 L 90 85 A 6 6 0 0 1 84 91 L 30 91 A 6 6 0 0 1 24 85 L 24 21 A 6 6 0 0 1 30 15 Z" fill="#ffffff" stroke="#f97316" strokeWidth="8" strokeLinejoin="round" className="dark:fill-slate-900" />
                
                {/* Fold Outline */}
                <path d="M 70 15 L 70 35 L 90 35" fill="#ffedd5" stroke="#f97316" strokeWidth="8" strokeLinejoin="round" className="dark:fill-slate-800" />

                {/* Dark Grey Lines */}
                <rect x="36" y="32" width="22" height="6" rx="3" fill="#4B5563" className="dark:fill-slate-600" strokeWidth="0" />
                <rect x="36" y="46" width="35" height="6" rx="3" fill="#4B5563" className="dark:fill-slate-600" strokeWidth="0" />
                <rect x="36" y="60" width="35" height="6" rx="3" fill="#4B5563" className="dark:fill-slate-600" strokeWidth="0" />
                <rect x="36" y="74" width="25" height="6" rx="3" fill="#4B5563" className="dark:fill-slate-600" strokeWidth="0" />

                {/* Orange Swoosh (foreground part) */}
                <path d="M 80 90 C 105 70, 115 35, 95 15" fill="none" stroke="#f97316" strokeWidth="8" strokeLinecap="round" />

                {/* Orange Checkmark */}
                <path d="M 36 50 L 48 68 L 84 28" stroke="#f97316" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg" />
                {/* Inner highlight for 3D effect on checkmark */}
                <path d="M 36 50 L 48 68 L 84 28" stroke="#ffedd5" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
             </svg>
        </div>
        <h2 className="text-4xl font-extrabold -mt-2 flex items-center justify-center tracking-tighter drop-shadow-sm z-10 relative">
             <span className="text-[#ea580c] drop-shadow-md">Eazy</span> 
             <span className="ml-2 text-slate-800 dark:text-slate-200 drop-shadow-md">Billing</span>
        </h2>
    </div>
  );
};
