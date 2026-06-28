import { db as firebaseDb, auth } from '../services/firebase';
import { getDb, setSuppressBillingHooks, suppressBillingHooks } from '../services/billingService';
import { BillingService } from '../services/SecureBillingService';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';

export type SyncStatus = 'Syncing' | 'Synced' | 'Offline' | 'Pure Local Offline Mode Active' | 'RE_AUTH_REQUIRED' | string;

type SyncStatusListener = (status: SyncStatus) => void;
let listeners: SyncStatusListener[] = [];
let currentStatus: SyncStatus = 'Synced';
let isSyncing = false;
let activeUnsubscribes: (() => void)[] = [];

let isFirstSyncActivation = false;
let lastEnabledState = false;
let onlineListener: (() => void) | null = null;
let offlineListener: (() => void) | null = null;

export async function getIsCloudSyncEnabled(): Promise<boolean> {
  try {
    const dbInstance = getDb();
    const directSetting = await dbInstance.settings.get('isCloudSyncEnabled');
    if (directSetting !== undefined) {
      return !!directSetting.value;
    }
    const appSettingsDoc = await dbInstance.settings.get('appSettings');
    if (appSettingsDoc !== undefined && appSettingsDoc.value) {
      const val = appSettingsDoc.value.cloudSyncEnabled;
      if (val !== undefined) {
        return !!val;
      }
    }
  } catch (e) {
    console.warn("Could not retrieve cloud sync settings:", e);
  }

  try {
    const localVal = localStorage.getItem('isCloudSyncEnabled');
    if (localVal !== null) {
      return localVal === 'true';
    }
  } catch (e) {}

  return false;
}

export async function setCloudSyncToggle(enabled: boolean): Promise<void> {
  console.log(`SYNC_DEBUG: setCloudSyncToggle invoked with state: ${enabled}`);
  const dbInstance = getDb();
  await dbInstance.settings.put({ key: 'isCloudSyncEnabled', value: enabled });
  try {
    localStorage.setItem('isCloudSyncEnabled', enabled ? 'true' : 'false');
  } catch (e) {}

  // Also keep appSettings.cloudSyncEnabled synced in the DB
  try {
    const s = await dbInstance.settings.get('appSettings');
    const appSettings = s ? s.value : {};
    appSettings.cloudSyncEnabled = enabled;
    await dbInstance.settings.put({ key: 'appSettings', value: appSettings });
  } catch (e) {}

  if (enabled) {
    isFirstSyncActivation = true;
    initializeSyncEngine();
  } else {
    stopPullSync();
    discardWindowListeners();
    setSyncStatus('Pure Local Offline Mode Active');
  }

  // Trigger appSettingsChanged custom event so other views refresh
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('appSettingsChanged'));
  }
}

export function registerWindowListeners() {
  if (typeof window !== 'undefined') {
    discardWindowListeners();
    onlineListener = () => {
      pushToCloud().catch(console.error);
    };
    offlineListener = () => {
      setSyncStatus('Offline');
    };
    window.addEventListener('online', onlineListener);
    window.addEventListener('offline', offlineListener);
  }
}

export function discardWindowListeners() {
  if (typeof window !== 'undefined') {
    if (onlineListener) {
      window.removeEventListener('online', onlineListener);
      onlineListener = null;
    }
    if (offlineListener) {
      window.removeEventListener('offline', offlineListener);
      offlineListener = null;
    }
  }
}

/**
 * Clean data helper that recursively removes undefined fields and converts Date objects to ISO strings
 */
export function cleanData(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanData(item));
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = cleanData(value);
      }
    }
    return cleaned;
  }
  return obj;
}

const getActiveUserId = (): string => {
  try {
    const memUser = BillingService.getCurrentUser();
    if (memUser && memUser.id) {
      return memUser.id;
    }
  } catch (e) {}

  try {
    const saved = localStorage.getItem('eazy_billing_current_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.role === 'staff' && parsed.id) {
        return parsed.id;
      }
    }
  } catch (e) {}
  return auth.currentUser?.uid || 'system_sync';
};

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function setSyncStatus(status: SyncStatus) {
  currentStatus = status;
  listeners.forEach(l => l(status));
}

