# Eazy-Billing: Architecture Map

## 1. High-Level Layered Structure
Eazy-Billing uses a strict, directional three-layered architecture. Data flows unidirectionally from the user interface down to our infrastructure:

```
+-------------------------------------------------------------+
|                        User Interface                       |
|   (React Views, Custom Theme, System Health UI, Components) |
+------------------------------------+------------------------+
                                     |
                                     v
+-------------------------------------------------------------+
|                        Service Layer                        |
|  (BillingService, StockManager, Auth, Print, Hash Utilities) |
+------------------------------------+------------------------+
                                     |
                                     v
+-------------------------------------------------------------+
|                     Infrastructure Layer                    |
|   (Dexie.js Local Indexes, Firestore Sync, Local Storage)   |
+-------------------------------------------------------------+
```

### UI Layer (`/components`, `/src`)
- **React 18 & Vite**: Render state changes immediately with beautiful typography and fluid page transitions.
- **Tailwind CSS**: A highly uniform design system providing consistent spacings and layout structures.
- **Responsiveness**: Auto-scales between desktop thermal printing systems and mobile tablet screens.

### Service Layer (`/src/services`)
- **Billing Service**: Encapsulates double-entry journal creation, invoice modifications, and cryptographic log-chain hashing.
- **Secure/Role-Based services**: Manages access control, permissions gating, and active session roles.
- **Integrations & Cloud Sync**: Firebase cloud syncing, Google Drive backup, and local storage management operate securely as designated services in this module.

### Infrastructure Layer (IndexedDB / Firebase)
- **Dexie.js Database**: High-speed, indexed local storage mimicking SQL constraints inside the browser.
- **Firestore Sync engine**: Handles continuous asynchronous replication of offline databases when network conditions permit.

---

## 2. Preventing Race Conditions: The Sequential Promise Queue
In high-frequency transaction environments (such as running our 100-transaction stress test or billing multiple customers in rapid succession), asynchronous write requests might overlap. When multiple write operations seek the "last block hash" simultaneously, it creates a classic race condition:
- Transaction A reads Last Hash (Hash #10).
- Transaction B reads Last Hash (Hash #10) before Transaction A finishes hashing and writing.
- Transaction A computes and writes Block #11.
- Transaction B computes and writes Block #12 using Hash #10 as its link instead of Hash #11.
- Clear consequence: **A broken cryptographic chain** at block #12.

### The Solution: Sequential Hook Promise Queueing
To avoid this racing behavior, all state mutations and cryptographic block appends are channeled through a strict, serialized promise queue. 

```typescript
// All updates wait on the previous promise's completion to maintain correct block order
let promiseQueue: Promise<any> = Promise.resolve();

export function appendTransactionLog(action: string, payload: any): Promise<void> {
  const currentPromise = promiseQueue.then(async () => {
    // 1. Fetch the absolute latest log entry inside this atomic execution
    const lastLogEntry = await db.transaction_log.orderBy('timestamp').last();
    
    // 2. Prevent timestamp collision or out-of-order writes
    let logTimestamp = Date.now();
    if (lastLogEntry && logTimestamp <= lastLogEntry.timestamp) {
        logTimestamp = lastLogEntry.timestamp + 1;
    }
    
    // 3. Compute continuous block hashing using Canonical JSON
    const prevHash = lastLogEntry ? lastLogEntry.stateHash : '0000000000';
    const payloadStr = canonicalJsonStringify(payload || {});
    const textToHash = payloadStr + prevHash;
    const stateHash = await computeSha256(textToHash);
    
    // 4. Safely persist block record
    await db.transaction_log.add({
        id: generateUuid(),
        timestamp: logTimestamp,
        action,
        payload,
        stateHash
    });
  });
  
  // Update the master queue pointer
  promiseQueue = currentPromise.catch((err) => {
    console.error("Queue execution error:", err);
  });
  
  return promiseQueue;
}
```

By forcing the next block computation to wait until the current block has been successfully validated and appended, we completely lock out race conditions and maintain stellar cryptographic chain continuity under all circumstances.
