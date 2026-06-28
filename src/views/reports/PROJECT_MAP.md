# Tiered Enterprise Architecture — Project Map

This project is structured around a **Tiered Enterprise Architecture** separating global views, modular component sub-systems, backend services, core schemas, context states, and shared layout systems.

---

## 📂 Structural Tree View (`/src`)

```text
/src
├── api/
│   └── placeholder.ts          # Integrations layer for future API endpoint wrappers
├── assets/
│   └── placeholder.ts          # Storage of local UI visual resources and assets
├── components/
│   ├── features/               # Context-bound features and dynamic elements
│   │   ├── AIAssistant.tsx     # Floating chatbot widget
│   │   └── SettingsAccordion.tsx
│   ├── layout/                 # Visual page scaffolds and boundary wrappers
│   │   ├── ErrorBoundary.tsx
│   │   └── TabTransitionWrapper.tsx
│   └── shared/                 # Fully reusable UI sub-atoms, modals, and elements
│       ├── AddItemModal.tsx
│       ├── DraggableFAB.tsx
│       ├── HeroGraphic.tsx
│       ├── PartySearch.tsx
│       ├── PermissionWrapper.tsx
│       ├── Step1Validator.tsx
│       ├── SyncStatusIcon.tsx
│       ├── SystemHealth.tsx
│       └── ThemeToggle.tsx
├── context/                    # Authentication state and global provider modules
│   └── AuthContext.tsx
├── core/
│   ├── constants/              # Static business configs and operational values
│   │   └── index.ts
│   ├── types/                  # Single source of truth for domain tables, shapes, and enums
│   │   └── index.ts
│   └── utils/                  # Safe system core primitives
│       └── index.ts
├── hooks/                      # Custom modular hooks
│   └── placeholder.ts
├── services/                   # Service engines, DB management, syncing protocol, and file IO
│   ├── aiService.ts
│   ├── billingService.ts
│   ├── firebase.ts
│   ├── firebaseService.ts
│   ├── googleAuthService.ts
│   ├── googleDriveService.ts
│   ├── inventoryService.ts
│   ├── localBackupService.ts
│   ├── secureBillingService.ts
│   ├── smokeTest.ts
│   ├── sqliteService.ts
│   └── syncEngine.ts
└── views/                      # Dedicated individual full-screen views (routed in App.tsx)
    ├── AccountGroupListScreen.tsx
    ├── AggregatedReportScreen.tsx
    ... [all 51 fullscreen views mapped securely]
```

---

## 🏛️ Architectural Layer Breakdown

### 1. View Layer (`/src/views`)
Holds the full screens mapped securely into the layout engine of `App.tsx`. Absolutely no low-level database manipulations occur inside this layer; screens delegate to the appropriate business model service.

### 2. Component System (`/src/components`)
Separated meticulously to optimize code generation, prevent large-file compiler decay, and maximize modular reusability:
- **`features/`**: Feature-specific UI widgets with state interactions.
- **`layout/`**: Structural scaffolding and boundaries.
- **`shared/`**: Simple functional units (modals, fields, triggers).

### 3. Service Layer (`/src/services`)
Contains all business logic, cloud databases, backup storage drivers, synchronizers, and cryptographic blockchain audit logs. Configured universally with `camelCase` filename parameters.

### 4. Core Blueprint (`/src/core`)
Types and constants defining contract rules globally. Every screen and helper references this folder to preserve runtime schemas.
