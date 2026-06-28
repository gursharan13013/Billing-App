# Eazy-Billing: Data Sync Protocol

## 1. Offline-First Synchronization Architecture
Eazy-Billing functions as a robust offline-first system. It stores all local inputs, invoices, ledgers, and transaction logs inside IndexedDB via Dexie.js. When internet connectivity is detected, a bidirectional synchronization service matches local state changes with Cloud Firestore.

---

## 2. Dynamic Schema Validation & Key Sorting
To guarantee that sync records remain fully structured, lightweight validation schemes check inbound records before they are admitted into IndexedDB or exported to Firestore. All syncable tables must expose these key fields:
- `id` (primary key, unique prefixing like `inv_`, `jv_`, `party_`)
- `updatedAt` (Unix millisecond timestamp of last modifications)
- `createdBy` (user identifier associated with structural security)

---

## 3. Crucial Fix: Canonical JSON Serialization for Block Hashing
The cryptographic security of the time-machine ledger depends on serializing the transaction log payload and hashing it alongside the previous block's SHA-256 hash. 

### Why Standard Stringification Fails
A standard `JSON.stringify(payload)` operation does not guarantee key ordering:
- Different engines, browser sessions, or database hooks may output keys differently: `{"id": 1, "amt": 100}` vs `{"amt": 100, "id": 1}`.
- Although the payload values are identical, their byte outputs differ. This results in completely different SHA-256 hashes, breaking the cryptographic chain unnecessarily (such as index block corruption alerts at index #429).

### The Canonical JSON Rule
Every serialization step inside `billingService.ts` or diagnostic scripts must use recursive key sorting to generate a deterministic, string-stable payload before hashing.

```typescript
function canonicalJsonStringify(obj: any): string {
  if (obj === null || obj === undefined) {
    return 'null';
  }
  if (obj instanceof Date) {
    return JSON.stringify(obj.toISOString());
  }
  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalJsonStringify(item)).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const properties = keys
    .filter(key => obj[key] !== undefined)
    .map(key => JSON.stringify(key) + ':' + canonicalJsonStringify(obj[key]));
  return '{' + properties.join(',') + '}';
}
```
**Strict Directive**: Standard `JSON.stringify` must never be used directly inside block verification utilities.

---

## 4. Conflict Resolution Strategy: Last-Write-Wins (LWW) via `updatedAt`
In multi-device setups, simultaneous edits on the same record can lead to data collision. Eazy-Billing resolves this collision programmatically using the **Last-Write-Wins** strategy based on the absolute database time hook:

### Local Change Tracking hook
Whenever an insert, update, or deletion occurs locally on key tables:
1. Dynamic Dexie hook intercepts the event.
2. The entity's `updatedAt` field is automatically set or rewritten to `Date.now()`.
3. The mutation is logged to the local sync buffer index.

### Alignment Merge Rule
When matching records during a synchronization cycle:
- **Case 1: Remote `updatedAt` > Local `updatedAt`**
  - Action: Pull remote record. Overwrite local record in Dexie index. Suppress local mutation hooks during import to prevent recursive infinite loops.
- **Case 2: Local `updatedAt` > Remote `updatedAt`**
  - Action: Remote database gets updated. Push local record upwards to Cloud Firestore.
- **Case 3: `updatedAt` matches perfectly**
  - Action: No sync required. Perfect alignment achieved.
- **Safe Transaction Flag**: During imports or diagnostic resets, we set `suppressBillingHooks = true` to verify we don't trigger recursive transaction creation.
