import { getDb, setSuppressBillingHooks } from './billingService';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import LZString from 'lz-string';
import { googleAuthService } from './googleAuthService';
import { GoogleDriveService } from './googleDriveService';

const BACKUP_FOLDER = 'EazyBilling_Backups';

export interface BackupResult {
  success: boolean;
  message: string;
  filePath?: string;
}

export const LocalBackupService = {
  // Ensure the native directory EazyBilling_Backups exists
  ensureBackupDirectory: async (): Promise<boolean> => {
    try {
      await Filesystem.mkdir({
        path: BACKUP_FOLDER,
        directory: Directory.Documents,
        recursive: true
      });
      return true;
    } catch (e: any) {
      // mkdir fails on duplicate folders; safe to ignore
      return true;
    }
  },

  // Export full Dexie database as a compressed JSON string and save
  createSnapshot: async (optionalSuffix: string = '', skipDownload: boolean = false): Promise<BackupResult> => {
    try {
      const db = getDb();
      const exportObject: Record<string, any[]> = {};
      
      // Dynamically scan and serialize all current tables
      for (const table of db.tables) {
        exportObject[table.name] = await table.toArray();
      }
      
      const jsonString = JSON.stringify(exportObject);
      const compressedData = LZString.compressToBase64(jsonString);
      
      // Timestamp filename format: eb_snapshot_YYYY-MM-DD_HHmmss.json
      const now = new Date();
      const formatNum = (num: number) => String(num).padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${formatNum(now.getMonth() + 1)}-${formatNum(now.getDate())}`;
      const timeStr = `${formatNum(now.getHours())}${formatNum(now.getMinutes())}${formatNum(now.getSeconds())}`;
      
      const suffix = optionalSuffix ? `_${optionalSuffix}` : '';
      const filename = `eb_snapshot_${dateStr}_${timeStr}${suffix}.json`;
      
      try {
        await LocalBackupService.ensureBackupDirectory();
        const fullPath = `${BACKUP_FOLDER}/${filename}`;
        
        await Filesystem.writeFile({
          path: fullPath,
          data: compressedData,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        
        // Remove from deleted blacklist if it was somehow marked as deleted
        try {
          const deletedList = JSON.parse(localStorage.getItem('eb_deleted_snapshots') || '[]');
          const updatedDeleted = deletedList.filter((name: string) => name !== filename);
          localStorage.setItem('eb_deleted_snapshots', JSON.stringify(updatedDeleted));
        } catch (e) {}

        // Also sync to browser index for absolute robust fallback listing in desktop/iframe
        try {
          const list = JSON.parse(localStorage.getItem('eb_browser_snapshots') || '[]');
          list.push({ filename, data: compressedData });
          localStorage.setItem('eb_browser_snapshots', JSON.stringify(list));
        } catch (lsErr) {}

        // Google Drive integration auto-sync
        const isTempBackup = optionalSuffix.includes('prerestore') || optionalSuffix.includes('qa') || optionalSuffix.includes('test') || optionalSuffix.includes('checkpoint');
        if (googleAuthService.isConnected() && !isTempBackup) {
          setTimeout(() => {
            GoogleDriveService.uploadSnapshotToDrive(filename).catch(err => {
              console.warn("Auto-sync automatic upload fail:", err);
            });
          }, 100);
        }

        return {
          success: true,
          message: googleAuthService.isConnected() && !isTempBackup
            ? `Backup safal raha! Snapshot '${filename}' ko native storage aur Google Drive dono mein automatic upload/sync kar diya gaya hai.`
            : `Backup safal raha! Snapshot ko '${filename}' ke roop mein native storage mein save kar diya gaya hai.`,
          filePath: filename
        };
      } catch (nativeErr: any) {
        // Fallback for standard browsers running inside preview/AI Studio
        console.warn("Native Filesystem API not available. Auto-downloading file inside browser:", nativeErr);
        
        if (typeof document !== 'undefined') {
          const isTestOrPrerestore = skipDownload || 
            optionalSuffix.includes('qa') || 
            optionalSuffix.includes('test') || 
            optionalSuffix.includes('prerestore') || 
            optionalSuffix.includes('checkpoint');

          if (!isTestOrPrerestore) {
            try {
              const blob = new Blob([compressedData], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            } catch (downloadErr) {
              console.warn("Browser download blocked by iframe boundaries or security constraints", downloadErr);
            }
          }
          
          // Store locally in browser index to support web listing & instant restores
          try {
            const list = JSON.parse(localStorage.getItem('eb_browser_snapshots') || '[]');
            list.push({ filename, data: compressedData });
            localStorage.setItem('eb_browser_snapshots', JSON.stringify(list));
            
            // Remove from deleted blacklist if recreating
            const deletedList = JSON.parse(localStorage.getItem('eb_deleted_snapshots') || '[]');
            const updatedDeleted = deletedList.filter((name: string) => name !== filename);
            localStorage.setItem('eb_deleted_snapshots', JSON.stringify(updatedDeleted));
          } catch (lsErr) {}

          // Google Drive integration auto-sync
          const isTempBackup = optionalSuffix.includes('prerestore') || optionalSuffix.includes('qa') || optionalSuffix.includes('test') || optionalSuffix.includes('checkpoint');
          if (googleAuthService.isConnected() && !isTempBackup) {
            setTimeout(() => {
              GoogleDriveService.uploadSnapshotToDrive(filename).catch(err => {
                console.warn("Auto-sync web fallback upload fail:", err);
              });
            }, 100);
          }

          return {
            success: true,
            message: isTestOrPrerestore 
              ? `Web Backup safal raha! Snapshot '${filename}' ko local storage index mein save kar diya gaya hai.` 
              : (googleAuthService.isConnected() && !isTempBackup
                  ? `Web Backup safal raha! Snapshot '${filename}' local cache mein save aur aapke Google Drive mein upload ho gaya hai!`
                  : `Web Backup safal raha! Snapshot '${filename}' aapke system par download kar di gai hai!`),
            filePath: filename
          };
        }
        
        throw nativeErr;
      }
    } catch (e: any) {
      console.error("Local Backup Creation Error: ", e);
      return {
        success: false,
        message: `Backup mein galti hui: ${e.message || e || 'Unknown error'}. Kripya dobara koshish karein.`
      };
    }
  },

  // List all available backups
  listSnapshots: async (): Promise<string[]> => {
    try {
      let deletedList: string[] = [];
      try {
        deletedList = JSON.parse(localStorage.getItem('eb_deleted_snapshots') || '[]');
      } catch (e) {}

      await LocalBackupService.ensureBackupDirectory();
      const result = await Filesystem.readdir({
        path: BACKUP_FOLDER,
        directory: Directory.Documents
      });
      
      const nativeFiles = result.files
        .map(file => (typeof file === 'string' ? file : file.name))
        .filter(name => name.startsWith('eb_snapshot_') && name.endsWith('.json'))
        .filter(name => !deletedList.includes(name));
        
      // Combine with local mock browser cache
      let browserSnapshots: string[] = [];
      try {
        const list = JSON.parse(localStorage.getItem('eb_browser_snapshots') || '[]');
        browserSnapshots = list
          .map((item: any) => item.filename)
          .filter((name: string) => !deletedList.includes(name));
      } catch(e) {}
      
      const allFiles = Array.from(new Set([...nativeFiles, ...browserSnapshots]));
      return allFiles.sort((a, b) => b.localeCompare(a));
    } catch (e) {
      console.warn("Failed to read native backups directory, checking browser storage indices...", e);
      try {
        let deletedList: string[] = [];
        try {
          deletedList = JSON.parse(localStorage.getItem('eb_deleted_snapshots') || '[]');
        } catch (err) {}

        const list = JSON.parse(localStorage.getItem('eb_browser_snapshots') || '[]');
        return list
          .map((item: any) => item.filename)
          .filter((name: string) => !deletedList.includes(name))
          .sort((a, b) => b.localeCompare(a));
      } catch(lsErr) {
        return [];
      }
    }
  },

  // Comprehensive safety check and full restore
  restoreFromSnapshot: async (filename: string, rawFileData?: string): Promise<BackupResult> => {
    try {
      // 1. PRE-RESTORE SAFETY CHECK: Take current state backup prior to rollback/restore
      console.log("Pre-restore Safety Check kicking in...");
      const safetyBackupRes = await LocalBackupService.createSnapshot('prerestore', true);
      if (!safetyBackupRes.success) {
        return {
          success: false,
          message: `Restore ruk gaya kyunki restore se pehle ka safety backup fail ho gaya: ${safetyBackupRes.message}`
        };
      }
      
      let compressedFileData = rawFileData;
      
      if (!compressedFileData) {
        // Find in native system first
        try {
          await LocalBackupService.ensureBackupDirectory();
          const rawFile = await Filesystem.readFile({
            path: `${BACKUP_FOLDER}/${filename}`,
            directory: Directory.Documents,
            encoding: Encoding.UTF8
          });
          if (typeof rawFile.data === 'string') {
            compressedFileData = rawFile.data;
          }
        } catch (nativeErr) {
          console.warn("Could not read native, falling back to browser storage cache...", nativeErr);
          try {
            const list = JSON.parse(localStorage.getItem('eb_browser_snapshots') || '[]');
            const found = list.find((item: any) => item.filename === filename);
            if (found) {
              compressedFileData = found.data;
            } else {
              throw new Error(`File system or cache has no backup with name '${filename}'.`);
            }
          } catch(lsErr: any) {
            throw new Error(lsErr.message || `File read error index missing.`);
          }
        }
      }
      
      if (!compressedFileData) {
        throw new Error("File content could not be read.");
      }
      
      // Decompress
      let decompressedData = LZString.decompressFromBase64(compressedFileData);
      if (!decompressedData || decompressedData === '') {
        const testUtf16 = LZString.decompressFromUTF16(compressedFileData);
        decompressedData = (testUtf16 && testUtf16 !== '') ? testUtf16 : compressedFileData;
      }
      
      const importObject = JSON.parse(decompressedData);
      const db = getDb();
      
      // Database restore via single dynamic multi-table transaction with billing hooks suppressed to prevent IndexedDB lockups
      setSuppressBillingHooks(true);
      try {
        await db.transaction('rw', db.tables, async () => {
          for (const table of db.tables) {
            await table.clear();
            const rows = importObject[table.name];
            if (Array.isArray(rows) && rows.length > 0) {
              await table.bulkAdd(rows);
            }
          }
        });
      } finally {
        setSuppressBillingHooks(false);
      }
      
      return {
        success: true,
        message: `Restore safal raha! Aapka data '${filename}' se safalta purvak restore ho gaya hai. Humne safety ke liye current state ka safety backup '${safetyBackupRes.filePath}' bhi bana diya hai.`
      };
      
    } catch (e: any) {
      console.error("Local Restore Error: ", e);
      return {
        success: false,
        message: `Restore mein galti hui: ${e.message || e || 'Unknown error'}. Kripya snapshot file check karein.`
      };
    }
  },

  // Delete dynamic snapshot from system & browser storage cache
  deleteSnapshot: async (filename: string): Promise<BackupResult> => {
    try {
      // Add to deleted blacklist in localStorage to ensure it is immediately hidden on Web
      try {
        const deletedList = JSON.parse(localStorage.getItem('eb_deleted_snapshots') || '[]');
        if (!deletedList.includes(filename)) {
          deletedList.push(filename);
          localStorage.setItem('eb_deleted_snapshots', JSON.stringify(deletedList));
        }
      } catch (e) {
        console.warn("Could not save to eb_deleted_snapshots blacklist:", e);
      }

      // Try native device filesystem removal
      try {
        await Filesystem.deleteFile({
          path: `${BACKUP_FOLDER}/${filename}`,
          directory: Directory.Documents
        });
      } catch (nativeErr) {
        console.warn("Could not delete from native filesystem (expected if running on web):", nativeErr);
      }

      // Try browser cache index removal (fallback storage)
      try {
        const list = JSON.parse(localStorage.getItem('eb_browser_snapshots') || '[]');
        const updatedList = list.filter((item: any) => item.filename !== filename);
        localStorage.setItem('eb_browser_snapshots', JSON.stringify(updatedList));
      } catch (lsErr) {
        console.warn("Failed to remove from browser storage cache:", lsErr);
      }

      return {
        success: true,
        message: `Snapshot '${filename}' ko successfully delete kar diya gaya hai.`
      };
    } catch (e: any) {
      console.error("Local Delete Error: ", e);
      return {
        success: false,
        message: `Delete karne mein galti hui: ${e.message || e || 'Unknown error'}.`
      };
    }
  }
};
