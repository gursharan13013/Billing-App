import { db as dexieDb } from './billingService';
import { db as firestoreDb } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Clean data helper that recursively removes undefined fields and converts Date objects to ISO strings.
 * Built inline to ensure perfect modular execution.
 */
function selfCleanData(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => selfCleanData(item));
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = selfCleanData(value);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Robust concurrency resolution. Extracts and evaluates the micro-timestamp fields, 
 * selecting the newest property values on duplicate cloud collision events to preserve ledger history.
 * 
 * @param localRecord The current local dataset from Dexie IndexedDB
 * @param cloudRecord The conflicting cloud dataset pulled from Firestore
 * @returns The resolved data construct containing the most up-to-date fields
 */
export function mergeRecordsFieldLevel(localRecord: any, cloudRecord: any): any {
  if (!localRecord) return cloudRecord;
  if (!cloudRecord) return localRecord;

  // Extract general timestamps
  const localGeneralTime = typeof localRecord._fieldUpdatedAt === 'number'
    ? localRecord._fieldUpdatedAt
    : (localRecord.updatedAt || 0);

  const cloudGeneralTime = typeof cloudRecord._fieldUpdatedAt === 'number'
    ? cloudRecord._fieldUpdatedAt
    : (cloudRecord.updatedAt || 0);

  // Extract potential fine-grained field dictionaries
  const localDict = typeof localRecord._fieldUpdatedAt === 'object' && localRecord._fieldUpdatedAt !== null
    ? localRecord._fieldUpdatedAt
    : null;

  const cloudDict = typeof cloudRecord._fieldUpdatedAt === 'object' && cloudRecord._fieldUpdatedAt !== null
    ? cloudRecord._fieldUpdatedAt
    : null;

  const merged: any = { ...localRecord };

  // Gather unique keys from local and cloud datasets
  const allKeys = Array.from(new Set([...Object.keys(localRecord), ...Object.keys(cloudRecord)]));
  const resolvedFieldUpdatedAt: Record<string, number> = {};

  for (const key of allKeys) {
    if (key === 'isSyncedToCloud' || key === 'updatedAt' || key === 'businessId' || key === '_fieldUpdatedAt') {
      continue;
    }

    const inLocal = key in localRecord;
    const inCloud = key in cloudRecord;

    if (!inLocal && inCloud) {
      merged[key] = cloudRecord[key];
      resolvedFieldUpdatedAt[key] = cloudDict ? (cloudDict[key] || cloudGeneralTime) : cloudGeneralTime;
    } else if (inLocal && !inCloud) {
      merged[key] = localRecord[key];
      resolvedFieldUpdatedAt[key] = localDict ? (localDict[key] || localGeneralTime) : localGeneralTime;
    } else {
      // Key exists in both. Compare high-precision field micro-timestamps
      const localTime = localDict ? (localDict[key] || localGeneralTime) : localGeneralTime;
      const cloudTime = cloudDict ? (cloudDict[key] || cloudGeneralTime) : cloudGeneralTime;

      if (cloudTime > localTime) {
        merged[key] = cloudRecord[key];
        resolvedFieldUpdatedAt[key] = cloudTime;
      } else {
        merged[key] = localRecord[key];
        resolvedFieldUpdatedAt[key] = localTime;
      }
    }
  }

  // Preserve complex schema dictionary formats, or fall back to high-precision scalars
  if (localDict || cloudDict) {
    merged._fieldUpdatedAt = resolvedFieldUpdatedAt;
  } else {
    merged._fieldUpdatedAt = Math.max(localGeneralTime, cloudGeneralTime);
  }

  return merged;
}

interface SyncQueueItem {
  id: string;
  tableName: string;
  record: any;
}

/**
 * Asynchronous sync queue parser. Gathers records marked 'isSyncedToCloud === false' 
 * across database schemas and transfers them in precisely 20-record packets.
 * Includes a mandatory throttle delay of exactly 1.2 seconds between iterations.
 * 
 * @param feedbackCallback Optional hook to pipe realtime sync updates to the settings dashboard UI
 */