export function subscribeToSyncStatus(listener: SyncStatusListener) {
  listeners.push(listener);
  listener(currentStatus);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

const SYNCABLE_TABLES = ['parties', 'items', 'invoices', 'payments'] as const;

async function getActiveBusinessId(): Promise<string> {
  // If business ID is locked (authenticating Admin or Staff member), prioritize the locked ID!
  try {
    const isLocked = localStorage.getItem('businessId_locked') === 'true';
    const lockedBusinessId = localStorage.getItem('locked_businessId');
    if (isLocked && lockedBusinessId) {
      return lockedBusinessId;
    }
  } catch (e) {}

  let mobile = '';
  // 1. try settings table
  try {
    const dbInstance = getDb();
    const profileDoc = await dbInstance.settings.get('companyProfile');
    if (profileDoc?.value?.mobile) {
      mobile = profileDoc.value.mobile.replace(/\D/g, '');
    }
  } catch (e) {
    console.warn("Could not get company profile from DB:", e);
  }

  // 2. try localStorage fallback
  if (!mobile) {
    try {
      const fallback = localStorage.getItem('companyProfile_fallback');
      if (fallback) {
        const parsed = JSON.parse(fallback);
        if (parsed.mobile) {
          mobile = parsed.mobile.replace(/\D/g, '');
        }
      }
    } catch (e) {}
  }

  // 3. Fallback to auth or default
  if (!mobile) {
    const currentUser = BillingService.getCurrentUser();
    if (currentUser?.businessId) {
      return currentUser.businessId;
    }
    return 'default_business_id';
  }

  return mobile;
}

async function getTableChunksViaCursor(tableName: string, chunkSize: number = 20): Promise<any[][]> {
  const dbInstance = getDb();
  const chunks: any[][] = [];
  let currentChunk: any[] = [];
  
  await dbInstance.table(tableName)
    .filter(record => !record.isSyncedToCloud)
    .each(record => {
      currentChunk.push(record);
      if (currentChunk.length === chunkSize) {
        chunks.push(currentChunk);
        currentChunk = [];
      }
    });
    
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}

async function getStaffChunksViaCursor(chunkSize: number = 20): Promise<any[][]> {
  const dbInstance = getDb();
  const chunks: any[][] = [];
  let currentChunk: any[] = [];
  
  await dbInstance.staff_members
    .filter((record: any) => !record.isSyncedToCloud)
    .each(record => {
      currentChunk.push(record);
      if (currentChunk.length === chunkSize) {
        chunks.push(currentChunk);
        currentChunk = [];
      }
    });
    
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}

/**
 * Pushes any local records with unsynced modifications to Firestore,
 * partitioned securely by user's businessId.
 */
export async function pushToCloud(): Promise<void | 'RE_AUTH_REQUIRED'> {
  if (isSyncing) {
    return;
  }

  const isEnabled = await getIsCloudSyncEnabled();
  if (!isEnabled) {
    setSyncStatus('Pure Local Offline Mode Active');
    return;
  }

  const isOnline = navigator.onLine;
  const businessId = await getActiveBusinessId();

  if (!isOnline || !businessId || businessId === "default_business_id") {
    setSyncStatus('Offline');
    return;
  }

  // Rigid Pre-Flight Validation Check on Firebase Authentication State
  if (!auth.currentUser) {
    console.warn("SYNC_DEBUG: Pre-flight check failed. No active Firebase user session.");
    setSyncStatus('RE_AUTH_REQUIRED');
    return 'RE_AUTH_REQUIRED';
  }

  try {
    // Execute a silent refresh command
    await auth.currentUser.getIdToken(true);
    console.log("SYNC_DEBUG: Pre-flight auth check passed. Silent token refresh successful.");
  } catch (tokenErr) {
    console.error("SYNC_DEBUG: Silent token refresh/validation failed. Auth session expired or dead.", tokenErr);
    setSyncStatus('RE_AUTH_REQUIRED');
    return 'RE_AUTH_REQUIRED';
  }

  const dbInstance = getDb();

  isSyncing = true;
  setSyncStatus('Syncing');

  let hasMoreUnsyncedGlobal = false;
  let throttleDelay = 2000;

  try {
    // Determine large backlog and adjust batchSize + throttle delay
    let totalUnsyncedCount = 0;
    for (const tableName of SYNCABLE_TABLES) {
      const count = await dbInstance.table(tableName)
        .filter(record => !record.isSyncedToCloud)
        .count();
      totalUnsyncedCount += count;
    }

    const staffCount = await dbInstance.staff_members
      .filter((record: any) => !record.isSyncedToCloud)
      .count();
    totalUnsyncedCount += staffCount;

    // 1. First Sync Backlog Chunk Burst mode
    if (isFirstSyncActivation && totalUnsyncedCount > 0) {
      console.log(`SYNC_DEBUG: First activation of sync detected with ${totalUnsyncedCount} records. Starting cursor stream chunked burst uploading...`);
      
      let processedSoFar = 0;
      
      // Process "staff_members" in chunks of 20
      const staffChunks = await getStaffChunksViaCursor(20);
      for (const chunk of staffChunks) {
        // Pre-Flight check inside pagination loop
        if (!auth.currentUser) {
          setSyncStatus('RE_AUTH_REQUIRED');
          isSyncing = false;
          return 'RE_AUTH_REQUIRED';
        }
        try {
          await auth.currentUser.getIdToken(true);
        } catch {
          setSyncStatus('RE_AUTH_REQUIRED');
          isSyncing = false;
          return 'RE_AUTH_REQUIRED';
        }

        for (const staff of chunk) {
          try {
            const staffDocRef = doc(firebaseDb, 'businesses', businessId, 'staff_members', staff.id);
            const firestorePayload = {
              id: staff.id,
              name: staff.name,
              mobile: staff.mobile,
              password: staff.password,
              permissions: staff.permissions,
              businessId,
              createdAt: staff.createdAt || Date.now(),
              isDeleted: staff.isDeleted || false,
              lastLogin: staff.lastLogin !== undefined ? staff.lastLogin : null,
              totalSalesToday: staff.totalSalesToday || 0
            };
            await setDoc(staffDocRef, firestorePayload);
            await dbInstance.staff_members.update(staff.id, { isSyncedToCloud: true });
          } catch (staffErr) {
            console.error("Failed to sync staff member inside burst", staff.id, staffErr);
          }
        }
        
        processedSoFar += chunk.length;
        setSyncStatus(`Syncing ${processedSoFar} of ${totalUnsyncedCount} records...`);
        // Mandatory pause between chunk batches to prevent WebView thread freezing and protect UI frames
        await new Promise(r => setTimeout(r, 1200));
      }

      // Process other tables in chunks of 20
      for (const tableName of SYNCABLE_TABLES) {
        const tableChunks = await getTableChunksViaCursor(tableName, 20);
        for (const chunk of tableChunks) {
          // Pre-Flight check inside pagination loop
          if (!auth.currentUser) {
            setSyncStatus('RE_AUTH_REQUIRED');
            isSyncing = false;
            return 'RE_AUTH_REQUIRED';
          }
          try {
            await auth.currentUser.getIdToken(true);
          } catch {
            setSyncStatus('RE_AUTH_REQUIRED');
            isSyncing = false;
            return 'RE_AUTH_REQUIRED';
          }

          for (const localRecord of chunk) {
            const docRef = doc(firebaseDb, tableName, localRecord.id);
            try {
              const docSnap = await getDoc(docRef);
              const currentTimestamp = Date.now();

              if (docSnap.exists()) {
                const remoteData = docSnap.data();
                const rawPayload = {
                  ...localRecord,
                  businessId,
                  isSyncedToCloud: true,
                  updatedAt: currentTimestamp
                };
                const cleanedPayload = cleanData(rawPayload);

                const diff: any = { updatedAt: currentTimestamp, businessId };
                const changesForAudit: Record<string, string> = {};
                const remoteFieldUpdatedAt = remoteData?._fieldUpdatedAt || {};
                const mergedFieldUpdatedAt = { ...remoteFieldUpdatedAt };

                let hasChanges = false;
                for (const key of Object.keys(cleanedPayload)) {
                  if (key === 'isSyncedToCloud' || key === 'updatedAt' || key === 'businessId' || key === '_fieldUpdatedAt') {
                    continue;
                  }
                  const localVal = cleanedPayload[key];
                  const remoteVal = remoteData[key];

                  if (JSON.stringify(localVal) !== JSON.stringify(remoteVal)) {
                    diff[key] = localVal;
                    mergedFieldUpdatedAt[key] = currentTimestamp;
                    changesForAudit[key] = `${String(remoteVal)} -> ${String(localVal)}`;
                    hasChanges = true;
                  }
                }

                if (hasChanges) {
                  diff._fieldUpdatedAt = mergedFieldUpdatedAt;
                  await updateDoc(docRef, diff);

                  setSuppressBillingHooks(true);
                  await dbInstance.table(tableName).update(localRecord.id, { 
                    isSyncedToCloud: true,
                    _fieldUpdatedAt: mergedFieldUpdatedAt,
                    updatedAt: currentTimestamp
                  });
                  setSuppressBillingHooks(false);
                } else {
                  setSuppressBillingHooks(true);
                  await dbInstance.table(tableName).update(localRecord.id, { isSyncedToCloud: true });
                  setSuppressBillingHooks(false);
                }
              } else {
                // First time push: Full payload
                const rawPayload = {
                  ...localRecord,
                  businessId,
                  isSyncedToCloud: true,
                  updatedAt: currentTimestamp
                };
                const initialFieldUpdatedAt: Record<string, number> = {};
                for (const key of Object.keys(rawPayload)) {
                  if (key !== 'isSyncedToCloud' && key !== 'updatedAt' && key !== 'businessId') {
                    initialFieldUpdatedAt[key] = currentTimestamp;
                  }
                }
                rawPayload._fieldUpdatedAt = initialFieldUpdatedAt;
                const cleanedPayload = cleanData(rawPayload);

                await setDoc(docRef, cleanedPayload);

                setSuppressBillingHooks(true);
                await dbInstance.table(tableName).update(localRecord.id, { 
                  isSyncedToCloud: true,
                  _fieldUpdatedAt: initialFieldUpdatedAt,
                  updatedAt: currentTimestamp
                });
                setSuppressBillingHooks(false);
              }
            } catch (err) {
              console.error(`Failed to sync record ${localRecord.id} or write to cloud inside burst`, err);
            }
          }

          processedSoFar += chunk.length;
          setSyncStatus(`Syncing ${processedSoFar} of ${totalUnsyncedCount} records...`);
          // Mandatory pause between chunk batches to prevent WebView thread freezing and protect UI frames
          await new Promise(r => setTimeout(r, 1200));
        }
      }

      isFirstSyncActivation = false;
      setSyncStatus('Synced');
      isSyncing = false;
      return;
    }

    // 2. Normal Synchronisation Mode (executed when not first-activation backfill burst)
    let batchSize = 10;
    if (totalUnsyncedCount > 100) {
      batchSize = 25;
      throttleDelay = 1000;
      console.log(`SYNC_DEBUG: Large backlog detected (${totalUnsyncedCount} records). Transitioning to batch size: 25, throttle: 1s.`);
    }

    // First push staff members
    const unsyncedStaff = await dbInstance.staff_members
      .filter((record: any) => !record.isSyncedToCloud)
      .limit(batchSize)
      .toArray();

    for (const staff of unsyncedStaff) {
      try {
        const staffDocRef = doc(firebaseDb, 'businesses', businessId, 'staff_members', staff.id);
        const firestorePayload = {
          id: staff.id,
          name: staff.name,
          mobile: staff.mobile,
          password: staff.password,
          permissions: staff.permissions,
          businessId,
          createdAt: staff.createdAt || Date.now(),
          isDeleted: staff.isDeleted || false,
          lastLogin: staff.lastLogin !== undefined ? staff.lastLogin : null,
          totalSalesToday: staff.totalSalesToday || 0
        };
        await setDoc(staffDocRef, firestorePayload);
        await dbInstance.staff_members.update(staff.id, { isSyncedToCloud: true });
      } catch (staffErr) {
        console.error("Failed to sync staff member", staff.id, staffErr);
      }
    }

    for (const tableName of SYNCABLE_TABLES) {
      // Limit each sync cycle based on dynamic batchSize
      const localRecords = await dbInstance.table(tableName)
        .filter(record => !record.isSyncedToCloud)
        .limit(batchSize)
        .toArray();

      // Check if there are strictly more unsynced records than page size in this table
      const countCheck = await dbInstance.table(tableName)
        .filter(record => !record.isSyncedToCloud)
        .limit(batchSize + 1)
        .count();
      if (countCheck > batchSize) {
        hasMoreUnsyncedGlobal = true;
      }

      let wroteStep3And4 = false;

      for (const localRecord of localRecords) {
        if (!wroteStep3And4) {
          console.log("STEP 3: Fetching Unsynced Records...");
          console.log("STEP 4: Attempting Firestore Write...");
          wroteStep3And4 = true;
        }

        const docRef = doc(firebaseDb, tableName, localRecord.id);

        try {
          const docSnap = await getDoc(docRef);
          const currentTimestamp = Date.now();
          
          if (docSnap.exists()) {
            // Enterprise Delta-Sync
            const remoteData = docSnap.data();
            const rawPayload = {
              ...localRecord,
              businessId,
              isSyncedToCloud: true,
              updatedAt: currentTimestamp
            };
            const cleanedPayload = cleanData(rawPayload);

            const diff: any = { updatedAt: currentTimestamp, businessId };
            const changesForAudit: Record<string, string> = {};
            const remoteFieldUpdatedAt = remoteData?._fieldUpdatedAt || {};
            const mergedFieldUpdatedAt = { ...remoteFieldUpdatedAt };

            let hasChanges = false;
            for (const key of Object.keys(cleanedPayload)) {
              if (key === 'isSyncedToCloud' || key === 'updatedAt' || key === 'businessId' || key === '_fieldUpdatedAt') {
                continue;
              }
              const localVal = cleanedPayload[key];
              const remoteVal = remoteData[key];

              if (JSON.stringify(localVal) !== JSON.stringify(remoteVal)) {
                diff[key] = localVal;
                mergedFieldUpdatedAt[key] = currentTimestamp;
                changesForAudit[key] = `${String(remoteVal)} -> ${String(localVal)}`;
                hasChanges = true;
              }
            }

            if (hasChanges) {
              diff._fieldUpdatedAt = mergedFieldUpdatedAt;
              
              // Only push the "Diff" (changed fields) to Firestore instead of the entire object
              await updateDoc(docRef, diff);

              // Log sync savings
              const fullSize = JSON.stringify(cleanedPayload).length;
              const diffSize = JSON.stringify(diff).length;
              const savedBytes = Math.max(0, fullSize - diffSize);
              if (savedBytes > 0) {
                const currentSaved = parseInt(localStorage.getItem('sync_bandwidth_saved') || '0', 10);
                localStorage.setItem('sync_bandwidth_saved', (currentSaved + savedBytes).toString());
              }

              // Create Audit Log
              const auditLogRef = doc(collection(firebaseDb, 'audit_logs'));

              let auditUserName = 'System Sync';
              let auditUserRole = 'system';
              try {
                const activeUser = BillingService.getCurrentUser();
                if (activeUser) {
                  auditUserName = activeUser.name;
                  auditUserRole = activeUser.role;
                } else {
                  const saved = localStorage.getItem('eazy_billing_current_user');
                  if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed) {
                      auditUserName = parsed.name || 'Admin User';
                      auditUserRole = parsed.role || 'admin';
                    }
                  }
                }
              } catch (e) {}

              const moduleName = tableName === 'invoices' ? 'Billing' : tableName === 'payments' ? 'Accounting' : tableName === 'parties' ? 'CRM' : tableName === 'items' ? 'Inventory' : 'System';
              const recordLabel = tableName === 'invoices' ? 'Invoice' : tableName === 'payments' ? 'Payment' : tableName === 'parties' ? 'Party/Customer' : tableName === 'items' ? 'Item' : tableName;

              await setDoc(auditLogRef, {
                action: 'update',
                actionType: 'Update',
                userId: getActiveUserId(),
                createdBy: getActiveUserId(),
                userName: auditUserName,
                userRole: auditUserRole,
                businessId,
                timestamp: currentTimestamp,
                changes: changesForAudit,
                metadata: changesForAudit,
                targetId: localRecord.id,
                targetTable: tableName,
                module: moduleName,
                description: `Updated ${recordLabel} (ID/No: ${localRecord.id || (localRecord as any).invoiceNo || 'N/A'})`
              });
              
              const currentLogCount = parseInt(localStorage.getItem('audit_log_count') || '0', 10);
              localStorage.setItem('audit_log_count', (currentLogCount + 1).toString());

              // Update Dexie
              setSuppressBillingHooks(true);
              await dbInstance.table(tableName).update(localRecord.id, { 
                isSyncedToCloud: true,
                _fieldUpdatedAt: mergedFieldUpdatedAt,
                updatedAt: currentTimestamp
              });
              setSuppressBillingHooks(false);
            } else {
              // No changes, just mark synced
              setSuppressBillingHooks(true);
              await dbInstance.table(tableName).update(localRecord.id, { isSyncedToCloud: true });
              setSuppressBillingHooks(false);
            }
          } else {
            // First time push: Full payload
            const rawPayload = {
              ...localRecord,
              businessId,
              isSyncedToCloud: true,
              updatedAt: currentTimestamp
            };
            const initialFieldUpdatedAt: Record<string, number> = {};
            for (const key of Object.keys(rawPayload)) {
              if (key !== 'isSyncedToCloud' && key !== 'updatedAt' && key !== 'businessId') {
                initialFieldUpdatedAt[key] = currentTimestamp;
              }
            }
            rawPayload._fieldUpdatedAt = initialFieldUpdatedAt;
            const cleanedPayload = cleanData(rawPayload);

            await setDoc(docRef, cleanedPayload);

            // Audit log for create
            const changesForAudit: Record<string, string> = {};
            for (const key of Object.keys(cleanedPayload)) {
              if (key !== 'businessId' && key !== '_fieldUpdatedAt') {
                changesForAudit[key] = `undefined -> ${String(cleanedPayload[key])}`;
              }
            }

            const auditLogRef = doc(collection(firebaseDb, 'audit_logs'));

            let auditUserName = 'System Sync';
            let auditUserRole = 'system';
            try {
              const activeUser = BillingService.getCurrentUser();
              if (activeUser) {
                auditUserName = activeUser.name;
                auditUserRole = activeUser.role;
              } else {
                const saved = localStorage.getItem('eazy_billing_current_user');
                if (saved) {
                  const parsed = JSON.parse(saved);
                  if (parsed) {
                    auditUserName = parsed.name || 'Admin User';
                    auditUserRole = parsed.role || 'admin';
                  }
                }
              }
            } catch (e) {}

            const moduleName = tableName === 'invoices' ? 'Billing' : tableName === 'payments' ? 'Accounting' : tableName === 'parties' ? 'CRM' : tableName === 'items' ? 'Inventory' : 'System';
            const recordLabel = tableName === 'invoices' ? 'Invoice' : tableName === 'payments' ? 'Payment' : tableName === 'parties' ? 'Party/Customer' : tableName === 'items' ? 'Item' : tableName;

            await setDoc(auditLogRef, {
              action: 'create',
              actionType: 'Create',
              userId: getActiveUserId(),
              createdBy: getActiveUserId(),
              userName: auditUserName,
              userRole: auditUserRole,
              businessId,
              timestamp: currentTimestamp,
              changes: changesForAudit,
              metadata: changesForAudit,
              targetId: localRecord.id,
              targetTable: tableName,
              module: moduleName,
              description: `Created ${recordLabel} (ID/No: ${localRecord.id || (localRecord as any).invoiceNo || 'N/A'})`
            });

            const currentLogCount = parseInt(localStorage.getItem('audit_log_count') || '0', 10);
            localStorage.setItem('audit_log_count', (currentLogCount + 1).toString());

            // Update Dexie
            setSuppressBillingHooks(true);
            await dbInstance.table(tableName).update(localRecord.id, { 
              isSyncedToCloud: true,
              _fieldUpdatedAt: initialFieldUpdatedAt,
              updatedAt: currentTimestamp
            });
            setSuppressBillingHooks(false);
          }
        } catch (error: any) {
          console.error("FIRESTORE_FAILURE:", error?.code || 'NO_CODE', error?.message || String(error));
        }
      }
    }

    // Check other tables block if they have remaining unsynced items
    if (!hasMoreUnsyncedGlobal) {
      for (const tName of SYNCABLE_TABLES) {
        const anyUnsynced = await dbInstance.table(tName)
          .filter(record => !record.isSyncedToCloud)
          .limit(1)
          .count();
        if (anyUnsynced > 0) {
          hasMoreUnsyncedGlobal = true;
          break;
        }
      }
      if (!hasMoreUnsyncedGlobal) {
        const remainingStaff = await dbInstance.staff_members
          .filter((record: any) => !record.isSyncedToCloud)
          .limit(1)
          .count();
        if (remainingStaff > 0) {
          hasMoreUnsyncedGlobal = true;
        }
      }
    }

    setSyncStatus('Synced');
  } catch (err: any) {
    console.error("CRITICAL_SYNC_ERROR:", err);
    setSyncStatus('Offline');
  } finally {
    isSyncing = false;

    if (!hasMoreUnsyncedGlobal) {
      isFirstSyncActivation = false;
    }

    // Loop Prevention: Use setTimeout to wait between batches
    if (hasMoreUnsyncedGlobal && isOnline && businessId && businessId !== "default_business_id") {
      console.log(`SYNC_DEBUG: Remaining unsynced records found. Queueing next batch in ${throttleDelay}ms...`);
      setTimeout(() => {
        pushToCloud().catch(console.error);
      }, throttleDelay);
    }
  }
}

