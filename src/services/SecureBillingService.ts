import { billingService as legacyBillingService } from './billingService';
import { sqliteService } from './sqliteService';
import { Invoice, TransactionType, User } from '../core/types/';
import { ROLES } from '../core/constants/';
import { pushToCloud } from './syncEngine';

let currentUser: User | null = {
  id: 'current_user',
  name: 'Admin User',
  role: 'admin',
  businessId: 'default_business_id'
}; // Default initialized admin user for compatibility

const BillingServiceBase = {
  setCurrentUser: (user: User | null) => {
    currentUser = user;
  },

  getCurrentUser: (): User | null => {
    return currentUser;
  },

  checkPermission: (action: string, userToCheck?: User | null): boolean => {
    const activeUser = userToCheck !== undefined ? userToCheck : currentUser;
    if (!activeUser) return false;

    // Constraint: deleteInvoice and editPastInvoice should only be allowed if admin, OR if staff has explicitly assigned permission
    if (action === 'editPastInvoice') {
      return activeUser.role === ROLES.ADMIN;
    }

    if (action === 'deleteInvoice') {
      if (activeUser.role === ROLES.ADMIN) return true;
      if (activeUser.role === ROLES.SUB_ADMIN || activeUser.role === 'staff') {
        return !!activeUser.permissions?.can_delete_invoice;
      }
      return false;
    }

    return true; // Default fallback for other operations
  },

  saveInvoice: async (
    partyId: string,
    date: Date,
    items: any[],
    type: TransactionType,
    existingId?: string,
    customInvoiceNo?: string
  ): Promise<string> => {
    if (existingId) {
      if (!BillingServiceBase.checkPermission('editPastInvoice')) {
        throw new Error('Permission Denied: Only Admin can edit past invoices.');
      }
    }

    // Call underlying legacy service to perform database & double-entry operations
    const invoiceId = await legacyBillingService.saveInvoice(partyId, date, items, type, existingId, customInvoiceNo);

    // Apply multi-device tags to the saved invoice
    const businessId = currentUser?.businessId || 'default_business_id';
    const updatedAt = Date.now();
    const op_uid = currentUser?.id || (currentUser as any)?.uid || 'admin';
    const op_name = currentUser?.name || 'Admin User';

    const invoice = await sqliteService.getInvoiceById(invoiceId);
    if (invoice) {
      invoice.businessId = businessId;
      invoice.updatedAt = updatedAt;
      (invoice as any).operator_uid = op_uid;
      (invoice as any).createdBy = op_name;
      await sqliteService.saveInvoice(invoice);

      // Also ensure Dexie fallback matches
      const { db } = await import('./billingService');
      const updateData: any = { 
        businessId, 
        updatedAt,
        operator_uid: op_uid,
        createdBy: op_name
      };
      await db.invoices.update(invoiceId, updateData);
    }

    console.log("SYNC_DEBUG: Calling SyncEngine.pushToCloud() after saveInvoice()");
    pushToCloud().catch(err => console.error("Immediate sync failed", err));

    return invoiceId;
  },

  deleteInvoice: async (id: string): Promise<void> => {
    if (!BillingServiceBase.checkPermission('deleteInvoice')) {
      throw new Error('Permission Denied: Only Admin or staff with Delete Bills permission can delete invoices.');
    }

    await legacyBillingService.deleteInvoice(id);
    pushToCloud().catch(err => console.error("Immediate sync failed", err));
  },

  getInvoices: async (type: TransactionType): Promise<Invoice[]> => {
    // Keep lightning-fast retrieval of invoices directly via SQL/Dexie
    return await sqliteService.getInvoicesByType(type);
  },

  // Register staff member: local-first Dexie write + 1.5s Firestore timeout + Hindustani error fallback
  registerStaff: async (staffData: {
    id: string;
    name: string;
    mobile: string;
    password?: string;
    permissions: {
      can_delete_invoice: boolean;
      can_edit_stock: boolean;
      view_reports: boolean;
      manage_settings: boolean;
    };
    businessId: string;
    createdAt?: number;
    isDeleted?: boolean;
    lastLogin?: number | null;
    totalSalesToday?: number;
  }): Promise<void> => {
    const { getDb } = await import('./billingService');
    const localDb = getDb();
    
    // Save to Dexie locally first with default values
    const localPayload = {
      ...staffData,
      isDeleted: staffData.isDeleted || false,
      lastLogin: staffData.lastLogin !== undefined ? staffData.lastLogin : null,
      totalSalesToday: staffData.totalSalesToday || 0,
      isSyncedToCloud: false,
      createdAt: staffData.createdAt || Date.now()
    };
    await localDb.staff_members.put(localPayload);

    // Write to Firebase under 1.5 seconds timeout limit
    const { db: firebaseDb } = await import('./firebaseService');
    const { doc, setDoc } = await import('firebase/firestore');
    
    const docRef = doc(firebaseDb, 'businesses', staffData.businessId, 'staff_members', staffData.id);
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 1500);
    });

    const firestoreWritePromise = setDoc(docRef, {
      id: staffData.id,
      name: staffData.name,
      mobile: staffData.mobile,
      password: staffData.password,
      permissions: staffData.permissions,
      businessId: staffData.businessId,
      createdAt: localPayload.createdAt,
      isDeleted: localPayload.isDeleted,
      lastLogin: localPayload.lastLogin,
      totalSalesToday: localPayload.totalSalesToday
    });

    try {
      if (!navigator.onLine) {
        throw new Error('TIMEOUT');
      }
      await Promise.race([firestoreWritePromise, timeoutPromise]);
      // Mark as fully synced to local cloud tracking
      await localDb.staff_members.update(staffData.id, { isSyncedToCloud: true });
    } catch (err: any) {
      if (err.message === 'TIMEOUT' || err.code === 'unavailable' || err.message?.toLowerCase().includes('network')) {
        // Safe warning - do NOT throw. Local save is already a complete success!
        console.warn("Server response not received. Staff registered locally. Cloud sync will occur in background.");
        return;
      }
      throw err;
    }
  },

  deleteStaffMember: async (staffId: string, businessId?: string): Promise<void> => {
    const { getDb } = await import('./billingService');
    const localDb = getDb();
    
    // Look up local staff to obtain correct business ID
    const staff = await localDb.staff_members.get(staffId);
    const bId = businessId || staff?.businessId || currentUser?.businessId || 'default_business_id';

    // Soft delete locally in Dexie: update isDeleted: true and isSyncedToCloud: false
    await localDb.staff_members.update(staffId, { isDeleted: true, isSyncedToCloud: false });

    // Set doc status in Firebase to isDeleted: true (with merge: true to keep existing properties or create the doc)
    const { db: firebaseDb } = await import('./firebaseService');
    const { doc, setDoc } = await import('firebase/firestore');
    const docRef = doc(firebaseDb, 'businesses', bId, 'staff_members', staffId);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 1500);
    });

    try {
      if (!navigator.onLine) {
        throw new Error('TIMEOUT');
      }
      const p = setDoc(docRef, { isDeleted: true }, { merge: true });
      await Promise.race([p, timeoutPromise]);
      // Mark as fully synced
      await localDb.staff_members.update(staffId, { isSyncedToCloud: true });
    } catch (err: any) {
      if (err.message === 'TIMEOUT' || err.code === 'unavailable' || err.message?.toLowerCase().includes('network')) {
        throw new Error('Server response nahi mil raha, soft delete locally complete. Cloud sync baad mei hoga.');
      }
      throw err;
    }
  },

  deleteStaff: async (businessId: string, staffId: string): Promise<void> => {
    return BillingServiceBase.deleteStaffMember(staffId, businessId);
  },

  getStaffMembers: async (businessId: string): Promise<any[]> => {
    const { getDb } = await import('./billingService');
    const localDb = getDb();
    let list = await localDb.staff_members.where('businessId').equals(businessId).toArray();
    if (list.length === 0) {
      // Fallback: check if we have any other staff in local DB to be incredibly resilient
      const allList = await localDb.staff_members.toArray();
      if (allList.length > 0) {
        list = allList;
      }
    }
    return list.filter((s: any) => !s.isDeleted).sort((a: any, b: any) => b.createdAt - a.createdAt);
  },

  getStaffSalesToday: async (
    staffId: string,
    businessId: string
  ): Promise<{ totalSales: number; invoiceCount: number; averageValue: number }> => {
    const { getDb } = await import('./billingService');
    const localDb = getDb();
    
    // Find today's date in local time YYYY-MM-DD
    const todayStr = new Date().toLocaleDateString('en-CA'); // outputs YYYY-MM-DD
    
    // Fetch all sales for today
    const sales = await localDb.invoices
      .where('date')
      .equals(todayStr)
      .toArray();
      
    // Filter by staffId/createdBy and Sale type
    const staffSales = sales.filter((inv: any) => 
      inv.type === 'Sale' && 
      (!inv.isDeleted) &&
      (inv.createdBy === staffId || inv.userId === staffId)
    );
    
    const totalSales = staffSales.reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0);
    const invoiceCount = staffSales.length;
    const averageValue = invoiceCount > 0 ? totalSales / invoiceCount : 0;
    
    return {
      totalSales,
      invoiceCount,
      averageValue
    };
  },

  getRecentStaffAuditLogs: async (
    staffId: string,
    businessId: string,
    limitCount: number = 5
  ): Promise<any[]> => {
    try {
      const { db: firebaseDb } = await import('./firebaseService');
      const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
      
      const logsCollection = collection(firebaseDb, 'audit_logs');
      // Fetch logs under this businessId and filter by staffId on client side for index-safety
      const q = query(
        logsCollection,
        where('businessId', '==', businessId),
        limit(150) // fetch higher pool to find the most recent matching ones
      );
      
      const snapshot = await getDocs(q);
      const fetched: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.userId === staffId || data.createdBy === staffId || data.targetId === staffId) {
          fetched.push({
            id: docSnap.id,
            ...data
          });
        }
      });
      
      // Sort descending by timestamp
      fetched.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return fetched.slice(0, limitCount);
    } catch (e) {
      console.error("Failed to fetch recent audit logs remotely, falling back to empty:", e);
      return [];
    }
  },

  updateStaffPermissions: async (
    staffId: string,
    businessId: string,
    permissions: {
      can_delete_invoice: boolean;
      can_edit_stock: boolean;
      view_reports: boolean;
      manage_settings: boolean;
    }
  ): Promise<void> => {
    const { getDb } = await import('./billingService');
    const localDb = getDb();
    
    // Update locally in Dexie
    await localDb.staff_members.update(staffId, { permissions, isSyncedToCloud: false });
    
    // Update remotely in Firestore
    const { db: firebaseDb } = await import('./firebaseService');
    const { doc, updateDoc } = await import('firebase/firestore');
    const docRef = doc(firebaseDb, 'businesses', businessId, 'staff_members', staffId);
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 1500);
    });
    
    const firestoreUpdatePromise = updateDoc(docRef, { permissions });
    
    try {
      if (!navigator.onLine) {
        throw new Error('TIMEOUT');
      }
      await Promise.race([firestoreUpdatePromise, timeoutPromise]);
      await localDb.staff_members.update(staffId, { isSyncedToCloud: true });
    } catch (err: any) {
      if (err.message === 'TIMEOUT' || err.code === 'unavailable' || err.message?.toLowerCase().includes('network')) {
        throw new Error('Server response nahi mil raha, permissions locally update complete. Cloud sync baad mei hoga.');
      }
      throw err;
    }
  }
};

