
import Dexie, { Table } from 'dexie';
import { 
  Party, Item, Invoice, PaymentRecord, JournalVoucher, JournalRow,
  Unit, Category, TaxRate, HSNCode, CompanyProfile, 
  Worker, Attendance, VoucherSettings, AppSettings,
  TransactionType, UnifiedTransaction, ManufacturingEntry,
  UNIFIED_CATEGORIES, SupplierItem, AccountGroup
} from '../core/types/';
import { db as firebaseDb, auth } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { sqliteService, initializeSqliteDB } from './sqliteService';

export interface BroadcastGroup {
    id: string;
    name: string;
    memberPartyIds: string[];
    createdAt: string;
}

export interface Order {
    id: string;
    orderNumber: string;
    partyId: string;
    partyName: string;
    date: string;
    grandTotal: number;
    status: 'pending' | 'completed';
    type: 'receive' | 'send'; // 'receive' (Customer Order -> Sale), 'send' (Supplier Order -> Purchase)
    convertedToInvoiceId?: string;
    items: any[];
    isSyncedToCloud?: boolean;
    createdAt?: number;
}

export interface ChatMessage {
  id: string;
  partyId: string;
  text: string;
  isSent: boolean;
  time: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';
  isRead?: boolean;
  contentUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileData?: Blob;
  cloudId?: string;
  itemsShared?: boolean;
}

export let suppressBillingHooks = false;
export function setSuppressBillingHooks(value: boolean) {
  suppressBillingHooks = value;
}

class BillingDatabase extends Dexie {
  parties!: Table<Party>;
  items!: Table<Item>;
  invoices!: Table<Invoice>;
  payments!: Table<PaymentRecord>;
  journals!: Table<JournalVoucher>;
  units!: Table<Unit>;
  categories!: Table<Category>;
  accountGroups!: Table<AccountGroup>;
  taxes!: Table<TaxRate>;
  hsn!: Table<HSNCode>;
  workers!: Table<Worker>;
  attendance!: Table<Attendance>;
  orders!: Table<Order>;
  settings!: Table<{key: string, value: any}>;
  messages!: Table<ChatMessage>;
  manufacturing!: Table<ManufacturingEntry>;
  broadcastGroups!: Table<BroadcastGroup>;
  supplierItems!: Table<SupplierItem>;
  transaction_log!: Table<any>;
  staff_members!: Table<any>;
  system_meta!: Table<{key: string, value: any}>;
  local_auth!: Table<{id: string, hashedPin: string}>;

  constructor(dbName: string = 'BillingDB') {
    super(dbName);
    
    // Version 1
    (this as any).version(1).stores({
      parties: 'id, name, mobile, type',
      items: 'id, name, code',
      invoices: 'id, invoiceNo, partyId, date, type',
      payments: 'id, voucherNo, partyId, date, type, invoiceId',
      journals: 'id, voucherNo, date',
      units: 'id, name',
      categories: 'id, name',
      taxes: 'id, name',
      hsn: 'id, code',
      workers: 'id, name',
      attendance: 'id, date, workerId',
      orders: 'id, orderNumber, type, date',
      settings: 'key'
    });

    // Version 2: Add index for 'code' in units to support orderBy('code')
    (this as any).version(2).stores({
      units: 'id, name, code'
    });

    // Version 3: Add messages table
    (this as any).version(3).stores({
      messages: 'id, partyId, time'
    });

    // Version 4: Add manufacturing table
    (this as any).version(4).stores({
      manufacturing: 'id, date, finishedItemId'
    });

    // Version 5: Add broadcastGroups table
    (this as any).version(5).stores({
      broadcastGroups: 'id, name'
    });

    // Version 6: Add supplierItems table
    (this as any).version(6).stores({
      supplierItems: 'id, supplierId, itemId'
    });

    // Version 7: Add account groups
    (this as any).version(7).stores({
      accountGroups: 'id, name'
    });

    // Version 8: Add transaction_log table for local time-machine
    (this as any).version(8).stores({
      transaction_log: 'id, timestamp'
    });

    // Version 9: Add staff_members table for offline-first staff access and testing
    (this as any).version(9).stores({
      staff_members: 'id, name, mobile, businessId, isSyncedToCloud'
    });

    // Version 10: Add system_meta and local_auth tables
    (this as any).version(10).stores({
      system_meta: 'key',
      local_auth: 'id, hashedPin'
    });

    // Setup Automated Transaction Logging hook for all major operational tables
    const trackedTables = [
      'parties', 'items', 'invoices', 'payments', 'journals', 
      'units', 'categories', 'accountGroups', 'taxes', 'hsn', 
      'workers', 'attendance', 'orders', 'messages', 'manufacturing', 
      'broadcastGroups', 'supplierItems'
    ];

    for (const tableName of trackedTables) {
      const tbl = this.table(tableName);
      if (tbl) {
        tbl.hook('creating', (primKey, obj) => {
          if (suppressBillingHooks) return;
          const idValue = primKey || (obj ? (obj as any).id : null);
          const payload = { id: idValue, ...(obj || {}) };
          Promise.resolve().then(() => {
            appendTransactionLog(`${tableName}.create`, payload);
          });
        });
        
        tbl.hook('updating', (mods, primKey, obj) => {
          if (suppressBillingHooks) return;
          const idValue = primKey || (obj ? (obj as any).id : null);
          const payload = { ...(obj || {}), ...(mods || {}), id: idValue };
          Promise.resolve().then(() => {
            appendTransactionLog(`${tableName}.update`, payload);
          });
        });
        
        tbl.hook('deleting', (primKey, obj) => {
          if (suppressBillingHooks) return;
          const idValue = primKey || (obj ? (obj as any).id : null);
          const payload = { id: idValue, ...(obj || {}) };
          Promise.resolve().then(() => {
            appendTransactionLog(`${tableName}.delete`, payload);
          });
        });
      }
    }
  }
}

// Canonical JSON stringifier to ensure consistent sorting of keys across indexings
export function canonicalJsonStringify(obj: any): string {
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

// SHA-256 helper with robust fallback
async function computeSha256(message: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(message);
      const digestPromise = window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashBuffer = Dexie.currentTransaction
        ? await Dexie.waitFor(digestPromise)
        : await digestPromise;
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn("Subtle crypto failed, using fallback:", e);
    }
  }
  // Fallback: robust FNV-1a style hash
  let h1 = 0x811c9dc5;
  for (let i = 0; i < message.length; i++) {
    h1 ^= message.charCodeAt(i);
    h1 += (h1 << 1) + (h1 << 4) + (h1 << 7) + (h1 << 8) + (h1 << 24);
  }
  return 'fb_' + Math.abs(h1).toString(16).padStart(8, '0');
}

let lastAppendPromise: Promise<void> = Promise.resolve();

export async function appendTransactionLog(action: string, payload: any) {
  if (suppressBillingHooks) return;

  // Append sequential execution to the promise chain to serialize database logs
  lastAppendPromise = lastAppendPromise.then(async () => {
    try {
      if (!db) return;

      // Dynamic resilience: attempt to re-open connection if Dexie reports it closed
      if (!db.isOpen()) {
        try {
          await db.open();
        } catch (openErr) {
          console.error("[DB RECOVERY] Could not re-open database connection during log append:", openErr);
          return;
        }
      }

      let timestamp = Date.now();
      const id = Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11);
      
      // Get last entry to find the previous state hash
      const lastEntry = await db.transaction_log.orderBy('timestamp').last();
      if (lastEntry && timestamp <= lastEntry.timestamp) {
        timestamp = lastEntry.timestamp + 1;
      }
      const prevHash = lastEntry ? lastEntry.stateHash : '0000000000000000000000000000000000000000000000000000000000000000';
      
      // Compute SHA-256 hash of: canonical stringified current payload + previous entry's hash
      const payloadStr = canonicalJsonStringify(payload || {});
      const textToHash = payloadStr + prevHash;
      const stateHash = await computeSha256(textToHash);
      
      const entry = {
        id,
        timestamp,
        action,
        payload,
        stateHash
      };
      
      await db.transaction_log.add(entry);
    } catch (err) {
      console.error("Failed to append to transaction log inside sequential queue:", err);
    }
  }).catch((queueErr) => {
    console.error("Queue appending encountered an error:", queueErr);
  });

  return lastAppendPromise;
}

export let db = new BillingDatabase();
export const getDb = () => db;

// Comprehensive List of Default Units
const DEFAULT_UNITS = [
    { name: 'Bags', code: 'BAG' },
    { name: 'Bale', code: 'BAL' },
    { name: 'Bundles', code: 'BDL' },
    { name: 'Buckets', code: 'BKL' },
    { name: 'Bill of Quantities', code: 'BOU' },
    { name: 'Boxes', code: 'BOX' },
    { name: 'Bottles', code: 'BTL' },
    { name: 'Bunches', code: 'BUN' },
    { name: 'Cans', code: 'CAN' },
    { name: 'Cubic Meters', code: 'CBM' },
    { name: 'Cubic Centimeters', code: 'CCM' },
    { name: 'Centimeters', code: 'CMS' },
    { name: 'Cartons', code: 'CTN' },
    { name: 'Dozens', code: 'DOZ' },
    { name: 'Drums', code: 'DRM' },
    { name: 'Great Gross', code: 'GGR' },
    { name: 'Grams', code: 'GMS' },
    { name: 'Gross', code: 'GRS' },
    { name: 'Gallon (Dry)', code: 'GYD' },
    { name: 'Hank', code: 'HBK' },
    { name: 'Hank (Skein)', code: 'HKS' },
    { name: 'Hours', code: 'HRS' },
    { name: 'Inches', code: 'INC' },
    { name: 'Jute Bag', code: 'JTA' },
    { name: 'Kilograms', code: 'KGS' },
    { name: 'Kiloliter', code: 'KLR' },
    { name: 'Kilometre', code: 'KME' },
    { name: 'Pounds', code: 'LBS' },
    { name: 'Logs', code: 'LOG' },
    { name: 'Lots', code: 'LOT' },
    { name: 'Liters', code: 'LTR' },
    { name: 'Milligrams', code: 'MGS' },
    { name: 'Milliliters', code: 'MLT' },
    { name: 'Millimeters', code: 'MMT' },
    { name: 'Meters', code: 'MTR' },
    { name: 'Numbers', code: 'NOS' },
    { name: 'Packs', code: 'PAC' },
    { name: 'Pieces', code: 'PCS' },
    { name: 'Pairs', code: 'PRS' },
    { name: 'Quintal', code: 'QTL' },
    { name: 'Rolls', code: 'ROL' },
    { name: 'Sets', code: 'SET' },
    { name: 'Square Feet', code: 'SQF' },
    { name: 'Square Meters', code: 'SQM' },
    { name: 'Square Yards', code: 'SQY' },
    { name: 'Tablets', code: 'TBS' },
    { name: 'Ten Gross', code: 'TGM' },
    { name: 'Thousands', code: 'THD' },
    { name: 'Tonnes', code: 'TON' },
    { name: 'Tubes', code: 'TUB' },
    { name: 'Units', code: 'UNT' },
    { name: 'Yards', code: 'YDS' }
];

// Use UNIFIED_CATEGORIES for consistency
const DEFAULT_BUSINESS_CATEGORIES = UNIFIED_CATEGORIES.map(c => c.en);

const DEFAULT_ACCOUNT_GROUPS = [
    "Bank Account", "Capital Account", "Cash In Hand", "Current Assets", 
    "Current Liabilities", "Expenses Payable", "Fixed Assets", "Loans Advances", 
    "Opening Stock", "Profit and Loss", "Purchase Account", "Reserve and Surplus", 
    "Sales Account", "Salesman Account", "Secured Loans", "Security Deposits", 
    "Sundry Creditors", "Sundry Debtors", "Trading Expenses", "Unsecured Loans", 
    "Indirect Expenses", "Direct Incomes", "Indirect Incomes", "Loans & Liabilities", 
    "Bank OD", "Branch & Division", "Stock in Hand", "Direct Expenses", 
    "Suspense Account", "Duties & Taxes", "Investment"
];

