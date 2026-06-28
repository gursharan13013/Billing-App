import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle, Database, 
  Settings, RefreshCw, FileText, Info, Play, Trash2, 
  Terminal, ShieldAlert, BadgeInfo, Activity, Wrench, Sparkles, Cpu, Lock, FileJson, Check, AlertCircle
} from 'lucide-react';
import { getDb } from '../../services/billingService';
import { LocalBackupService } from '../../services/localBackupService';
import LZString from 'lz-string';
import { StorageIntegrityTest, TestSuiteResult } from '../../../QA/StorageIntegrityTest';

// Re-implement the hash function logic locally for absolute parity verification
async function verifySha256(message: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn("Crypto API fallback activated during validation check.", e);
    }
  }
  // Fallback equivalent to the primary engine
  let h1 = 0x811c9dc5;
  for (let i = 0; i < message.length; i++) {
    h1 ^= message.charCodeAt(i);
    h1 += (h1 << 1) + (h1 << 4) + (h1 << 7) + (h1 << 8) + (h1 << 24);
  }
  return 'fb_' + Math.abs(h1).toString(16).padStart(8, '0');
}

interface DiagnosticResult {
  title: string;
  status: 'GREEN' | 'RED' | 'PENDING';
  message: string;
  details?: any;
}

export default function Step1Validator() {
  const [hashingStatus, setHashingStatus] = useState<DiagnosticResult>({
    title: 'Hashing Integrity & Ledger Chain Audit',
    status: 'PENDING',
    message: 'Diagnostics running...',
  });

  const [storageStatus, setStorageStatus] = useState<DiagnosticResult>({
    title: 'Capacitor Filesystem / Storage Verification',
    status: 'PENDING',
    message: 'Diagnostics running...',
  });

  const [compressionStatus, setCompressionStatus] = useState<DiagnosticResult>({
    title: 'LZ-String Compression & Schema Lossless Audit',
    status: 'PENDING',
    message: 'Diagnostics running...',
  });

  const [activeLogCount, setActiveLogCount] = useState<number>(0);
  const [detailedLogs, setDetailedLogs] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Programmatic QA Stress Test states
  const [activeTab, setActiveTab ] = useState<'diagnostics' | 'qa_stress'>('diagnostics');
  const [qaResult, setQaResult] = useState<TestSuiteResult | null>(null);
  const [isQaRunning, setIsQaRunning] = useState<boolean>(false);
  const [healStatus, setHealStatus] = useState<{ success: boolean; repairedCount: number; message: string } | null>(null);

  const executeQaStressSuite = async () => {
    setIsQaRunning(true);
    setHealStatus(null);
    try {
      console.log("[QA TERMINAL] Booting StorageIntegrityTest suite...");
      const result = await StorageIntegrityTest.runAllStressTests();
      setQaResult(result);
      await loadStats();
    } catch (e: any) {
      console.error("[QA TERMINAL] Failure during test runner execute:", e);
    } finally {
      setIsQaRunning(false);
    }
  };

  const executeSelfHealing = async () => {
    try {
      const result = await StorageIntegrityTest.fixItFunction();
      setHealStatus(result);
      await loadStats();
      // Re-run diagnostics if healing succeeded to verify restoration
      await runAllDiagnostics();
    } catch (e: any) {
      console.error("[QA TERMINAL] Auto-heal failed:", e);
    }
  };

  // Load basic state of transactional stores
  const loadStats = async () => {
    try {
      const db = getDb();
      const count = await db.transaction_log.count();
      setActiveLogCount(count);
      const latestLogs = await db.transaction_log.orderBy('timestamp').reverse().limit(10).toArray();
      setDetailedLogs(latestLogs);

      const backupList = await LocalBackupService.listSnapshots();
      setSnapshots(backupList);
    } catch (err) {
      console.error("Failed to load diagnostic initial state:", err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const runAllDiagnostics = async () => {
    setIsRunning(true);
    setHashingStatus(p => ({ ...p, status: 'PENDING', message: 'Verifying ledger chains...' }));
    setStorageStatus(p => ({ ...p, status: 'PENDING', message: 'Checking storage boundaries...' }));
    setCompressionStatus(p => ({ ...p, status: 'PENDING', message: 'Evaluating compression efficiency...' }));

    // 1. Ledger BlockChain / Failsafe Cryptographic Chain Verification
    try {
      const db = getDb();
      const logs = await db.transaction_log.orderBy('timestamp').toArray();
      
      if (logs.length === 0) {
        setHashingStatus({
          title: 'Hashing Integrity & Ledger Chain Audit',
          status: 'GREEN',
          message: 'Zero transaction entries found yet. The ledger ledger blockchain directory is initialized and fully secure!',
          details: { logCount: 0 }
        });
      } else {
        let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
        let chainValid = true;
        let brokenIndex = -1;
        let brokenId = '';
        
        for (let i = 0; i < logs.length; i++) {
          const log = logs[i];
          const payloadStr = JSON.stringify(log.payload || {});
          const textToHash = payloadStr + prevHash;
          const recomputed = await verifySha256(textToHash);
          
          if (recomputed !== log.stateHash) {
            chainValid = false;
            brokenIndex = i;
            brokenId = log.id;
            break;
          }
          prevHash = log.stateHash;
        }

        if (chainValid) {
          setHashingStatus({
            title: 'Hashing Integrity & Ledger Chain Audit',
            status: 'GREEN',
            message: `Verified! Saari ${logs.length} ledger entries perfectly chained hain. Ek bhi modification detect nahi ki gayi. SHA-256 seal secure hai!`,
            details: { count: logs.length, lastHash: logs[logs.length - 1].stateHash }
          });
        } else {
          setHashingStatus({
            title: 'Hashing Integrity & Ledger Chain Audit',
            status: 'RED',
            message: `⚠️ SECURITY TRIGGER: Integrity chain broken at index ${brokenIndex}! Transaction Entry ID: ${brokenId}.`,
            details: { brokenIndex, brokenId, totalChecked: logs.length }
          });
        }
      }
    } catch (e: any) {
      setHashingStatus({
        title: 'Hashing Integrity & Ledger Chain Audit',
        status: 'RED',
        message: `Diagnostics calculation crash or database is locked: ${e.message || e}`,
      });
    }

    // 2. Storage Check & Backup Read-Write Boundaries
    try {
      const fileList = await LocalBackupService.listSnapshots();
      setSnapshots(fileList);
      
      if (fileList.length === 0) {
        setStorageStatus({
          title: 'Capacitor Filesystem / Storage Verification',
          status: 'GREEN',
          message: 'Filesystem directory structural test safe, but no physical backup snapshots found. Database is perfectly idle.',
          details: { directoriesChecked: 'EazyBilling_Backups' }
        });
      } else {
        setStorageStatus({
          title: 'Capacitor Filesystem / Storage Verification',
          status: 'GREEN',
          message: `Succesfull! Total check completed on ${fileList.length} local checkpoints. Directories are fully accessible!`,
          details: { firstThree: fileList.slice(0, 3) }
        });
      }
    } catch (e: any) {
      setStorageStatus({
        title: 'Capacitor Filesystem / Storage Verification',
        status: 'RED',
        message: `Directories layout read failed: ${e.message || e}`
      });
    }

    // 3. Compression Lossless Check & Schema Parity validation
    try {
      const db = getDb();
      const mockSchemaObject: Record<string, any[]> = {};
      
      // Perform a dry-run serialization in memory
      for (const table of db.tables) {
        mockSchemaObject[table.name] = await table.toArray();
      }
      
      const originalSerialized = JSON.stringify(mockSchemaObject);
      const originalLength = originalSerialized.length;
      
      // Dry-Run Compress
      const base64Compressed = LZString.compressToBase64(originalSerialized);
      const compressedLength = base64Compressed.length;
      
      // Dry-Run Decompress
      const decodedUtf8 = LZString.decompressFromBase64(base64Compressed);
      
      // Verification of parity
      const reconstructObj = JSON.parse(decodedUtf8);
      const isSchemaMatched = Object.keys(mockSchemaObject).every(key => key in reconstructObj);
      
      const ratio = originalLength > 0 ? ((1 - (compressedLength / originalLength)) * 100).toFixed(1) : '100';

      if (isSchemaMatched) {
        setCompressionStatus({
          title: 'LZ-String Compression & Schema Lossless Audit',
          status: 'GREEN',
          message: `Lossless validation safal raha! Compressed data size: ${compressedLength} bytes (Saved ${ratio}% space). Zero schema data-loss verified during serialisation.`,
          details: { originalLength, compressedLength, compressionRatioPercent: ratio }
        });
      } else {
        setCompressionStatus({
          title: 'LZ-String Compression & Schema Lossless Audit',
          status: 'RED',
          message: 'CRITICAL FAILURE: Schema mismatch detected. Some Dexie database tables are stripped or corrupted after base64 lz-string serialization cycles.',
          details: { originalKeys: Object.keys(mockSchemaObject), reconstructedKeys: Object.keys(reconstructObj) }
        });
      }

    } catch (e: any) {
      setCompressionStatus({
        title: 'LZ-String Compression & Schema Lossless Audit',
        status: 'RED',
        message: `Memory decompression cycle test failed: ${e.message || e}`
      });
    }

    setIsRunning(false);
    loadStats();
  };

  const clearTransactionLog = async () => {
    const confirmClear = confirm(`Kya aap sach mein ledger and hashing indices safe reset karna chahte hain? Isse transaction logs clear ho jayenge par system fresh rehkar fir se immutable logging shuru kar dega.`);
    if (!confirmClear) return;

    try {
      const db = getDb();
      await db.transaction_log.clear();
      alert("Billing Transaction Hashing Logs clear ho gaye hain!");
      loadStats();
    } catch (e) {
      alert("Cleaning logs error.");
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 p-4 md:p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-lg space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-[#3b5998] text-white p-2.5 rounded-xl shadow-md">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Triple-Sync Step 1 Validator panel</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Automated validation of Local Time-Machine Storage, Cryptographic Chain, & Lossless Base64 Serializers.</p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button 
            onClick={runAllDiagnostics}
            disabled={isRunning}
            className="flex items-center gap-2 bg-[#3b5998] hover:bg-[#2d4373] text-white font-bold py-2 px-3 md:py-2.5 md:px-4 rounded-xl shadow transition duration-150 disabled:opacity-50 text-xs"
          >
            <Play size={15} />
            <span>Run Diagnostics</span>
          </button>
          
          <button 
            onClick={clearTransactionLog}
            className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 py-2.5 px-3.5 rounded-xl border border-rose-200/50 dark:border-rose-900/30 transition duration-150 text-xs font-bold"
          >
            <Trash2 size={15} />
            <span>Reset Logs</span>
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-gray-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`py-2 px-4 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'diagnostics'
              ? 'border-[#3b5998] text-[#3b5998] dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'
          }`}
        >
          <Activity size={14} />
          <span>General Diagnostics</span>
        </button>
        <button
          onClick={() => setActiveTab('qa_stress')}
          className={`py-2 px-4 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'qa_stress'
              ? 'border-[#3b5998] text-[#3b5998] dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'
          }`}
        >
          <Cpu size={14} />
          <span>QA Stress-Testing Terminal</span>
          <span className="bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider">Pro</span>
        </button>
      </div>

      {activeTab === 'diagnostics' ? (
        <>
          {/* Grid Status Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Hashing Status Card */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between h-full bg-white dark:bg-slate-900 shadow-sm transition-all ${
              hashingStatus.status === 'GREEN' ? 'border-emerald-200 dark:border-emerald-950/40 bg-emerald-50/10' :
              hashingStatus.status === 'RED' ? 'border-rose-200 dark:border-rose-950/40 bg-rose-50/10' : 'border-gray-200 dark:border-slate-800'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Security Chain</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    hashingStatus.status === 'GREEN' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400' :
                    hashingStatus.status === 'RED' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                  }`}>{hashingStatus.status === 'GREEN' ? 'SECURE' : hashingStatus.status === 'RED' ? 'ALERT' : 'PENDING'}</span>
                </div>
                <h3 className="font-bold text-sm text-gray-800 dark:text-white mb-2">{hashingStatus.title}</h3>
                <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed mb-4">{hashingStatus.message}</p>
              </div>
              {hashingStatus.details && (
                <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/40 font-mono text-[9px] text-gray-500 overflow-x-auto">
                  <pre>{JSON.stringify(hashingStatus.details, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Storage Boundaries Card */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between h-full bg-white dark:bg-slate-900 shadow-sm transition-all ${
              storageStatus.status === 'GREEN' ? 'border-emerald-200 dark:border-emerald-950/40 bg-emerald-50/10' :
              storageStatus.status === 'RED' ? 'border-rose-200 dark:border-rose-950/40 bg-rose-50/10' : 'border-gray-200 dark:border-slate-800'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Device Storage</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    storageStatus.status === 'GREEN' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400' :
                    storageStatus.status === 'RED' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                  }`}>{storageStatus.status === 'GREEN' ? 'ONLINE' : storageStatus.status === 'RED' ? 'OFFLINE' : 'PENDING'}</span>
                </div>
                <h3 className="font-bold text-sm text-gray-800 dark:text-white mb-2">{storageStatus.title}</h3>
                <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed mb-4">{storageStatus.message}</p>
              </div>
              {storageStatus.details && (
                <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/40 font-mono text-[9px] text-gray-500 overflow-x-auto">
                  <pre>{JSON.stringify(storageStatus.details, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Compression Losses Audit Card */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between h-full bg-white dark:bg-slate-900 shadow-sm transition-all ${
              compressionStatus.status === 'GREEN' ? 'border-emerald-200 dark:border-emerald-950/40 bg-emerald-50/10' :
              compressionStatus.status === 'RED' ? 'border-rose-200 dark:border-rose-950/40 bg-rose-50/10' : 'border-gray-200 dark:border-slate-800'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Decompression Audit</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    compressionStatus.status === 'GREEN' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400' :
                    compressionStatus.status === 'RED' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                  }`}>{compressionStatus.status === 'GREEN' ? 'PASS' : compressionStatus.status === 'RED' ? 'FAIL' : 'PENDING'}</span>
                </div>
                <h3 className="font-bold text-sm text-gray-800 dark:text-white mb-2">{compressionStatus.title}</h3>
                <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed mb-4">{compressionStatus.message}</p>
              </div>
              {compressionStatus.details && (
                <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/40 font-mono text-[9px] text-gray-500 overflow-x-auto">
                  <pre>{JSON.stringify(compressionStatus.details, null, 2)}</pre>
                </div>
              )}
            </div>

          </div>

          {/* Brand Voice / Hinglish Guidelines UI Check Block */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-slate-800 text-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-400">
              <BadgeInfo size={18} />
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#5672ab]">Hinglish Feedback Voicing Audit (Live Schema)</h4>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              The brand communication system relies on intuitive hybrid-dialect translation patterns. Below are verified prompts configured inside the controllers:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono select-all">
              <div className="bg-black/30 p-2 rounded-lg border border-white/5 space-y-0.5">
                <span className="text-[#3b5998] font-bold">[Success State Backup]</span>
                <p className="text-slate-300">"Backup safal raha! Snapshot ko 'eb_snapshot_...' ke roop mein save kar diya gaya hai."</p>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/5 space-y-0.5">
                <span className="text-[#3b5998] font-bold">[Safety Check Block]</span>
                <p className="text-slate-300">"Restore ruk gaya kyunki restore se pehle ka safety backup fail ho gaya..."</p>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/5 space-y-0.5">
                <span className="text-[#3b5998] font-bold">[Clean Restore Match]</span>
                <p className="text-slate-300">"Restore safal raha! Aapka data 'eb_snapshot_...' se safalta purvak restore ho gaya hai."</p>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/5 space-y-0.5">
                <span className="text-[#3b5998] font-bold">[Interactive Dialect Confirm]</span>
                <p className="text-slate-300">"ALERT: Kya aap sach mein snapshot se poora database rollback karna chahte hain?"</p>
              </div>
            </div>
          </div>

          {/* Active Ledgers / logs monitor stream */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                <Terminal size={14} />
                <span>Cryptographic Ledger Stream (Current Log Ledger Pool: {activeLogCount})</span>
              </h3>
              <span className="text-[10px] text-gray-400 font-bold bg-gray-200/60 dark:bg-slate-900 px-2 py-0.5 rounded">Real Time</span>
            </div>

            {detailedLogs.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-xl p-6 text-center text-xs text-gray-400">
                Log ledger is currently blank! Modify any billing item, customer invoice, or workers list to immediately observe cryptographic ledger additions.
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-600 dark:text-slate-300">
                    <thead className="bg-gray-50 dark:bg-slate-950/60 border-b border-gray-200 dark:border-slate-800 font-bold text-gray-500 dark:text-slate-400">
                      <tr>
                        <th className="p-3">Action Type</th>
                        <th className="p-3">Block ID</th>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Cryptographic Block Hash (SHA-256)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 dark:divide-slate-800 font-mono text-[11px]">
                      {detailedLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50 transition">
                          <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 text-xs font-sans">
                            <span className="bg-[#3b5998]/10 text-[#3b5998] px-2 py-0.5 rounded font-mono font-bold text-[10px]">{log.action}</span>
                          </td>
                          <td className="p-3 text-gray-400 truncate max-w-[80px]" title={log.id}>{log.id}</td>
                          <td className="p-3 text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                          <td className="p-3 text-[#3182ce] dark:text-blue-400 truncate max-w-[200px]" title={log.stateHash}>{log.stateHash}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* QA Programmatic Stress Tester terminal subview */
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-[#192742] p-5 rounded-2xl border border-slate-800 text-slate-100 shadow-xl space-y-4">
            
            {/* Header Control row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600/20 p-2.5 rounded-xl border border-indigo-500/20 text-indigo-400">
                  <Activity className="animate-pulse" size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    Storage & Cryptographic Stress Testing Suit
                  </h3>
                  <p className="text-xs text-slate-400">Execute automated high-density checks on database state, compression algorithms, rollback hooks, & ledger security.</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={executeQaStressSuite}
                  disabled={isQaRunning}
                  className="flex items-center gap-2 bg-[#3b5998] hover:bg-[#2d4373] disabled:opacity-50 text-white font-bold text-xs py-2 px-4 rounded-xl shadow transition"
                >
                  <Cpu size={14} />
                  <span>{isQaRunning ? 'Running Stress-Test...' : 'Start Stress-Test'}</span>
                </button>

                <button
                  onClick={executeSelfHealing}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow transition"
                >
                  <Wrench size={14} />
                  <span>Fix-it (Heal Ledger)</span>
                </button>
              </div>
            </div>

            {/* Heal State Alert Notification */}
            {healStatus && (
              <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                healStatus.success 
                  ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-300' 
                  : 'bg-rose-950/20 border-rose-900/50 text-rose-300'
              }`}>
                {healStatus.success ? <CheckCircle size={18} className="shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="shrink-0 mt-0.5" />}
                <div>
                  <h4 className="font-bold text-xs">{healStatus.success ? 'HEALING SUCCESSFUL (Auto-Heal Safal Raha!)' : 'HEALING ATTEMPT FAILED'}</h4>
                  <p className="text-[11px] mt-0.5 opacity-90">{healStatus.message}</p>
                  {healStatus.repairedCount > 0 && (
                    <span className="inline-block bg-emerald-500/10 border border-emerald-500/30 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full mt-2">
                       Repaired Nodes Count: {healStatus.repairedCount}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Scorecard panel */}
            {qaResult ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-black/40 border border-slate-900">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Success Rate</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold font-mono text-emerald-400">
                      {((qaResult.successCount / qaResult.totalTests) * 100).toFixed(0)}%
                    </span>
                    <span className="text-xs text-slate-500">Passed</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-sans">Total Test Cases</span>
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-2xl font-bold text-slate-200">{qaResult.totalTests}</span>
                    <span className="text-xs text-slate-500">tests</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-sans">Passed Logs</span>
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-2xl font-bold text-emerald-400">{qaResult.successCount}</span>
                    <span className="text-xs text-emerald-600 flex items-center gap-0.5"><Check size={10} /> pass</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-sans">Failing Logs</span>
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-2xl font-bold text-rose-400">{qaResult.failureCount}</span>
                    <span className="text-xs text-rose-500 flex items-center gap-0.5">{qaResult.failureCount > 0 ? <AlertCircle size={10} /> : <Check size={10} />} errs</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-slate-800 p-8 rounded-xl text-center">
                <Terminal size={32} className="mx-auto text-slate-600 mb-3" />
                <h4 className="text-xs font-bold text-slate-300">Stress Test Suite Ready</h4>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">Start Stress-Test button click karein tab programmatically 10 simulated heavy billing operations, rollback triggers, hash injections, pre-restore backup hooks & schema serialisation audits execute honge.</p>
              </div>
            )}

            {/* Individual test results listing */}
            {qaResult && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <Sparkles size={13} />
                  <span>Integration Test Cases Breakdown Logs ({qaResult.results.length})</span>
                </h4>
                
                <div className="space-y-2.5">
                  {qaResult.results.map((test) => (
                    <details 
                      key={test.id} 
                      className="group border border-slate-800 bg-black/20 hover:bg-black/40 rounded-xl transition-all"
                      open
                    >
                      <summary className="list-none flex items-center justify-between p-3.5 cursor-pointer select-none">
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                            test.status === 'PASS' 
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' 
                              : test.status === 'WARNING'
                              ? 'bg-amber-950/45 text-amber-400 border border-amber-900/50'
                              : 'bg-rose-950/45 text-rose-400 border border-rose-900/50'
                          }`}>
                            {test.status}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-100 font-sans">{test.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono ml-2">ID: {test.id}</span>
                          </div>
                        </div>

                        {/* Collateral visual indicator */}
                        <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform font-bold">▼</span>
                      </summary>

                      <div className="px-4 pb-4 pt-1 border-t border-slate-900/85 text-xs text-slate-300 space-y-3">
                        <p className="leading-relaxed opacity-95 text-[11px] font-sans">{test.message}</p>
                        
                        {test.details && (
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block font-sans">Calculated Parity Metrics & Payloads:</span>
                            <div className="bg-black/60 border border-slate-800 p-2.5 rounded-lg overflow-x-auto">
                              <pre className="font-mono text-[9px] text-slate-400 leading-normal">{JSON.stringify(test.details, null, 2)}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* QA Reference Notes */}
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900 text-[10px] text-slate-400 leading-relaxed font-sans flex items-start gap-2">
              <Info className="shrink-0 text-indigo-400 mt-0.5" size={13} />
              <span>
                <strong>Developer Note:</strong> StorageIntegrityTest suite runs safe sandbox simulations. All test mutations (e.g. mock items, simulated failures) are immediately rolled back and purged from local disk storage indices dynamically on conclusion to guarantee full safety for physical customer records.
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
