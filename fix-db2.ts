import * as fs from 'fs';
import * as path from 'path';

const content = `import { db as dexieDB } from './billingService';
import { Party, Item, Invoice, PaymentRecord, JournalVoucher, Unit, Category, TaxRate, HSNCode, Worker, Attendance, Order, ChatMessage, ManufacturingEntry, BroadcastGroup, SupplierItem } from '../types';

export const initializeSqliteDB = async (dbName: string) => {};
export const initializeDatabase = async () => {};
export const sql = async () => [];
export const db = {} as any;

export const sqliteService = {
  // Parties
  getAllParties: async (): Promise<Party[]> => dexieDB.parties.toArray(),
  getPartyById: async (id: string): Promise<Party | undefined> => dexieDB.parties.get(id),
  getPartyByMobile: async (mobile: string): Promise<Party | undefined> => dexieDB.parties.where('mobile').equals(mobile).first(),
  getPartyByName: async (name: string): Promise<Party | undefined> => dexieDB.parties.where('name').equals(name).first(),
  saveParty: async (party: Party) => { await dexieDB.parties.put(party); },
  updateParty: async (id: string, updates: Partial<Party>) => { await dexieDB.parties.update(id, updates); },
  deleteParty: async (id: string) => { await dexieDB.parties.delete(id); },

  // Categories
  getAllCategories: async (): Promise<Category[]> => dexieDB.categories.toArray(),
  saveCategory: async (category: Category) => { await dexieDB.categories.put(category); },
  deleteCategory: async (id: string) => { await dexieDB.categories.delete(id); },
  clearCategories: async () => { await dexieDB.categories.clear(); },

  // Items
  getAllItems: async (): Promise<Item[]> => dexieDB.items.toArray(),
  getItemById: async (id: string): Promise<Item | undefined> => dexieDB.items.get(id),
  saveItem: async (item: Item) => { await dexieDB.items.put(item); },
  updateItem: async (id: string, updates: Partial<Item>) => { await dexieDB.items.update(id, updates); },
  deleteItem: async (id: string) => { await dexieDB.items.delete(id); },
  deleteItems: async (ids: string[]) => { await dexieDB.items.bulkDelete(ids); },

  // Invoices
  getAllInvoices: async (): Promise<Invoice[]> => dexieDB.invoices.toArray(),
  getInvoicesByType: async (type: string): Promise<Invoice[]> => dexieDB.invoices.where('type').equals(type).toArray(),
  getInvoiceById: async (id: string): Promise<Invoice | undefined> => dexieDB.invoices.get(id),
  saveInvoice: async (invoice: Invoice) => { await dexieDB.invoices.put(invoice); },
  deleteInvoice: async (id: string) => { await dexieDB.invoices.delete(id); },

  // Orders
  getAllOrders: async (): Promise<Order[]> => dexieDB.orders.toArray(),
  getOrderById: async (id: string): Promise<Order | undefined> => dexieDB.orders.get(id),
  getOrderByInvoiceNo: async (invoiceNo: string): Promise<Order | undefined> => dexieDB.orders.where('orderNumber').equals(invoiceNo).first(),
  saveOrder: async (order: Order) => { await dexieDB.orders.put(order); },
  updateOrder: async (id: string, updates: Partial<Order>) => { await dexieDB.orders.update(id, updates); },
  deleteOrder: async (id: string) => { await dexieDB.orders.delete(id); },

  // Supplier Items
  getSupplierItems: async (supplierId: string): Promise<SupplierItem[]> => dexieDB.supplierItems.where('supplierId').equals(supplierId).toArray(),
  saveSupplierItem: async (item: SupplierItem) => { await dexieDB.supplierItems.put(item); },

  // Payments
  getAllPayments: async (): Promise<PaymentRecord[]> => dexieDB.payments.toArray(),
  getPaymentsByType: async (type: string): Promise<PaymentRecord[]> => dexieDB.payments.where('type').equals(type).toArray(),
  getPaymentsByInvoiceId: async (invoiceId: string): Promise<PaymentRecord[]> => dexieDB.payments.where('invoiceId').equals(invoiceId).toArray(),
  getPaymentById: async (id: string): Promise<PaymentRecord | undefined> => dexieDB.payments.get(id),
  savePayment: async (payment: PaymentRecord) => { await dexieDB.payments.put(payment); },
  deletePayment: async (id: string) => { await dexieDB.payments.delete(id); },

  // Journals
  getAllJournals: async (): Promise<JournalVoucher[]> => dexieDB.journals.toArray(),
  getJournalById: async (id: string): Promise<JournalVoucher | undefined> => dexieDB.journals.get(id),
  saveJournal: async (journal: JournalVoucher) => { await dexieDB.journals.put(journal); },
  deleteJournal: async (id: string) => { await dexieDB.journals.delete(id); },

  // Units
  getAllUnits: async (): Promise<Unit[]> => dexieDB.units.toArray(),
  saveUnit: async (unit: Unit) => { await dexieDB.units.put(unit); },
  deleteUnit: async (id: string) => { await dexieDB.units.delete(id); },

  // Taxes
  getAllTaxes: async (): Promise<TaxRate[]> => dexieDB.taxes.toArray(),
  saveTax: async (tax: TaxRate) => { await dexieDB.taxes.put(tax); },
  deleteTax: async (id: string) => { await dexieDB.taxes.delete(id); },

  // HSN
  getAllHSN: async (): Promise<HSNCode[]> => dexieDB.hsn.toArray(),
  saveHSN: async (hsn: HSNCode) => { await dexieDB.hsn.put(hsn); },
  deleteHSN: async (id: string) => { await dexieDB.hsn.delete(id); },

  // Workers
  getAllWorkers: async (): Promise<Worker[]> => dexieDB.workers.toArray(),
  saveWorker: async (worker: Worker) => { await dexieDB.workers.put(worker); },
  deleteWorker: async (id: string) => { await dexieDB.workers.delete(id); },

  // Attendance
  getAttendanceByDate: async (date: string): Promise<Attendance[]> => dexieDB.attendance.where('date').equals(date).toArray(),
  getAttendanceByWorkerAndDate: async (workerId: string, date: string): Promise<Attendance | undefined> => dexieDB.attendance.where({workerId, date}).first(),
  getAllAttendance: async (): Promise<Attendance[]> => dexieDB.attendance.toArray(),
  saveAttendance: async (attendance: Attendance) => { await dexieDB.attendance.put(attendance); },

  // Settings
  getSetting: async (key: string): Promise<any> => {
      const s = await dexieDB.settings.get(key);
      return s ? s.value : undefined;
  },
  saveSetting: async (key: string, value: any) => { await dexieDB.settings.put({key, value}); },

  // Messages
  getAllMessages: async (): Promise<ChatMessage[]> => dexieDB.messages.toArray(),
  getMessagesByParty: async (partyId: string): Promise<ChatMessage[]> => dexieDB.messages.where('partyId').equals(partyId).toArray(),
  saveMessage: async (msg: ChatMessage) => { await dexieDB.messages.put(msg); },
  deleteMessage: async (id: string) => { await dexieDB.messages.delete(id); },

  // Manufacturing
  getAllManufacturingEntries: async (): Promise<ManufacturingEntry[]> => dexieDB.manufacturing.toArray(),
  getManufacturingEntryById: async (id: string): Promise<ManufacturingEntry | undefined> => dexieDB.manufacturing.get(id),
  getManufacturingEntriesByFinishedItem: async (itemId: string): Promise<ManufacturingEntry[]> => dexieDB.manufacturing.where('finishedItemId').equals(itemId).toArray(),
  saveManufacturingEntry: async (entry: ManufacturingEntry) => { await dexieDB.manufacturing.put(entry); },
  deleteManufacturingEntry: async (id: string) => { await dexieDB.manufacturing.delete(id); },

  // BroadcastGroups
  getAllBroadcastGroups: async (): Promise<BroadcastGroup[]> => dexieDB.broadcastGroups.toArray(),
  getBroadcastGroupById: async (id: string): Promise<BroadcastGroup | undefined> => dexieDB.broadcastGroups.get(id),
  saveBroadcastGroup: async (group: BroadcastGroup) => { await dexieDB.broadcastGroups.put(group); },
  deleteBroadcastGroup: async (id: string) => { await dexieDB.broadcastGroups.delete(id); },

  clearAllData: async () => {
      await dexieDB.parties.clear();
      await dexieDB.items.clear();
      await dexieDB.invoices.clear();
      await dexieDB.payments.clear();
      await dexieDB.journals.clear();
      await dexieDB.units.clear();
      await dexieDB.categories.clear();
      await dexieDB.taxes.clear();
      await dexieDB.hsn.clear();
      await dexieDB.workers.clear();
      await dexieDB.attendance.clear();
      await dexieDB.orders.clear();
      await dexieDB.settings.clear();
      await dexieDB.messages.clear();
      await dexieDB.manufacturing.clear();
      await dexieDB.broadcastGroups.clear();
      await dexieDB.supplierItems.clear();
  },
  
  exportData: async () => "{}",
  importData: async (jsonString: string) => {}
};
`;

fs.writeFileSync(path.join(process.cwd(), 'services', 'sqliteService.ts'), content);
console.log("Rewritten sqliteService.ts to use Dexie.");
