import React, { createContext, useContext, useEffect } from 'react';
import { Language } from '../../core/types';

// =================================================================
// 🌍 CENTRAL BILINGUAL TRANSLATION DICTIONARY (REAL-TIME CONCURRENT STREAM)
// =================================================================
export const CENTRAL_TRANSLATION_DICTIONARY = {
  en: {
    dashboardTitle: "EazyBilling Business Hub",
    dashboardSubtitle: "High-Performance Offline-First Operations",
    salesInvoice: "Sales Invoice",
    purchase: "Purchase",
    itemsRegistry: "Item Registry",
    partiesLedger: "Ledger Parties",
    expensesList: "Expenses Terminal",
    reportsMetrics: "Reports & Financials",
    settingsDashboard: "Settings & System",
    searchPlaceholder: "Search records, actions or bills...",
    noDataFound: "No records found on current workstation",
    backBtn: "Back",
    saveBtn: "Save",
    cancelBtn: "Cancel",
    addBtn: "Add New Entry",
    deleteBtn: "Delete",
    loading: "Initializing stream...",
    statusActive: "Active Connection",
    statusOffline: "Local Offline Workstation",
    unbalancedTax: "Taxes rounded with high precision",
    confirmAction: "Are you certain about this action?",
    successMessage: "Action committed to offline database!",
    errorMessage: "Process failed. Resolve errors.",
    invoiceNo: "Invoice Number",
    partyName: "Party Name",
    amount: "Total Amount (₹)",
    status: "Status"
  },
  hi: {
    dashboardTitle: "ईज़ीबिलिंग बिज़नेस हब",
    dashboardSubtitle: "हाई-परफॉर्मेंस ऑफलाइन-फर्स्ट ऑपरेशन्स",
    salesInvoice: "बिक्री इनवॉइस (Sale)",
    purchase: "खरीद इनवॉइस (Purchase)",
    itemsRegistry: "उत्पाद एवं सेवाएं (Items)",
    partiesLedger: "ग्राहक और विक्रेता (Parties)",
    expensesList: "खर्च और भुगतान (Expenses)",
    reportsMetrics: "रिपोर्ट्स और आंकड़े (Reports)",
    settingsDashboard: "सेटिंग्स और सिस्टम",
    searchPlaceholder: "रिकॉर्ड, एक्शन या बिल खोजें...",
    noDataFound: "वर्तमान वर्कस्टेशन पर कोई रिकॉर्ड नहीं मिला",
    backBtn: "पीछे जाएं",
    saveBtn: "सुरक्षित करें",
    cancelBtn: "रद्द करें",
    addBtn: "नया दर्ज करें",
    deleteBtn: "हटाएं",
    loading: "डेटा लोड हो रहा है...",
    statusActive: "सक्रिय इंटरनेट नेटवर्क",
    statusOffline: "लोकल ऑफलाइन वर्कस्टेशन",
    unbalancedTax: "हाई-परिसिजन राउंडिंग के साथ टैक्स जोड़ा गया",
    confirmAction: "क्या आप इस कार्रवाई के बारे में सुनिश्चित हैं?",
    successMessage: "कार्रवाई लोकल डेटाबेस में सुरक्षित हो गई है!",
    errorMessage: "प्रक्रिया विफल रही। कृपया त्रुटियों को सुधारें।",
    invoiceNo: "इनवॉइस नंबर",
    partyName: "पार्टी का नाम",
    amount: "कुल राशि (₹)",
    status: "स्थिति"
  }
};

// Create a React translation Context for unified, screen-wide instant translation propagation
const TranslationContext = createContext<{
  t: typeof CENTRAL_TRANSLATION_DICTIONARY['en'];
  language: Language;
}>({
  t: CENTRAL_TRANSLATION_DICTIONARY.en,
  language: 'en'
});

export const useTranslation = () => useContext(TranslationContext);

interface MenuPageHarmonizerProps {
  language: Language;
  children: React.ReactNode;
}

export const MenuPageHarmonizer: React.FC<MenuPageHarmonizerProps> = ({ language, children }) => {
  const activeLanguage = language === 'hi' ? 'hi' : 'en';
  const t = CENTRAL_TRANSLATION_DICTIONARY[activeLanguage];

  // Dynamically inject global focus halo overrides for any child inputs within this container boundary
  useEffect(() => {
    const styleId = "menu-page-harmonizer-styles";
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      styleElement.innerHTML = `
        /* Central CSS overrides mapping directly to strict UX bindings */
        .harmonized-view input,
        .harmonized-view select,
        .harmonized-view textarea {
          background-color: var(--bg-card) !important;
          color: var(--text-main) !important;
          border: 1px solid var(--border-ui) !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
          outline: none !important;
        }
        
        .harmonized-view input:focus,
        .harmonized-view select:focus,
        .harmonized-view textarea:focus {
          border-color: var(--brand-primary) !important;
          box-shadow: 0 0 10px var(--brand-light) !important;
        }

        /* Enforce uncompromised Visual Inheritance */
        .harmonized-view {
          background-color: var(--bg-app) !important;
          color: var(--text-main) !important;
        }

        .harmonized-card {
          background-color: var(--bg-card) !important;
          border: 1px solid var(--border-ui) !important;
          color: var(--text-main) !important;
        }
      `;
      document.head.appendChild(styleElement);
    }
  }, []);

  return (
    <TranslationContext.Provider value={{ t, language: activeLanguage }}>
      <div className="harmonized-view w-full h-full min-h-0 flex-1 flex flex-col transition-colors duration-300">
        {children}
      </div>
    </TranslationContext.Provider>
  );
};