/**
 * Resolves per-field conflicts by choosing the value with the higher updatedAt.
 */
export function mergeRecordsFieldLevel(local: any, remote: any): { merged: any; isModified: boolean } {
  if (!local) return { merged: remote, isModified: true };
  
  const merged = { ...local };
  
  // Explicit transaction signature merge validation: Detect uninitialized or empty property maps
  const hasLocalPropertyMap = local && typeof local === 'object' && '_fieldUpdatedAt' in local && local._fieldUpdatedAt && Object.keys(local._fieldUpdatedAt).length > 0;
  const hasRemotePropertyMap = remote && typeof remote === 'object' && '_fieldUpdatedAt' in remote && remote._fieldUpdatedAt && Object.keys(remote._fieldUpdatedAt).length > 0;
  
  const localFieldUpdatedAt = hasLocalPropertyMap ? local._fieldUpdatedAt : {};
  const remoteFieldUpdatedAt = hasRemotePropertyMap ? remote._fieldUpdatedAt : {};

  const allKeys = Array.from(new Set([...Object.keys(local), ...Object.keys(remote)]));
  
  const mergedFieldUpdatedAt: Record<string, number> = {};
  let isModified = false;

  for (const key of allKeys) {
    if (key === 'isSyncedToCloud' || key === 'updatedAt' || key === '_fieldUpdatedAt' || key === 'businessId' || key === 'id') {
      continue;
    }

    // Fallback cleanly to key-level or row-level updatedAt timestamp representation if uninitialized
    const localTime = (hasLocalPropertyMap && localFieldUpdatedAt[key] !== undefined) ? localFieldUpdatedAt[key] : (local.updatedAt || 0);
    const remoteTime = (hasRemotePropertyMap && remoteFieldUpdatedAt[key] !== undefined) ? remoteFieldUpdatedAt[key] : (remote.updatedAt || 0);

    if (remoteTime > localTime) {
      if (JSON.stringify(local[key]) !== JSON.stringify(remote[key])) {
        merged[key] = remote[key];
        isModified = true;
      }
      mergedFieldUpdatedAt[key] = remoteTime;
    } else {
      mergedFieldUpdatedAt[key] = localTime;
    }
  }

  merged._fieldUpdatedAt = mergedFieldUpdatedAt;
  merged.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0);
  merged.isSyncedToCloud = true;

  return { merged, isModified };
}

