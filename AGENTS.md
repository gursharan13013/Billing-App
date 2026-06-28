# EazyBilling - AI Agent System Instructions & Context

This file contains the core architecture, constraints, and instructions for any AI Assistant (including Google Antigravity, Gemini, and Claude) modifying or maintaining this codebase. 

---

## 📌 Architectural Core
- **Type:** Hybrid PWA & Native Android App (wrapped with Capacitor).
- **Frontend:** React 19 (Functional Components, Hooks, `lucide-react` for icons).
- **Aesthetic:** Clean, high-contrast, modern interface with generous negative space using Tailwind CSS exclusively (no arbitrary custom CSS).
- **Local Persistence & Sync:** 
  - **Dexie.js (IndexedDB):** Primary offline database for instant client reads/writes.
  - **Firebase Firestore:** Secondary online database. Handles real-time cross-device cloud synchronization.
  - **Conflict Resolution:** Sync engine synchronizes records preserving offline edits.

---

## 🛠️ Build & Compilation Pipelines
- **Development Tooling:** Vite (with PWA capabilities and `@vitejs/plugin-legacy`).
- **Android Compilation Script:** The workspace uses a custom command runner:
  - `npm run build:android`: Heals Gradle, builds Vite assets, and syncs to Capacitor.
  - `npm run build:apk`: Triggers full local Gradle compilation (`./gradlew assembleDebug`).
- **Gradle Integrity Wrapper:** If the binary `gradle-wrapper.jar` gets corrupted or changes formatting, our built-in `node scripts/heal-gradle.js` script (invoked during builds) will automatically fetch a pristine verified clone of the **Gradle 8.14.3** spec wrapper over the network on-the-fly and deploy it.

---

## 🛑 Strict Style Guides & Implementation Rules

### 1. Typography & Styling
- **Tailwind Only:** Styling must be strictly utility-based with Tailwind CSS. Do not create inline styling block attributes or secondary CSS files.
- **Micro-Animations:** Use the standard standard `motion` (by importing from `motion/react`) for smooth, micro-animated entrances/transitions.

### 2. Number Precision & Safe Calculations
- Invoicing and tax systems are highly sensitive to float rounding errors.
- Always parse numerical fields safely using `parseFloat()` or unary plus operators (`+val`), and round formatting cleanly at render times (typically via `.toFixed(2)`).
- Never allow calculations to return `NaN` or unformatted raw decimals in the viewport.

### 3. Native & PWA Safety
- Avoid using pure web-only alerts (`window.alert` or `window.confirm`) which block the UI thread natively on Android WebView.
- Use elegant, accessible custom modals styled with Tailwind for alerts, confirmations, or prompt inputs.
- Ensure touch targets are a minimum of `44px` on interactive mobile nodes.

### 4. Dependency Discipline
- The codebase already contains all necessary packages:
  - Geolocation & Map Display: `leaflet` & `react-leaflet`
  - Camera & Barcode Scan: `html5-qrcode` & `@capacitor/camera`
  - Offline Database wrapper: `dexie` & `dexie-react-hooks`
- Never install generic NPM utilities without inspecting existing libraries first.

---

## 📂 Codebase File Map
- `/src/services/billingService.ts` — Houses main invoice data state and local persistence.
- `/src/services/SecureBillingService.ts` — Relays local Dexie changes with Firestore sync pipelines.
- `/src/infrastructure/SyncEngine.ts` — Offline-first real-time Firebase syncing.
- `/src/views/` — Screen components divided cleanly by modules (billing, inventory, reports, CRM, admin).
- `/scripts/heal-gradle.js` — Checks and repairs Android build binary integrity.
