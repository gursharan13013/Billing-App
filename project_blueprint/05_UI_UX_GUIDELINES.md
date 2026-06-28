# Eazy-Billing: UI/UX Guidelines

## 1. Theme Configuration & Typography
Eazy-Billing follows a high-contrast, professional, and comforting color palette tailored to long hours of billing entry. It centers around Indigo (representing security and business integrity) and Emerald (representing growth, cashflow, and profit).

### Brand Palette Details
- **Primary / Corporate Indigo**: Applied to major actions, navigation anchors, sidebars, and secure card headers (`text-indigo-900`, `bg-indigo-600`, `hover:bg-indigo-700`).
- **Success / Emerald**: Represented heavily in transactional receipts, profit statements, paid badges, and positive billing audits (`text-emerald-800`, `bg-emerald-50`, `border-emerald-200`).
- **Surface / Ambient**: Clean off-white canvases with subtle gray shadows, ensuring that typography contrast strictly meets AAA accessibility criteria.

### Typography
- **Headings & Metric Displays**: Paired with **Inter** or high-readability sans-serif families. Heavy tracking-tight layouts convey modern professionalism.
- **Numbers & Transaction IDs**: Rendered in **JetBrains Mono** or cleanly spaced monospace layouts. This aligns decimal places perfectly and facilitates quick visual scans of large tabular invoice logs.

---

## 2. WhatsApp-Style Micro-Interactions & Transitions
Recognizing that Indian SME operators are highly familiar with WhatsApp's interface, Eazy-Billing integrates similar familiar, responsive micro-animations for interactions:
- **Slide-In Drawers**: Sidebar navigation and invoice items drawers slide smoothly from the right margin during interactions, mimicking conversational chat overlays.
- **Micro-scale Hover Effects**: Buttons and billing rows enlarge slightly (`scale-101`) when hovered over, providing high-visibility tactile feedback under cursor environments.
- **Bouncing Refresh Loops**: Diagnostic reload actions rotate with subtle easing animations, notifying the operator that an assertion is actively compiling.
- **Fading View Transitions**: Avoid jarring full-page flashes. Use standard `motion` transitions for route swapping.

---

## 3. The 5-Step Customer Onboarding Flow
To ensure zero friction during first-time activations while establishing deep security parameters, we introduce an intuitive onboarding flow:

```
+-----------------------------------------------------------------+
|                         Step 1: Welcome                         |
|   Select language setting (English, Hinglish) and click Start.  |
+-------------------------------+---------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
|                    Step 2: Business Identity                    |
|  Enter business display name & select category (Retail, etc).   |
+-------------------------------+---------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
|                       Step 3: Tax Profile                       |
|   Add GSTIN sequence or label as composition/non-registered.     |
+-------------------------------+---------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
|                      Step 4: Initial Contact                    |
|   Create a single customer or party record to clear the board.  |
+-------------------------------+---------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
|                        Step 5: Completion                       |
|   Redirects to clean Dashboard with "Create Invoice" highlighted.|
+-----------------------------------------------------------------+
```

### UX Onboarding Guardrails:
- **No Compulsory Sign-up**: Do not force email or password registration inside the entry funnel. Allow immediate offline operation in local Dexie IndexedDB.
- **Familiar Context Hints**: Use friendly hints (e.g., *"Aapka data local memory me fully encrypted save ho raha hai."*) to build trust early on.
- **Complete-Later Bypass**: Every step has clear default entries, enabling users to click "Next" rapidly and finish the flow in under 20 seconds.