/**
 * Subscribes to real-time changes in Firestore for the current businessId,
 * merging newer server data down into the local Dexie DB.
 */
export function startPullSync(businessId: string): void {
  // Clear any existing listeners to prevent leaks
  stopPullSync();

  getIsCloudSyncEnabled().then((isEnabled) => {
    if (!isEnabled) {
      setSyncStatus('Pure Local Offline Mode Active');
      return;
    }

    for (const tableName of SYNCABLE_TABLES) {
      const q = query(
        collection(firebaseDb, tableName),
        where("businessId", "==", businessId)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const cloudData = change.doc.data();
            const docId = change.doc.id;

            try {
              const dbInstance = getDb();
              const localData = await dbInstance.table(tableName).get(docId);

              const { merged, isModified } = mergeRecordsFieldLevel(localData, cloudData);

              if (!localData || isModified) {
                setSuppressBillingHooks(true);
                await dbInstance.table(tableName).put(merged);
                setSuppressBillingHooks(false);
              }
            } catch (err) {
              console.error(`Error saving pulled record to local DB for table ${tableName}:`, err);
            }
          }
        });
      }, (error) => {
        console.warn(`Firestore pull observer for ${tableName} failed:`, error);
      });

      activeUnsubscribes.push(unsub);
    }
  }).catch(console.error);
}

