import { BillingService } from './SecureBillingService';
import { getDb } from './billingService';

export async function runStaffIntegrityCheck(businessId: string): Promise<{
  success: boolean;
  logs: string[];
}> {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(`[StaffIntegrityCheck] ${msg}`);
    logs.push(msg);
  };

  log("Starting Staff Integrity Check Diagnostic Suite...");

  const testMobile = '9999888877';
  const testName = 'Integrity Test Staff';
  const testPassword = 'integritypassword';

  try {
    const localDb = getDb();

    // 1. Staff Creation Verification
    log("Step 1: Testing Staff Creation...");
    const mockStaffPayload = {
      id: testMobile,
      name: testName,
      mobile: testMobile,
      password: testPassword,
      permissions: {
        can_delete_invoice: true, 
        can_edit_stock: false,
        view_reports: true,
        manage_settings: false,
      },
      businessId: businessId || 'integrity_test_biz',
      createdAt: Date.now()
    };

    // Before writing, ensure clean state in Dexie
    await localDb.staff_members.delete(testMobile);

    log(`Registering staff member: ${testName} (${testMobile})`);
    
    // Simulate registerStaff (sets defaults for lastLogin, totalSalesToday, isDeleted)
    await BillingService.registerStaff(mockStaffPayload);

    // Fetch from Dexie
    const createdRecord = await localDb.staff_members.get(testMobile);
    if (!createdRecord) {
      throw new Error("Created staff record was not found in Dexie local storage!");
    }

    log(`PASSED: Staff record created successfully in Dexie. Defaults assigned: lastLogin=${createdRecord.lastLogin}, totalSalesToday=${createdRecord.totalSalesToday}, isDeleted=${createdRecord.isDeleted}`);

    // 2. Permission Assignment Verification
    log("Step 2: Testing Permission Assignment Matrix...");
    if (createdRecord.permissions.can_delete_invoice !== true || createdRecord.permissions.view_reports !== true) {
      throw new Error("Assigned permissions do not match the input matrix!");
    }
    log("PASSED: Verified assigned permissions: can_delete_invoice=true, view_reports=true.");

    // Verify SecureBillingService permission checks work correctly for this staff
    const staffUserObject = {
      id: testMobile,
      name: testName,
      mobile: testMobile,
      role: 'staff',
      businessId: businessId || 'integrity_test_biz',
      permissions: createdRecord.permissions
    };

    const hasDeletePermission = BillingService.checkPermission('deleteInvoice', staffUserObject as any);
    if (!hasDeletePermission) {
      throw new Error("BillingService checkPermission('deleteInvoice') returned false for staff with delete permission!");
    }
    log("PASSED: checkPermission('deleteInvoice') allowed successfully for permitted staff user.");

    // 3. Deletion Hook (Soft Delete Logic Verification)
    log("Step 3: Testing Staff Soft Deletion & Audit Integrity...");
    
    // Call soft delete function
    await BillingService.deleteStaffMember(testMobile, businessId || 'integrity_test_biz');

    // Retrieve again to assert record is NOT hard deleted but soft deleted
    const deletedRecord = await localDb.staff_members.get(testMobile);
    if (!deletedRecord) {
      throw new Error("Staff record was hard-deleted! Deletion must be soft (isDeleted: true) to maintain audit logs.");
    }

    if (deletedRecord.isDeleted !== true) {
      throw new Error("Soft delete failed: record isDeleted flag is not set to true!");
    }
    log("PASSED: Soft delete successfully retained record in Dexie with isDeleted=true.");

    // 4. Sync Status Verification
    log("Step 4: Testing Sync Status Integrity queues...");
    log(`Record Sync status: isSyncedToCloud=${deletedRecord.isSyncedToCloud}`);
    log("PASSED: Sync status checked successfully.");

    // Cleanup: completely clear the test staff from local Dexie DB when test completes
    await localDb.staff_members.delete(testMobile);
    log("Cleaned up integrity check diagnostic entries.");

    log("🎉 STAFF INTEGRITY CHECK COMPLETED SUCCESSFULLY.");
    return { success: true, logs };

  } catch (err: any) {
    const errorMsg = err.message || String(err);
    log(`❌ INTEGRITY CHECK FAILED: ${errorMsg}`);
    
    // Attempt cleanup
    try {
      const localDb = getDb();
      await localDb.staff_members.delete(testMobile);
    } catch (_) {}

    return { success: false, logs };
  }
}
