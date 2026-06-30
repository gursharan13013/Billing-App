export const APP_VERSION = "2.1.0";
export const BUILD_DATE = "11-May-2026";

export interface SupplierItem {
  id: string; // partyId_itemId format or just random UUID
  supplierId: string;
  itemId: string;
  itemName: string;
  itemCode?: string;
  category?: string;
}

export interface Party {
  id: string;
  name: string;
  mobile: string;
  type: 'Customer' | 'Supplier';
  accountGroup?: string; // New: For Tally-like grouping (e.g., Sundry Debtors, Bank, etc.)
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  openingBalance?: number;
  currentBalance: number;
  email?: string;
  category?: string; // Added category field for search
  isLocal?: boolean; // True if saved in user's database, False if from Global Search
  isGstRegistered?: boolean;
  bankDetails?: string;
  businessId?: string; // Added for multi-device sync
  updatedAt?: number;  // Added for multi-device sync
  isDeleted?: boolean; // Added for soft deletes
  isSyncedToCloud?: boolean; // Added for cloud sync matching
  _fieldUpdatedAt?: Record<string, number>; // Per-field conflict resolution tracking
}

export interface Item {
  id: string;
  name: string;
  code?: string; // Item Code / Barcode
  hsnCode?: string;
  saleRate: number;
  purchaseRate?: number;
  mrp?: number;
  taxPercent?: number; // GST %
  taxType?: 'Excluded' | 'Included';
  openingStock?: number;
  unit?: string;
  category?: string;
  businessId?: string; // Added for multi-device sync
  updatedAt?: number;  // Added for multi-device sync
  isDeleted?: boolean; // Added for soft deletes
  isSyncedToCloud?: boolean; // Added for cloud sync matching
  _fieldUpdatedAt?: Record<string, number>; // Per-field conflict resolution tracking
}

export interface InvoiceItem {
  id: string; // unique id for list rendering
  item: Item;
  qty: number;
  rate: number;
  mrp: number;
  purchaseRate?: number;
  taxType: 'Excluded' | 'Included';
  taxPercent: number;
  discountPercent: number;
}

export interface Unit {
  id: string;
  name: string;
  code: string;
}

export interface CompanyProfile {
  name: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin: string;
  pan?: string;
  mobile: string;
  email: string;
  website?: string;
  bankDetails?: string;
  terms?: string;
  // New Fields
  businessCategory?: string;
  businessType?: string;
  latitude?: number;
  longitude?: number;
  isGstRegistered?: boolean;
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
}

