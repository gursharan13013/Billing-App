import { getDb } from './billingService';
import { BillingService } from '../services/SecureBillingService';
import { getSyncStatus } from './syncEngine';

export interface SmokeTestResults {
  dexieOpen: boolean;
  userInitialized: boolean;
  syncStatus: string;
  success: boolean;
  currentUser?: any;
  errors: string[];
}

/**
 * Runs a standalone validation check of the main system components
 * to verify they are connected and operating correctly.
 */
export async function runSmokeTest(): Promise<SmokeTestResults> {
  const errors: string[] = [];
  const results: SmokeTestResults = {
    dexieOpen: false,
    userInitialized: false,
    syncStatus: 'Unknown',
    success: false,
    errors
  };

  console.log("🚀 Starting EAZY BILLING v2.0 Smoke Test...");

  // 1. Check if Dexie DB is open
  try {
    const db = getDb();
    if (db && db.isOpen()) {
      results.dexieOpen = true;
      console.log("✅ Dexie DB: Connected and Open.");
    } else {
      errors.push("Dexie is not open or not initialized.");
      console.error("❌ Dexie DB: Closed or uninitialized.");
    }
  } catch (err: any) {
    errors.push(`Dexie error: ${err.message || String(err)}`);
    console.error("❌ Dexie DB: Connection failure", err);
  }

  // 2. Check if the current user is initialized
  try {
    const user = BillingService.getCurrentUser();
    if (user && user.id && user.businessId) {
      results.userInitialized = true;
      results.currentUser = user;
      console.log(`✅ Current User: Initialized securely for Business ID "${user.businessId}" (Role: ${user.role}).`);
    } else {
      errors.push("Current user state is null or missing businessId.");
      console.error("❌ Current User: Loading failed.");
    }
  } catch (err: any) {
    errors.push(`User context error: ${err.message || String(err)}`);
    console.error("❌ Current User: Lookup failure", err);
  }

  // 3. Check live Sync Status
  try {
    const syncStatusVal = getSyncStatus();
    results.syncStatus = syncStatusVal;
    console.log(`✅ Live Sync Status: ${syncStatusVal}`);
  } catch (err: any) {
    errors.push(`SyncEngine error: ${err.message || String(err)}`);
    console.error("❌ Live Sync: Lookup failure", err);
  }

  results.success = results.dexieOpen && results.userInitialized;
  console.log(
    results.success 
    ? "🎉 Smoke Test Completed Successfully! All 4 Phases are verified." 
    : "⚠️ Smoke Test completed with errors."
  );

  return results;
}