/**
 * Pulls recent records from Firestore for all syncable tables and applies them locally
 * using precision conflict resolution: if (remote.updatedAt > local.updatedAt) { updateLocal(remote); }
 */
export async function pullFromCloud(): Promise<void> {
  const isEnabled = await getIsCloudSyncEnabled();
  if (!isEnabled) {
    setSyncStatus('Pure Local Offline Mode Active');
    return;
  }

  const isOnline = navigator.onLine;
  const businessId = await getActiveBusinessId();

  if (!isOnline || !businessId || businessId === "default_business_id") {
    return;
  }

  const dbInstance = getDb();

  for (const tableName of SYNCABLE_TABLES) {
    try {
      const q = query(
        collection(firebaseDb, tableName),
        where("businessId", "==", businessId)
      );
      const snapshot = await getDocs(q);
      
      for (const docSnap of snapshot.docs) {
        const remote = docSnap.data();
        const docId = docSnap.id;
        const local = await dbInstance.table(tableName).get(docId);

        const { merged, isModified } = mergeRecordsFieldLevel(local, remote);

        if (!local || isModified) {
          setSuppressBillingHooks(true);
          await dbInstance.table(tableName).put(merged);
          setSuppressBillingHooks(false);
        }
      }
    } catch (err) {
      console.error(`Error in pullFromCloud for table ${tableName}:`, err);
    }
  }
}

