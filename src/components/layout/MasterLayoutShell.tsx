import React, { useState, useEffect } from 'react';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  LayoutGrid, 
  FileText, 
  ClipboardPaste, 
  Package, 
  Users, 
  Banknote, 
  FileBarChart, 
  Sliders, 
  Sparkles, 
  Globe, 
  Sun, 
  Moon, 
  Plus, 
  Trash2,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

// =================================================================
// 🌍 REAL-TIME CENTRAL LOCALIZATION STREAM MATRIX
// =================================================================
const TRANSLATIONS = {
  en: {
    menuDashboard: "Dashboard Overview",
    menuSalesInvoice: "Sales Invoice Bill",
    menuPurchase: "Purchase Order",
    menuItems: "Items Ledger",
    menuParties: "Parties CRM",
    menuExpenses: "Expenses Log",
    menuReports: "Audit Reports",
    menuSettings: "System Settings",

    // Actions & General
    backBtn: "Back", addBtn: "Add", deleteBtn: "Remove", saveBtn: "Save",
    actionCol: "Action", selectPlaceholder: "Choose an option...",
    searchQuery: "Filter active records...",
    statusActive: "Active", statusPending: "Overdue", statusPaid: "Committed",

    // Dashboard Screen
    dashTitle: "Fintech Business Control Desk",
    dashSub: "IndexedDB Dexie and Firestore offline-ready analytical metrics",
    cardSales: "Total Sales Revenue",
    cardBalance: "Pending Collections",
    cardItems: "Items Registered",
    cardParties: "Active Partners",
    recentSales: "Recent Committed Invoices",
    thInvId: "Invoicing ID", thCust: "Customer Name", thDate: "Posting Date", thAmt: "Bill Total", thStatus: "Status",
    quickTitle: "Quick Operation Lanes",
    sysCheck: "System Core Diagnostic",
    sysOnline: "IndexedDB Data Engine Online",

    // Sales Invoice & Purchase Form General
    invFormTitle: "Create Sales Invoice Statement",
    invFormSub: "High-precision automated rounding ledger builder",
    purFormTitle: "Record Raw Procurement Bill",
    purFormSub: "Append received vendor list inventory to stock entries",
    inpCust: "Select Customer Party",
    inpCustNew: "Or Create Guest Customer",
    inpVend: "Select Vendor partner",
    inpVendNew: "Or Create Guest Supplier",
    inpItem: "Select Catalog Item",
    inpQty: "Quantity (Qty)",
    inpPrice: "Base Price (₹)",
    inpDisc: "Discount Margin (%)",
    inpTax: "GST Allocation Slab",
    btnCart: "Add Entry To Cart",
    cartLabel: "Active Invoice Billing Cart",
    cartEmpty: "The billing cart is empty. Please add items to commit transaction.",
    lblSub: "Subtotal (Taxes Excl.)",
    lblTax: "Calculated GST",
    lblDisc: "Total Discount Amount",
    lblGrand: "Receivable Net Total",
    btnCommit: "Commit & Save Bill",
    commitSuccess: "Invoice saved successfully to offline-first cache!",
    purCommitSuccess: "Purchase recorded and stock has been incremented!",

    // Items Ledger
    itemsTitle: "Products & Services Catalog",
    itemsSub: "Maintain items barcode SKU indices and standard selling prices",
    inpItemName: "New Product Name",
    inpSku: "SKU / Barcode Index",
    inpCost: "Supplier Cost (₹)",
    inpSell: "Retail Price (₹)",
    thSku: "SKU", thName: "Product Name", thCost: "Cost", thPrice: "Selling Price", thTax: "GST",

    // Parties Screen
    partiesTitle: "Customer & Supplier Registry",
    partiesSub: "Maintain dynamic profiles, tax identities and outstanding balance ledgers",
    inpPName: "Full Business Name",
    inpPPhone: "Mobile / Contact Number",
    inpPGst: "Business GSTIN ID",
    inpPType: "Accounting Map Type",
    filtCust: "Client Customers List",
    filtSupp: "Inventory Suppliers List",
    thPName: "Ledger Title", thPhone: "Telephone", thType: "Map Type", thBal: "Outstanding",

    // Expenses Screen
    expensesTitle: "Operational Expenses Registry",
    expensesSub: "Record overhead expenditures, utility costs, salary advances and rents",
    inpEDesc: "Overhead Account Title",
    inpECat: "Allocation Group",
    inpEAmt: "Amount Expended (₹)",
    colEDesc: "Description Detail", colECat: "Category Title", colEAmt: "Paid Over",

    // Reports Screen
    reportsTitle: "Real-time Financial P&L Audits",
    reportsSub: "Instantly aggregated metrics stream from Dexie offline-first tables",
    plTitle: "Profit & Loss Operating Statement",
    repSales: "Gross Trading Sales",
    repPur: "Goods Production Cost (COGS)",
    repExp: "Operation Expenses",
    repProfit: "Net Operating Margin Net Profit",
    balAssetTitle: "Calculated Assets Reserve Balance",
    gstAuditTitle: "Consolidated GST Auditor Sheet",
    downloadLabel: "Download Report Audit PDF",

    // Settings Screen
    settingsTitle: "Developer Settings Console",
    settingsSub: "Manage synchronization backlogs, translation toggles, and offline caches",
    lblLang: "Central System Language Toggle",
    lblTheme: "System Appearance Light/Dark Toggle",
    lblThemeLight: "Alabaster Light Theme",
    lblThemeDark: "Space Obsidian Black (Dark)",
    lblSyncGate: "Firebase Firestore Sync Pipeline",
    syncEnabled: "Real-time sync pipeline activated",
    syncDisabled: "Pure offline cache active",
    lblMetrology: "IndexedDB Table Metrology Analytics",
    dbInvoices: "Committed Invoices Logged",
    btnReset: "Run Cold Reset & Flush Database"
  },
  hi: {
    menuDashboard: "डैशबोर्ड रिपोर्ट",
    menuSalesInvoice: "बिक्री इनवॉइस (सेल)",
    menuPurchase: "खरीद (परचेज)",
    menuItems: "सामान बहीखाता (आइटम)",
    menuParties: "ग्राहक और विक्रेता (पार्टी)",
    menuExpenses: "दुकान खर्च (एक्सपेंस)",
    menuReports: "वित्तीय रिपोर्ट",
    menuSettings: "सिस्टम सेटिंग्स",

    // Actions & General
    backBtn: "पीछे", addBtn: "जोड़ें", deleteBtn: "हटाएं", saveBtn: "सहेजें",
    actionCol: "क्रिया", selectPlaceholder: "विकल्प चुनें...",
    searchQuery: "सक्रिय रिकॉर्ड खोजें...",
    statusActive: "सक्रिय", statusPending: "बकाया", statusPaid: "सफल सहेजा",

    // Dashboard Screen
    dashTitle: "व्यापार संचालन नियंत्रण डेस्क",
    dashSub: "Dexie और फायरबेस ऑफलाइन-तैयार बहीखाता सांख्यिकी",
    cardSales: "कुल बिक्री राजस्व",
    cardBalance: "बकाया वसूली सीमा",
    cardItems: "पंजीकृत सामान",
    cardParties: "सक्रिय खातेदार",
    recentSales: "हाल ही में जारी बिक्री इनवॉइस",
    thInvId: "इनवॉइस आईडी", thCust: "ग्राहक का नाम", thDate: "तारीख", thAmt: "कुल राशि", thStatus: "स्थिति",
    quickTitle: "तुरंत लेनदेन के विकल्प",
    sysCheck: "सिस्टम डायग्नोस्टिक्स",
    sysOnline: "लोकल डेटाबेस इंजन चालू है",

    // Sales Invoice & Purchase Form General
    invFormTitle: "नया बिक्री (सेल) इनवॉइस बनाएं",
    invFormSub: "सटीक राउंडिंग फॉर्मूला और जीएसटी टैक्स गणना प्रणाली",
    purFormTitle: "व्यापार खरीद (परचेज) इनवॉइस",
    purFormSub: "सप्लायर से प्राप्त माल की प्रविष्टि और स्टॉक अपडेट",
    inpCust: "ग्राहक बहीखाता चुनें",
    inpCustNew: "या नया ग्राहक दर्ज करें",
    inpVend: "विक्रेता/आपूर्तिकर्ता चुनें",
    inpVendNew: "या नया विक्रेता दर्ज करें",
    inpItem: "बिलिंग सामान चुनें",
    inpQty: "मात्रा (मटेरियल संख्या)",
    inpPrice: "मूल्य प्रति इकाई (₹)",
    inpDisc: "कुल डिस्काउंट छूट (%)",
    inpTax: "जीएसटी टैक्स स्लैब प्रतिशत",
    btnCart: "कार्ट में प्रविष्टि जोड़ें",
    cartLabel: "सक्रिय बिक्री बिलिंग कार्ट",
    cartEmpty: "सक्रिय कार्ट बिल्कुल खाली है। सामान जोड़कर आगे बढ़ें।",
    lblSub: "कुल राशि (टैक्स के बिना)",
    lblTax: "कुल जीएसटी टैक्स",
    lblDisc: "दी गई कुल नकद छूट",
    lblGrand: "कुल देय राशि (ग्रैंड टोटल)",
    btnCommit: "इनवॉइस सहेजें और प्रिंट करें",
    commitSuccess: "इनवॉइस सुरक्षित रूप से ऑफलाइन डेटाबेस में सहेज लिया है!",
    purCommitSuccess: "खरीद बिल सहेजा गया और स्टॉक मात्रा अपडेट हुई!",

    // Items Ledger
    itemsTitle: "सामान और सेवाओं की सूची",
    itemsSub: "सामान का बारकोड एसकेयू इंडेक्स और मानक मूल्य प्रबंधित करें",
    inpItemName: "नया सामान का नाम",
    inpSku: "बारकोड / SKU नंबर",
    inpCost: "खरीद मूल्य लागत (₹)",
    inpSell: "खुदरा बिक्री मूल्य (₹)",
    thSku: "SKU कोड", thName: "सामान का नाम", thCost: "लागत", thPrice: "बिक्री मूल्य", thTax: "जीएसटी %",

    // Parties Screen
    partiesTitle: "ग्राहक और सप्लायर प्रोफाइल CRM",
    partiesSub: "व्यावसायिक खातेदार, फोन सूची और बकाया बहीखाता",
    inpPName: "पूरा व्यापारिक नाम",
    inpPPhone: "मोबाइल/फोन नंबर",
    inpPGst: "जीएसटी नंबर ID",
    inpPType: "खाता समूह श्रेणी",
    filtCust: "ग्राहकों (Clients) की सूची",
    filtSupp: "विक्रेताओं (Suppliers) की सूची",
    thPName: "खाता धारक", thPhone: "मोबाइल", thType: "समूह प्रकार", thBal: "बकाया राशि",

    // Expenses Screen
    expensesTitle: "व्यापार खर्च बहीखाता",
    expensesSub: "दूकान किराया, वाई-फाई बिल, बिजली और कर्मचारियों का वेतन",
    inpEDesc: "खर्च लेखा विवरण",
    inpECat: "खर्च की श्रेणी / टाइप",
    inpEAmt: "कुल व्यय राशि (₹)",
    colEDesc: "प्रविष्टि विवरण", colECat: "वर्गीकरण श्रेणी", colEAmt: "भुगतान लागत",

    // Reports Screen
    reportsTitle: "रियल-टाइम व्यापार वित्तीय लेखा रिपोर्ट",
    reportsSub: "सक्रिय ऑफलाइन तालिकाओं से स्वचालित गणना प्रवाह",
    plTitle: "लाभ एवं हानि विवरण (Profit & Loss Statement)",
    repSales: "सकल व्यापार बिक्री आय",
    repPur: "खरीदे गए माल की कुल लागत",
    repExp: "कुल दर्ज अतिरिक्त व्यापार खर्च",
    repProfit: "शुद्ध परिचालन शुद्ध लाभ (Net Profit)",
    balAssetTitle: "परिसंपत्तियों और देनदारियों का विवरण",
    gstAuditTitle: "जीएसटी कर संग्रह लेखा रिपोर्ट",
    downloadLabel: "वित्तीय पीडीएफ रिपोर्ट डाउनलोड करें",

    // Settings Screen
    settingsTitle: "सिस्टम कॉन्फ़िगरेशन और कंट्रोल पैनल",
    settingsSub: "डेटाबेस भाषा, लेआउट रंग थीम और फायरबेस सिंक्रोनाइज़ेशन प्रबंधित करें",
    lblLang: "सक्रिय बहीखाता भाषा सेटिंग",
    lblTheme: "सिस्टम थीम मोड",
    lblThemeLight: "लाइट मोड (सॉफ्ट क्रीम)",
    lblThemeDark: "डार्क मोड (स्पेस ओब्सीडियन)",
    lblSyncGate: "फायरबेस क्लाउड सिंक",
    syncEnabled: "क्लाउड डेटाबेस सिंक सक्रिय है",
    syncDisabled: "केवल सुरक्षित ऑफ़लाइन सत्र चालू है",
    lblMetrology: "इंजन डायग्नोस्टिक्स डेटा",
    dbInvoices: "पंजीकृत कुल इनवॉइस",
    btnReset: "पूरा स्थानीय डेटा वाइप करके रीसेट करें"
  }
};