export interface AccountGroup {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface HSNCode {
  id: string;
  code: string;
  description?: string;
  taxRate?: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  partyId: string;
  partyName: string;
  date: string; // YYYY-MM-DD
  totalAmount: number;
  status: 'PAID' | 'UNPAID' | 'PARTIAL';
  type: TransactionType;
  items?: InvoiceItem[]; // Added to store items for editing
  isSyncedToCloud?: boolean; // Indicates if invoice was synced to client
  isOnlineImport?: boolean; // Indicates if invoice was imported from online
  businessId?: string; // Added for multi-device sync
  updatedAt?: number;  // Added for multi-device sync
  isDeleted?: boolean; // Added for soft deletes
  _fieldUpdatedAt?: Record<string, number>; // Per-field conflict resolution tracking
}

export interface PaymentRecord {
  id: string;
  voucherNo: string;
  partyId: string;
  partyName: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: 'Payment' | 'Receipt';
  mode: 'Cash' | 'Bank' | 'Online' | string;
  modeLedgerId?: string;
  remarks?: string;
  invoiceId?: string; // Link payment to specific invoice
  isSyncedToCloud?: boolean; // Indicates if payment was synced to client
  createdAt?: number; // timestamp for sorting
  businessId?: string; // Added for multi-device sync
  updatedAt?: number;  // Added for multi-device sync
  isDeleted?: boolean; // Added for soft deletes
  _fieldUpdatedAt?: Record<string, number>; // Per-field conflict resolution tracking
}

export interface JournalRow {
  id: string;
  partyId: string;
  partyName: string;
  debit: number;
  credit: number;
}

export interface JournalVoucher {
  id: string;
  voucherNo: string;
  date: string;
  narration: string;
  rows: JournalRow[];
  totalAmount: number;
  type?: 'Journal' | 'Contra'; // Added Contra type
}

// --- NEW WORKER TYPES ---
export interface Worker {
  id: string;
  name: string;
  mobile: string;
  dailyWage: number; // Salary per day
}

export interface Attendance {
  id: string;
  date: string; // YYYY-MM-DD
  workerId: string;
  status: 'Present' | 'Absent' | 'Half-Day';
}

// --- NEW VOUCHER SETTINGS ---
export interface VoucherSettings {
    type: TransactionType;
    prefix: string;
    currentSequence: number;
    padding: number; // e.g. 3 => 001
}

export interface UnifiedTransaction {
    id: string;
    date: string;
    voucherNo: string;
    type: string;
    partyName: string;
    amount: number;
    description?: string;
}

export interface RawMaterialConsumption {
  itemId: string;
  itemName: string;
  quantity: number;
  costPerUnit: number;
}

export interface ManufacturingEntry {
  id: string;
  date: string;
  finishedItemId: string;
  finishedItemName: string;
  finishedQuantity: number;
  rawMaterials: RawMaterialConsumption[];
  totalCost: number;
  notes?: string;
}

export type InvoiceStatus = 'draft' | 'saved' | 'loading' | 'error';
export type TransactionType = 'Sale' | 'Purchase' | 'Sale Return' | 'Purchase Return' | 'Payment' | 'Receipt' | 'Sale Order' | 'Purchase Order' | 'Contra' | 'Journal';
export type Language = 'en' | 'hi';
export type Theme = 'light' | 'dark';

export interface AppSettings {
  offlineMode: boolean; // "Offline Core" - primary save is always local
  cloudSyncEnabled: boolean; // Enables background sync to Firebase
  messagingEnabled: boolean; // Enalbes Chat features
  liveSearchEnabled: boolean; // Enables online customer search
}

// --- USER INTERFACE ---
export interface User {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  role: 'admin' | 'staff';
  businessId?: string;
  storeCode?: string;
  updatedAt?: number;
  permissions?: {
    can_delete_invoice: boolean;
    can_edit_stock: boolean;
    view_reports: boolean;
    manage_settings: boolean;
  };
}

// --- UNIFIED CATEGORY LIST ---
export const UNIFIED_CATEGORIES = [
    { en: "AC Mechanic", hi: "AC मैकेनिक" },
    { en: "AC Repair & Tent Service", hi: "एसी रिपेयर और टेंट सर्विस" },
    { en: "Actor", hi: "अभिनेता" },
    { en: "AI Developer", hi: "AI डेवलपर" },
    { en: "Air Hostess", hi: "एयर होस्टेस" },
    { en: "All Furniture Shop", hi: "ऑल फर्नीचर की दुकान" },
    { en: "Animal Feed Shop", hi: "हेनाफोड / पशु चारा दुकान" },
    { en: "Architect", hi: "आर्किटेक्ट" },
    { en: "Astrologer", hi: "ज्योतिषी" },
    { en: "Astronaut", hi: "एस्ट्रोनॉट" },
    { en: "ATM Booth", hi: "ATM बूथ" },
    { en: "Audiobook Narrator", hi: "ऑडियोबुक रिकॉर्डर" },
    { en: "Automobile Mechanic", hi: "ऑटोमोबाइल मैकेनिक" },
    { en: "Automobile Workshop", hi: "ऑटोमोबाइल कार्यशाला" },
    { en: "Ayurvedic Doctor", hi: "वैद्य" },
    { en: "Ayurvedic Shopkeeper", hi: "आयुर्वेदिक दुकानदार" },
    { en: "Bakery", hi: "बेकरी" },
    { en: "Bakery Operator", hi: "बेकरी संचालक" },
    { en: "Bank Branch", hi: "बैंक शाखा" },
    { en: "Barber", hi: "नाई" },
    { en: "Beauty Parlor Worker", hi: "ब्यूटी पार्लर कर्मचारी" },
    { en: "Betel Seller", hi: "पानवाला" },
    { en: "Bicycle Repair Shop", hi: "साइकिल रिपेयर की दुकान" },
    { en: "Blockchain Engineer", hi: "ब्लॉकचेन इंजीनियर" },
    { en: "Bodyguard", hi: "बॉडीगार्ड" },
    { en: "Book Seller", hi: "किताब दुकानदार" },
    { en: "Builder", hi: "बिल्डर" },
    { en: "Building Contractor", hi: "बिल्डिंग ठेकेदार" },
    { en: "Building Material Shop", hi: "बिल्डिंग मटेरियल शॉप" },
    { en: "Bus Travel Agency", hi: "बस ट्रैवल एजेंसी" },
    { en: "Cable Operator", hi: "केबल ऑपरेटर" },
    { en: "Cameraman", hi: "कैमरामैन" },
    { en: "Car Accessories", hi: "कार एसेसरीज" },
    { en: "Car Charging Point", hi: "कार चार्जर" },
    { en: "Car Dealership", hi: "कार एजेंसी" },
    { en: "Car Sale & Purchase", hi: "कार सेल परचेस" },
    { en: "Car Scrap", hi: "कार स्क्रैप" },
    { en: "Car Service Station", hi: "कार सर्विस स्टेशन" },
    { en: "Car Travel Agency", hi: "कार ट्रैवल एजेंसी" },
    { en: "Carpenter", hi: "बढ़ई" },
    { en: "CCTV/Security Devices Shop", hi: "सीसीटीवी / सिक्योरिटी डिवाइस शॉप" },
    { en: "Cement/Brick/Sand Store", hi: "सीमेंट / ईंट / बालू स्टोर" },
    { en: "Chef", hi: "शेफ" },
    { en: "Chemist", hi: "दवाई की दुकान" },
    { en: "Chinese Fast Food Shop", hi: "चायनिज फास्ट फूड शॉप" },
    { en: "Climate Activist", hi: "क्लाइमेट एक्टिविस्ट" },
    { en: "Cloth Dry Cleaner/Laundry Shop", hi: "क्लॉथ ड्राई क्लीनर / लॉन्ड्री शॉप" },
    { en: "Coach", hi: "कोच" },
    { en: "Coaching Center Owner", hi: "कोचिंग सेंटर संचालक" },
    { en: "Cobbler", hi: "मोची" },
    { en: "College", hi: "कॉलेज" },
    { en: "Combine Harvesting Service Provider", hi: "कंबाइन किसान की फसल काटने की सर्विस देने वाला" },
    { en: "Combine Scrap", hi: "कंबाइन स्क्रैप" },
    { en: "Combine Spare Parts", hi: "कंबाइन स्पेयर पार्ट" },
    { en: "Combine Spare Parts Shop", hi: "कंबाइन के स्पेयर पार्ट की दुकान" },
    { en: "Commando", hi: "कमांडो" },
    { en: "Computer Repair Expert", hi: "कंप्यूटर रिपेयरिंग एक्सपर्ट" },
    { en: "Computer Teacher", hi: "कंप्यूटर टीचर" },
    { en: "Computer/Laptop Sales Shop", hi: "कंप्यूटर / लैपटॉप सेल्स शॉप" },
    { en: "Concrete Centering Contractor", hi: "सेंटर डालने वाला ठेकेदार" },
    { en: "Consumer Support Center", hi: "उपभोक्ता सहायता केंद्र" },
    { en: "Content Writer", hi: "कंटेंट राइटर" },
    { en: "Cook", hi: "रसोइया" },
    { en: "Counselor", hi: "काउंसलर" },
    { en: "Country Liquor Shop", hi: "देसी शराब की दुकान" },
    { en: "Craft Shop Owner", hi: "क्राफ्ट शॉप संचालक" },
    { en: "Craftsman", hi: "कारीगर" },
    { en: "Cricket Team Member", hi: "क्रिकेट टीम में" },
    { en: "Crypto Trader", hi: "क्रिप्टो ट्रेडर" },
    { en: "Cyber Cafe Operator", hi: "साइबर कैफे ऑपरेटर" },
    { en: "Cyber Security Expert", hi: "साइबर सुरक्षा विशेषज्ञ" },
    { en: "Dairy Booth Operator", hi: "डेयरी बूथ ऑपरेटर" },
    { en: "Dairy Farmer", hi: "डेयरी किसान" },
    { en: "Dance Instructor", hi: "डांस टीचर" },
    { en: "Data Entry Operator", hi: "डेटा एंट्री ऑपरेटर" },
    { en: "Data Scientist", hi: "डाटा साइंटिस्ट" },
    { en: "Decoration Items Shop", hi: "डेकोरेशन आइटम्स शॉप" },
    { en: "Delivery Boy", hi: "डिलीवरी बॉय" },
    { en: "Dental Hospital", hi: "डेंटल हॉस्पिटल" },
    { en: "Dharamshala / Pilgrim Lodge", hi: "धर्मशाला" },
    { en: "Driver", hi: "ड्राइवर" },
    { en: "Driving School", hi: "ड्राइविंग स्कूल" },
    { en: "Editor", hi: "एडिटर" },
    { en: "Electrical Fittings Shop", hi: "बिजली फिटिंग शॉप" },
    { en: "Electrician", hi: "इलेक्ट्रीशियन" },
    { en: "Electrician Spare Parts Shop", hi: "इलेक्ट्रीशियन स्पेयर पार्ट शॉप" },
    { en: "Electronics", hi: "इलेक्ट्रॉनिक्स" },
    { en: "Electronics Mall", hi: "इलेक्ट्रॉनिक मॉल" },
    { en: "Electronics Shopkeeper", hi: "इलेक्ट्रॉनिक्स दुकानदार" },
    { en: "Engineer", hi: "इंजीनियर" },
    { en: "English Liquor Shop", hi: "अंग्रेजी शराब की दुकान" },
    { en: "Environment Specialist", hi: "पर्यावरण विशेषज्ञ" },
    { en: "Esports Player", hi: "ई-स्पोर्ट्स खिलाड़ी" },
    { en: "Event Manager", hi: "इवेंट मैनेजर" },
    { en: "Fabric/Sewing Material Shop", hi: "फैब्रिक / सिलाई सामग्री की दुकान" },
    { en: "Farmer Fertilizer & Seed Shop", hi: "किसान खाद बीज दुकान" },
    { en: "Financial Advisor", hi: "फाइनेंशियल एडवाइज़र" },
    { en: "Fisherman", hi: "मछुआरा" },
    { en: "Flour Mill", hi: "आटा चक्की" },
    { en: "Flower Shop", hi: "फूलों की दुकान" },
    { en: "Footwear", hi: "जूते चप्पल" },
    { en: "Footwear Shop", hi: "जूते चप्पलों की दुकान" },
    { en: "Fruit Seller", hi: "फलवाला" },
    { en: "Furniture", hi: "फर्नीचर" },
    { en: "Furniture Showroom", hi: "फर्नीचर शोरूम" },
    { en: "Game Commentator", hi: "गेम कमेंटेटर" },
    { en: "Game Developer", hi: "गेम डेवलपर" },
    { en: "Gardener", hi: "माली" },
    { en: "Garments / Clothing", hi: "कपड़े की दुकान" },
    { en: "Gas Stove/Kitchen Appliances Shop", hi: "गैस चूल्हा / किचन अप्लायंसेस शॉप" },
    { en: "Gift Shop Owner", hi: "गिफ्ट शॉप संचालक" },
    { en: "Government Ration Depot", hi: "सरकारी डिपो की दुकान" },
    { en: "Grain Market / Corn Exchange", hi: "अनाज मंडी" },
    { en: "Graphic Designer", hi: "ग्राफिक डिज़ाइनर" },
    { en: "Grocery and Provisions Store", hi: "पंसारी और किराना स्टोर" },
    { en: "Grocery Shopkeeper", hi: "किराना दुकानदार" },
    { en: "Grocery Store", hi: "किराना स्टोर" },
    { en: "Gym Trainer", hi: "जिम ट्रेनर" },
    { en: "Hardware Shopkeeper", hi: "हार्डवेयर दुकानदार" },
    { en: "Hardware Store", hi: "हार्डवेयर स्टोर" },
    { en: "Hotel Manager", hi: "होटल मैनेजर" },
    { en: "Housemaid", hi: "घरेलू सहायिका" },
    { en: "Ice Cream Parlor Operator", hi: "आइसक्रीम पार्लर ऑपरेटर" },
    { en: "Interior Decorator", hi: "इंटीरियर डेकोरेटर" },
    { en: "Internet Service Provider (ISP)", hi: "नेट सर्विस" },
    { en: "Inverter & Solar Technician", hi: "इनवर्टर एंड सोलर" },
    { en: "Inverter Technician", hi: "इनवर्टर मिस्त्री" },
    { en: "Iron/Steel Shop", hi: "लोहा / स्टील की दुकान" },
    { en: "Jewelry", hi: "आभूषण" },
    { en: "Jewelry Seller", hi: "ज्वेलरी दुकानदार" },
    { en: "Journalist", hi: "पत्रकार" },
    { en: "Juice Corner", hi: "जूस कॉर्नर" },
    { en: "Kitchen Utensils Shop", hi: "किचन बर्तनों की दुकान" },
    { en: "Lawyer", hi: "वकील" },
    { en: "LED Lights Shop", hi: "एलईडी लाइट्स शॉप" },
    { en: "Life Coach", hi: "लाइफ कोच" },
    { en: "Lighting and Decoration Seller", hi: "लाइटिंग और डेकोरेशन विक्रेता" },
    { en: "Manufacturing Industry", hi: "मैन्युफैक्चर इंडस्ट्री" },
    { en: "Marble Polisher", hi: "मार्बल पोलिश करने वाला" },
    { en: "Mason", hi: "राज मिस्त्री" },
    { en: "Mechanic", hi: "मिस्त्री" },
    { en: "Milk Dairy Shop", hi: "मिल्क डेरी शॉप" },
    { en: "Milkman", hi: "दूधवाला" },
    { en: "Mobile Accessories Seller", hi: "मोबाइल एक्सेसरीज़ दुकानदार" },
    { en: "Mobile App Developer", hi: "मोबाइल ऐप डेवलपर" },
    { en: "Mobile Repair Shop", hi: "मोबाइल रिपेयरिंग शॉप" },
    { en: "Motor Parts Shop", hi: "मोटर पार्ट्स शॉप" },
    { en: "Motorcycle Dealership", hi: "मोटरसाइकिल एजेंसी" },
    { en: "Motorcycle Mechanic", hi: "मोटरसाइकिल मिस्त्री" },
    { en: "Motorcycle Sale & Purchase", hi: "मोटरसाइकिल सेल परचेस" },
    { en: "Motorcycle Seat Making", hi: "मोटरसाइकिल सीट बनाना" },
    { en: "Municipal Office", hi: "नगर निगम कार्यालय" },
    { en: "Music Teacher", hi: "संगीत टीचर" },
    { en: "NFT Artist", hi: "NFT आर्टिस्ट" },
    { en: "NGO Leader", hi: "NGO लीडर" },
    { en: "NGO Worker", hi: "NGO कार्यकर्ता" },
    { en: "Non-Veg Hotel Operator", hi: "नॉन-वेज होटल संचालक" },
    { en: "Opticals/Glasses Shop", hi: "ऑप्टिकल्स / चश्मा दुकान" },
    { en: "Other Scrap Shop", hi: "अन्य स्क्रब शॉप" },
    { en: "Paint and Hardware Shop", hi: "पेंट और हार्डवेयर शॉप" },
    { en: "Painter", hi: "चित्रकार" },
    { en: "Passport Service", hi: "पासपोर्ट सर्विस" },
    { en: "Petrol Pump", hi: "पेट्रोल पंप" },
    { en: "Photo Studio Operator", hi: "फोटो स्टूडियो संचालक" },
    { en: "Photocopy / Printing Center", hi: "फोटो कॉपी / प्रिंटिंग सेंटर" },
    { en: "Photographer", hi: "फोटोग्राफर" },
    { en: "Physiotherapist", hi: "फिजियोथेरेपिस्ट" },
    { en: "Pilot", hi: "पायलट" },
    { en: "Plastic Goods Seller", hi: "प्लास्टिक आइटम विक्रेता" },
    { en: "Plastic Material Shop", hi: "प्लास्टिक मैटेरियल शॉप" },
    { en: "Plumber", hi: "प्लंबर" },
    { en: "Plumbing Supplies Shop", hi: "प्लंबिंग सामान की दुकान" },
    { en: "Podcaster", hi: "पॉडकास्टर" },
    { en: "Police Station", hi: "पुलिस स्टेशन" },
    { en: "Poultry Farmer", hi: "पोल्ट्री किसान" },
    { en: "Priest", hi: "पुजारी" },
    { en: "Property Agent", hi: "प्रॉपर्टी एजेंट" },
    { en: "Public Health", hi: "पब्लिक हेल्थ" },
    { en: "Pure Veg Hotel Operator", hi: "प्योर वेज होटल संचालक" },
    { en: "Purse/Bag/Belt Shop", hi: "पर्स / बैग / बेल्ट की दुकान" },
    { en: "Radio Jockey", hi: "रेडियो जॉकी" },
    { en: "Readymade Garments Shop", hi: "रेडीमेड कपड़ों की दुकान" },
    { en: "Reliance Fresh Store", hi: "रिलायंस फ्रेश" },
    { en: "Religious Items Shop", hi: "धार्मिक सामग्री की दुकान" },
    { en: "Religious Place", hi: "धार्मिक स्थल" },
    { en: "Restaurant", hi: "रेस्टोरेंट" },
    { en: "Road Construction Contractor", hi: "सड़क निर्माण ठेकेदार" },
    { en: "Road Construction Worker", hi: "सड़क निर्माण मजदूर" },
    { en: "Sailor", hi: "नाविक" },
    { en: "Saint", hi: "संत" },
    { en: "Salon", hi: "सैलून" },
    { en: "Salon Worker", hi: "सैलून कर्मचारी" },
    { en: "School", hi: "स्कूल" },
    { en: "School Uniform Supplier", hi: "स्कूल यूनिफॉर्म" },
    { en: "Scientist", hi: "वैज्ञानिक" },
    { en: "Servo Voltage Stabilizer", hi: "सर्वो वोल्टेज स्टेबलाइजर" },
    { en: "Sewing Machine Mechanic", hi: "सिलाई मशीन मैकेनिक" },
    { en: "Shoe Shop", hi: "जूता दुकान" },
    { en: "Singer", hi: "गायक" },
    { en: "Social Worker", hi: "समाजसेवी" },
    { en: "Solar Energy Technician", hi: "सौर ऊर्जा तकनीशियन" },
    { en: "Solar Panel Manufacturing Company", hi: "सोलर पैनल मैन्युफैक्चरिंग कंपनी" },
    { en: "Soldier", hi: "सैनिक" },
    { en: "Sound System/DJ Shop", hi: "साउंड सिस्टम / डीजे शॉप" },
    { en: "Space Researcher", hi: "स्पेस रिसर्चर" },
    { en: "Spare Parts Seller", hi: "स्पेयर पार्ट्स विक्रेता" },
    { en: "Spiritual Guru", hi: "आध्यात्मिक गुरु" },
    { en: "Sportsperson", hi: "खिलाड़ी" },
    { en: "Stationery", hi: "स्टेशनरी" },
    { en: "Stationery Seller", hi: "स्टेशनरी दुकानदार" },
    { en: "Sweet Shopkeeper", hi: "मिठाई दुकानदार" },
    { en: "Sweets/Snacks House", hi: "मिठाई / नमकीन हाउस" },
    { en: "Tailor / Garment Craftsman", hi: "दर्जी कपड़े सिलने वाला कारीगर" },
    { en: "Tailor Shop", hi: "टेलर की दुकान" },
    { en: "Tailor/Embroidery Worker", hi: "सिलाई-कढ़ाई वर्कर" },
    { en: "Tea Seller", hi: "चायवाला" },
    { en: "Therapist", hi: "थेरेपिस्ट" },
    { en: "Three Wheeler Service", hi: "थ्री व्हीलर सर्विस" },
    { en: "Tiles and Marble Shop", hi: "टाइल्स और मार्बल शॉप" },
    { en: "Toy Shop", hi: "खिलौने की दुकान" },
    { en: "Trade Union Leader", hi: "ट्रेड यूनियन लीडर" },
    { en: "Transformer", hi: "ट्रांसफार्मर" },
    { en: "Translator", hi: "अनुवादक" },
    { en: "Transport Agent", hi: "ट्रांसपोर्ट एजेंट" },
    { en: "Travel Guide", hi: "ट्रैवल गाइड" },
    { en: "Tubewell Operator", hi: "ट्यूबल ऑपरेटर" },
    { en: "Tuition Teacher", hi: "ट्यूशन टीचर" },
    { en: "Tutor", hi: "ट्यूटर" },
    { en: "Tyre Seller", hi: "टायर विक्रेता" },
    { en: "University", hi: "यूनिवर्सिटी" },
    { en: "Utensil Seller", hi: "बर्तन दुकानदार" },
    { en: "Vastu Consultant", hi: "वास्तु सलाहकार" },
    { en: "Vegetable & Fruits", hi: "फल और सब्जी" },
    { en: "Vegetable Market Commission Agent", hi: "सब्जी मंडी आड़ती" },
    { en: "Vegetable Seller", hi: "सब्ज़ीवाला" },
    { en: "Vehicle Washing Center", hi: "वाशिंग सेंटर" },
    { en: "Village Panchayat Office", hi: "ग्राम पंचायत कार्यालय" },
    { en: "Waiter", hi: "वेटर" },
    { en: "Wall Painter", hi: "पेण्टर" },
    { en: "Warehouse Staff", hi: "वेयरहाउस स्टाफ" },
    { en: "Washerman", hi: "धोबी" },
    { en: "Washing Machine Repair Technician", hi: "वॉशिंग मशीन रिपेयरिंग" },
    { en: "Watch Shop/Repairing", hi: "घड़ी दुकान / वॉच रिपेयरिंग" },
    { en: "Water Camper Supplier", hi: "पानी के कैंपर सप्लायर" },
    { en: "Water Tanker Supplier", hi: "पानी के टैंकर सप्लायर" },
    { en: "Weaver", hi: "बुनकर" },
    { en: "Web Developer", hi: "वेब डेवलपर" },
    { en: "Welder", hi: "वेल्डर" },
    { en: "Wholesale Grocery Store", hi: "होलसेल किराना स्टोर" },
    { en: "Wholesale Trader", hi: "थोक व्यापारी" },
    { en: "YouTuber", hi: "यूट्यूबर" },
    { en: "Other", hi: "अन्य" }
];

export interface AccountRow {
    name: string;
    amount: number;
    subRows?: AccountRow[];
    isTotal?: boolean;
    isHeading?: boolean;
}

export interface FinancialData {
    trialBalance: { dr: AccountRow[], cr: AccountRow[], totalDr: number, totalCr: number };
    pl: { 
        expenses: AccountRow[], incomes: AccountRow[], 
        grossProfit: number, netProfit: number,
        totalExpense: number, totalIncome: number 
    };
    bs: {
        liabilities: AccountRow[], assets: AccountRow[],
        totalLiabilities: number, totalAssets: number
    };
}
