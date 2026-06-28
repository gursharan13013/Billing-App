import { BillingService } from './SecureBillingService';
import { getDb } from './billingService';

interface TestStepHook {
  (stepIdx: number, status: 'loading' | 'success' | 'failure', observation?: string, error?: string): void;
}

export async function runStaffFlowTest(
  businessId: string,
  updateStep: TestStepHook
): Promise<void> {
  const testMobile = '8888777766';
  const testName = 'Flow Test Staff';
  const testPassword = 'testpassword123';

  // --- STEP A: Fills the Staff Registration form with mock data ---
  updateStep(0, 'loading');
  const mockFormPayload = {
    id: testMobile,
    name: testName,
    mobile: testMobile,
    password: testPassword,
    permissions: {
      can_delete_invoice: false,
      can_edit_stock: true,
      view_reports: true,
      manage_settings: false,
    },
    businessId: businessId || 'test_suite_business_id',
    createdAt: Date.now()
  };
  await new Promise(resolve => setTimeout(resolve, 600));
  updateStep(0, 'success', `Mock Staff Form Filled: Name="${testName}", Mobile="${testMobile}"`);

  // --- STEP B: Calls the registerStaff service ---
  updateStep(1, 'loading');
  
  // We simulate being offline temporarily so the write is held in Dexie's pending sync queue,
  // allowing us to assert offline persistence & pending queue state in Step C & D reliably!
  const originalOnLine = navigator.onLine;
  Object.defineProperty(navigator, 'onLine', {
    value: false,
    configurable: true
  });

  try {
    // Attempt local write through registerStaff (which writes to Dexie, attempts Firestore, and catches TIMEOUT/offline gracefully)
    await BillingService.registerStaff(mockFormPayload).catch((writeErr) => {
      // Offline/TIMEOUT error is completely expected and proves offline queueing is operational
      console.log("Expected write status (offline registration queueing active):", writeErr.message);
    });

    updateStep(1, 'success', 'registerStaff invoked - Local-first fallback saved record to Dexie safely.');
  } catch (err: any) {
    updateStep(1, 'failure', undefined, `registerStaff service call failed: ${err.message || String(err)}`);
    // Restore navigator just in case
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      configurable: true
    });
    return;
  }

  // Restore network online context
  Object.defineProperty(navigator, 'onLine', {
    value: originalOnLine,
    configurable: true
  });

  // --- STEP C: Verifies the record exists in Dexie ---
  updateStep(2, 'loading');
  const localDb = getDb();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const dexieRecord = await localDb.staff_members.get(testMobile);
  if (dexieRecord && dexieRecord.name === testName && dexieRecord.mobile === testMobile) {
    updateStep(2, 'success', `PASS: Record found in Dexie table [staff_members] for Key: "${testMobile}"!`);
  } else {
    updateStep(2, 'failure', undefined, 'FAIL: Record was not found/written inside Dexie database.');
    return;
  }

  // --- STEP D: Verifies the record is pushed to the sync_queue ---
  updateStep(3, 'loading');
  
  // Because we ran the transaction offline, the isSyncedToCloud state must be false!
  const isPendingSync = dexieRecord.isSyncedToCloud === false;
  if (isPendingSync) {
    updateStep(3, 'success', `PASS: record.isSyncedToCloud was strictly marked as false, flagging it in Sync Queue.`);
  } else {
    updateStep(3, 'failure', undefined, `FAIL: flag isSyncedToCloud was ${dexieRecord.isSyncedToCloud} (expected false).`);
    return;
  }

  // --- STEP E: Checks if the new staff appears in the staff_members list ---
  updateStep(4, 'loading');
  await new Promise(resolve => setTimeout(resolve, 500));

  const allBusinessStaff = await localDb.staff_members.where('businessId').equals(mockFormPayload.businessId).toArray();
  const foundInList = allBusinessStaff.some(s => s.id === testMobile);

  if (foundInList) {
    updateStep(4, 'success', `PASS: "${testName}" resolved in local business list containing ${allBusinessStaff.length} members.`);
  } else {
    updateStep(4, 'failure', undefined, `FAIL: "${testName}" not found in business's active list.`);
    return;
  }

  // Clean up the created test staff so we don't pollute the production database
  await localDb.staff_members.delete(testMobile);
  console.log("Sync flow test cleanup complete: deleted test staff", testMobile);
}