/**
 * Compares the total count of records in Dexie vs Firestore and fixes any missing/discrepant links.
 * Runs once every 24 hours (tracked via settings/localStorage timestamp).
 */
export async function reconcileSync(): Promise<void> {
  const isEnabled = await getIsCloudSyncEnabled();
  if (!isEnabled) {
    setSyncStatus('Pure Local Offline Mode Active');
    return;
  }

  const isOnline = navigator.onLine;
  const businessId = await getActiveBusinessId();

  if (!isOnline || !businessId || businessId === "default_business_id") {
    return;
  }

  // Prevent running more than once every 24 hours
  try {
    const lastReconcileStr = localStorage.getItem('last_sync_reconcile_time');
    const now = Date.now();
    if (lastReconcileStr) {
      const lastReconcile = parseInt(lastReconcileStr, 10);
      if (now - lastReconcile < 24 * 60 * 60 * 1000) {
        console.log("SYNC_DEBUG: Reconcile sync already executed within the past 24 hours.");
        return;
      }
    }
  } catch (e) {}

  console.log("SYNC_DEBUG: Starting 24-hour Sync Integrity Check / Reconciliation...");
  const dbInstance = getDb();

  for (const tableName of SYNCABLE_TABLES) {
    try {
      // 1. Fetch all Firestore documents for the current business
      const q = query(
        collection(firebaseDb, tableName),
        where("businessId", "==", businessId)
      );
      const snapshot = await getDocs(q);
      
      const remoteMap = new Map<string, any>();
      snapshot.docs.forEach(docSnap => {
        remoteMap.set(docSnap.id, docSnap.data());
      });

      // 2. Fetch all local Dexie records (including soft-deleted ones)
      const localRecords = await dbInstance.table(tableName).toArray();
      const localMap = new Map<string, any>();
      localRecords.forEach(rec => {
        localMap.set(rec.id, rec);
      });

      // 3. Find records that exist locally but are missing on Firestore
      for (const [id, localRec] of localMap.entries()) {
        if (!remoteMap.has(id)) {
          console.warn(`reconcileSync: Local record ${id} of ${tableName} is missing on Firestore. Resetting sync flag.`);
          // Setting isSyncedToCloud to false will trigger the normal push engine
          setSuppressBillingHooks(true);
          await dbInstance.table(tableName).update(id, { isSyncedToCloud: false });
          setSuppressBillingHooks(false);
        }
      }

      // 4. Find records that exist in Firestore but are missing locally
      for (const [id, remotePayload] of remoteMap.entries()) {
        if (!localMap.has(id)) {
          console.info(`reconcileSync: Remote record ${id} of ${tableName} is missing locally. Downloading.`);
          setSuppressBillingHooks(true);
          const localPayload = {
            ...remotePayload,
            isSyncedToCloud: true
          };
          await dbInstance.table(tableName).put(localPayload);
          setSuppressBillingHooks(false);
        }
      }
    } catch (err) {
      console.error(`Error reconciling sync for table ${tableName}:`, err);
    }
  }

  try {
    localStorage.setItem('last_sync_reconcile_time', Date.now().toString());
  } catch (e) {}
  
  console.log("SYNC_DEBUG: Sync Integrity Check/Reconciliation finished. Queueing pushToCloud to fix missing links.");
  // Trigger push to cloud to immediately upload any reset flags
  pushToCloud().catch(console.error);
}

