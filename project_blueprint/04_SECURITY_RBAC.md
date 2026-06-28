# Eazy-Billing: Role-Based Access Control (RBAC)

## 1. System Role Matrix
Eazy-Billing enforces clear boundaries between operational duties (Staff users) and system override actions (Admin users). This segregation prevents unauthorized tampering, accidental double-entry ledger deletions, or bypasses of diagnostic chains.

| Action / Capability | Admin Role | Staff Role | Reasoning |
| :--- | :---: | :---: | :--- |
| **Create Sales / Purchase Invoices** | Yes | Yes | Core business billing operation. |
| **Issue Payments & Customer Receipts** | Yes | Yes | Basic day-to-day transaction creation. |
| **View System Diagnostics Panel** | Yes | Yes | Beneficial for transparency of data integrity checks. |
| **Edit System Configuration & Tax Profiles** | Yes | No | Prevents accidental configuration drifts. |
| **Initiate Double-Entry Journal Adjustments (JV)**| Yes | No | Restricts direct manipulation of the financial books. |
| **Run Stress Tests & Diagnostic Resets** | Yes | No | Prevents stress-checking from interrupting production workflows. |
| **Reset / Clear Transaction Ledger logs** | Yes | No | Crucial data override that should lock out standard operators. |

---

## 2. Admin Privileges and Override Actions
Administrative controls are explicitly guarded within both UI components and route controllers.

### Restricted Actions List
For Staff roles, the system disables and screens off:
1. **Direct Ledger Mutation**: Standard accounts cannot modify Ledger entries. Ledgers must only be written automatically via trade sales/purchases or through JV vouchers signed by an Admin.
2. **Backdating Entries**: Staff users are limited to a safe rolling context (e.g., current day +/- 48 hours for billing corrections) to prevent ledger auditing manipulation.
3. **Financial Statement Overwrites**: Deleting historic financial years is exclusively an Administrative privilege.

---

## 3. Cryptographic overrides: "Reset Ledger Chain" Privilege
When diagnostic issues emerge (such as importing a historic database backup that lacks transaction log hashes, or encountering an unresolvable cryptographic discrepancy), Admin users can bypass alerts safely using the **Reset & Clear Broken Logs (रीसेट लेजर चेन)** protocol.

```
+-------------------------------------------------------------+
|               Admin triggers Diagnostic Reset               |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|    Renders Confirmation Alert with Clear Bilingual Warning   |
|     (Hindi/Hinglish context clarifying safety of data)      |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|         Clears IndexedDB `transaction_log` Table            |
|       (Billing invoices, items, and customers remain)       |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|             Runs Full System-Health Diagnoses               |
|            Re-establishes a Clean Cryptographic Link        |
+-------------------------------------------------------------+
```

### Reset Ledger Chain Safety Checklist
When constructing or updating reset components:
1. **Always Display Safety Confirmations**: Never clear logs instantly. Require explicit confirmation so users understand that actual invoices, items, and parties are **100% safe**, and only the diagnostic hashing history is re-aligned.
2. **Clear Logs Safely**:
   ```typescript
   const dbInstance = getDb();
   await dbInstance.transaction_log.clear();
   ```
3. **Re-trigger Audit Verification**: Instantly rerun diagnostic calculations to refresh the UI and clear the error flag immediately.
