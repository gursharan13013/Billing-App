import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { subscribeToSyncStatus, SyncStatus, forceSyncAndReinit, getIsCloudSyncEnabled } from '../../services/syncEngine';

export const SyncStatusIcon: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus>('Synced');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'info' | 'error' | 'success'>('info');

  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((newStatus) => {
      setStatus(newStatus);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === 'Syncing') return;

    try {
      const isEnabled = await getIsCloudSyncEnabled();
      if (!isEnabled) {
        console.log("SYNC_DEBUG: SyncStatusIcon click handler: Cloud Sync is disabled. Presenting modal.");
        setModalType('info');
        setModalTitle('Cloud Sync is Disabled');
        setModalMessage('Your application is current running in Pure Local Offline Mode. All ledger bookkeeping, invoicing elements, and client lists are saved safely inside your device storage.\n\nTo synchronize and backup your records to our secure Firebase Cloud servers automatically, please activate Cloud Sync under Settings.');
        setShowInfoModal(true);
        setStatus('Pure Local Offline Mode Active');
        return;
      }

      setStatus('Syncing');
      console.log("SYNC_DEBUG: Sync icon clicked. Triggering re-initialization and sync.");
      await forceSyncAndReinit();
      console.log("SYNC_DEBUG: Re-initialization and Sync complete successfully!");
      
      setModalType('success');
      setModalTitle('Sync Successful');
      setModalMessage('Your local offline database records have been fully synchronized with your active Firebase Cloud account.');
      setShowInfoModal(true);
    } catch (err: any) {
      if (err?.message && err.message.includes('Sync is disabled')) {
        console.log("SYNC_DEBUG: Handled sync-disabled checking gracefully.");
        setModalType('info');
        setModalTitle('Cloud Sync is Disabled');
        setModalMessage('Your application is running in local offline mode. Activate Cloud Sync under Settings to synchronize records.');
        setShowInfoModal(true);
        setStatus('Pure Local Offline Mode Active');
      } else {
        console.error("SYNC_DEBUG: SyncStatusIcon click handler error during forced Sync/Reinit:", err);
        setModalType('error');
        setModalTitle('Sync Process Blocked');
        setModalMessage(err?.message || String(err));
        setShowInfoModal(true);
        setStatus('Offline');
      }
    }
  };

  const isLocalMode = status === 'Pure Local Offline Mode Active';

  return (
    <>
      {status === 'Syncing' && (
        <button 
          onClick={handleClick}
          className="p-1.5 rounded-lg bg-slate-800/60 text-yellow-400 hover:text-yellow-300 hover:bg-slate-800 transition-colors flex items-center justify-center shadow-sm"
          title="Cloud Syncing..."
        >
          <RefreshCw size={16} className="animate-spin" />
        </button>
      )}

      {status === 'Offline' && (
        <button 
          onClick={handleClick}
          className="p-1.5 rounded-lg bg-slate-800/60 text-slate-500 hover:text-slate-400 hover:bg-slate-800 transition-colors flex items-center justify-center shadow-sm"
          title="Offline Mode (Click to retry)"
        >
          <CloudOff size={16} />
        </button>
      )}

      {isLocalMode && (
        <button 
          onClick={handleClick}
          className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400 hover:text-slate-300 hover:bg-slate-800 transition-colors flex items-center justify-center shadow-sm"
          title="Pure Local Offline Mode. Click for details."
        >
          <CloudOff size={16} />
        </button>
      )}

      {status !== 'Syncing' && status !== 'Offline' && !isLocalMode && (
        <button 
          onClick={handleClick}
          className="p-1.5 rounded-lg bg-slate-800/60 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition-all flex items-center justify-center animate-pulse shadow-sm"
          title="Cloud Synced ✅ Click to Force Sync"
        >
          <Cloud size={16} />
        </button>
      )}

      {/* Elegant accessible custom modal details popup */}
      {showInfoModal && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm transition-all animate-fade-in"
          onClick={() => setShowInfoModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative text-left animate-scale-up text-slate-800 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowInfoModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-4 pr-6">
              <div className="mt-1">
                {modalType === 'success' && (
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-xl">
                    <CheckCircle size={22} />
                  </div>
                )}
                {modalType === 'error' && (
                  <div className="p-2 bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded-xl">
                    <AlertTriangle size={22} />
                  </div>
                )}
                {modalType === 'info' && (
                  <div className="p-2 bg-slate-500/10 text-slate-600 dark:text-slate-400 rounded-xl">
                    <Info size={22} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
                  {modalTitle}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-wrap font-sans">
                  {modalMessage}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold leading-none select-none text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-98 transition-all"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
