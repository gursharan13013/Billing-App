import { sqliteService } from './sqliteService';
import { billingService as legacyBillingService } from './billingService';
import { Item, ManufacturingEntry, User } from '../core/types/';
import { ROLES } from '../core/constants/';
import { pushToCloud } from './syncEngine';

let currentUser: User | null = {
  id: 'current_user',
  name: 'Admin User',
  role: 'admin',
  businessId: 'default_business_id'
}; // Default initialized admin user for compatibility

const InventoryServiceBase = {
  setCurrentUser: (user: User | null) => {
    currentUser = user;
  },

  getCurrentUser: (): User | null => {
    return currentUser;
  },

  checkPermission: (action: string, userToCheck?: User | null): boolean => {
    const activeUser = userToCheck !== undefined ? userToCheck : currentUser;
    if (!activeUser) return false;

    // Constraint: adjustStockManual (manual stock correction) should be restricted to ADMIN only
    if (action === 'adjustStockManual') {
      return activeUser.role === ROLES.ADMIN;
    }

    return true; // Default fallback for other operations
  },

  addItem: async (item: Item): Promise<void> => {
    const businessId = currentUser?.businessId || 'default_business_id';
    const updatedAt = Date.now();

    const taggedItem: Item = {
      ...item,
      businessId,
      updatedAt
    };

    await sqliteService.saveItem(taggedItem);
    pushToCloud().catch(err => console.error("Immediate sync failed", err));
  },

  updateStock: async (itemId: string, newStock: number): Promise<void> => {
    const businessId = currentUser?.businessId || 'default_business_id';
    const updatedAt = Date.now();

    await sqliteService.updateItem(itemId, {
      openingStock: newStock,
      businessId,
      updatedAt
    });
    pushToCloud().catch(err => console.error("Immediate sync failed", err));
  },

  adjustStockManual: async (itemId: string, adjustment: number): Promise<void> => {
    if (!InventoryServiceBase.checkPermission('adjustStockManual')) {
      throw new Error('Permission Denied: Only Admin can perform manual stock corrections.');
    }

    const item = await sqliteService.getItemById(itemId);
    if (!item) {
      throw new Error(`Item with ID ${itemId} not found.`);
    }

    const businessId = currentUser?.businessId || 'default_business_id';
    const updatedAt = Date.now();
    const currentStock = item.openingStock || 0;

    await sqliteService.updateItem(itemId, {
      openingStock: currentStock + adjustment,
      businessId,
      updatedAt
    });
    pushToCloud().catch(err => console.error("Immediate sync failed", err));
  },

  manufacturingLog: async (entry: ManufacturingEntry): Promise<void> => {
    const businessId = currentUser?.businessId || 'default_business_id';
    const updatedAt = Date.now();

    const taggedEntry: ManufacturingEntry = {
      ...entry,
      rawMaterials: entry.rawMaterials.map(rm => ({
        ...rm
      }))
    };

    // Call underlying legacy service to trigger cascading finished items & raw materials stock updates
    await legacyBillingService.saveManufacturingEntry(taggedEntry);

    // Apply multi-device tags to the finished item and raw materials
    const finishedItem = await sqliteService.getItemById(entry.finishedItemId);
    if (finishedItem) {
      await sqliteService.updateItem(entry.finishedItemId, {
        businessId,
        updatedAt
      });
    }

    for (const rm of entry.rawMaterials) {
      const rawItem = await sqliteService.getItemById(rm.itemId);
      if (rawItem) {
        await sqliteService.updateItem(rm.itemId, {
          businessId,
          updatedAt
        });
      }
    }
    pushToCloud().catch(err => console.error("Immediate sync failed", err));
  }
};

export const InventoryService = new Proxy(InventoryServiceBase, {
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
  addItem: (item: Item) => Promise<void>;
  updateStock: (itemId: string, newStock: number) => Promise<void>;
  adjustStockManual: (itemId: string, adjustment: number) => Promise<void>;
  manufacturingLog: (entry: ManufacturingEntry) => Promise<void>;
};