/**
 * Unsubscribes from all active Firestore snapshot listeners.
 */
export function stopPullSync(): void {
  activeUnsubscribes.forEach(unsub => unsub());
  activeUnsubscribes = [];
}

/**
 * Re-initializes the sync connection, resets listeners, and triggers a full push/pull sync.
 */
export async function forceSyncAndReinit(): Promise<void> {
  const isEnabled = await getIsCloudSyncEnabled();
  if (!isEnabled) {
    setSyncStatus('Pure Local Offline Mode Active');
    throw new Error('Sync is disabled inside settings context.');
  }

  console.log("SYNC_DEBUG: Re-initializing SyncEngine connection...");
  setSyncStatus('Syncing');
  stopPullSync();
  const businessId = await getActiveBusinessId();
  console.log("SYNC_DEBUG: Target BusinessId computed as:", businessId);
  if (businessId && navigator.onLine) {
    try {
      startPullSync(businessId);
      console.log("SYNC_DEBUG: Re-subscribed pull sync listener with ID:", businessId);
      await pushToCloud();
      console.log("SYNC_DEBUG: Force sync completed successfully!");
      setSyncStatus('Synced');
    } catch (err: any) {
      console.error("SYNC_DEBUG: Force sync / re-initialization failed:", err);
      setSyncStatus('Offline');
      throw err;
    }
  } else {
    console.warn("SYNC_DEBUG: Cannot sync. Online state:", navigator.onLine, "BusinessID:", businessId);
    setSyncStatus('Offline');
    throw new Error(`Connection offline or businessId empty (Online: ${navigator.onLine}, BusinessId: ${businessId})`);
  }
}