export const BillingService = new Proxy(BillingServiceBase, {
  get(target, prop, receiver) {
    if (prop in target) {
      return Reflect.get(target, prop, receiver);
    }
    const legacyVal = (legacyBillingService as any)[prop];
    if (typeof legacyVal === 'function') {
      return legacyVal.bind(legacyBillingService);
    }
    return legacyVal;
  }
}) as unknown as typeof legacyBillingService & {
  setCurrentUser: (user: User | null) => void;
  getCurrentUser: () => User | null;
  checkPermission: (action: string, userToCheck?: User | null) => boolean;
  saveInvoice: (partyId: string, date: Date, items: any[], type: any, existingId?: string, customInvoiceNo?: string) => Promise<string>;
  deleteInvoice: (id: string) => Promise<void>;
  getInvoices: (type: any) => Promise<any[]>;
  registerStaff: (staffData: any) => Promise<void>;
  deleteStaff: (businessId: string, staffId: string) => Promise<void>;
  deleteStaffMember: (staffId: string, businessId?: string) => Promise<void>;
  getStaffMembers: (businessId: string) => Promise<any[]>;
  getStaffSalesToday: (staffId: string, businessId: string) => Promise<{ totalSales: number; invoiceCount: number; averageValue: number }>;
  getRecentStaffAuditLogs: (staffId: string, businessId: string, limitCount?: number) => Promise<any[]>;
  updateStaffPermissions: (staffId: string, businessId: string, permissions: any) => Promise<void>;
};
