import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { subscribeToSyncStatus, SyncStatus, forceSyncAndReinit } from '../src/infrastructure/SyncEngine';

export const SyncStatusIcon: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus>('Synced');

  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((newStatus) => {
      setStatus(newStatus);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status !== 'Syncing') {
      setStatus('Syncing');
      console.log("SYNC_DEBUG: Sync icon clicked. Triggering re-initialization and sync.");
      forceSyncAndReinit()
        .then(() => {
          console.log("SYNC_DEBUG: Re-initialization and Sync complete successfully!");
        })
        .catch((err) => {
          console.error("SYNC_DEBUG: SyncStatusIcon click handler error during forced Sync/Reinit:", err);
          alert("Sync block/error detected: " + (err?.message || String(err)));
        });
    }
  };

  if (status === 'Syncing') {
    return (
      <button 
        onClick={handleClick}
        className="p-1.5 rounded-lg bg-slate-800/60 text-yellow-400 hover:text-yellow-300 hover:bg-slate-800 transition-colors flex items-center justify-center"
        title="Cloud Syncing..."
      >
        <RefreshCw size={16} className="animate-spin" />
      </button>
    );
  }

  if (status === 'Offline') {
    return (
      <button 
        onClick={handleClick}
        className="p-1.5 rounded-lg bg-slate-800/60 text-slate-500 hover:text-slate-400 hover:bg-slate-800 transition-colors flex items-center justify-center"
        title="Sync Offline / Connected Offline"
      >
        <CloudOff size={16} />
      </button>
    );
  }

  return (
    <button 
      onClick={handleClick}
      className="p-1.5 rounded-lg bg-slate-800/60 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition-all flex items-center justify-center animate-pulse"
      title="Cloud Synced ✅ Click to Force Sync"
    >
      <Cloud size={16} />
    </button>
  );
};
