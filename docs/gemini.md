# Eazy Billing App - Project Context for AI

## 📌 Project Overview
**Eazy Billing App** is a comprehensive, hybrid (Web + Android) application designed for billing, accounting, and inventory management. It is built to help businesses manage their daily operations, including invoicing, GST reporting, stock tracking, manufacturing processes, and location-based shop discovery.

The app is built as a Progressive Web App (PWA) and wrapped as a native Android application using **Capacitor**.

## 🛠️ Tech Stack
- **Frontend Framework:** React 19 (with Hooks & Functional Components)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Mobile/Native Wrapper:** Capacitor (Core & Android)
- **Database & Backend:** 
  - **Firebase:** Firestore (Real-time database) & Authentication
  - **Dexie.js:** IndexedDB wrapper for local/offline data storage
  - **Supabase:** (Used for specific backend services/migrations)
- **Mapping & Geolocation:** Leaflet & React-Leaflet
- **Hardware Integrations:** HTML5-QRCode (for barcode/QR scanning)

## 📂 Core Modules & Features

### 1. Billing & Invoicing (`InvoiceScreen.tsx`)
- Creation of invoices with detailed line items.
- Complex tax calculations (GST - Included/Excluded).
- Discount calculations and line totals (`calculateItemTotal`).

### 2. Accounting & Reports
- **GST Reports (`GSTReportScreen.tsx`):** Tracks Inward and Outward GST, taxable amounts, and total tax payable.
- **Ledger (`LedgerReportScreen.tsx`):** Tracks debit/credit transactions, opening balances, and closing balances.
- **Business Reports (`BusinessReportScreen.tsx`):** High-level overview of business performance, paid amounts, and pending balances.

### 3. Inventory & Manufacturing
- **Stock Management (`OpeningStockScreen.tsx`):** Tracks current stock levels.
- **Manufacturing (`ManufacturingScreen.tsx`):** Handles the conversion of raw materials into finished goods based on defined ratios.

### 4. Location-Based Services (`NearbyShopsScreen.tsx`)
- Uses geolocation to find nearby shops.
- Calculates distance in kilometers using the Haversine formula (`getDistance`).

### 5. Communication (`ChatDetailScreen.tsx`)
- In-app messaging system.
- File sharing capabilities with size formatting (KB/MB).

### 6. Company Profile (`CompanyProfileScreen.tsx`)
- Manages business details, GSTIN, PAN, and exact GPS coordinates (Latitude/Longitude).

## 🏗️ Architecture & Patterns
- **Hybrid Mobile Approach:** The app uses Capacitor (`npx cap sync android`) to bridge the web code to native Android. Avoid using web-only APIs (like `window.alert`) that might behave poorly on mobile; prefer custom UI modals.
- **Data Strategy:** Uses a mix of local storage (Dexie) for fast, offline-capable reads/writes, and Firebase for cloud synchronization and real-time updates.
- **Styling:** Strictly uses Tailwind CSS utility classes. No external CSS files should be created unless absolutely necessary.
- **State Management:** Relies heavily on React Hooks (`useState`, `useEffect`, `useMemo`).

## 🤖 Instructions for AI Assistants
When assisting with this codebase, please adhere to the following rules:
1. **Mobile-First Mindset:** Remember this app is deployed to Android via Capacitor. Ensure UI components are touch-friendly and responsive.
2. **Tailwind Only:** Use Tailwind CSS for all styling. Do not write custom CSS.
3. **Safe Math:** When dealing with currency and taxes, always ensure numbers are safely parsed and formatted (e.g., using `.toFixed(2)` and `Math.abs()` where appropriate to prevent UI crashes).
4. **No Mock Data:** If interacting with the database, write real Firebase/Dexie queries. Do not hardcode mock data unless explicitly asked for a prototype.
5. **Check Dependencies:** Before suggesting a new npm package, check `package.json`. The app already has robust tools for mapping (Leaflet), scanning (html5-qrcode), and icons (lucide-react).