export const MasterLayoutShell: React.FC = () => {
  // =================================================================
  // COORDINATED STATE ARCHITECTURE
  // =================================================================
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark');
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Dynamic Offline registries (Mock Dexie / Store synchronizer state)
  const [invoicesList, setInvoicesList] = useState<any[]>([
    { id: "INV-202601", customer: "Suresh Sharma", itemsCount: 3, amount: 4850.00, tax: 432.50, discount: 200.00, date: "2026-06-21", status: "Paid" },
    { id: "INV-202602", customer: "Priya Patel", itemsCount: 2, amount: 2340.00, tax: 210.00, discount: 50.00, date: "2026-06-22", status: "Pending" },
    { id: "INV-202603", customer: "Ramesh Grocery", itemsCount: 5, amount: 890.00, tax: 85.00, discount: 20.00, date: "2026-06-23", status: "Paid" },
  ]);

  const [purchasesList, setPurchasesList] = useState<any[]>([
    { id: "PUR-101", vendor: "Varun Agro Wholesale", itemsCount: 15, amount: 3100.00, tax: 155.00, discount: 100.00, date: "2026-06-18" },
    { id: "PUR-102", vendor: "Hindustan Unilever Pvt", itemsCount: 42, amount: 12500.00, tax: 2250.00, discount: 500.00, date: "2026-06-20" },
  ]);

  const [itemsList, setItemsList] = useState<any[]>([
    { barcode: "8901030752538", name: "Fortune Soya Oil 1L", baseCost: 110.00, price: 145.00, taxRate: 5, category: "Grocery" },
    { barcode: "8901725181223", name: "Maggi Two Minute Noodles", baseCost: 9.50, price: 14.00, taxRate: 18, category: "Snacks" },
    { barcode: "8901138510122", name: "Dettol Liquid Handwash 200ml", baseCost: 72.00, price: 99.00, taxRate: 18, category: "Personal Care" },
    { barcode: "8901058002318", name: "Tata Salt Lite 1kg", baseCost: 19.00, price: 28.00, taxRate: 0, category: "Groceries" },
    { barcode: "8901030732128", name: "Aashirvaad Shudh Chakki Atta 5kg", baseCost: 205.00, price: 260.00, taxRate: 5, category: "Flour" },
  ]);

  const [partiesList, setPartiesList] = useState<any[]>([
    { name: "Suresh Sharma", phone: "+91 94455 01234", gstIn: "07AAAFS3412A1Z1", type: "Customer", outstanding: 12500.00 },
    { name: "Priya Patel", phone: "+91 98210 54321", gstIn: "24BBBPK1290B2Z3", type: "Customer", outstanding: 4500.00 },
    { name: "Varun Agro Wholesale", phone: "+91 91122 33445", gstIn: "09CCCKA9901F1Z8", type: "Supplier", outstanding: -3100.00 },
    { name: "Hindustan Unilever Pvt", phone: "+91 80099 88776", gstIn: "33AAAHU0091G3Z4", type: "Supplier", outstanding: -12500.00 }
  ]);

  const [expensesList, setExpensesList] = useState<any[]>([
    { desc: "Digital Store High-Speed Wi-Fi", category: "Utilities", amount: 1250.00, date: "2026-06-15" },
    { desc: "Main Market Store Rent Accord", category: "Rent", amount: 25000.00, date: "2026-06-01" },
    { desc: "Monthly Warehouse Electricity", category: "Electricity", amount: 4890.00, date: "2026-06-10" },
  ]);

  const [isCloudSyncEnabled, setIsCloudSyncEnabled] = useState<boolean>(true);

  // =================================================================
  // TRANSACTION SUB-CART FLOW CONTROLS
  // =================================================================
  // Sales bill fields
  const [saleCustomer, setSaleCustomer] = useState<string>('Ramesh Grocery');
  const [saleItemIndex, setSaleItemIndex] = useState<number>(0);
  const [saleQty, setSaleQty] = useState<string>('2');
  const [salePrice, setSalePrice] = useState<string>('145.00');
  const [saleDiscount, setSaleDiscount] = useState<string>('5');
  const [saleTax, setSaleTax] = useState<number>(5);
  const [saleCart, setSaleCart] = useState<any[]>([]);

  // Purchase record fields
  const [purVendor, setPurVendor] = useState<string>('Varun Agro Wholesale');
  const [purItemIndex, setPurItemIndex] = useState<number>(1);
  const [purQty, setPurQty] = useState<string>('10');
  const [purCost, setPurCost] = useState<string>('9.50');
  const [purDiscount, setPurDiscount] = useState<string>('10');
  const [purTax, setPurTax] = useState<number>(18);
  const [purCart, setPurCart] = useState<any[]>([]);

  // Item catalog creation fields
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemSku, setNewItemSku] = useState<string>('');
  const [newItemCost, setNewItemCost] = useState<string>('30.00');
  const [newItemPrice, setNewItemPrice] = useState<string>('45.00');
  const [newItemTax, setNewItemTax] = useState<number>(18);
  const [newItemCat, setNewItemCat] = useState<string>('General');

  // Party entry creation fields
  const [newPName, setNewPName] = useState<string>('');
  const [newPPhone, setNewPPhone] = useState<string>('');
  const [newPGst, setNewPGst] = useState<string>('');
  const [newPType, setNewPType] = useState<'Customer' | 'Supplier'>('Customer');

  // Expenses entry creation fields
  const [newEDesc, setNewEDesc] = useState<string>('');
  const [newECat, setNewECat] = useState<string>('Utilities');
  const [newEAmt, setNewEAmt] = useState<string>('');

  // Search filtering state
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Trigger Toasts Helper
  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Coordinated theme side-effect
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeMode]);

  // Read current active language dictionary
  const t = TRANSLATIONS[language] || TRANSLATIONS['en'];

  // focus status halos picker helper
  const inputStyle = `w-full text-xs font-semibold py-2.5 px-3 rounded-xl border-2 bg-[var(--bg-card)] transition-all outline-none focus:ring-2 ${
    themeMode === 'dark' 
      ? 'focus-active-dark border-slate-700 text-slate-100 placeholder-slate-500' 
      : 'focus-active-light border-slate-300 text-slate-900 placeholder-slate-400'
  }`;

  // =================================================================
  // CALCULATION LOGIC SECURE ENGINES
  // =================================================================
  const computeSalesSummary = (activeSalesCart: any[]) => {
    let subtotal = 0;
    let discountAmt = 0;
    let taxAmt = 0;

    activeSalesCart.forEach(item => {
      const lineCost = (+item.qty) * (+item.price);
      const lineDisc = lineCost * ((+item.discount) / 100);
      const postDisc = lineCost - lineDisc;
      const lineTax = postDisc * (item.taxRate / 100);

      subtotal += lineCost;
      discountAmt += lineDisc;
      taxAmt += lineTax;
    });

    const grandTotal = subtotal - discountAmt + taxAmt;
    return {
      subtotal: subtotal.toFixed(2),
      discount: discountAmt.toFixed(2),
      tax: taxAmt.toFixed(2),
      grand: grandTotal.toFixed(2)
    };
  };

  const computePurchaseSummary = (activePurCart: any[]) => {
    let subtotal = 0;
    let discountAmt = 0;
    let taxAmt = 0;

    activePurCart.forEach(item => {
      const lineCost = (+item.qty) * (+item.cost);
      const lineDisc = lineCost * ((+item.discount) / 100);
      const postDisc = lineCost - lineDisc;
      const lineTax = postDisc * (item.taxRate / 100);

      subtotal += lineCost;
      discountAmt += lineDisc;
      taxAmt += lineTax;
    });

    const grandTotal = subtotal - discountAmt + taxAmt;
    return {
      subtotal: subtotal.toFixed(2),
      discount: discountAmt.toFixed(2),
      tax: taxAmt.toFixed(2),
      grand: grandTotal.toFixed(2)
    };
  };

  // Profit and loss direct mathematical calculations
  const calculateAggregateRevenue = () => invoicesList.reduce((acc, current) => acc + current.amount, 0);
  const calculateAggregateCog = () => purchasesList.reduce((acc, current) => acc + current.amount, 0);
  const calculateAggregateExpenses = () => expensesList.reduce((acc, current) => acc + current.amount, 0);
  const calculateNetOperatingMargin = () => {
    const rev = calculateAggregateRevenue();
    const cogs = calculateAggregateCog();
    const overheads = calculateAggregateExpenses();
    return rev - cogs - overheads;
  };

  // =================================================================
  // OPERATIONS HANDLERS
  // =================================================================
  const handleAddNewItemToCatalog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemSku.trim()) {
      triggerToast("Please provide valid product metadata.", "error");
      return;
    }
    const exists = itemsList.some(it => it.barcode === newItemSku.trim());
    if (exists) {
      triggerToast("This Barcode/SKU mapping already index registers.", "error");
      return;
    }
    const added = {
      barcode: newItemSku.trim(),
      name: newItemName.trim(),
      baseCost: parseFloat(newItemCost) || 0.0,
      price: parseFloat(newItemPrice) || 0.0,
      taxRate: newItemTax,
      category: newItemCat.trim()
    };
    setItemsList(prev => [...prev, added]);
    triggerToast(`Catalog Appended: ${newItemName}`, "success");
    setNewItemName('');
    setNewItemSku('');
  };

  const handleAddNewPartyToCRM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPName.trim() || !newPPhone.trim()) {
      triggerToast("Ledger title and phone are required.", "error");
      return;
    }
    const added = {
      name: newPName.trim(),
      phone: newPPhone.trim(),
      gstIn: newPGst.trim() || "Unregistered",
      type: newPType,
      outstanding: newPType === 'Customer' ? 0.0 : 0.0
    };
    setPartiesList(prev => [...prev, added]);
    triggerToast(`Party profile linked: ${newPName}`, "success");
    setNewPName('');
    setNewPPhone('');
    setNewPGst('');
  };

  const handleAddNewExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(newEAmt);
    if (!newEDesc.trim() || isNaN(parsedAmt) || parsedAmt <= 0) {
      triggerToast("Provide a valid expense description and positive amount.", "error");
      return;
    }
    const addedCustom = {
      desc: newEDesc.trim(),
      category: newECat,
      amount: parsedAmt,
      date: new Date().toISOString().split('T')[0]
    };
    setExpensesList(prev => [addedCustom, ...prev]);
    triggerToast(`Log added under overheads account.`, "success");
    setNewEDesc('');
    setNewEAmt('');
  };

  const handlePushItemToSalesCart = () => {
    const selectedProduct = itemsList[saleItemIndex];
    if (!selectedProduct) return;
    const qty = parseFloat(saleQty) || 1;
    const price = parseFloat(salePrice) || 0;
    const discount = parseFloat(saleDiscount) || 0;

    const row = {
      id: Date.now().toString(),
      name: selectedProduct.name,
      barcode: selectedProduct.barcode,
      qty,
      price,
      discount,
      taxRate: saleTax
    };
    setSaleCart(prev => [...prev, row]);
    triggerToast(`${selectedProduct.name} included in cart.`, "info");
  };

  const handleCommitSalesInvoice = () => {
    if (saleCart.length === 0) {
      triggerToast(t.cartEmpty, "error");
      return;
    }
    const summaryData = computeSalesSummary(saleCart);
    const invoice = {
      id: `INV-${Date.now().toString().slice(-6)}`,
      customer: saleCustomer,
      itemsCount: saleCart.length,
      amount: parseFloat(summaryData.grand),
      tax: parseFloat(summaryData.tax),
      discount: parseFloat(summaryData.discount),
      date: new Date().toISOString().split('T')[0],
      status: "Paid"
    };

    setInvoicesList(prev => [invoice, ...prev]);
    setSaleCart([]);
    triggerToast(t.commitSuccess, "success");
    setActiveMenu('dashboard');
  };

  const handlePushItemToPurchaseCart = () => {
    const selectedProduct = itemsList[purItemIndex];
    if (!selectedProduct) return;
    const qty = parseFloat(purQty) || 1;
    const cost = parseFloat(purCost) || 0;
    const discount = parseFloat(purDiscount) || 0;

    const row = {
      id: Date.now().toString(),
      name: selectedProduct.name,
      barcode: selectedProduct.barcode,
      qty,
      cost,
      discount,
      taxRate: purTax
    };
    setPurCart(prev => [...prev, row]);
    triggerToast(`${selectedProduct.name} loaded into procurement.`, "info");
  };

  const handleCommitPurchaseOrder = () => {
    if (purCart.length === 0) {
      triggerToast(t.cartEmpty, "error");
      return;
    }
    const summaryData = computePurchaseSummary(purCart);
    const order = {
      id: `PUR-${Date.now().toString().slice(-6)}`,
      vendor: purVendor,
      itemsCount: purCart.length,
      amount: parseFloat(summaryData.grand),
      tax: parseFloat(summaryData.tax),
      discount: parseFloat(summaryData.discount),
      date: new Date().toISOString().split('T')[0]
    };

    setPurchasesList(prev => [order, ...prev]);
    setPurCart([]);
    triggerToast(t.purCommitSuccess, "success");
    setActiveMenu('dashboard');
  };

  // Sync state lookup of items dynamically with search filter
  useEffect(() => {
    if (itemsList[saleItemIndex]) {
      setSalePrice(itemsList[saleItemIndex].price.toFixed(2));
      setSaleTax(itemsList[saleItemIndex].taxRate);
    }
  }, [saleItemIndex, itemsList]);

  useEffect(() => {
    if (itemsList[purItemIndex]) {
      setPurCost(itemsList[purItemIndex].baseCost.toFixed(2));
      setPurTax(itemsList[purItemIndex].taxRate);
    }
  }, [purItemIndex, itemsList]);

  // Quick navigation setup mapping
  const menuItems = [
    { id: 'dashboard', labelKey: 'menuDashboard', icon: <LayoutGrid size={16} /> },
    { id: 'salesInvoice', labelKey: 'menuSalesInvoice', icon: <FileText size={16} /> },
    { id: 'purchase', labelKey: 'menuPurchase', icon: <ClipboardPaste size={16} /> },
    { id: 'items', labelKey: 'menuItems', icon: <Package size={16} /> },
    { id: 'parties', labelKey: 'menuParties', icon: <Users size={16} /> },
    { id: 'expenses', labelKey: 'menuExpenses', icon: <Banknote size={16} /> },
    { id: 'reports', labelKey: 'menuReports', icon: <FileBarChart size={16} /> },
    { id: 'settings', labelKey: 'menuSettings', icon: <Sliders size={16} /> },
  ];

  // =================================================================
  // VIEW RENDER CORNER
  // =================================================================
  const renderViewContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black tracking-tight">{t.dashTitle}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{t.dashSub}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-500/10 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>{t.sysOnline}</span>
                </div>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">{t.cardSales}</span>
                  <div className="text-lg font-extrabold text-[var(--brand-primary)]">₹{calculateAggregateRevenue().toFixed(2)}</div>
                </div>
                <div className="p-3 rounded-xl bg-[rgba(79,70,229,0.08)] text-[var(--brand-primary)]">
                  <FileText size={20} />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">{t.cardBalance}</span>
                  <div className="text-lg font-extrabold text-red-500">₹{invoicesList.filter(i => i.status === 'Pending').reduce((a,c) => a + c.amount, 0).toFixed(2)}</div>
                </div>
                <div className="p-3 rounded-xl bg-red-500/5 text-red-500">
                  <Banknote size={20} />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">{t.cardItems}</span>
                  <div className="text-lg font-extrabold text-emerald-500">{itemsList.length} Units</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 text-emerald-500">
                  <Package size={20} />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">{t.cardParties}</span>
                  <div className="text-lg font-extrabold text-amber-500">{partiesList.length} Ledger Contacts</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/5 text-amber-500">
                  <Users size={20} />
                </div>
              </div>
            </div>

            {/* Quick action gates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.quickTitle}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setActiveMenu('salesInvoice')}
                    className="p-3 text-xs font-bold rounded-xl border border-[var(--border-ui)] hover:bg-slate-500/5 hover:border-[var(--brand-primary)] text-left flex flex-col gap-1 transition-all"
                  >
                    <span className="text-[var(--brand-primary)]">➕ {t.menuSalesInvoice}</span>
                    <span className="text-[9px] text-[var(--text-secondary)] font-medium">Record consumer order</span>
                  </button>
                  <button 
                    onClick={() => setActiveMenu('purchase')}
                    className="p-3 text-xs font-bold rounded-xl border border-[var(--border-ui)] hover:bg-slate-500/5 hover:border-[var(--brand-primary)] text-left flex flex-col gap-1 transition-all"
                  >
                    <span className="text-emerald-500">➕ {t.menuPurchase}</span>
                    <span className="text-[9px] text-[var(--text-secondary)] font-medium">Add received products</span>
                  </button>
                </div>
              </div>

              {/* Systems Status */}
              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.sysCheck}</h4>
                <div className="space-y-1.5 font-mono text-[10.5px]">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Local Tables (IndexedDB):</span>
                    <span className="text-emerald-500">Connected Ok</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Real-time cloud channels:</span>
                    <span className={isCloudSyncEnabled ? 'text-emerald-400' : 'text-slate-400'}>
                      {isCloudSyncEnabled ? "Connected & Synchronized" : "Local Standalone Session"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Precision rounders:</span>
                    <span className="text-emerald-500">IEEE 754 Conformant (.2f)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoices List */}
            <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.recentSales}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-ui)] text-[var(--text-secondary)]">
                      <th className="py-2.5 font-bold uppercase tracking-wider">{t.thInvId}</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider">{t.thCust}</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider">{t.thDate}</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-right">{t.thAmt}</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider text-center">{t.thStatus}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoicesList.map(inv => (
                      <tr key={inv.id} className="border-b border-[var(--border-ui)]/50 hover:bg-slate-500/5">
                        <td className="py-3 font-mono font-bold text-[var(--brand-primary)]">{inv.id}</td>
                        <td className="py-3 font-semibold">{inv.customer}</td>
                        <td className="py-3 text-[var(--text-secondary)]">{inv.date}</td>
                        <td className="py-3 text-right font-mono font-bold">₹{inv.amount.toFixed(2)}</td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {inv.status === 'Paid' ? t.statusPaid : t.statusPending}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'salesInvoice':
        const salesSummary = computeSalesSummary(saleCart);
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-2">
              <h3 className="text-base font-black tracking-tight">{t.invFormTitle}</h3>
              <p className="text-xs text-[var(--text-secondary)]">{t.invFormSub}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* input controller */}
              <div className="lg:col-span-2 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpCust}</label>
                    <select 
                      value={saleCustomer} 
                      onChange={(e) => setSaleCustomer(e.target.value)} 
                      className={inputStyle}
                    >
                      {partiesList.filter(p => p.type === 'Customer').map(p => (
                        <option key={p.name} value={p.name}>{p.name} ({p.phone})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpCustNew}</label>
                    <input 
                      type="text" 
                      value={saleCustomer} 
                      onChange={(e) => setSaleCustomer(e.target.value)} 
                      placeholder="Enter direct or dynamic guest client"
                      className={inputStyle} 
                    />
                  </div>
                </div>

                <div className="border-t border-[var(--border-ui)]/50 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpItem}</label>
                    <select 
                      value={saleItemIndex} 
                      onChange={(e) => setSaleItemIndex(Number(e.target.value))} 
                      className={inputStyle}
                    >
                      {itemsList.map((it, idx) => (
                        <option key={it.barcode} value={idx}>{it.name} (Sell: ₹{it.price.toFixed(2)})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpQty}</label>
                      <input 
                        type="number" 
                        value={saleQty} 
                        onChange={(e) => setSaleQty(e.target.value)} 
                        className={inputStyle} 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpPrice}</label>
                      <input 
                        type="number" 
                        value={salePrice} 
                        onChange={(e) => setSalePrice(e.target.value)} 
                        className={inputStyle} 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpDisc}</label>
                      <input 
                        type="number" 
                        value={saleDiscount} 
                        onChange={(e) => setSaleDiscount(e.target.value)} 
                        className={inputStyle} 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpTax}</label>
                    <select 
                      value={saleTax} 
                      onChange={(e) => setSaleTax(Number(e.target.value))} 
                      className={inputStyle}
                    >
                      <option value="0">GST @ 0% (Exempt)</option>
                      <option value="5">GST @ 5%</option>
                      <option value="12">GST @ 12%</option>
                      <option value="18">GST @ 18%</option>
                      <option value="28">GST @ 28%</option>
                    </select>
                  </div>

                  <button 
                    onClick={handlePushItemToSalesCart}
                    className="py-3 px-4 bg-[var(--brand-primary)] text-white hover:opacity-90 font-bold uppercase text-[11px] select-none rounded-xl transition-all flex items-center justify-center gap-1 min-h-[44px]"
                  >
                    <Plus size={14} />
                    <span>{t.btnCart}</span>
                  </button>
                </div>
              </div>

              {/* active cart display pane */}
              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-6">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase text-slate-500">{t.cartLabel}</h4>
                  <p className="text-[10px] text-[var(--text-secondary)]">{saleCart.length} entries added</p>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {saleCart.length === 0 ? (
                    <div className="text-[10.5px] p-4 text-center text-slate-400 font-sans border-2 border-dashed border-[var(--border-ui)] rounded-xl">
                      {t.cartEmpty}
                    </div>
                  ) : (
                    saleCart.map(it => (
                      <div key={it.id} className="p-2.5 rounded-xl border border-[var(--border-ui)]/50 bg-[var(--bg-app)] flex items-center justify-between text-xs font-mono">
                        <div className="truncate pr-2">
                          <span className="font-sans font-bold block truncate">{it.name}</span>
                          <span className="text-[9px] text-[var(--text-secondary)] block">Qty: {it.qty} x ₹{it.price} (Tax {it.taxRate}%)</span>
                        </div>
                        <button 
                          onClick={() => setSaleCart(p => p.filter(e => e.id !== it.id))}
                          className="text-red-500 p-1 bg-red-500/10 hover:bg-red-500/25 rounded-md"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* financial summaries ROUNDED TO FIXED 2 */}
                <div className="border-t border-[var(--border-ui)]/60 pt-4 space-y-2 font-mono text-[11px] text-[var(--text-secondary)]">
                  <div className="flex justify-between">
                    <span>{t.lblSub}:</span>
                    <span className="font-bold text-[var(--text-main)]">₹{salesSummary.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.lblTax}:</span>
                    <span className="font-bold text-[var(--text-main)]">₹{salesSummary.tax}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.lblDisc}:</span>
                    <span className="font-bold text-[var(--text-main)]">₹{salesSummary.discount}</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--border-ui)]/40 pt-2 text-xs font-extrabold text-[var(--brand-primary)]">
                    <span>{t.lblGrand}:</span>
                    <span>₹{salesSummary.grand}</span>
                  </div>
                </div>

                <button 
                  onClick={handleCommitSalesInvoice}
                  disabled={saleCart.length === 0}
                  className="w-full py-3 bg-[var(--brand-primary)] text-white hover:opacity-90 active:scale-98 disabled:opacity-50 font-bold uppercase text-xs rounded-xl transition-all"
                >
                  {t.btnCommit}
                </button>
              </div>
            </div>
          </div>
        );

      case 'purchase':
        const purchaseSummary = computePurchaseSummary(purCart);
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-2">
              <h3 className="text-base font-black tracking-tight">{t.purFormTitle}</h3>
              <p className="text-xs text-[var(--text-secondary)]">{t.purFormSub}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpVend}</label>
                    <select 
                      value={purVendor} 
                      onChange={(e) => setPurVendor(e.target.value)} 
                      className={inputStyle}
                    >
                      {partiesList.filter(p => p.type === 'Supplier').map(p => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpVendNew}</label>
                    <input 
                      type="text" 
                      value={purVendor} 
                      onChange={(e) => setPurVendor(e.target.value)} 
                      placeholder="Insert customized direct supplier vendor"
                      className={inputStyle} 
                    />
                  </div>
                </div>

                <div className="border-t border-[var(--border-ui)]/50 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpItem}</label>
                    <select 
                      value={purItemIndex} 
                      onChange={(e) => setPurItemIndex(Number(e.target.value))} 
                      className={inputStyle}
                    >
                      {itemsList.map((it, idx) => (
                        <option key={it.barcode} value={idx}>{it.name} (Cost: ₹{it.baseCost.toFixed(2)})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpQty}</label>
                      <input 
                        type="number" 
                        value={purQty} 
                        onChange={(e) => setPurQty(e.target.value)} 
                        className={inputStyle} 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpCost}</label>
                      <input 
                        type="number" 
                        value={purCost} 
                        onChange={(e) => setPurCost(e.target.value)} 
                        className={inputStyle} 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpDisc}</label>
                      <input 
                        type="number" 
                        value={purDiscount} 
                        onChange={(e) => setPurDiscount(e.target.value)} 
                        className={inputStyle} 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpTax}</label>
                    <select 
                      value={purTax} 
                      onChange={(e) => setPurTax(Number(e.target.value))} 
                      className={inputStyle}
                    >
                      <option value="0">GST @ 0% (Exempt)</option>
                      <option value="5">GST @ 5%</option>
                      <option value="12">GST @ 12%</option>
                      <option value="18">GST @ 18%</option>
                      <option value="28">GST @ 28%</option>
                    </select>
                  </div>

                  <button 
                    onClick={handlePushItemToPurchaseCart}
                    className="py-3 px-4 bg-emerald-600 text-white hover:opacity-90 font-bold uppercase text-[11px] select-none rounded-xl transition-all flex items-center justify-center gap-1 min-h-[44px]"
                  >
                    <Plus size={14} />
                    <span>{t.btnCart}</span>
                  </button>
                </div>
              </div>

              {/* active buy lists cart display pane */}
              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-6">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase text-slate-500">{t.cartLabel}</h4>
                  <p className="text-[10px] text-[var(--text-secondary)]">{purCart.length} entries added</p>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {purCart.length === 0 ? (
                    <div className="text-[10.5px] p-4 text-center text-slate-400 font-sans border-2 border-dashed border-[var(--border-ui)] rounded-xl">
                      {t.cartEmpty}
                    </div>
                  ) : (
                    purCart.map(it => (
                      <div key={it.id} className="p-2.5 rounded-xl border border-[var(--border-ui)]/50 bg-[var(--bg-app)] flex items-center justify-between text-xs font-mono">
                        <div className="truncate pr-2">
                          <span className="font-sans font-bold block truncate">{it.name}</span>
                          <span className="text-[9px] text-[var(--text-secondary)] block">Qty: {it.qty} x ₹{it.cost} (Tax {it.taxRate}%)</span>
                        </div>
                        <button 
                          onClick={() => setPurCart(p => p.filter(e => e.id !== it.id))}
                          className="text-red-500 p-1 bg-red-500/10 hover:bg-red-500/25 rounded-md"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-[var(--border-ui)]/60 pt-4 space-y-2 font-mono text-[11px] text-[var(--text-secondary)]">
                  <div className="flex justify-between">
                    <span>{t.lblSub}:</span>
                    <span className="font-bold text-[var(--text-main)]">₹{purchaseSummary.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.lblTax}:</span>
                    <span className="font-bold text-[var(--text-main)]">₹{purchaseSummary.tax}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.lblDisc}:</span>
                    <span className="font-bold text-[var(--text-main)]">₹{purchaseSummary.discount}</span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--border-ui)]/40 pt-2 text-xs font-extrabold text-emerald-500">
                    <span>{t.lblGrand}:</span>
                    <span>₹{purchaseSummary.grand}</span>
                  </div>
                </div>

                <button 
                  onClick={handleCommitPurchaseOrder}
                  disabled={purCart.length === 0}
                  className="w-full py-3 bg-emerald-600 text-white hover:opacity-90 active:scale-98 disabled:opacity-50 font-bold uppercase text-xs rounded-xl transition-all"
                >
                  {t.savePurchase}
                </button>
              </div>
            </div>
          </div>
        );

      case 'items':
        const filteredProducts = itemsList.filter(it => 
          it.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
          it.barcode.includes(searchFilter)
        );
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-2">
              <h3 className="text-base font-black tracking-tight">{t.itemsTitle}</h3>
              <p className="text-xs text-[var(--text-secondary)]">{t.itemsSub}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* addition form component */}
              <form onSubmit={handleAddNewItemToCatalog} className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-500">{t.addItemTitle}</h4>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpItemName}*</label>
                  <input 
                    type="text" 
                    required 
                    value={newItemName} 
                    onChange={(e) => setNewItemName(e.target.value)} 
                    placeholder="e.g., Basmati Rice 5kg" 
                    className={inputStyle} 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpSku}*</label>
                  <input 
                    type="text" 
                    required 
                    value={newItemSku} 
                    onChange={(e) => setNewItemSku(e.target.value)} 
                    placeholder="e.g., 890111222333" 
                    className={inputStyle} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpCost}</label>
                    <input 
                      type="number" 
                      value={newItemCost} 
                      onChange={(e) => setNewItemCost(e.target.value)} 
                      className={inputStyle} 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpSell}</label>
                    <input 
                      type="number" 
                      value={newItemPrice} 
                      onChange={(e) => setNewItemPrice(e.target.value)} 
                      className={inputStyle} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">GST %</label>
                    <select 
                      value={newItemTax} 
                      onChange={(e) => setNewItemTax(Number(e.target.value))} 
                      className={inputStyle}
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.itemCategory}</label>
                    <input 
                      type="text" 
                      value={newItemCat} 
                      onChange={(e) => setNewItemCat(e.target.value)} 
                      className={inputStyle} 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-3 bg-[var(--brand-primary)] text-white font-bold uppercase text-xs rounded-xl hover:opacity-90 transition-all"
                >
                  {t.addBtn} {t.menuItems}
                </button>
              </form>

              {/* lists output */}
              <div className="lg:col-span-2 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-4">
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-[var(--text-secondary)]" />
                  <input 
                    type="text" 
                    value={searchFilter} 
                    onChange={(e) => setSearchFilter(e.target.value)} 
                    placeholder={t.searchQuery}
                    className="w-full py-1.5 bg-transparent border-0 outline-none text-xs text-[var(--text-main)]"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-ui)] text-[var(--text-secondary)] pb-2">
                        <th className="py-2 font-bold uppercase">{t.thSku}</th>
                        <th className="py-2 font-bold uppercase">{t.thName}</th>
                        <th className="py-2 font-bold uppercase text-right">{t.thCost}</th>
                        <th className="py-2 font-bold uppercase text-right">{t.thPrice}</th>
                        <th className="py-2 font-bold uppercase text-center">{t.thTax}</th>
                        <th className="py-2 font-bold uppercase text-center">{t.actionCol}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(it => (
                        <tr key={it.barcode} className="border-b border-[var(--border-ui)]/40 hover:bg-slate-500/5">
                          <td className="py-2.5 font-mono text-[var(--text-secondary)]">{it.barcode}</td>
                          <td className="py-2.5 font-semibold text-[var(--text-main)]">{it.name}</td>
                          <td className="py-2.5 text-right font-mono">₹{it.baseCost.toFixed(2)}</td>
                          <td className="py-2.5 text-right font-mono font-bold text-[var(--brand-primary)]">₹{it.price.toFixed(2)}</td>
                          <td className="py-2.5 text-center font-mono text-slate-500">{it.taxRate}%</td>
                          <td className="py-2.5 text-center">
                            <button 
                              onClick={() => setItemsList(v => v.filter(i => i.barcode !== it.barcode))}
                              className="text-red-500 hover:underline font-bold"
                            >
                              {t.deleteBtn}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );

      case 'parties':
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-2">
              <h3 className="text-base font-black tracking-tight">{t.partiesTitle}</h3>
              <p className="text-xs text-[var(--text-secondary)]">{t.partiesSub}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* link input crm panel */}
              <form onSubmit={handleAddNewPartyToCRM} className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-500">{t.addPartyTitle}</h4>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpPName}*</label>
                  <input 
                    type="text" 
                    required 
                    value={newPName} 
                    onChange={(e) => setNewPName(e.target.value)} 
                    placeholder="e.g., Harish Traders" 
                    className={inputStyle} 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpPPhone}*</label>
                  <input 
                    type="tel" 
                    required 
                    value={newPPhone} 
                    onChange={(e) => setNewPPhone(e.target.value)} 
                    placeholder="e.g., +91 99887 76655" 
                    className={inputStyle} 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpPGst}</label>
                  <input 
                    type="text" 
                    value={newPGst} 
                    onChange={(e) => setNewPGst(e.target.value)} 
                    placeholder="15-char GSTIN identity" 
                    className={inputStyle} 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpPType}</label>
                  <select 
                    value={newPType} 
                    onChange={(e) => setNewPType(e.target.value as any)} 
                    className={inputStyle}
                  >
                    <option value="Customer">Customer Party (Client)</option>
                    <option value="Supplier">Supplier Party (Vendor)</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-3 bg-[var(--brand-primary)] text-white font-bold uppercase text-xs rounded-xl hover:opacity-90 transition-all"
                >
                  {t.addBtn} Party
                </button>
              </form>

              {/* client directory registry outputs */}
              <div className="lg:col-span-2 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-4">
                <div className="flex border-b border-[var(--border-ui)]/50 pb-2 gap-4 text-xs font-bold font-sans">
                  <span>🗺️ Directory Logs ({partiesList.length})</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-ui)] text-[var(--text-secondary)]">
                        <th className="py-2 font-bold uppercase">{t.thPName}</th>
                        <th className="py-2 font-bold uppercase">{t.thPhone}</th>
                        <th className="py-2 font-bold uppercase text-center">{t.thType}</th>
                        <th className="py-2 font-bold uppercase text-right">{t.colOutstanding}</th>
                        <th className="py-2 font-bold uppercase text-center">{t.actionCol}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partiesList.map(p => (
                        <tr key={p.phone} className="border-b border-[var(--border-ui)]/40 hover:bg-slate-500/5">
                          <td className="py-2.5 font-semibold text-[var(--text-main)]">{p.name}</td>
                          <td className="py-2.5 text-[var(--text-secondary)] font-mono">{p.phone}</td>
                          <td className="py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              p.type === 'Customer' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {p.type}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold">
                            <span className={p.outstanding < 0 ? 'text-red-500' : 'text-emerald-500'}>
                              ₹{p.outstanding.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-2.5 text-center">
                            <button 
                              onClick={() => setPartiesList(v => v.filter(e => e.phone !== p.phone))}
                              className="text-red-500 hover:underline font-bold"
                            >
                              {t.deleteBtn}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );

      case 'expenses':
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-2">
              <h3 className="text-base font-black tracking-tight">{t.expensesTitle}</h3>
              <p className="text-xs text-[var(--text-secondary)]">{t.expensesSub}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* expense creation logs form */}
              <form onSubmit={handleAddNewExpense} className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-500">{t.addExpenseTitle}</h4>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpEDesc}*</label>
                  <input 
                    type="text" 
                    required 
                    value={newEDesc} 
                    onChange={(e) => setNewEDesc(e.target.value)} 
                    placeholder="e.g., Internet Monthly Rental" 
                    className={inputStyle} 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpECat}</label>
                  <select 
                    value={newECat} 
                    onChange={(e) => setNewECat(e.target.value)} 
                    className={inputStyle}
                  >
                    <option value="Utilities">Utilities & WiFi</option>
                    <option value="Rent">Store Room Rent</option>
                    <option value="Salaries">Worker Daily Salaries</option>
                    <option value="Transport">Vehicle Logistics Fuel</option>
                    <option value="Miscellaneous">Other Miscellaneous Overhead</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{t.inpEAmt}*</label>
                  <input 
                    type="number" 
                    required 
                    value={newEAmt} 
                    onChange={(e) => setNewEAmt(e.target.value)} 
                    placeholder="0.00" 
                    className={inputStyle} 
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full py-3 bg-[var(--brand-primary)] text-white font-bold uppercase text-xs rounded-xl hover:opacity-90 transition-all"
                >
                  Log Expense Cost
                </button>
              </form>

              {/* registered expenses list table */}
              <div className="lg:col-span-2 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-4">
                <div className="flex border-b border-[var(--border-ui)]/50 pb-2 justify-between items-center text-xs font-bold">
                  <span>📋 Operational Expenses Ledger</span>
                  <span className="text-red-500">Total: ₹{calculateAggregateExpenses().toFixed(2)}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-ui)] text-[var(--text-secondary)]">
                        <th className="py-2.5 font-bold uppercase">{t.colEDesc}</th>
                        <th className="py-2.5 font-bold uppercase">{t.colECat}</th>
                        <th className="py-2.5 font-bold uppercase text-right">{t.colEAmt}</th>
                        <th className="py-2.5 font-bold uppercase text-center">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expensesList.map((e, idx) => (
                        <tr key={idx} className="border-b border-[var(--border-ui)]/40 hover:bg-slate-500/5">
                          <td className="py-3 font-semibold text-[var(--text-main)]">{e.desc}</td>
                          <td className="py-3"><span className="bg-red-500/10 text-red-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">{e.category}</span></td>
                          <td className="py-3 text-right font-mono font-bold text-red-500">₹{e.amount.toFixed(2)}</td>
                          <td className="py-3 text-center text-[var(--text-secondary)] font-mono">{e.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );

      case 'reports':
        const revenue = calculateAggregateRevenue();
        const cogs = calculateAggregateCog();
        const operatingOverheads = calculateAggregateExpenses();
        const profitMargin = calculateNetOperatingMargin();
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-2">
              <h3 className="text-base font-black tracking-tight">{t.reportsTitle}</h3>
              <p className="text-xs text-[var(--text-secondary)]">{t.reportsSub}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* direct P&L dynamic financial calculation audits sheet */}
              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.plTitle}</h4>
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-[var(--border-ui)]/30 pb-2">
                    <span>{t.repSales} (+):</span>
                    <span className="text-emerald-500 font-extrabold">₹{revenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-ui)]/30 pb-2">
                    <span>{t.repPur} (-):</span>
                    <span className="text-red-400">₹{cogs.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-ui)]/30 pb-2">
                    <span>{t.repExp} (-):</span>
                    <span className="text-red-400">₹{operatingOverheads.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-sm font-black border-t border-[var(--border-ui)]/60">
                    <span>{t.repProfit}:</span>
                    <span className={profitMargin >= 0 ? "text-emerald-500" : "text-rose-500"}>
                      ₹{profitMargin.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Asset and GST audit highlights sheet */}
              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.balAssetTitle}</h4>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between">
                      <span>Receivable Outstanding Assets:</span>
                      <span className="text-indigo-500">₹{partiesList.filter(p => p.type === 'Customer').reduce((a,c)=>a+c.outstanding,0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Withholding GST Tax Pool:</span>
                      <span className="text-amber-500">₹{invoicesList.reduce((acc, c)=> acc+c.tax, 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => triggerToast("Compiled audit formatted output sheet safely to device cache.", "success")}
                  className="w-full py-3 border border-[var(--border-ui)] hover:bg-[var(--brand-primary)] hover:text-white rounded-xl text-xs font-bold transition-all uppercase"
                >
                  {t.downloadLabel}
                </button>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-2">
              <h3 className="text-base font-black tracking-tight">{t.settingsTitlePage}</h3>
              <p className="text-xs text-[var(--text-secondary)]">{t.settingsSubPage}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* general togglers settings pane */}
              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-6">
                {/* Lang Selector */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-400">{t.lblLang}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={`py-2 px-3 text-xs font-extrabold rounded-xl border transition-all ${
                        language === 'en' 
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-sm' 
                          : 'border-[var(--border-ui)] text-[var(--text-secondary)] hover:bg-slate-500/5'
                      }`}
                    >
                      English
                    </button>
                    <button 
                      type="button"
                      onClick={() => setLanguage('hi')}
                      className={`py-2 px-3 text-xs font-extrabold rounded-xl border transition-all ${
                        language === 'hi' 
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-sm' 
                          : 'border-[var(--border-ui)] text-[var(--text-secondary)] hover:bg-slate-500/5'
                      }`}
                    >
                      Hindi / Hinglish हिन्दी
                    </button>
                  </div>
                </div>

                {/* Theme Selector */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-400">{t.lblTheme}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => setThemeMode('light')}
                      className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 bg-[var(--bg-card)] ${
                        themeMode === 'light' 
                          ? 'border-indigo-500 ring-2 ring-indigo-500/20 text-slate-900 font-extrabold' 
                          : 'border-[var(--border-ui)] text-[var(--text-secondary)] hover:bg-slate-500/5'
                      }`}
                    >
                      <Sun size={14} className={themeMode === 'light' ? 'text-indigo-500' : ''} />
                      <span>{t.lblThemeLight}</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setThemeMode('dark')}
                      className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 bg-[var(--bg-card)] ${
                        themeMode === 'dark' 
                          ? 'border-indigo-400 ring-2 ring-indigo-400/20 text-white font-extrabold' 
                          : 'border-[var(--border-ui)] text-[var(--text-secondary)] hover:bg-slate-500/5'
                      }`}
                    >
                      <Moon size={14} className={themeMode === 'dark' ? 'text-indigo-400' : ''} />
                      <span>{t.lblThemeDark}</span>
                    </button>
                  </div>
                </div>

                {/* Cloud Sync toggle switch */}
                <div className="p-4 rounded-xl border border-[var(--border-ui)] bg-slate-500/5 flex items-center justify-between">
                  <div className="pr-3">
                    <h5 className="text-[11.5px] font-extrabold">{t.lblSyncGate}</h5>
                    <p className="text-[9.5px] text-[var(--text-secondary)] leading-tight mt-0.5">
                      {isCloudSyncEnabled ? "Live connections on" : "Off-grid sandbox active"}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      const next = !isCloudSyncEnabled;
                      setIsCloudSyncEnabled(next);
                      triggerToast(next ? "Cloud sync channels connected" : "Pure local standby toggled");
                    }}
                    className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full transition-colors duration-200 outline-none ${
                      isCloudSyncEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ${
                      isCloudSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Metrology indices pane */}
              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-ui)] space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-500">{t.lblMetrology}</h4>
                <div className="space-y-2 font-mono text-[11px] text-[var(--text-secondary)]">
                  <div className="flex justify-between pb-1 border-b border-[var(--border-ui)]/35">
                    <span>{t.dbInvoices}:</span>
                    <span className="font-bold text-[var(--text-main)]">{invoicesList.length}</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-[var(--border-ui)]/35">
                    <span>Product Catalog Rows:</span>
                    <span className="font-bold text-[var(--text-main)]">{itemsList.length}</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-[var(--border-ui)]/35">
                    <span>CRM Contact Logs:</span>
                    <span className="font-bold text-[var(--text-main)]">{partiesList.length}</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-[var(--border-ui)]/35">
                    <span>Sync Queue Status:</span>
                    <span className="text-emerald-500 font-bold">Synced (0 pending)</span>
                  </div>
                </div>

                <div className="border-t border-[var(--border-ui)]/50 pt-4 flex flex-col gap-2">
                  <button 
                    onClick={() => triggerToast("Cleared system database overheads, optimizing indices.", "success")}
                    className="w-full py-2.5 border border-[var(--border-ui)] rounded-xl text-xs font-bold hover:bg-slate-500/5 transition-all text-slate-500 hover:text-[var(--text-main)]"
                  >
                    Clean Cache
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm("This wipes all active mock local storage elements. Reset?")) {
                        setInvoicesList([]);
                        setPurchasesList([]);
                        setItemsList([]);
                        setPartiesList([]);
                        setExpensesList([]);
                        triggerToast("All ledger tables purged.", "info");
                        setActiveMenu('dashboard');
                      }
                    }}
                    className="w-full py-2.5 border border-red-500/30 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500/5 transition-all"
                  >
                    Reset Operational Base
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div className="p-4">Select an active operations view.</div>;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-app)] text-[var(--text-main)] overflow-hidden font-sans">
      
      {/* ================================================================= */}
      {/* SIDEBAR NAVIGATION PANEL (LHS Desktop Screens)                   */}
      {/* ================================================================= */}
      <aside className="hidden md:flex flex-col w-64 bg-[var(--bg-card)] border-r border-[var(--border-ui)] shrink-0 h-full p-5 relative select-none">
        {/* Core branding info */}
        <div className="flex items-center gap-3 pb-6 border-b border-[var(--border-ui)]/50">
          <div className="p-2.5 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight uppercase leading-none">EazyBilling v2.0</h3>
            <span className="text-[9px] text-emerald-500 font-mono tracking-wider">CONFORMANCE CONSOLE</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1.5 py-6 overflow-y-auto">
          {menuItems.map(item => {
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-[var(--brand-primary)] text-white shadow-md' 
                    : 'hover:bg-slate-500/5 dark:hover:bg-slate-500/10 text-[var(--text-secondary)]'
                }`}
              >
                {item.icon}
                <span>{t[item.labelKey]}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer parameters quick toggle */}
        <div className="pt-4 border-t border-[var(--border-ui)]/50 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[var(--text-secondary)]">
            <span>{t.lblLang}:</span>
            <button 
              onClick={() => setLanguage(lang => lang === 'en' ? 'hi' : 'en')}
              className="px-2 py-1 border border-[var(--border-ui)] rounded-md hover:bg-slate-500/5 active:scale-95 transition-all text-[9px]"
            >
              {language === 'en' ? 'हिन्दी' : 'English'}
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[var(--text-secondary)]">
            <span>Theme:</span>
            <button 
              onClick={() => setThemeMode(mode => mode === 'light' ? 'dark' : 'light')}
              className="px-2 py-1 border border-[var(--border-ui)] rounded-md hover:bg-slate-500/5 active:scale-95 transition-all text-[9px]"
            >
              {themeMode === 'light' ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </aside>

      {/* ================================================================= */}
      {/* MAIN LAYOUT CANVAS ROUTER                                         */}
      {/* ================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Mobile Header navigation bars */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 bg-[var(--bg-card)] border-b border-[var(--border-ui)] shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 border border-[var(--border-ui)] rounded-lg text-xs font-black tracking-wider uppercase leading-none select-none active:scale-95"
            >
              Menu
            </button>
            <span className="text-xs font-black uppercase text-[var(--brand-primary)]">
              {t[menuItems.find(i=>i.id===activeMenu)?.labelKey || 'menuDashboard']}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setLanguage(lang => lang === 'en' ? 'hi' : 'en')}
              className="px-2 py-1 text-[9px] font-extrabold border border-[var(--border-ui)] rounded-lg"
            >
              {language === 'en' ? 'हिन्दी' : 'Eng'}
            </button>
            <button 
              onClick={() => setThemeMode(mode => mode === 'light' ? 'dark' : 'light')}
              className="p-1 border border-[var(--border-ui)] rounded-lg"
            >
              {themeMode === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </header>

        {/* Desktop Top Header Info context */}
        <header className="hidden md:flex items-center justify-between px-6 py-4 border-b border-[var(--border-ui)]/50 bg-[var(--bg-card)] shrink-0">
          <div>
            <h1 className="text-base font-black tracking-tight">
              {t[menuItems.find(i=>i.id===activeMenu)?.labelKey || 'menuDashboard']}
            </h1>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-none">
              EazyBilling High-Performance Harmonized Operations Monitor
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] bg-indigo-500/10 text-indigo-500 font-extrabold px-2.5 py-1 rounded-full uppercase">
              Financial Session: 2026-II
            </span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2.5 py-1 rounded-full font-mono uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          </div>
        </header>

        {/* Viewport content layout pane */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--bg-app)] relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMenu}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-6xl mx-auto pb-12"
            >
              {renderViewContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ================================================================= */}
      {/* MOBILE DRAWER DRAWER SIDE NAVIGATION NAVIGATION MENU OVERLAY      */}
      {/* ================================================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[50000] flex">
          {/* backdrop click overlay */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          
          <div className="relative flex flex-col w-2/3 max-w-xs h-full bg-[var(--bg-card)] p-5 border-r border-[var(--border-ui)] animate-slide-in">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-ui)]/50 mb-4">
              <span className="text-xs font-black uppercase text-slate-400">Navigation</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-rose-500 text-xs font-bold select-none uppercase">Close</button>
            </div>
            
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {menuItems.map(item => {
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveMenu(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                      isActive 
                        ? 'bg-[var(--brand-primary)] text-white shadow-md' 
                        : 'hover:bg-slate-500/5 text-[var(--text-secondary)]'
                    }`}
                  >
                    {item.icon}
                    <span>{t[item.labelKey]}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* HIGHLY DISCIPLINED ACCESSIBLE CUSTOM ROUNDED TOAST POPUP          */}
      {/* ================================================================= */}
      <AnimatePresence>
        {toast && (
          <div className="fixed top-4 left-4 right-4 z-[99999] pointer-events-none flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`p-3.5 max-w-sm w-full rounded-2xl shadow-lg border text-xs font-bold flex items-center gap-2.5 backdrop-blur-md ${
                toast.type === 'success' 
                  ? 'bg-emerald-500/95 border-emerald-400 text-white shadow-emerald-500/10' 
                  : toast.type === 'error'
                  ? 'bg-red-500/95 border-red-400 text-white shadow-red-500/10'
                  : 'bg-indigo-600/95 border-indigo-500 text-white shadow-indigo-600/10'
              }`}
            >
              <span>{toast.type === 'success' ? '✅' : 'ℹ️'}</span>
              <div className="flex-1 select-none leading-relaxed">{toast.message}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
