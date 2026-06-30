const fs = require('fs');

const files = [
  "./components/ManufacturingScreen.tsx",
  "./components/DashboardScreen.tsx",
  "./components/JournalEntryScreen.tsx",
  "./components/AttendanceScreen.tsx",
  "./components/InvoiceScreen.tsx",
  "./components/MasterDataTableScreen.tsx",
  "./components/ContraScreen.tsx",
  "./components/FinancialReportScreen.tsx",
  "./components/OpeningStockScreen.tsx",
  "./components/StockSummaryScreen.tsx",
  "./components/SettingsScreen.tsx",
  "./components/PaymentScreen.tsx",
  "./components/LedgerReportScreen.tsx",
  "./components/BusinessReportScreen.tsx",
  "./services/billingService.ts"
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/\.toISOString\(\)\.split\('T'\)\[0\]/g, ".toLocalDateString()");
    fs.writeFileSync(f, content);
  }
});
