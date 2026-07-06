# Eazy Billing - Project History & Development Log

This document serves as a persistent history of features, configurations, refactoring sessions, and design iterations completed in the **Eazy Billing** application.

---

## 📅 July 6, 2026

### 🏆 Premium Feature Isolation & Visibility Configuration
* **Dashboard Revisions (`DashboardScreen.tsx`)**:
  * Removed the initial interceptor modal behavior.
  * Configured the menu rendering to **completely hide** the premium features (**Chat** and **Category Search**) when the app is running under the Basic license tier.
* **Settings Upgrades (`SettingsScreen.tsx`)**:
  * Created a dedicated **Premium License** category available directly as an accordion in the mobile view (`md:hidden`) and as a tab on the tablet/desktop sidebar (`md:grid`).
  * Relocated all premium status indicators, sandbox toggles, and license key verification to this view.
  * Added a license key text field supporting the activation key: `EAZY-PREMIUM-2026`. Entering this key validates and upgrades the local DB state to the Premium tier immediately.
  * Restored the ability to downgrade to the Basic tier for testing purposes.
* **Code Quality & Builds**:
  * Verified compilation and typing integrity (`npm run lint` completes with 0 errors).
  * Built and synchronized assets with the iOS native target (`npm run build:ios`).
  * Committed and pushed changes to branch `refactor/modular-features`.

---

## 📅 June 30, 2026

### 🏆 Mac Catalyst Integration & Onboarding Refactoring
* **Mac Catalyst (Capacitor iOS) Integration**:
  * Installed `@capacitor/ios` and added the native Xcode project (`ios/` folder).
  * Added the `"build:ios"` scripts in `package.json` for web asset compilation and Capacitor sync.
* **Native Back Button & Gestures**:
  * Installed `@capacitor/app` and implemented a hardware/gesture back button listener in `App.tsx` to handle navigation history.
* **Onboarding Themes**:
  * Aligned the styling of the onboarding/setup screens (`SplashScreen.tsx`, `LanguageScreen.tsx`, `RoleSelectionScreen.tsx`, `PhoneAuthScreen.tsx`, and `FinancialYearScreen.tsx`) to use the application's root CSS variable tokens (`--bg-app`, `--bg-card`, `--text-main`, `--border-ui`).
* **Modular Codebase Refactoring**:
  * Reorganized components and views into separate domains under `src/features/` (`admin`, `auth`, `billing`, `crm`, `inventory`, `reports`).
  * Relocated utility DB patch scripts to `scripts/db-patches/`.
* **OTP Authentication**:
  * Created `PhoneAuthScreen.tsx` for Firebase OTP verification.
* **Routing Optimization**:
  * Integrated a check in `App.tsx` to bypass onboarding for returning users with a complete company profile.

---

## 🔑 Key Verification Credentials (For Testing)
* **Premium Activation License Key**: `EAZY-PREMIUM-2026`