// List of Ledgers from Screenshots
const DEFAULT_LEDGERS = [
    // Banks
    { name: 'Allahabad Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Andhra Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Bank of Baroda', group: 'Bank Account', type: 'Customer' },
    { name: 'Bank of India', group: 'Bank Account', type: 'Customer' },
    { name: 'Bank of Maharashtra', group: 'Bank Account', type: 'Customer' },
    { name: 'Canara Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Central Bank of India', group: 'Bank Account', type: 'Customer' },
    { name: 'Corporation Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Dena Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Indian Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Indian Overseas Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'IDBI Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'ICICI Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'IDFC Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'IndusInd Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Jammu and Kashmir Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Karnataka Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Karur Vysya Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Kotak Mahindra Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Lakshmi Vilas Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Nainital Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'RBL Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Tamilnad Mercantile Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'YES Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'India Post', group: 'Bank Account', type: 'Customer' },
    { name: 'Paytm', group: 'Bank Account', type: 'Customer' },
    { name: 'Oriental Bank of Commerce', group: 'Bank Account', type: 'Customer' },
    { name: 'Punjab and Sindh Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Punjab National Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'State Bank of India', group: 'Bank Account', type: 'Customer' },
    { name: 'Syndicate Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'UCO Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Union Bank of India', group: 'Bank Account', type: 'Customer' },
    { name: 'United Bank of India', group: 'Bank Account', type: 'Customer' },
    { name: 'Vijaya Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Bandhan Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Catholic Syrian Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'City Union Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'DCB Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Dhanlaxmi Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'Federal Bank', group: 'Bank Account', type: 'Customer' },
    { name: 'HDFC Bank', group: 'Bank Account', type: 'Customer' },

    // Core Accounting
    { name: 'Cash', group: 'Cash In Hand', type: 'Customer' },
    { name: 'Purchase A/C', group: 'Purchase Account', type: 'Customer' }, // Dr
    { name: 'Sales A/C', group: 'Sales Account', type: 'Supplier' }, // Cr
    { name: 'Purchase Return A/C', group: 'Purchase Account', type: 'Customer' },
    { name: 'Sales Return A/C', group: 'Sales Account', type: 'Supplier' },
    { name: 'Profit & Loss A/C', group: 'Profit and Loss', type: 'Supplier' },
    { name: 'Trading A/C', group: 'Profit and Loss', type: 'Supplier' },
    { name: 'Stock In Hand', group: 'Stock in Hand', type: 'Customer' },
    
    // Duties & Taxes
    { name: 'IGST A/C', group: 'Duties & Taxes', type: 'Supplier' },
    { name: 'CGST A/C', group: 'Duties & Taxes', type: 'Supplier' },
    { name: 'SGST A/C', group: 'Duties & Taxes', type: 'Supplier' },
    { name: 'UTGST A/C', group: 'Duties & Taxes', type: 'Supplier' },

    // Expenses & Incomes
    { name: 'Bank Commision A/C', group: 'Indirect Expenses', type: 'Customer' },
    { name: 'Discount A/C', group: 'Indirect Expenses', type: 'Customer' },
    { name: 'Freight Inward A/C', group: 'Direct Expenses', type: 'Customer' },
    { name: 'Freight Outward A/C', group: 'Indirect Expenses', type: 'Customer' },
    { name: 'Round Off A/C', group: 'Indirect Expenses', type: 'Customer' },
    { name: 'Extra A/C', group: 'Indirect Expenses', type: 'Customer' },
    { name: 'Packaging A/C', group: 'Indirect Expenses', type: 'Customer' },
    { name: 'Insurance A/C', group: 'Indirect Expenses', type: 'Customer' },
];

// Common HSN Codes for Dairy and Grocery
const DEFAULT_HSN_CODES = [
    // Dairy
    { code: '0401', description: 'Milk & Cream (Fresh)', taxRate: 0 },
    { code: '0402', description: 'Milk Powder / Concentrated', taxRate: 5 },
    { code: '0403', description: 'Curd, Lassi, Butter Milk', taxRate: 0 },
    { code: '0405', description: 'Butter, Ghee', taxRate: 12 },
    { code: '0406', description: 'Cheese & Paneer', taxRate: 5 },
    { code: '0409', description: 'Natural Honey', taxRate: 5 },
    
    // Grocery / Kirana
    { code: '1006', description: 'Rice', taxRate: 5 },
    { code: '1101', description: 'Wheat Flour (Atta)', taxRate: 5 },
    { code: '1701', description: 'Cane Sugar', taxRate: 5 },
    { code: '1507', description: 'Soybean Oil', taxRate: 5 },
    { code: '1508', description: 'Groundnut Oil', taxRate: 5 },
    { code: '0902', description: 'Tea', taxRate: 5 },
    { code: '0901', description: 'Coffee', taxRate: 5 },
    { code: '1905', description: 'Biscuits / Bread', taxRate: 18 },
    { code: '2106', description: 'Food Preparations', taxRate: 18 },
    { code: '3401', description: 'Soap', taxRate: 18 },
    { code: '3304', description: 'Cosmetics / Beauty', taxRate: 18 },
    { code: '0910', description: 'Spices (Masala)', taxRate: 5 },
    { code: '0701', description: 'Potatoes (Fresh)', taxRate: 0 },
    { code: '0703', description: 'Onions (Fresh)', taxRate: 0 }
];

// Tax Categories from Screenshot
const DEFAULT_TAXES = [
    { name: 'Nill Rated', rate: 0 },
    { name: 'Exempted', rate: 0 },
    { name: 'Zero Rated', rate: 0 },
    { name: 'Non GST', rate: 0 },
    { name: '0.25% GST', rate: 0.25 },
    { name: '3% GST', rate: 3 },
    { name: '5% GST', rate: 5 },
    { name: '12% GST', rate: 12 },
    { name: '18% GST', rate: 18 },
    { name: '28% GST', rate: 28 }
];

let initPromise: Promise<void> = Promise.resolve();
let defaultsInitPromise: Promise<void> | null = null;

const initializeDefaults = async () => {
    if (defaultsInitPromise) return defaultsInitPromise;
    defaultsInitPromise = (async () => {
        // Initialize defaults if empty
        const units = await sqliteService.getAllUnits();
        if (units.length === 0) {
            const unitsToAdd = DEFAULT_UNITS.map(u => ({
                id: Math.random().toString(36).substr(2, 9),
                name: u.name,
                code: u.code
            }));
            for(let u of unitsToAdd) await sqliteService.saveUnit(u);
        }

        const categories = await sqliteService.getAllCategories();
        if (categories.length === 0) {
            const groupsToAdd = DEFAULT_BUSINESS_CATEGORIES.map(name => ({
                id: Math.random().toString(36).substr(2, 9),
                name: name
            }));
            for(let g of groupsToAdd) await sqliteService.saveCategory(g);
        }

        const accountGroups = await sqliteService.getAllAccountGroups();
        if (accountGroups.length === 0) {
            const agsToAdd = DEFAULT_ACCOUNT_GROUPS.map(name => ({
                id: Math.random().toString(36).substr(2, 9),
                name: name
            }));
            for(let ag of agsToAdd) await sqliteService.saveAccountGroup(ag);
        }

        const taxes = await sqliteService.getAllTaxes();
        if (taxes.length === 0) {
            const taxesToAdd = DEFAULT_TAXES.map(t => ({
                id: Math.random().toString(36).substr(2, 9),
                name: t.name,
                rate: t.rate
            }));
            for(let t of taxesToAdd) await sqliteService.saveTax(t);
        }

        const hsn = await sqliteService.getAllHSN();
        if (hsn.length === 0) {
            const hsnToAdd = DEFAULT_HSN_CODES.map(h => ({
                id: Math.random().toString(36).substr(2, 9),
                code: h.code,
                description: h.description,
                taxRate: h.taxRate
            }));
            for(let h of hsnToAdd) await sqliteService.saveHSN(h);
        }

        const parties = await sqliteService.getAllParties();
        if (parties.length === 0) {
            const ledgersToAdd = DEFAULT_LEDGERS.map(l => ({
                id: Math.random().toString(36).substr(2, 9),
                name: l.name,
                mobile: '',
                type: l.type as 'Customer' | 'Supplier',
                accountGroup: l.group,
                currentBalance: 0,
                isLocal: true
            }));
            for(let l of ledgersToAdd) await sqliteService.saveParty(l as Party);
        }
    })();
    return defaultsInitPromise;
};

let processingOrders = new Set<string>();

// --- DEFAULT APP SETTINGS (CEO CONTROL) ---
const DEFAULT_APP_SETTINGS: AppSettings = {
    offlineMode: true, // Default to offline core
    cloudSyncEnabled: false,
    messagingEnabled: true,
    liveSearchEnabled: true
};

export const billingService = {
  // App Settings (CEO Control)
  getAppSettings: async (): Promise<AppSettings> => {
      const setting = await sqliteService.getSetting('appSettings');
      return setting ? { ...DEFAULT_APP_SETTINGS, ...setting } : DEFAULT_APP_SETTINGS;
  },
  saveAppSettings: async (settings: AppSettings) => {
      await sqliteService.saveSetting('appSettings', settings);
      
      // Keep isCloudSyncEnabled key synced directly in Dexie and localStorage for complete safety
      try {
        const dbInstance = getDb();
        await dbInstance.settings.put({ key: 'isCloudSyncEnabled', value: !!settings.cloudSyncEnabled });
        localStorage.setItem('isCloudSyncEnabled', settings.cloudSyncEnabled ? 'true' : 'false');
      } catch (e) {
        console.warn("Could not sync isCloudSyncEnabled key directly:", e);
      }

      // Trigger a custom event for components to listen to
      window.dispatchEvent(new Event('appSettingsChanged'));
  },

  // Items
  getAllItems: async (): Promise<Item[]> => sqliteService.getAllItems(),
  saveItem: async (item: Item) => { await sqliteService.saveItem(item); },
  deleteItem: async (id: string) => { await sqliteService.deleteItem(id); },
  deleteItems: async (ids: string[]) => { await sqliteService.deleteItems(ids); },

  // Supplier Items
  getSupplierItems: async (supplierId: string): Promise<SupplierItem[]> => {
      return sqliteService.getSupplierItems(supplierId);
  },

  // Units
  getAllUnits: async (): Promise<Unit[]> => {
      await initializeDefaults();
      return sqliteService.getAllUnits();
  },
  saveUnit: async (unit: Unit) => { await sqliteService.saveUnit(unit); },
  deleteUnit: async (id: string) => { await sqliteService.deleteUnit(id); },

  // Account Groups
  getAllAccountGroups: async (): Promise<AccountGroup[]> => {
      await initializeDefaults();
      return sqliteService.getAllAccountGroups();
  },
  resetAccountGroups: async () => {
      await sqliteService.clearAccountGroups();
      const agsToAdd = DEFAULT_ACCOUNT_GROUPS.map(name => ({
          id: Math.random().toString(36).substr(2, 9),
          name: name
      }));
      for (const ag of agsToAdd) {
          await sqliteService.saveAccountGroup(ag);
      }
      return sqliteService.getAllAccountGroups();
  },
  saveAccountGroup: async (group: AccountGroup) => sqliteService.saveAccountGroup(group),
  deleteAccountGroup: async (id: string) => sqliteService.deleteAccountGroup(id),

  // Categories (Groups) - Updated to use Business Categories
  getAllCategories: async (): Promise<Category[]> => {
      await initializeDefaults();
      return sqliteService.getAllCategories();
  },
  // Reset Categories to Default Business List (User Request)
  resetCategories: async () => {
      await sqliteService.clearCategories();
      const groupsToAdd = DEFAULT_BUSINESS_CATEGORIES.map(name => ({
          id: Math.random().toString(36).substr(2, 9),
          name: name
      }));
      for (const group of groupsToAdd) {
        await sqliteService.saveCategory(group);
      }
  },
  saveCategory: async (category: Category) => { await sqliteService.saveCategory(category); },
  deleteCategory: async (id: string) => { await sqliteService.deleteCategory(id); },

  // Taxes - Updated to auto-populate from DEFAULT_TAXES
  getAllTaxes: async (): Promise<TaxRate[]> => {
      await initializeDefaults();
      return sqliteService.getAllTaxes();
  },
  saveTax: async (tax: TaxRate) => { await sqliteService.saveTax(tax); },
  deleteTax: async (id: string) => { await sqliteService.deleteTax(id); },

  // HSN - Updated to auto-populate
  getAllHSN: async (): Promise<HSNCode[]> => {
      await initializeDefaults();
      return sqliteService.getAllHSN();
  },
  saveHSN: async (hsn: HSNCode) => { await sqliteService.saveHSN(hsn); },
  deleteHSN: async (id: string) => { await sqliteService.deleteHSN(id); },

  // Parties
  getAllParties: async (): Promise<Party[]> => {
      await initializeDefaults();
      return sqliteService.getAllParties();
  },
  getPartyById: async (id: string): Promise<Party | undefined> => sqliteService.getPartyById(id),
  getPartyByMobile: async (mobile: string): Promise<Party | undefined> => sqliteService.getPartyByMobile(mobile),
  getPartyByName: async (name: string): Promise<Party | undefined> => sqliteService.getPartyByName(name),
  saveParty: async (party: Party) => { 
      await sqliteService.saveParty(party); 
      // Sync to Firebase directly so admin can view it
      try {
          const profile = await billingService.getCompanyProfile();
          if (profile && profile.mobile) {
              const cleanMobileCompany = profile.mobile.replace(/\D/g, '');
              const cleanMobileParty = party.mobile ? party.mobile.replace(/\D/g, '') : null;
              const docId = cleanMobileParty ? cleanMobileParty : party.id;

              const firebaseData = {
                  ...party,
                  updated_at: new Date().toISOString()
              };
              // Remove undefined fields for Firebase
              Object.keys(firebaseData).forEach(key => {
                  if ((firebaseData as any)[key] === undefined) {
                      (firebaseData as any)[key] = null;
                  }
              });
              
              const path = `company_profile/${cleanMobileCompany}/parties/${docId}`;
              setDoc(doc(firebaseDb, path), firebaseData).catch(e => {
                  console.warn(`Firebase individual party sync failed on path [${path}]:`, e);
              });
          }
      } catch (err) {
          console.warn("Could not sync party to Firebase:", err);
      }
  },
  deleteParty: async (id: string) => { await sqliteService.deleteParty(id); },
  searchParties: async (query: string): Promise<Party[]> => {
    const lowerQuery = query.toLowerCase();
    
    // Fetch all that match loosely
    const allItems = await sqliteService.getAllParties();
    const allMatches = allItems.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      p.mobile.includes(lowerQuery) ||
      (p.category && p.category.toLowerCase().includes(lowerQuery))
    );

    // Sort by relevance
    return allMatches.sort((a, b) => {
        const aNameStarts = a.name.toLowerCase().startsWith(lowerQuery);
        const bNameStarts = b.name.toLowerCase().startsWith(lowerQuery);
        
        if (aNameStarts && !bNameStarts) return -1;
        if (!aNameStarts && bNameStarts) return 1;

        return 0;
    });
  },
  importGlobalParty: async (party: Party): Promise<Party> => {
      const newParty = { ...party, isLocal: true, id: Math.random().toString(36).substr(2, 9) };
      await sqliteService.saveParty(newParty);
      return newParty;
  },

  // Company Profile
  getCompanyProfile: async (): Promise<CompanyProfile> => {
      let setting = await sqliteService.getSetting('companyProfile');
      if (!setting) {
          try {
              const fallback = localStorage.getItem('companyProfile_fallback');
              if (fallback) setting = JSON.parse(fallback);
          } catch(e) {}
      }
      return setting ? setting : { 
          name: '', address: '', city: '', gstin: '', mobile: '', email: '',
          businessCategory: '', businessType: '' 
      };
  },
  saveCompanyProfile: async (profile: CompanyProfile, awaitCloudSync: boolean = false): Promise<{cloudSync: boolean | null, message: string}> => {
      // 1. Save Locally - Crucial for app functionality
      await sqliteService.saveSetting('companyProfile', profile);
      try {
          localStorage.setItem('companyProfile_fallback', JSON.stringify(profile));
          window.dispatchEvent(new Event('companyProfileUpdated'));
      } catch(e) {}

      // 2. Sync to Firebase
      const syncToCloud = async () => {
          if (!navigator.onLine) {
              return { cloudSync: false, message: 'No internet connection. Profile saved locally.' };
          }
          try {
              // Map local profile fields to Firebase document, replacing undefined with null
              const firebaseData = {
                  uid: auth.currentUser?.uid || null,
                  name: profile.name || null,
                  address: profile.address || null,
                  city: profile.city || null,
                  state: profile.state || null,
                  pincode: profile.pincode || null,
                  gstin: profile.gstin || null,
                  pan: profile.pan || null,
                  mobile: profile.mobile || null,
                  email: profile.email || null,
                  website: profile.website || null,
                  bank_details: profile.bankDetails || null,
                  is_gst_registered: profile.isGstRegistered ?? null,
                  terms: profile.terms || null,
                  business_category: profile.businessCategory || null,
                  business_type: profile.businessType || null,
                  latitude: profile.latitude || null,
                  longitude: profile.longitude || null,
                  updated_at: new Date().toISOString()
              };

              // Use mobile as a unique key for now (assuming 1 company per mobile)
              if (profile.mobile) {
                  // clean mobile number
                  const cleanMobile = profile.mobile.replace(/\D/g, '');
                  await setDoc(doc(firebaseDb, 'company_profile', cleanMobile), firebaseData);
                  console.log("Synced to Firebase successfully");
                  return { cloudSync: true, message: 'Profile updated locally and successfully synced to Firebase!' };
              } else {
                 return { cloudSync: false, message: 'Profile saved locally. Mobile number required for Firebase backup.' };
              }
          } catch (err: any) {
              const path = profile.mobile ? `company_profile/${profile.mobile.replace(/\D/g, '')}` : 'unknown';
              console.error(`Firebase connection failed on path [${path}]:`, err);
              return { cloudSync: false, message: `Profile saved locally, but Firebase sync failed: ${err.message}` };
          }
      };
      
      if (awaitCloudSync) {
          return await syncToCloud();
      } else {
          syncToCloud();
          return { cloudSync: null, message: 'Saved locally' };
      }
  },

  // Voucher Settings
  getVoucherSettings: async (): Promise<VoucherSettings[]> => {
      const setting = await sqliteService.getSetting('voucherSettings');
      return setting ? setting : [
          { type: 'Sale', prefix: 'INV', currentSequence: 0, padding: 3 },
          { type: 'Purchase', prefix: 'PUR', currentSequence: 0, padding: 3 },
          { type: 'Payment', prefix: 'PAY', currentSequence: 0, padding: 4 },
          { type: 'Receipt', prefix: 'RCP', currentSequence: 0, padding: 4 },
          { type: 'Journal', prefix: 'JV', currentSequence: 0, padding: 4 },
          { type: 'Contra', prefix: 'CN', currentSequence: 0, padding: 4 },
          { type: 'Sale Order', prefix: 'SO', currentSequence: 0, padding: 3 },
          { type: 'Purchase Order', prefix: 'PO', currentSequence: 0, padding: 3 },
      ];
  },
  saveVoucherSettings: async (settings: VoucherSettings[]) => {
      await sqliteService.saveSetting('voucherSettings', settings);
  },
  generateNextVoucherNo: async (type: TransactionType | string): Promise<string> => {
      const allSettings = await billingService.getVoucherSettings();
      const setting = allSettings.find(s => s.type === type);
      if (!setting) return '001';
      const nextSeq = setting.currentSequence + 1;
      return `${setting.prefix}-${nextSeq.toString().padStart(setting.padding, '0')}`;
  },
  incrementVoucherSequence: async (type: TransactionType | string) => {
      const allSettings = await billingService.getVoucherSettings();
      const newSettings = allSettings.map(s => s.type === type ? { ...s, currentSequence: s.currentSequence + 1 } : s);
      await billingService.saveVoucherSettings(newSettings);
  },

  // Invoices
  saveInvoice: async (partyId: string, date: Date, items: any[], type: TransactionType, existingId?: string, customInvoiceNo?: string): Promise<string> => {
      // Find existing invoice if customInvoiceNo is provided but existingId is missing
      if (!existingId && customInvoiceNo) {
          if (type === 'Sale Order' || type === 'Purchase Order') {
              const existingOrders = await sqliteService.getAllOrders();
              const existingOrder = existingOrders.find(ord => ord.orderNumber === customInvoiceNo && ord.type === (type === 'Sale Order' ? 'receive' : 'send'));
              if (existingOrder) existingId = existingOrder.id;
          } else {
              const existingInvoices = await sqliteService.getAllInvoices();
              const existingInvoice = existingInvoices.find(inv => inv.invoiceNo === customInvoiceNo && inv.type === type);
              if (existingInvoice) existingId = existingInvoice.id;
          }
      }

      const returnedId = await db.transaction('rw', [
          db.parties, db.items, db.invoices, db.payments, db.journals, 
          db.units, db.categories, db.taxes, db.hsn, db.workers, 
          db.attendance, db.orders, db.settings, db.transaction_log
      ], async () => {
          let oldInvoiceObj: Invoice | undefined;

          // Helper to dynamically get or create a ledger account (stored as a Party) within transaction
          const getLedgerTx = async (name: string, group: string, partyType: 'Customer' | 'Supplier') => {
              const all = await db.parties.toArray();
              let found = all.find(p => p.name.toLowerCase() === name.toLowerCase());
              if (!found) {
                  found = {
                      id: 'dyn_' + Math.random().toString(36).substr(2, 9),
                      name: name,
                      mobile: '',
                      type: partyType,
                      accountGroup: group,
                      currentBalance: 0,
                      isLocal: true
                  };
                  await db.parties.add(found);
              }
              return found;
          };

          // 1. If EDITING, first reverse the effect of the OLD invoice on the party balances AND STOCK
          if (existingId) {
              oldInvoiceObj = await db.invoices.get(existingId);
              if (oldInvoiceObj) {
                  // Try to find the old double-entry journal first to reverse all accounts perfectly
                  const oldJournal = await db.journals.get('jv_' + existingId);
                  if (oldJournal) {
                      for (const row of oldJournal.rows) {
                          const party = await db.parties.get(row.partyId);
                          if (party) {
                              const reverseChange = row.credit - row.debit;
                              await db.parties.update(row.partyId, { currentBalance: party.currentBalance + reverseChange });
                          }
                      }
                      await db.journals.delete('jv_' + existingId);
                  } else {
                      // Fallback for pre-existing invoices without a journal
                      const oldParty = await db.parties.get(oldInvoiceObj.partyId);
                      if (oldParty && !['Sale Order', 'Purchase Order'].includes(oldInvoiceObj.type)) {
                          let reverseChange = -oldInvoiceObj.totalAmount; 
                          if (oldInvoiceObj.type === 'Purchase' || oldInvoiceObj.type === 'Sale Return') {
                              reverseChange = oldInvoiceObj.totalAmount;
                          }
                          await db.parties.update(oldInvoiceObj.partyId, { currentBalance: oldParty.currentBalance + reverseChange });
                      }
                  }

                  // Reverse stock impact
                  if (['Sale', 'Purchase', 'Sale Return', 'Purchase Return'].includes(oldInvoiceObj.type)) {
                      for (const item of oldInvoiceObj.items) {
                          if (item.item && item.item.id) {
                              const dbItem = await db.items.get(item.item.id);
                              if (dbItem) {
                                  let stockChange = item.qty; // Reverse of Sale is +qty
                                  if (oldInvoiceObj.type === 'Purchase' || oldInvoiceObj.type === 'Sale Return') {
                                      stockChange = -item.qty; // Reverse of Purchase is -qty
                                  }
                                  await db.items.update(dbItem.id, { openingStock: (dbItem.openingStock || 0) + stockChange });
                              }
                          }
                      }
                  }
              }
          }

          let invoiceNo = customInvoiceNo;
          if (!invoiceNo) {
              if (existingId && oldInvoiceObj) {
                  invoiceNo = oldInvoiceObj.invoiceNo;
              } else {
                  // Inside transaction settings read
                  const voucherSettingsSetting = await db.settings.get('voucherSettings');
                  const allSettings: VoucherSettings[] = voucherSettingsSetting ? voucherSettingsSetting.value : [
                      { type: 'Sale', prefix: 'INV', currentSequence: 0, padding: 3 },
                      { type: 'Purchase', prefix: 'PUR', currentSequence: 0, padding: 3 },
                      { type: 'Payment', prefix: 'PAY', currentSequence: 0, padding: 4 },
                      { type: 'Receipt', prefix: 'RCP', currentSequence: 0, padding: 4 },
                      { type: 'Journal', prefix: 'JV', currentSequence: 0, padding: 4 },
                      { type: 'Contra', prefix: 'CN', currentSequence: 0, padding: 4 },
                      { type: 'Sale Order', prefix: 'SO', currentSequence: 0, padding: 3 },
                      { type: 'Purchase Order', prefix: 'PO', currentSequence: 0, padding: 3 },
                  ];
                  const setting = allSettings.find(s => s.type === type);
                  if (!setting) {
                      invoiceNo = '001';
                  } else {
                      const nextSeq = setting.currentSequence + 1;
                      invoiceNo = `${setting.prefix}-${nextSeq.toString().padStart(setting.padding, '0')}`;
                  }
              }
          }
          
          const totalAmount = items.reduce((sum, item) => {
              const gross = item.qty * item.rate;
              const discount = gross * (item.discountPercent || 0) / 100;
              const subTotal = gross - discount;
              let tax = 0;
              if (item.taxType === 'Excluded') {
                  tax = subTotal * (item.taxPercent || 0) / 100;
                  return sum + subTotal + tax;
              }
              return sum + subTotal; 
          }, 0);
          
          // 2. Apply NEW balance impact & Double-entry generation for financial transactions
          const party = await db.parties.get(partyId);
          
          // 3. Apply NEW stock impact
          if (['Sale', 'Purchase', 'Sale Return', 'Purchase Return'].includes(type) && !suppressBillingHooks) {
              for (let i = 0; i < items.length; i++) {
                  const item = items[i];
                  if (item.item) {
                      let dbItem = item.item.id && !item.item.id.startsWith('temp_') ? await db.items.get(item.item.id) : undefined;
                      
                      // If not found by ID, try by name
                      if (!dbItem) {
                          const allItems = await db.items.toArray();
                          dbItem = allItems.find(it => it.name.toLowerCase() === item.item.name.toLowerCase());
                      }

                      let stockChange = -item.qty; // Sale decreases stock
                      if (type === 'Purchase' || type === 'Sale Return') {
                          stockChange = item.qty; // Purchase increases stock
                      }

                      if (dbItem) {
                          // Update existing item
                          await db.items.update(dbItem.id, { openingStock: (dbItem.openingStock || 0) + stockChange });
                          // Update the item reference in the invoice to use the real ID
                          items[i].item = dbItem;
                      } else {
                          // Create new item
                          const newItem: Item = {
                              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                              name: item.item.name,
                              saleRate: type === 'Sale' ? item.rate : 0,
                              purchaseRate: type === 'Purchase' ? item.rate : 0,
                              mrp: item.mrp || 0,
                              openingStock: stockChange, // New item starts with this stock change
                              taxPercent: item.taxPercent || 0,
                              taxType: item.taxType || 'Excluded'
                          };
                          await db.items.add(newItem);
                          items[i].item = newItem;
                      }
                  }
              }
          }

          // Enforce that unique invoice/voucher IDs utilize device workspace prefix identifiers
          // to achieve absolute primary key data segregation on Firestore and completely eliminate sequence collisions
          const companyProfileSettingForId = await db.settings.get('companyProfile');
          const companyProfileForId = companyProfileSettingForId ? companyProfileSettingForId.value : null;
          const businessIdVal = companyProfileForId?.mobile ? companyProfileForId.mobile.replace(/\D/g, '') : 'default_business';
          const savedUser = localStorage.getItem('eazy_billing_current_user');
          const currentStaffVal = savedUser ? JSON.parse(savedUser) : null;
          const staffIdVal = currentStaffVal?.id || 'admin';
          const sequenceNoStr = invoiceNo.replace(/[^a-zA-Z0-9_-]/g, '_');
          const id = existingId || `${businessIdVal}_${staffIdVal}_${sequenceNoStr}`;

          // Check if this is an Order (Sale Order or Purchase Order)
          if (type === 'Sale Order' || type === 'Purchase Order') {
              const orderType = type === 'Sale Order' ? 'receive' : 'send';
              
              await db.orders.put({
                  id: id, // Use the same ID
                  orderNumber: invoiceNo,
                  partyId,
                  partyName: party?.name || 'Unknown',
                  date: date.toLocalDateString(),
                  grandTotal: totalAmount,
                  status: 'pending',
                  type: orderType,
                  items,
                  isSyncedToCloud: oldInvoiceObj?.isSyncedToCloud,
                  createdAt: Date.now()
              });
          }

          // 4. Create proper double-entry journal rows and update party account balances
          if (['Sale', 'Purchase', 'Sale Return', 'Purchase Return'].includes(type) && party) {
              let totalTaxable = 0;
              let totalGST = 0;

              for (const item of items) {
                  const gross = item.qty * item.rate;
                  const discount = gross * (item.discountPercent || 0) / 100;
                  const subTotal = gross - discount;
                  if (item.taxType === 'Included') {
                      const taxRate = item.taxPercent || 0;
                      const base = subTotal / (1 + (taxRate / 100));
                      const tax = subTotal - base;
                      totalTaxable += base;
                      totalGST += tax;
                  } else {
                      const tax = subTotal * (item.taxPercent || 0) / 100;
                      totalTaxable += subTotal;
                      totalGST += tax;
                  }
              }

              const mainPartyName = party.name;
              const companyProfileSetting = await db.settings.get('companyProfile');
              const companyProfile = companyProfileSetting ? companyProfileSetting.value : null;
              const isInterstate = companyProfile?.state && party?.state && companyProfile.state.toLowerCase() !== party.state.toLowerCase();
              const isUnionTerritory = ['delhi', 'chandigarh', 'puducherry', 'lakshadweep', 'andaman and nicobar islands', 'jammu and kashmir', 'ladakh', 'ladakh & jk'].includes((party?.state || '').toLowerCase());

              const rows: JournalRow[] = [];

              const addRowTx = (pId: string, pName: string, debit: number, credit: number) => {
                  if (debit > 0 || credit > 0) {
                      rows.push({
                          id: Math.random().toString(36).substr(2, 9),
                          partyId: pId,
                          partyName: pName,
                          debit: Number(debit.toFixed(2)),
                          credit: Number(credit.toFixed(2))
                      });
                  }
              };

              const salesLedger = await getLedgerTx('Sales A/C', 'Sales Account', 'Supplier');
              const purchaseLedger = await getLedgerTx('Purchase A/C', 'Purchase Account', 'Customer');
              const salesReturnLedger = await getLedgerTx('Sales Return A/C', 'Sales Account', 'Supplier');
              const purchaseReturnLedger = await getLedgerTx('Purchase Return A/C', 'Purchase Account', 'Customer');

              if (type === 'Sale') {
                  addRowTx(partyId, mainPartyName, totalAmount, 0);
                  addRowTx(salesLedger.id, salesLedger.name, 0, totalTaxable);
                  if (totalGST > 0) {
                      if (isInterstate) {
                          const igstLedger = await getLedgerTx('IGST A/C', 'Duties & Taxes', 'Supplier');
                          addRowTx(igstLedger.id, igstLedger.name, 0, totalGST);
                      } else if (isUnionTerritory) {
                          const utgstLedger = await getLedgerTx('UTGST A/C', 'Duties & Taxes', 'Supplier');
                          const cgstLedger = await getLedgerTx('CGST A/C', 'Duties & Taxes', 'Supplier');
                          addRowTx(cgstLedger.id, cgstLedger.name, 0, totalGST / 2);
                          addRowTx(utgstLedger.id, utgstLedger.name, 0, totalGST / 2);
                      } else {
                          const cgstLedger = await getLedgerTx('CGST A/C', 'Duties & Taxes', 'Supplier');
                          const sgstLedger = await getLedgerTx('SGST A/C', 'Duties & Taxes', 'Supplier');
                          addRowTx(cgstLedger.id, cgstLedger.name, 0, totalGST / 2);
                          addRowTx(sgstLedger.id, sgstLedger.name, 0, totalGST / 2);
                      }
                  }
              } else if (type === 'Purchase') {
                  addRowTx(purchaseLedger.id, purchaseLedger.name, totalTaxable, 0);
                  if (totalGST > 0) {
                      if (isInterstate) {
                          const igstLedger = await getLedgerTx('IGST A/C', 'Duties & Taxes', 'Supplier');
                          addRowTx(igstLedger.id, igstLedger.name, totalGST, 0);
                      } else if (isUnionTerritory) {
                          const utgstLedger = await getLedgerTx('UTGST A/C', 'Duties & Taxes', 'Supplier');
                          const cgstLedger = await getLedgerTx('CGST A/C', 'Duties & Taxes', 'Supplier');
                          addRowTx(cgstLedger.id, cgstLedger.name, totalGST / 2, 0);
                          addRowTx(utgstLedger.id, utgstLedger.name, totalGST / 2, 0);
                      } else {
                          const cgstLedger = await getLedgerTx('CGST A/C', 'Duties & Taxes', 'Supplier');
                          const sgstLedger = await getLedgerTx('SGST A/C', 'Duties & Taxes', 'Supplier');
                          addRowTx(cgstLedger.id, cgstLedger.name, totalGST / 2, 0);
                          addRowTx(sgstLedger.id, sgstLedger.name, totalGST / 2, 0);
                      }
                  }
                  addRowTx(partyId, mainPartyName, 0, totalAmount);
              } else if (type === 'Sale Return') {
                  addRowTx(salesReturnLedger.id, salesReturnLedger.name, totalTaxable, 0);
                  if (totalGST > 0) {
                      if (isInterstate) {
                          const igstLedger = await getLedgerTx('IGST A/C', 'Duties & Taxes', 'Supplier');
                          addRowTx(igstLedger.id, igstLedger.name, totalGST, 0);
                      } else if (isUnionTerritory) {
                          const utgstLedger = await getLedgerTx('UTGST A/C', 'Duties & Taxes', 'Supplier');
                          const cgstLedger = await getLedgerTx('CGST A/C', 'Duties & Taxes', 'Supplier');
                          addRowTx(cgstLedger.id, cgstLedger.name, totalGST / 2, 0);
                          addRowTx(utgstLedger.id, utgstLedger.name, totalGST / 2, 0);
                      } else {
                          const cgstLedger = await getLedgerTx('CGST A/C', 'Duties & Taxes', 'Supplier');
                          const sgstLedger = await getLedgerTx('SGST A/C', 'Duties & Taxes', 'Supplier');
                          addRowTx(cgstLedger.id, cgstLedger.name, totalGST / 2, 0);
                          addRowTx(sgstLedger.id, sgstLedger.name, totalGST / 2, 0);
                      }
                  }
                  addRowTx(partyId, mainPartyName, 0, totalAmount);
              } else if (type === 'Purchase Return') {
                  addRowTx(partyId, mainPartyName, totalAmount, 0);
                  addRowTx(purchaseReturnLedger.id, purchaseReturnLedger.name, 0, totalTaxable);
                  if (totalGST > 0) {
                      if (isInterstate) {
                          const igstLedger = await getLedgerTx('IGST A/C', 'Duties & Taxes', 'Supplier');
                          addRowTx(igstLedger.id, igstLedger.name, 0, totalGST);
                      } else if (isUnionTerritory) {
                          const utgstLedger = await getLedgerTx('UTGST A/C', 'Duties & Taxes', 'Supplier');
                          const cgstLedger = await getLedgerTx('CGST A/C', 'Duties & Taxes', 'Supplier');
                          addRowTx(cgstLedger.id, cgstLedger.name, 0, totalGST / 2);
                          addRowTx(utgstLedger.id, utgstLedger.name, 0, totalGST / 2);
                      } else {
                          const cgstLedger = await getLedgerTx('CGST A/C', 'Duties & Taxes', 'Supplier');
                          const sgstLedger = await getLedgerTx('SGST A/C', 'Duties & Taxes', 'Supplier');
                          addRowTx(cgstLedger.id, cgstLedger.name, 0, totalGST / 2);
                          addRowTx(sgstLedger.id, sgstLedger.name, 0, totalGST / 2);
                      }
                  }
              }

              const jv: JournalVoucher = {
                  id: 'jv_' + id,
                  voucherNo: 'JV-' + invoiceNo,
                  date: date.toLocalDateString(),
                  narration: `Double entry for ${type} ${invoiceNo}`,
                  rows,
                  totalAmount,
                  type: 'Journal'
              };
              await db.journals.put(jv);

              // Update actual ledger account current balances
              for (const row of rows) {
                  const p = await db.parties.get(row.partyId);
                  if (p) {
                      const change = row.debit - row.credit;
                      await db.parties.update(row.partyId, { currentBalance: p.currentBalance + change });
                  }
              }
          }

          const invoice: Invoice = {
              ...(oldInvoiceObj || {}),
              id: id,
              invoiceNo,
              partyId,
              partyName: party?.name || 'Unknown',
              date: date.toLocalDateString(),
              totalAmount,
              status: oldInvoiceObj ? oldInvoiceObj.status : 'UNPAID', // Preserve status if editing
              type,
              items
          };
          
          await db.invoices.put(invoice);

          // Secure entry: immediately trigger cryptographically chained Step 1 Transaction Log
          const cleanPayload = {
              id: invoice.id,
              invoiceNo: invoice.invoiceNo,
              partyId: invoice.partyId,
              totalAmount: invoice.totalAmount,
              type: invoice.type,
              action: 'atomic_invoice_save'
          };
          
          // Secure sequential crypto chaining queued under the same promise queue as the hooks
          Promise.resolve().then(() => {
              appendTransactionLog('invoices.save_atomic', cleanPayload);
          });

          // Increment settings sequence inside transaction
          if (!existingId && !customInvoiceNo) {
              const voucherSettingsSetting = await db.settings.get('voucherSettings');
              if (voucherSettingsSetting) {
                  const allSettings = voucherSettingsSetting.value || [];
                  const newSettings = allSettings.map((s: any) => s.type === type ? { ...s, currentSequence: s.currentSequence + 1 } : s);
                  await db.settings.put({ key: 'voucherSettings', value: newSettings });
              }
          }

          return id;
      });

      return returnedId;
  },
  getInvoices: async (type: TransactionType): Promise<Invoice[]> => {
      return sqliteService.getInvoicesByType(type);
  },
  getLastItemRate: async (partyId: string, itemId: string, transactionType: TransactionType): Promise<number | null> => {
      let targetType: TransactionType = 'Sale';
      if (['Purchase', 'Purchase Return', 'Purchase Order'].includes(transactionType)) {
          targetType = 'Purchase';
      }
      const invoices = await sqliteService.getInvoicesByType(targetType);
      const partyInvoices = invoices.filter(inv => inv.partyId === partyId);
      
      partyInvoices.sort((a, b) => {
          const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (timeDiff === 0) {
              const aId = a.invoiceNo || a.id;
              const bId = b.invoiceNo || b.id;
              return bId.localeCompare(aId); // Descending by ID/VoucherNo as tie-breaker
          }
          return timeDiff;
      });
      
      console.log(`[getLastItemRate] Checking ${partyInvoices.length} invoices for party ${partyId}, item ${itemId}, type ${targetType}`);
      
      for (const invoice of partyInvoices) {
          const item = invoice.items.find(i => i.item && i.item.id === itemId);
          if (item) {
              console.log(`[getLastItemRate] Found in invoice ${invoice.invoiceNo}: rate ${item.rate}`);
              return item.rate;
          }
      }
      console.log(`[getLastItemRate] Not found.`);
      return null;
  },
  getInvoiceById: async (id: string): Promise<Invoice | undefined> => sqliteService.getInvoiceById(id),
  getOrderById: async (id: string): Promise<Order | undefined> => sqliteService.getOrderById(id),

  // FIX: Reverse balance before deleting
  deleteInvoice: async (id: string) => { 
      const invoice = await sqliteService.getInvoiceById(id);
      if (invoice) {
          const party = await sqliteService.getPartyById(invoice.partyId);
          if (party && !['Sale Order', 'Purchase Order'].includes(invoice.type)) {
              // Reverse Balance Logic
              let reverseChange = -invoice.totalAmount; // Default reverse for Sale (Subtract)
              if (invoice.type === 'Purchase' || invoice.type === 'Sale Return') {
                  reverseChange = invoice.totalAmount; // Reverse for Purchase (Add back)
              }
              await sqliteService.updateParty(invoice.partyId, { currentBalance: party.currentBalance + reverseChange });
          }

          // Reverse stock impact
          if (['Sale', 'Purchase', 'Sale Return', 'Purchase Return'].includes(invoice.type)) {
              for (const item of invoice.items) {
                  if (item.item && item.item.id) {
                      const dbItem = await sqliteService.getItemById(item.item.id);
                      if (dbItem) {
                          let stockChange = item.qty; // Reverse of Sale is +qty
                          if (invoice.type === 'Purchase' || invoice.type === 'Sale Return') {
                              stockChange = -item.qty; // Reverse of Purchase is -qty
                          }
                          await sqliteService.updateItem(dbItem.id, { openingStock: (dbItem.openingStock || 0) + stockChange });
                      }
                  }
              }
          }

          await sqliteService.deleteInvoice(id);
          
          await sqliteService.deleteOrder(id);
          
          const orderCheck = await sqliteService.getOrderByInvoiceNo(invoice.invoiceNo);
          if (orderCheck && orderCheck.id !== id) {
              await sqliteService.deleteOrder(orderCheck.id);
          }
      }
  },

  // Import Data from Clipboard JSON
  importTransaction: async (jsonString: string): Promise<{ id: string, type: TransactionType }> => {
      try {
          const data = JSON.parse(jsonString);
          
          // Support both long keys (old) and short keys (new)
          const originType = data.originType || data.ot;
          const items = data.items || data.i;
          const partyName = data.partyName || data.pn;
          const customInvoiceNo = data.v; // Extract invoice number if present

          if (!originType || !items || !partyName) {
              throw new Error("Invalid Data Format");
          }
          
          let targetType: TransactionType;
          if (originType === 'Sale') targetType = 'Purchase';
          else if (originType === 'Purchase') targetType = 'Sale';
          else if (originType === 'Purchase Order') targetType = 'Sale Order';
          else if (originType === 'Sale Order') targetType = 'Purchase Order';
          else targetType = 'Purchase'; 

          // Check if party exists, or create new
          let party = await billingService.getPartyByName(partyName);
          let partyId = party?.id;

          if (!party) {
              partyId = Math.random().toString(36).substr(2, 9);
              const partyType = (targetType === 'Purchase' || targetType === 'Purchase Order') ? 'Supplier' : 'Customer';
              const accountGroup = partyType === 'Supplier' ? 'Sundry Creditors' : 'Sundry Debtors';

              await billingService.saveParty({
                  id: partyId,
                  name: partyName,
                  mobile: '',
                  type: partyType,
                  accountGroup: accountGroup,
                  currentBalance: 0
              });
          }

          const mappedItems = [];
          for (const item of items) {
              // Map short keys to full item properties
              const name = item.name || item.n;
              
              // Try to find item by name
              let existingItem = (await billingService.getAllItems()).find(i => i.name.toLowerCase() === name.toLowerCase());
              
              if (!existingItem) {
                  const newItemId = Math.random().toString(36).substr(2, 9);
                  existingItem = {
                      id: newItemId,
                      name: name,
                      code: '',
                      saleRate: item.rate || item.r || 0,
                      purchaseRate: item.rate || item.r || 0,
                      mrp: item.mrp || item.m || 0,
                      taxPercent: item.taxPercent || item.tp || 0,
                      taxType: (item.taxType === 'I' || item.tt === 'I') ? 'Included' : 'Excluded',
                      openingStock: 0,
                  };
                  await billingService.saveItem(existingItem);
              }
              
              mappedItems.push({
                  id: Math.random().toString(36).substr(2, 9),
                  item: existingItem,
                  qty: item.qty || item.q || 0,
                  rate: item.rate || item.r || 0,
                  mrp: item.mrp || item.m || 0,
                  taxType: (item.taxType === 'I' || item.tt === 'I') ? 'Included' : 'Excluded',
                  taxPercent: item.taxPercent || item.tp || 0,
                  discountPercent: item.discountPercent || item.dp || 0
              });
          }

          // Save as new Invoice
          const newId = await billingService.saveInvoice(partyId!, new Date(), mappedItems, targetType, undefined, customInvoiceNo);
          const invoice = await sqliteService.getInvoiceById(newId);
          if (invoice) {
              invoice.isOnlineImport = true;
              await sqliteService.saveInvoice(invoice);
          }
          return { id: newId, type: targetType };

      } catch (error) {
          console.error("Import Error", error);
          throw error;
      }
  },

  // Payments
  savePayment: async (payment: PaymentRecord, isEdit?: boolean) => {
      if (isEdit || !payment.id.startsWith(payment.type === 'Payment' ? 'PAY' : 'RCP') && !payment.id.startsWith('edit')) {
          // It might be an edit. Check if old exists.
          const oldPayment = await sqliteService.getPaymentById(payment.id);
          if (oldPayment) {
              const oldParty = await sqliteService.getPartyById(oldPayment.partyId);
              if (oldParty) {
                  let reverseChange = 0;
                  if (oldPayment.type === 'Receipt') reverseChange = oldPayment.amount; 
                  if (oldPayment.type === 'Payment') reverseChange = -oldPayment.amount; 
                  await sqliteService.updateParty(oldPayment.partyId, { currentBalance: oldParty.currentBalance + reverseChange });
              }
              if (oldPayment.modeLedgerId) {
                  const oldBankMode = await sqliteService.getPartyById(oldPayment.modeLedgerId);
                  if (oldBankMode) {
                      let reverseBankChange = 0;
                      if (oldPayment.type === 'Receipt') reverseBankChange = -oldPayment.amount; 
                      if (oldPayment.type === 'Payment') reverseBankChange = oldPayment.amount; 
                      await sqliteService.updateParty(oldPayment.modeLedgerId, { currentBalance: oldBankMode.currentBalance + reverseBankChange });
                  }
              }
          }
      }

      await sqliteService.savePayment(payment);
      const party = await sqliteService.getPartyById(payment.partyId);
      if (party) {
          let change = 0;
          if (payment.type === 'Receipt') change = -payment.amount; 
          if (payment.type === 'Payment') change = payment.amount; 
          
          await sqliteService.updateParty(payment.partyId, { currentBalance: party.currentBalance + change });
      }
      
      if (payment.modeLedgerId) {
          const modeBank = await sqliteService.getPartyById(payment.modeLedgerId);
          if (modeBank) {
              let bankChange = 0;
              if (payment.type === 'Receipt') bankChange = payment.amount; 
              if (payment.type === 'Payment') bankChange = -payment.amount; 
              
              await sqliteService.updateParty(payment.modeLedgerId, { currentBalance: modeBank.currentBalance + bankChange });
          }
      }
      if (!isEdit && !payment.id.startsWith('edit')) await billingService.incrementVoucherSequence(payment.type);
  },
  getAllPayments: async (type: 'Payment' | 'Receipt'): Promise<PaymentRecord[]> => {
      return sqliteService.getPaymentsByType(type);
  },
  getPaymentsByInvoiceId: async (invoiceId: string): Promise<PaymentRecord[]> => {
      return sqliteService.getPaymentsByInvoiceId(invoiceId);
  },
  deletePayment: async (id: string) => { 
      const payment = await sqliteService.getPaymentById(id);
      if (payment) {
          const party = await sqliteService.getPartyById(payment.partyId);
          if (party) {
              let reverseChange = 0;
              if (payment.type === 'Receipt') reverseChange = payment.amount;
              if (payment.type === 'Payment') reverseChange = -payment.amount;
              await sqliteService.updateParty(payment.partyId, { currentBalance: party.currentBalance + reverseChange });
          }
          if (payment.modeLedgerId) {
              const oldBankMode = await sqliteService.getPartyById(payment.modeLedgerId);
              if (oldBankMode) {
                  let reverseBankChange = 0;
                  if (payment.type === 'Receipt') reverseBankChange = -payment.amount; 
                  if (payment.type === 'Payment') reverseBankChange = payment.amount; 
                  await sqliteService.updateParty(payment.modeLedgerId, { currentBalance: oldBankMode.currentBalance + reverseBankChange });
              }
          }
          await sqliteService.deletePayment(id);
      }
  },

  // Journals
  getAllJournals: async (): Promise<JournalVoucher[]> => sqliteService.getAllJournals(),
  saveJournalVoucher: async (journal: JournalVoucher) => {
      await sqliteService.saveJournal(journal);
      for (const row of journal.rows) {
          const party = await sqliteService.getPartyById(row.partyId);
          if (party) {
              const change = row.debit - row.credit;
              await sqliteService.updateParty(row.partyId, { currentBalance: party.currentBalance + change });
          }
      }
  },
  deleteJournalVoucher: async (id: string) => { 
      const journal = await sqliteService.getJournalById(id);
      if (journal) {
          for (const row of journal.rows) {
              const party = await sqliteService.getPartyById(row.partyId);
              if (party) {
                  const reverseChange = row.credit - row.debit;
                  await sqliteService.updateParty(row.partyId, { currentBalance: party.currentBalance + reverseChange });
              }
          }
          await sqliteService.deleteJournal(id); 
      }
  },

  // Orders
  getAllOrders: async (): Promise<Order[]> => sqliteService.getAllOrders(),
  deleteOrder: async (id: string) => { await sqliteService.deleteOrder(id); },
  convertOrdersToSaleBills: async (orderIds: string[]): Promise<number> => {
      let count = 0;
      const uniqueOrderIds = Array.from(new Set(orderIds));
      for (const id of uniqueOrderIds) {
          if (processingOrders.has(id)) continue;
          processingOrders.add(id);
          try {
              const order = await sqliteService.getOrderById(id);
              if (order && !order.convertedToInvoiceId) {
                  const itemsCopy = JSON.parse(JSON.stringify(order.items));
                  const invoiceId = await billingService.saveInvoice(
                      order.partyId, 
                      new Date(order.date), 
                      itemsCopy, 
                      order.type === 'receive' ? 'Sale' : 'Purchase'
                  );
                  await sqliteService.updateOrder(id, { convertedToInvoiceId: invoiceId, status: 'completed' });
                  count++;
              }
          } finally {
              processingOrders.delete(id);
          }
      }
      return count;
  },

  // Workers
  getAllWorkers: async (): Promise<Worker[]> => sqliteService.getAllWorkers(),
  saveWorker: async (worker: Worker) => { await sqliteService.saveWorker(worker); },
  deleteWorker: async (id: string) => { await sqliteService.deleteWorker(id); },
  getAttendanceByDate: async (date: string): Promise<Attendance[]> => {
      return (await sqliteService.getAttendanceByDate(date)) as any;
  },
  markAttendance: async (workerId: string, date: string, status: 'Present' | 'Absent' | 'Half-Day') => {
      const existing = await sqliteService.getAttendanceByWorkerAndDate(workerId, date);
      if (existing) {
          await sqliteService.saveAttendance({ ...existing, status });
      } else {
          await sqliteService.saveAttendance({ id: Math.random().toString(36).substr(2, 9), workerId, date, status });
      }
  },
  getAttendanceByMonth: async (year: number, month: number): Promise<Attendance[]> => {
      const all = await sqliteService.getAllAttendance();
      return (all as any).filter(a => {
          const d = new Date(a.date);
          return d.getFullYear() === year && d.getMonth() === month;
      });
  },

  // Unified Transaction
  getUnifiedTransactions: async (): Promise<UnifiedTransaction[]> => {
      const invoices = await sqliteService.getAllInvoices();
      const payments = await sqliteService.getAllPayments();
      const journals = await sqliteService.getAllJournals();

      const combined: UnifiedTransaction[] = [
          ...invoices.map(inv => ({
              id: inv.id,
              date: inv.date,
              voucherNo: inv.invoiceNo,
              type: inv.type,
              partyName: inv.partyName,
              amount: inv.totalAmount,
              description: `Items: ${inv.items?.length || 0}`
          })),
          ...payments.map(pay => ({
              id: pay.id,
              date: pay.date,
              voucherNo: pay.voucherNo,
              type: pay.type,
              partyName: pay.partyName,
              amount: pay.amount,
              description: pay.remarks || pay.mode
          })),
          ...journals.map(j => ({
              id: j.id,
              date: j.date,
              voucherNo: j.voucherNo,
              type: j.type || 'Journal',
              partyName: j.rows.map(r => r.partyName).join(', '),
              amount: j.totalAmount,
              description: j.narration
          }))
      ];

      return combined.sort((a, b) => Date.fromLocalDateString(b.date).getTime() - Date.fromLocalDateString(a.date).getTime());
  },

  // Clear All Data
  clearAllData: async () => {
      // Clear SQLite
      await sqliteService.clearAllData();
      
      // Clear Dexie (for settings and any legacy stuff)
      await (db as any).transaction('rw', [db.parties, db.items, db.invoices, db.payments, db.journals, db.units, db.categories, db.taxes, db.hsn, db.workers, db.attendance, db.orders, db.settings], async () => {
          await Promise.all([
              db.parties.clear(),
              db.items.clear(),
              db.invoices.clear(),
              db.payments.clear(),
              db.journals.clear(),
              db.units.clear(),
              db.categories.clear(),
              db.taxes.clear(),
              db.hsn.clear(),
              db.workers.clear(),
              db.attendance.clear(),
              db.orders.clear(),
              db.settings.clear()
          ]);
      });

      // Clear all onboarding, security and config flags in local storage
      localStorage.removeItem('onboardingCompleted');
      localStorage.removeItem('companyProfileSetup');
      localStorage.removeItem('activeFY');
      localStorage.removeItem('appLockEnabled');
      localStorage.removeItem('appPin');
      localStorage.removeItem('app_initialized');
      localStorage.removeItem('appLanguage');
      localStorage.removeItem('language_selected');
      localStorage.removeItem('onboarding_role_selected');
      localStorage.removeItem('locked_role');
      localStorage.removeItem('storeCode');
      localStorage.removeItem('businessId_locked');
      localStorage.removeItem('locked_businessId');
      localStorage.removeItem('staff_permissions');
      localStorage.removeItem('companyProfile_fallback');
      localStorage.removeItem('eazy_billing_current_user');
      sessionStorage.removeItem('language_selected');
      sessionStorage.removeItem('hasShownSplash');
      sessionStorage.removeItem('navState');
      sessionStorage.removeItem('history');
  },

  // Seed Data
  seedDairyData: async () => {
      await billingService.clearAllData();

      const unitsToAdd = DEFAULT_UNITS.map(u => ({ id: Math.random().toString(36).substr(2, 9), name: u.name, code: u.code }));
      for (const u of unitsToAdd) await sqliteService.saveUnit(u);

      const groupsToAdd = DEFAULT_BUSINESS_CATEGORIES.map(name => ({ id: Math.random().toString(36).substr(2, 9), name: name }));
      for (const g of groupsToAdd) await sqliteService.saveCategory(g);

      const taxesToAdd = DEFAULT_TAXES.map(t => ({ id: Math.random().toString(36).substr(2, 9), name: t.name, rate: t.rate }));
      for (const t of taxesToAdd) await sqliteService.saveTax(t);

      const ledgersToAdd = DEFAULT_LEDGERS.map(l => ({
          id: Math.random().toString(36).substr(2, 9),
          name: l.name,
          mobile: '',
          type: l.type as 'Customer' | 'Supplier',
          accountGroup: l.group,
          currentBalance: 0,
          isLocal: true
      }));
      
      ledgersToAdd.push(
          { id: '1', name: 'Amul Dairy Supplier', mobile: '9876543210', type: 'Supplier', accountGroup: 'Sundry Creditors', currentBalance: -5000, isLocal: true, category: 'Dairy' } as any,
          { id: '2', name: 'Raju Tea Stall', mobile: '9988776655', type: 'Customer', accountGroup: 'Sundry Debtors', currentBalance: 2000, isLocal: true, category: 'Tea Stall' } as any,
          { id: '3', name: 'Sharma General Store', mobile: '8877665544', type: 'Customer', accountGroup: 'Sundry Debtors', currentBalance: 0, isLocal: true, category: 'Grocery' } as any
      );

      for (const l of ledgersToAdd) await sqliteService.saveParty(l);

      const itemsToAdd = [
          { id: '1', name: 'Amul Gold Milk', code: 'MILK01', saleRate: 66, purchaseRate: 60, mrp: 70, unit: 'LTR', openingStock: 50, taxPercent: 0, taxType: 'Excluded', category: 'Dairy' },
          { id: '2', name: 'Fresh Curd (Dahi)', code: 'CURD01', saleRate: 80, purchaseRate: 70, mrp: 90, unit: 'KGS', openingStock: 25, taxPercent: 0, taxType: 'Excluded', category: 'Dairy' },
          { id: '3', name: 'Paneer Premium', code: 'PAN01', saleRate: 380, purchaseRate: 320, mrp: 450, unit: 'KGS', openingStock: 15, taxPercent: 5, taxType: 'Excluded', category: 'Dairy' },
          { id: '4', name: 'Butter 500g', code: 'BUT01', saleRate: 260, purchaseRate: 240, mrp: 275, unit: 'PCS', openingStock: 100, taxPercent: 12, taxType: 'Included', category: 'Dairy' }
      ];
      for (const item of itemsToAdd) await sqliteService.saveItem(item as any);

      const defaultSettings = [
          { type: 'Sale', prefix: 'INV', currentSequence: 1, padding: 3 },
          { type: 'Purchase', prefix: 'PUR', currentSequence: 1, padding: 3 },
          { type: 'Payment', prefix: 'PAY', currentSequence: 1, padding: 4 },
          { type: 'Receipt', prefix: 'RCP', currentSequence: 1, padding: 4 },
          { type: 'Journal', prefix: 'JV', currentSequence: 0, padding: 4 },
          { type: 'Contra', prefix: 'CN', currentSequence: 0, padding: 4 },
          { type: 'Sale Order', prefix: 'SO', currentSequence: 0, padding: 3 },
          { type: 'Purchase Order', prefix: 'PO', currentSequence: 0, padding: 3 },
      ];
      await sqliteService.saveSetting('voucherSettings', defaultSettings);

      const invoiceId = 'demo-inv-1';
      const saleItems = [
          { id: 'i1', item: { id: '1', name: 'Amul Gold Milk' }, qty: 10, rate: 66, mrp: 70, taxType: 'Excluded', taxPercent: 0, discountPercent: 0 },
          { id: 'i2', item: { id: '3', name: 'Paneer Premium' }, qty: 2, rate: 380, mrp: 450, taxType: 'Excluded', taxPercent: 5, discountPercent: 0 }
      ];
      const totalAmt = 1458;

      await sqliteService.saveInvoice({
          id: invoiceId,
          invoiceNo: 'INV-001',
          partyId: '2',
          partyName: 'Raju Tea Stall',
          date: new Date().toLocalDateString(),
          totalAmount: totalAmt,
          status: 'UNPAID',
          type: 'Sale',
          items: saleItems as any
      });

      const party2 = await sqliteService.getPartyById('2');
      if (party2) {
          await sqliteService.updateParty('2', { currentBalance: party2.currentBalance + totalAmt });
      }
  },

  exportData: async (): Promise<string> => {
      return await sqliteService.exportData();
  },

  importData: async (jsonString: string): Promise<void> => {
      await sqliteService.importData(jsonString);
  },

  initDB: async (dbName: string) => {
      initPromise = initPromise.then(async () => {
          try {
              await initializeSqliteDB(dbName);
              if (db.name !== dbName) {
                  // Close the old database. This might cancel pending queries/opens on it,
                  // which will throw DatabaseClosedError or cancellation errors in those queries.
                  // We suppress those globally in App.tsx.
                  db.close();
                  db = new BillingDatabase(dbName);
              }
              
              if (!db.isOpen()) {
                  await db.open();
              }
          } catch (error: any) {
              console.error('Failed to initialize database:', error);
              throw error;
          }
      }).catch((err) => {
          // Catch to prevent unhandled rejections breaking the chain
          console.error('Error in initDB chain:', err);
      });

      await initPromise;
  },

  getMessages: async (partyId: string): Promise<ChatMessage[]> => {
      const msgs = await sqliteService.getMessagesByParty(partyId);
      const parseId = (id: string) => (id && typeof id === 'string' && id.length > 15 && id.includes('0.')) ? Number(id.replace('0.', '.')) : Number(id);
      return msgs.sort((a, b) => parseId(a.id) - parseId(b.id));
  },

  saveMessage: async (message: ChatMessage): Promise<void> => {
      await sqliteService.saveMessage(message);
  },

  deleteMessages: async (ids: string[]): Promise<void> => {
      for (const id of ids) {
          await sqliteService.deleteMessage(id);
      }
  },

  // Manufacturing
  saveManufacturingEntry: async (entry: ManufacturingEntry) => {
      // 1. Update Manufacturing table
      await sqliteService.saveManufacturingEntry(entry);

      // 2. Update finished good stock
      const finishedItem = await sqliteService.getItemById(entry.finishedItemId);
      if (finishedItem) {
          await sqliteService.updateItem(entry.finishedItemId, {
              openingStock: (finishedItem.openingStock || 0) + entry.finishedQuantity
          });
      }

      // 3. Update raw materials stock
      for (const rm of entry.rawMaterials) {
          const rawItem = await sqliteService.getItemById(rm.itemId);
          if (rawItem) {
              await sqliteService.updateItem(rm.itemId, {
                  openingStock: (rawItem.openingStock || 0) - rm.quantity
              });
          }
      }
  },
  getAllManufacturingEntries: async (): Promise<ManufacturingEntry[]> => {
      return await sqliteService.getAllManufacturingEntries();
  },
  getLastRecipeForItem: async (itemId: string): Promise<ManufacturingEntry | undefined> => {
      const entries = await sqliteService.getManufacturingEntriesByFinishedItem(itemId);
      if (entries.length === 0) return undefined;
      return entries[0];
  },
  deleteManufacturingEntry: async (id: string) => {
      const entry = await sqliteService.getManufacturingEntryById(id);
      if (!entry) return;

      // Reverse finished good stock
      const finishedItem = await sqliteService.getItemById(entry.finishedItemId);
      if (finishedItem) {
          await sqliteService.updateItem(entry.finishedItemId, {
              openingStock: (finishedItem.openingStock || 0) - entry.finishedQuantity
          });
      }

      // Reverse raw materials stock
      for (const rm of entry.rawMaterials) {
          const rawItem = await sqliteService.getItemById(rm.itemId);
          if (rawItem) {
              await sqliteService.updateItem(rm.itemId, {
                  openingStock: (rawItem.openingStock || 0) + rm.quantity
              });
          }
      }

      await sqliteService.deleteManufacturingEntry(id);
  },

  transferFinancialYear: async (newFyId: string, newFyLabel: string): Promise<void> => {
      // 1. Get current data that needs to be carried over
      const parties = await sqliteService.getAllParties();
      const updatedParties = parties.map(p => ({
          ...p,
          openingBalance: p.currentBalance
      }));
      
      const items = await sqliteService.getAllItems();
      const units = await sqliteService.getAllUnits();
      const categories = await sqliteService.getAllCategories();
      const taxes = await sqliteService.getAllTaxes();
      const hsn = await sqliteService.getAllHSN();
      const workers = await sqliteService.getAllWorkers();
      
      const allSettings = await billingService.getVoucherSettings();
      const newSettings = allSettings.map(s => ({ ...s, currentSequence: 0 }));
      const companyProfile = await billingService.getCompanyProfile();

      // 2. Add the new FY to localStorage
      const existingFys = JSON.parse(localStorage.getItem('availableFYs') || '[{"id":"BillingDB","label":"Current FY"}]');
      if (!existingFys.find((fy: any) => fy.id === newFyId)) {
          existingFys.push({ id: newFyId, label: newFyLabel });
          localStorage.setItem('availableFYs', JSON.stringify(existingFys));
      }
      localStorage.setItem('activeFY', newFyId);

      // 3. Switch to the new DB
      await billingService.initDB(newFyId);

      // 4. Populate the new DB with opening balances and master data
      for (const p of updatedParties) await sqliteService.saveParty(p);
      for (const i of items) await sqliteService.saveItem(i as any);
      for (const u of units) await sqliteService.saveUnit(u);
      for (const c of categories) await sqliteService.saveCategory(c);
      for (const t of taxes) await sqliteService.saveTax(t);
      for (const h of hsn) await sqliteService.saveHSN(h);
      for (const w of workers) await sqliteService.saveWorker(w);
      
      await sqliteService.saveSetting('voucherSettings', newSettings);
      await sqliteService.saveSetting('companyProfile', companyProfile);
  },

  uploadDataToCloud: async (): Promise<string> => {
      const profile = await billingService.getCompanyProfile();
      if (!profile.mobile) {
          throw new Error('Please save your mobile number in My Profile first.');
      }
      
      const cleanMobile = profile.mobile.replace(/\D/g, '');

      if (!auth.currentUser) {
           throw new Error('You must be signed in to sync to cloud.');
      }

      const data = await billingService.exportData();
      
      try {
          const docSnap = await getDoc(doc(firebaseDb, 'cloud_backups', cleanMobile));
          if (docSnap.exists()) {
              const cloudData = docSnap.data();
              if (cloudData && cloudData.backup_data) {
                  let localCount = 0;
                  let cloudCount = 0;
                  try {
                      const localObj = JSON.parse(data);
                      const cloudObj = JSON.parse(cloudData.backup_data);
                      
                      const countRecords = (obj: any) => {
                          let count = 0;
                          if (obj && obj.formatName === 'dexie' && Array.isArray(obj.data)) {
                              for(const table of obj.data) {
                                  if (['invoices', 'parties', 'items', 'payments', 'journals', 'orders'].includes(table.tableName) && Array.isArray(table.rows)) {
                                      count += table.rows.length;
                                  }
                              }
                          } else if (obj) {
                              for(const key of Object.keys(obj)) {
                                  if (['invoices', 'parties', 'items', 'payments', 'journals', 'orders'].includes(key) && Array.isArray(obj[key])) {
                                      count += obj[key].length;
                                  }
                              }
                          }
                          return count;
                      }
                      
                      localCount = countRecords(localObj);
                      cloudCount = countRecords(cloudObj);
                      
                  } catch (e) {
                      console.warn("Error parsing data for comparison", e);
                  }
                  
                  if (localCount < cloudCount) {
                      throw new Error(`सर्वर पर अधिक डाटा (Records: ${cloudCount}) उपलब्ध है, जबकि आपके ऐप में कम डाटा (Records: ${localCount}) है। पुराना डाटा डिलीट होने से बचाने के लिए अपलोड रोक दिया गया है। कृपया पहले 'क्लाउड से रिकवर करें' बटन का उपयोग करें।`);
                  }
              }
          }

          await setDoc(doc(firebaseDb, 'cloud_backups', cleanMobile), {
              uid: auth.currentUser?.uid || null,
              mobile: profile.mobile, 
              backup_data: data, 
              updated_at: new Date().toISOString() 
          });

          // Re-create/sync all root level collections (parties, items, invoices, payments, journals, orders) to Firestore as requested
          try {
              const SYNCABLE_TABLES = ['parties', 'items', 'invoices', 'payments', 'journals', 'orders'] as const;
              const dbInstance = getDb();
              for (const tableName of SYNCABLE_TABLES) {
                  let localRecords = [];
                  try {
                      localRecords = await dbInstance.table(tableName).toArray();
                  } catch (e1) {
                      console.warn(`Could not read local table ${tableName} during force upload:`, e1);
                      continue;
                  }
                  
                  for (const localRecord of localRecords) {
                      const docId = localRecord.id;
                      if (!docId) continue;
                      
                      const docRef = doc(firebaseDb, tableName, docId);
                      const serializedPayload = JSON.parse(
                          JSON.stringify({
                              ...localRecord,
                              businessId: cleanMobile,
                              isSyncedToCloud: true,
                              updatedAt: localRecord.updatedAt || Date.now()
                          }, (key, value) => (value === undefined ? null : value))
                      );
                      await setDoc(docRef, serializedPayload);
                      
                      // Update local flag
                      try {
                          await dbInstance.table(tableName).update(docId, { isSyncedToCloud: true });
                      } catch (e2) {}
                  }
              }
              console.log("Root Firestore collections synced successfully.");
          } catch (syncErr) {
              console.warn("Detailed root collections sync error:", syncErr);
          }

          return 'डाटा सफलतापूर्वक ऑनलाइन क्लाउड पर अपलोड हो गया है!';
      } catch (err: any) {
          if (err.message && err.message.includes('अपलोड रोक दिया गया है')) {
              throw err;
          }
          console.warn("Firebase failed, falling back to local demo cloud:", err);
          // Fallback to localStorage for demo purposes if Firebase fails
          localStorage.setItem(`demo_cloud_backup_${profile.mobile}`, data);
          return `असली क्लाउड सर्वर (Firebase) से कनेक्ट नहीं हो पाया। (${err?.message || err}) आपका डाटा "डेमो क्लाउड" (लोकल) में सेव कर दिया गया है।`;
      }
  },

  downloadDataFromCloud: async (): Promise<string> => {
      const profile = await billingService.getCompanyProfile();
      if (!profile.mobile) {
          throw new Error('Please save your mobile number in My Profile first.');
      }
      
      const cleanMobile = profile.mobile.replace(/\D/g, '');

      try {
          const docSnap = await getDoc(doc(firebaseDb, 'cloud_backups', cleanMobile));
              
          if (docSnap.exists()) {
              const data = docSnap.data();
              if (data && data.backup_data) {
                  await billingService.importData(data.backup_data);
                  return 'डाटा सफलतापूर्वक क्लाउड से रिकवर हो गया है! ऐप रीलोड हो रहा है...';
              }
          }
          
          throw new Error('Backup data is empty or not found.');
      } catch (err: any) {
          console.warn("Firebase failed, trying local demo cloud:", err);
          const localData = localStorage.getItem(`demo_cloud_backup_${profile.mobile}`);
          if (localData) {
              await billingService.importData(localData);
              return `असली क्लाउड सर्वर से कनेक्ट नहीं हो पाया (${err?.message || err}), लेकिन आपका डाटा "डेमो क्लाउड" से सफलतापूर्वक रिकवर कर लिया गया है!`;
          } else {
              throw new Error('क्लाउड सर्वर से कनेक्ट नहीं हो पाया और डेमो क्लाउड में भी कोई डाटा नहीं मिला।');
          }
      }
  },

  // --- Broadcast Methods ---
  getBroadcastGroups: async () => {
      return await sqliteService.getAllBroadcastGroups();
  },

  saveBroadcastGroup: async (group: BroadcastGroup) => {
      await sqliteService.saveBroadcastGroup(group);
  },

  deleteBroadcastGroup: async (id: string) => {
      await sqliteService.deleteBroadcastGroup(id);
  },

  getBroadcastGroup: async (id: string) => {
      return await sqliteService.getBroadcastGroupById(id);
  },

  verifyFinancialIntegrity: async () => {
      const invoices = await sqliteService.getAllInvoices();
      const financialInvoices = invoices.filter(i => ['Sale', 'Purchase', 'Sale Return', 'Purchase Return'].includes(i.type));

      const journals = await sqliteService.getAllJournals();
      const journalMap = new Map(journals.map(j => [j.id, j]));

      // Define local helper to get or create ledger account
      const getLedgerLocal = async (name: string, group: string, partyType: 'Customer' | 'Supplier') => {
          const all = await sqliteService.getAllParties();
          let found = all.find(p => p.name.toLowerCase() === name.toLowerCase());
          if (!found) {
              found = {
                  id: 'dyn_' + Math.random().toString(36).substr(2, 9),
                  name: name,
                  mobile: '',
                  type: partyType,
                  accountGroup: group,
                  currentBalance: 0,
                  isLocal: true
              };
              await sqliteService.saveParty(found);
          }
          return found;
      };

      // Auto-backfill / self-heal any missing or mismatched accounting journal rows for historical invoices
      let backfilledAny = false;
      for (const inv of financialInvoices) {
          const jvId = 'jv_' + inv.id;
          const existingJv = journalMap.get(jvId);
          const existingCredits = existingJv ? existingJv.rows.reduce((sum, r) => sum + r.credit, 0) : 0;
          const isMismatched = existingJv && Math.abs(existingCredits - inv.totalAmount) > 0.05;

          if (!existingJv || isMismatched) {
              if (isMismatched && existingJv) {
                  // Reverse old balance impact first before regenerating to keep party balances accurate
                  for (const row of existingJv.rows) {
                      const party = await sqliteService.getPartyById(row.partyId);
                      if (party) {
                          const reverseChange = row.credit - row.debit;
                          await sqliteService.updateParty(row.partyId, { currentBalance: party.currentBalance + reverseChange });
                      }
                  }
                  await db.journals.delete(jvId);
              }

              let totalTaxable = 0;
              let totalGST = 0;

              for (const item of (inv.items || [])) {
                  const gross = (item.qty || 0) * (item.rate || 0);
                  const discount = gross * (item.discountPercent || 0) / 100;
                  const subTotal = gross - discount;
                  if (item.taxType === 'Included') {
                      const taxRate = item.taxPercent || 0;
                      const base = subTotal / (1 + (taxRate / 100));
                      const tax = subTotal - base;
                      totalTaxable += base;
                      totalGST += tax;
                  } else {
                      const tax = subTotal * (item.taxPercent || 0) / 100;
                      totalTaxable += subTotal;
                      totalGST += tax;
                  }
              }

              const party = await sqliteService.getPartyById(inv.partyId);
              const mainPartyName = party?.name || 'Unknown';
              const companyProfile = await billingService.getCompanyProfile();
              const isInterstate = companyProfile?.state && party?.state && companyProfile.state.toLowerCase() !== party.state.toLowerCase();
              const isUnionTerritory = ['delhi', 'chandigarh', 'puducherry', 'lakshadweep', 'andaman and nicobar islands', 'jammu and kashmir', 'ladakh', 'ladakh & jk'].includes((party?.state || '').toLowerCase());

              const rows: JournalRow[] = [];

              const addRow = (pId: string, pName: string, debit: number, credit: number) => {
                  if (debit > 0 || credit > 0) {
                      rows.push({
                          id: Math.random().toString(36).substr(2, 9),
                          partyId: pId,
                          partyName: pName,
                          debit: Number(debit.toFixed(2)),
                          credit: Number(credit.toFixed(2))
                      });
                  }
              };

              const salesLedger = await getLedgerLocal('Sales A/C', 'Sales Account', 'Supplier');
              const purchaseLedger = await getLedgerLocal('Purchase A/C', 'Purchase Account', 'Customer');
              const salesReturnLedger = await getLedgerLocal('Sales Return A/C', 'Sales Account', 'Supplier');
              const purchaseReturnLedger = await getLedgerLocal('Purchase Return A/C', 'Purchase Account', 'Customer');

              if (inv.type === 'Sale') {
                  addRow(inv.partyId, mainPartyName, inv.totalAmount, 0);
                  addRow(salesLedger.id, salesLedger.name, 0, totalTaxable);
                  if (totalGST > 0) {
                      if (isInterstate) {
                          const igstLedger = await getLedgerLocal('IGST A/C', 'Duties & Taxes', 'Supplier');
                          addRow(igstLedger.id, igstLedger.name, 0, totalGST);
                      } else if (isUnionTerritory) {
                          const utgstLedger = await getLedgerLocal('UTGST A/C', 'Duties & Taxes', 'Supplier');
                          const cgstLedger = await getLedgerLocal('CGST A/C', 'Duties & Taxes', 'Supplier');
                          addRow(cgstLedger.id, cgstLedger.name, 0, totalGST / 2);
                          addRow(utgstLedger.id, utgstLedger.name, 0, totalGST / 2);
                      } else {
                          const cgstLedger = await getLedgerLocal('CGST A/C', 'Duties & Taxes', 'Supplier');
                          const sgstLedger = await getLedgerLocal('SGST A/C', 'Duties & Taxes', 'Supplier');
                          addRow(cgstLedger.id, cgstLedger.name, 0, totalGST / 2);
                          addRow(sgstLedger.id, sgstLedger.name, 0, totalGST / 2);
                      }
                  }
              } else if (inv.type === 'Purchase') {
                  addRow(purchaseLedger.id, purchaseLedger.name, totalTaxable, 0);
                  if (totalGST > 0) {
                      if (isInterstate) {
                          const igstLedger = await getLedgerLocal('IGST A/C', 'Duties & Taxes', 'Supplier');
                          addRow(igstLedger.id, igstLedger.name, totalGST, 0);
                      } else if (isUnionTerritory) {
                          const utgstLedger = await getLedgerLocal('UTGST A/C', 'Duties & Taxes', 'Supplier');
                          const cgstLedger = await getLedgerLocal('CGST A/C', 'Duties & Taxes', 'Supplier');
                          addRow(cgstLedger.id, cgstLedger.name, totalGST / 2, 0);
                          addRow(utgstLedger.id, utgstLedger.name, totalGST / 2, 0);
                      } else {
                          const cgstLedger = await getLedgerLocal('CGST A/C', 'Duties & Taxes', 'Supplier');
                          const sgstLedger = await getLedgerLocal('SGST A/C', 'Duties & Taxes', 'Supplier');
                          addRow(cgstLedger.id, cgstLedger.name, totalGST / 2, 0);
                          addRow(sgstLedger.id, sgstLedger.name, totalGST / 2, 0);
                      }
                  }
                  addRow(inv.partyId, mainPartyName, 0, inv.totalAmount);
              } else if (inv.type === 'Sale Return') {
                  addRow(salesReturnLedger.id, salesReturnLedger.name, totalTaxable, 0);
                  if (totalGST > 0) {
                      if (isInterstate) {
                          const igstLedger = await getLedgerLocal('IGST A/C', 'Duties & Taxes', 'Supplier');
                          addRow(igstLedger.id, igstLedger.name, totalGST, 0);
                      } else if (isUnionTerritory) {
                          const utgstLedger = await getLedgerLocal('UTGST A/C', 'Duties & Taxes', 'Supplier');
                          const cgstLedger = await getLedgerLocal('CGST A/C', 'Duties & Taxes', 'Supplier');
                          addRow(cgstLedger.id, cgstLedger.name, totalGST / 2, 0);
                          addRow(utgstLedger.id, utgstLedger.name, totalGST / 2, 0);
                      } else {
                          const cgstLedger = await getLedgerLocal('CGST A/C', 'Duties & Taxes', 'Supplier');
                          const sgstLedger = await getLedgerLocal('SGST A/C', 'Duties & Taxes', 'Supplier');
                          addRow(cgstLedger.id, cgstLedger.name, totalGST / 2, 0);
                          addRow(sgstLedger.id, sgstLedger.name, totalGST / 2, 0);
                      }
                  }
                  addRow(inv.partyId, mainPartyName, 0, inv.totalAmount);
              } else if (inv.type === 'Purchase Return') {
                  addRow(inv.partyId, mainPartyName, inv.totalAmount, 0);
                  addRow(purchaseReturnLedger.id, purchaseReturnLedger.name, 0, totalTaxable);
                  if (totalGST > 0) {
                      if (isInterstate) {
                          const igstLedger = await getLedgerLocal('IGST A/C', 'Duties & Taxes', 'Supplier');
                          addRow(igstLedger.id, igstLedger.name, 0, totalGST);
                      } else if (isUnionTerritory) {
                          const utgstLedger = await getLedgerLocal('UTGST A/C', 'Duties & Taxes', 'Supplier');
                          const cgstLedger = await getLedgerLocal('CGST A/C', 'Duties & Taxes', 'Supplier');
                          addRow(cgstLedger.id, cgstLedger.name, 0, totalGST / 2);
                          addRow(utgstLedger.id, utgstLedger.name, 0, totalGST / 2);
                      } else {
                          const cgstLedger = await getLedgerLocal('CGST A/C', 'Duties & Taxes', 'Supplier');
                          const sgstLedger = await getLedgerLocal('SGST A/C', 'Duties & Taxes', 'Supplier');
                          addRow(cgstLedger.id, cgstLedger.name, 0, totalGST / 2);
                          addRow(sgstLedger.id, sgstLedger.name, 0, totalGST / 2);
                      }
                  }
              }

              const jv: JournalVoucher = {
                  id: jvId,
                  voucherNo: 'JV-' + inv.invoiceNo,
                  date: inv.date,
                  narration: `Double entry for historical invoice ${inv.invoiceNo}`,
                  rows,
                  totalAmount: inv.totalAmount,
                  type: 'Journal'
              };
              await sqliteService.saveJournal(jv);
              journalMap.set(jvId, jv);
              backfilledAny = true;
          }
      }

      // Re-fetch journals if backfilled
      const finalJournals = backfilledAny ? await sqliteService.getAllJournals() : Array.from(journalMap.values());
      const invoiceJournals = finalJournals.filter(j => j.id.startsWith('jv_'));

      const ledgerCreditsSum = invoiceJournals.reduce((sum, j) => {
          return sum + (j.totalAmount || 0);
      }, 0);

      const invoiceSum = financialInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
      const isValid = Math.abs(invoiceSum - ledgerCreditsSum) < 0.05;

      return {
          isValid,
          invoiceSum: Number(invoiceSum.toFixed(2)),
          ledgerCreditsSum: Number(ledgerCreditsSum.toFixed(2)),
          details: isValid
              ? `Hisab barabar hai! Total: ₹${invoiceSum.toFixed(2)}`
              : `Mismatch found! Invoice: ₹${invoiceSum.toFixed(2)}, Ledger: ₹${ledgerCreditsSum.toFixed(2)}`
      };
  },

  checkDataIntegrityChain: async () => {
      try {
          const logs = await db.transaction_log.orderBy('timestamp').toArray();
          if (logs.length === 0) {
              return { isValid: true, checkedCount: 0 };
          }
          let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
          for (let i = 0; i < logs.length; i++) {
              const log = logs[i];
              const payloadStr = canonicalJsonStringify(log.payload || {});
              const textToHash = payloadStr + prevHash;
              const recomputed = await computeSha256(textToHash);
              if (recomputed !== log.stateHash) {
                  return { isValid: false, checkedCount: logs.length, brokenIndex: i };
              }
              prevHash = log.stateHash;
          }
          return { isValid: true, checkedCount: logs.length };
      } catch (e) {
          console.error("Integrity chain check error:", e);
          return { isValid: false, checkedCount: 0 };
      }
  }
};