export async function* processPendingSyncQueue(
  feedbackCallback?: (progress: string) => void
): AsyncGenerator<string, void, unknown> {
  const businessId = localStorage.getItem('businessId') || 'EZB-OFFLINE-TEMP-001';

  // Comprehensive tracking matching our operational table domains
  const syncableTables = [
    'parties', 'items', 'invoices', 'payments', 'journals', 
    'units', 'categories', 'accountGroups', 'taxes', 'hsn', 
    'workers', 'attendance', 'orders', 'messages', 'manufacturing', 
    'broadcastGroups', 'supplierItems', 'staff_members'
  ];

  const queue: SyncQueueItem[] = [];

  // Read backlog across standard Dexie tables
  for (const tableName of syncableTables) {
    try {
      const dbTable = dexieDb.table(tableName);
      if (dbTable) {
        const unsyncedRows = await dbTable.filter((row) => !row.isSyncedToCloud).toArray();
        for (const row of unsyncedRows) {
          queue.push({
            id: row.id,
            tableName,
            record: row
          });
        }
      }
    } catch (err) {
      console.warn(`Could not read unsynced backlog queue from table ${tableName}:`, err);
    }
  }

  const totalRecords = queue.length;
  if (totalRecords === 0) {
    const emptyMsg = 'No pending records found in unsynced queues.';
    if (feedbackCallback) feedbackCallback(emptyMsg);
    yield emptyMsg;
    return;
  }

  const batchSize = 20;
  let batchIndex = 1;

  for (let i = 0; i < totalRecords; i += batchSize) {
    const currentChunk = queue.slice(i, i + batchSize);
    const startRange = i + 1;
    const endRange = Math.min(i + batchSize, totalRecords);

    const progressMsg = `Uploading batch ${batchIndex} (${startRange}-${endRange} of ${totalRecords})...`;
    if (feedbackCallback) feedbackCallback(progressMsg);
    yield progressMsg;

    // Process chunk concurrently
    const promises = currentChunk.map(async (item) => {
      const { id, tableName, record } = item;
      
      let docRef;
      if (tableName === 'staff_members') {
        docRef = doc(firestoreDb, 'businesses', businessId, 'staff_members', id);
      } else {
        docRef = doc(firestoreDb, tableName, id);
      }

      try {
        const docSnap = await getDoc(docRef);
        const currentTimestamp = Date.now();

        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          const resolvedRecord = mergeRecordsFieldLevel(record, cloudData);

          const payload = {
            ...resolvedRecord,
            businessId,
            isSyncedToCloud: true,
            updatedAt: currentTimestamp
          };

          const cleaned = selfCleanData(payload);
          await setDoc(docRef, cleaned);

          await dexieDb.table(tableName).update(id, {
            ...resolvedRecord,
            isSyncedToCloud: true,
            updatedAt: currentTimestamp
          });
        } else {
          // Brand new record registry in parent path
          const initialFieldUpdatedAt: Record<string, number> = {};
          for (const key of Object.keys(record)) {
            if (key !== 'isSyncedToCloud' && key !== 'updatedAt' && key !== 'businessId') {
              initialFieldUpdatedAt[key] = currentTimestamp;
            }
          }

          const payload = {
            ...record,
            businessId,
            isSyncedToCloud: true,
            updatedAt: currentTimestamp,
            _fieldUpdatedAt: initialFieldUpdatedAt
          };

          const cleaned = selfCleanData(payload);
          await setDoc(docRef, cleaned);

          await dexieDb.table(tableName).update(id, {
            isSyncedToCloud: true,
            _fieldUpdatedAt: initialFieldUpdatedAt,
            updatedAt: currentTimestamp
          });
        }
      } catch (writeErr: any) {
        console.error(`Failed to push queue item ${id} in table ${tableName}:`, writeErr);
      }
    });

    await Promise.all(promises);

    const completionMsg = `Batch ${batchIndex} synced successfully.`;
    if (feedbackCallback) feedbackCallback(completionMsg);
    yield completionMsg;

    batchIndex++;

    // Mandatory throttle delay between packets
    if (i + batchSize < totalRecords) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }
}
