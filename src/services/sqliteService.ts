import { getDb, Order, ChatMessage, BroadcastGroup, setSuppressBillingHooks } from './billingService';
import { Party, Item, Invoice, PaymentRecord, JournalVoucher, Unit, Category, TaxRate, HSNCode, Worker, Attendance, SupplierItem, ManufacturingEntry, AccountGroup } from '../core/types/';

export const initializeSqliteDB = async (dbName: string) => {};
export const initializeDatabase = async () => {};
export const sql = async () => [];
export const db = {} as any;

export const sqliteService = {
  // Parties
  getAllParties: async (): Promise<Party[]> => getDb().parties.toArray(),
  getPartyById: async (id: string): Promise<Party | undefined> => getDb().parties.get(id),
  getPartyByMobile: async (mobile: string): Promise<Party | undefined> => getDb().parties.where('mobile').equals(mobile).first(),
  getPartyByName: async (name: string): Promise<Party | undefined> => getDb().parties.where('name').equals(name).first(),
  saveParty: async (party: Party) => { await getDb().parties.put(party); },
  updateParty: async (id: string, updates: Partial<Party>) => { await getDb().parties.update(id, updates); },
  deleteParty: async (id: string) => { await getDb().parties.delete(id); },

  // Categories
  getAllCategories: async (): Promise<Category[]> => getDb().categories.toArray(),
  saveCategory: async (category: Category) => { await getDb().categories.put(category); },
  deleteCategory: async (id: string) => { await getDb().categories.delete(id); },
  clearCategories: async () => { await getDb().categories.clear(); },

  // Account Groups
  getAllAccountGroups: async (): Promise<AccountGroup[]> => getDb().accountGroups.toArray(),
  saveAccountGroup: async (group: AccountGroup) => { await getDb().accountGroups.put(group); },
  deleteAccountGroup: async (id: string) => { await getDb().accountGroups.delete(id); },
  clearAccountGroups: async () => { await getDb().accountGroups.clear(); },

  // Items
  getAllItems: async (): Promise<Item[]> => {
    const items = await getDb().items.toArray();
    return items.filter(item => !item.isDeleted);
  },
  getItemById: async (id: string): Promise<Item | undefined> => {
    const item = await getDb().items.get(id);
    return item && !item.isDeleted ? item : undefined;
  },
  saveItem: async (item: Item) => { 
    item.updatedAt = Date.now();
    item.isSyncedToCloud = false;
    await getDb().items.put(item); 
  },
  updateItem: async (id: string, updates: Partial<Item>) => { 
    await getDb().items.update(id, { 
      ...updates, 
      updatedAt: Date.now(), 
      isSyncedToCloud: false 
    }); 
  },
  deleteItem: async (id: string) => { 
    await getDb().items.update(id, { isDeleted: true, isSyncedToCloud: false, updatedAt: Date.now() }); 
  },
  deleteItems: async (ids: string[]) => {
    for (const id of ids) {
      await sqliteService.deleteItem(id);
    }
  },

  // Invoices
  getAllInvoices: async (): Promise<Invoice[]> => {
    const invoices = await getDb().invoices.toArray();
    return invoices.filter(inv => !inv.isDeleted);
  },
  getInvoicesByType: async (type: string): Promise<Invoice[]> => {
    const invoices = await getDb().invoices.where('type').equals(type).toArray();
    return invoices.filter(inv => !inv.isDeleted);
  },
  getInvoiceById: async (id: string): Promise<Invoice | undefined> => {
    const invoice = await getDb().invoices.get(id);
    return invoice && !invoice.isDeleted ? invoice : undefined;
  },
  saveInvoice: async (invoice: Invoice) => { 
    invoice.updatedAt = Date.now();
    invoice.isSyncedToCloud = false;
    await getDb().invoices.put(invoice); 
  },
  deleteInvoice: async (id: string) => { 
    await getDb().invoices.update(id, { isDeleted: true, isSyncedToCloud: false, updatedAt: Date.now() }); 
  },

  // Orders
  getAllOrders: async (): Promise<Order[]> => getDb().orders.toArray(),
  getOrderById: async (id: string): Promise<Order | undefined> => getDb().orders.get(id),
  getOrderByInvoiceNo: async (invoiceNo: string): Promise<Order | undefined> => getDb().orders.where('orderNumber').equals(invoiceNo).first(),
  saveOrder: async (order: Order) => { await getDb().orders.put(order); },
  updateOrder: async (id: string, updates: Partial<Order>) => { await getDb().orders.update(id, updates); },
  deleteOrder: async (id: string) => { await getDb().orders.delete(id); },

  // Supplier Items
  getSupplierItems: async (supplierId: string): Promise<SupplierItem[]> => getDb().supplierItems.where('supplierId').equals(supplierId).toArray(),
  saveSupplierItem: async (item: SupplierItem) => { await getDb().supplierItems.put(item); },

  // Payments
  getAllPayments: async (): Promise<PaymentRecord[]> => getDb().payments.toArray(),
  getPaymentsByType: async (type: string): Promise<PaymentRecord[]> => getDb().payments.where('type').equals(type).toArray(),
  getPaymentsByInvoiceId: async (invoiceId: string): Promise<PaymentRecord[]> => getDb().payments.where('invoiceId').equals(invoiceId).toArray(),
  getPaymentById: async (id: string): Promise<PaymentRecord | undefined> => getDb().payments.get(id),
  savePayment: async (payment: PaymentRecord) => { await getDb().payments.put(payment); },
  deletePayment: async (id: string) => { await getDb().payments.delete(id); },

  // Journals
  getAllJournals: async (): Promise<JournalVoucher[]> => getDb().journals.toArray(),
  getJournalById: async (id: string): Promise<JournalVoucher | undefined> => getDb().journals.get(id),
  saveJournal: async (journal: JournalVoucher) => { await getDb().journals.put(journal); },
  deleteJournal: async (id: string) => { await getDb().journals.delete(id); },

  // Units
  getAllUnits: async (): Promise<Unit[]> => getDb().units.toArray(),
  saveUnit: async (unit: Unit) => { await getDb().units.put(unit); },
  deleteUnit: async (id: string) => { await getDb().units.delete(id); },

  // Taxes
  getAllTaxes: async (): Promise<TaxRate[]> => getDb().taxes.toArray(),
  saveTax: async (tax: TaxRate) => { await getDb().taxes.put(tax); },
  deleteTax: async (id: string) => { await getDb().taxes.delete(id); },

  // HSN
  getAllHSN: async (): Promise<HSNCode[]> => getDb().hsn.toArray(),
  saveHSN: async (hsn: HSNCode) => { await getDb().hsn.put(hsn); },
  deleteHSN: async (id: string) => { await getDb().hsn.delete(id); },

  // Workers
  getAllWorkers: async (): Promise<Worker[]> => getDb().workers.toArray(),
  saveWorker: async (worker: Worker) => { await getDb().workers.put(worker); },
  deleteWorker: async (id: string) => { await getDb().workers.delete(id); },

  // Attendance
  getAttendanceByDate: async (date: string): Promise<Attendance[]> => getDb().attendance.where('date').equals(date).toArray(),
  getAttendanceByWorkerAndDate: async (workerId: string, date: string): Promise<Attendance | undefined> => getDb().attendance.where({workerId, date}).first(),
  getAllAttendance: async (): Promise<Attendance[]> => getDb().attendance.toArray(),
  saveAttendance: async (attendance: Attendance) => { await getDb().attendance.put(attendance); },

  // Settings
  getSetting: async (key: string): Promise<any> => {
      const s = await getDb().settings.get(key);
      return s ? s.value : undefined;
  },
  saveSetting: async (key: string, value: any) => { await getDb().settings.put({key, value}); },

  // Messages
  getAllMessages: async (): Promise<ChatMessage[]> => getDb().messages.toArray(),
  getMessagesByParty: async (partyId: string): Promise<ChatMessage[]> => getDb().messages.where('partyId').equals(partyId).toArray(),
  saveMessage: async (msg: ChatMessage) => { await getDb().messages.put(msg); },
  deleteMessage: async (id: string) => { await getDb().messages.delete(id); },

  // Manufacturing
  getAllManufacturingEntries: async (): Promise<ManufacturingEntry[]> => getDb().manufacturing.toArray(),
  getManufacturingEntryById: async (id: string): Promise<ManufacturingEntry | undefined> => getDb().manufacturing.get(id),
  getManufacturingEntriesByFinishedItem: async (itemId: string): Promise<ManufacturingEntry[]> => getDb().manufacturing.where('finishedItemId').equals(itemId).toArray(),
  saveManufacturingEntry: async (entry: ManufacturingEntry) => { await getDb().manufacturing.put(entry); },
  deleteManufacturingEntry: async (id: string) => { await getDb().manufacturing.delete(id); },

  // BroadcastGroups
  getAllBroadcastGroups: async (): Promise<BroadcastGroup[]> => getDb().broadcastGroups.toArray(),
  getBroadcastGroupById: async (id: string): Promise<BroadcastGroup | undefined> => getDb().broadcastGroups.get(id),
  saveBroadcastGroup: async (group: BroadcastGroup) => { await getDb().broadcastGroups.put(group); },
  deleteBroadcastGroup: async (id: string) => { await getDb().broadcastGroups.delete(id); },

  clearAllData: async () => {
      setSuppressBillingHooks(true);
      try {
          await getDb().parties.clear();
          await getDb().items.clear();
          await getDb().invoices.clear();
          await getDb().payments.clear();
          await getDb().journals.clear();
          await getDb().units.clear();
          await getDb().categories.clear();
          await getDb().taxes.clear();
          await getDb().hsn.clear();
          await getDb().workers.clear();
          await getDb().attendance.clear();
          await getDb().orders.clear();
          await getDb().settings.clear();
          await getDb().messages.clear();
          await getDb().manufacturing.clear();
          await getDb().broadcastGroups.clear();
          await getDb().supplierItems.clear();
      } finally {
          setSuppressBillingHooks(false);
      }
  },
  
  exportData: async (): Promise<string> => {
      const db = getDb();
      const data: Record<string, any[]> = {};
      for (const table of db.tables) {
          data[table.name] = await table.toArray();
      }
      return JSON.stringify(data);
  },
  importData: async (jsonString: string): Promise<void> => {
      const db = getDb();
      try {
          const parsed = JSON.parse(jsonString);
          let dataToImport: Record<string, any[]> = {};

          if (parsed.formatName === 'dexie' && Array.isArray(parsed.data)) {
              // It's the dexie-export-import format
              for (const tableData of parsed.data) {
                  if (tableData.tableName && Array.isArray(tableData.rows)) {
                      dataToImport[tableData.tableName] = tableData.rows;
                  }
              }
          } else {
              // Custom format
              dataToImport = parsed;
          }

          setSuppressBillingHooks(true);
          try {
              await db.transaction('rw', db.tables, async () => {
                  for (const tableName of Object.keys(dataToImport)) {
                      const table = db.tables.find(t => t.name === tableName);
                      if (table) {
                          await table.clear();
                          if (Array.isArray(dataToImport[tableName]) && dataToImport[tableName].length > 0) {
                              try {
                                  await table.bulkAdd(dataToImport[tableName]);
                              } catch(bulkErr) {
                                  console.warn("Bulk add failed for table " + tableName, bulkErr);
                                  for(const row of dataToImport[tableName]) {
                                      try { await table.put(row); } catch(rowErr) {}
                                  }
                              }
                          }
                      }
                  }
              });
          } finally {
              setSuppressBillingHooks(false);
          }
      } catch (e) {
          console.error("Failed to import data:", e);
          throw new Error("Invalid backup file or format.");
      }
  }
};