/**
 * Emergency Sync Diagnostic function
 */
export async function debugSyncState(): Promise<void> {
  console.log("--- START EMERGENCY DIAGNOSTIC ---");
  try {
    const currentUser = BillingService.getCurrentUser();
    console.log("DEBUG_STATE: Current User Role:", currentUser?.role || 'null');
    console.log("DEBUG_STATE: Business ID:", currentUser?.businessId || 'null');
    console.log("DEBUG_STATE: Firebase Initialized:", !!firebaseDb);

    const dbInstance = getDb();
    const invoices = await dbInstance.invoices.toArray();
    const count = invoices.filter((inv: any) => !inv.isSyncedToCloud).length;
    console.log("DEBUG_STATE: Unsynced Invoices Count:", count);

    const activeBusinessId = await getActiveBusinessId();
    if (activeBusinessId === "default_business_id") {
      console.log("SYNC_DEBUG: Business has not completed setup yet (default_business_id). Sync is suspended.");
    }
  } catch (error) {
    console.error("DEBUG_STATE: Diagnostic check failed with error:", error);
  }
  console.log("--- END EMERGENCY DIAGNOSTIC ---");
}

/**
 * Initializes the bidirectional Sync Engine background checks.
 */
let intervalRef: any = null;

if (typeof window !== 'undefined') {
  window.addEventListener('appSettingsChanged', () => {
    console.log("SYNC_DEBUG: App settings changed event received. Re-initializing SyncEngine...");
    initializeSyncEngine();
  });
}

export function initializeSyncEngine(): void {
  // Clear any existing intervals
  if (intervalRef) {
    clearInterval(intervalRef);
    intervalRef = null;
  }

  getIsCloudSyncEnabled().then(async (isEnabled) => {
    if (!isEnabled) {
      console.log("SYNC_DEBUG: Booting inside Pure Local Sandbox Offline Mode.");
      setSyncStatus('Pure Local Offline Mode Active');
      discardWindowListeners();
      stopPullSync();
      lastEnabledState = false;
      return;
    }

    // Otherwise, cloud sync is enabled. Was it previously disabled?
    if (!lastEnabledState) {
      console.log("SYNC_DEBUG: Cloud Sync state transition detected! Activating cloud pipeline...");
      isFirstSyncActivation = true;
    }
    lastEnabledState = true;

    console.log("SYNC_DEBUG: Cloud Sync is active. Registering pipelines...");
    registerWindowListeners();

    // Trigger emergency diagnostics immediately on app load
    debugSyncState().catch(console.error);

    // Securely initialize the cloud pipeline:
    const businessId = await getActiveBusinessId();
    if (businessId && businessId !== 'default_business_id') {
      try {
        startPullSync(businessId);
        
        // Execute custom timestamp fallback checking algorithm (mergeRecordsFieldLevel)
        // by pulling from cloud (which merges using mergeRecordsFieldLevel)
        await pullFromCloud();
        
        // Push un-synchronized records with strict dynamic batching
        await pushToCloud();
      } catch (err) {
        console.error("SYNC_DEBUG: Initialization sync pipeline failed:", err);
      }
    }

    // Trigger Sync Integrity Reconciliation check on startup (throttled to 24-hours internally)
    reconcileSync().catch(console.error);

    let currentBusinessId = '';

    const syncIntervalCheck = async () => {
      const isEnabledNow = await getIsCloudSyncEnabled();
      if (!isEnabledNow) {
        setSyncStatus('Pure Local Offline Mode Active');
        discardWindowListeners();
        stopPullSync();
        lastEnabledState = false;
        if (intervalRef) {
          clearInterval(intervalRef);
          intervalRef = null;
        }
        return;
      }

      const businessId = await getActiveBusinessId();
      if (!navigator.onLine || !businessId || businessId === 'default_business_id') {
        setSyncStatus('Offline');
        if (currentBusinessId) {
          stopPullSync();
          currentBusinessId = '';
        }
        return;
      }

      if (businessId !== currentBusinessId) {
        currentBusinessId = businessId;
        startPullSync(currentBusinessId);
        pushToCloud().catch(console.error);
      } else {
        pushToCloud().catch(console.error);
      }
    };

    // Run the check immediately on startup
    syncIntervalCheck().catch(console.error);

    // Poll for background checks every 15 seconds
    intervalRef = setInterval(syncIntervalCheck, 15000);
  }).catch(console.error);
}
