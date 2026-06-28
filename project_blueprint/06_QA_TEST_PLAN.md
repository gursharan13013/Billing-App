# Eazy-Billing: QA & Stress Test Plan

## 1. System Health Verification Protocols
Data integrity is the bedrock of professional accounting. Eazy-Billing incorporates built-in diagnostic engines to verify that all business books remain accurate, sequential, and untampered with.

### Check 1: Double-Entry Balancing (Accounting Health)
- **Objective**: Match total sales/purchase ledger adjustments against actual invoice sums.
- **Rule**: Sum of invoice totals must equal sum of trade ledger entry credits/debits.
- **Verification Tool**: Runs automatically on the diagnostics screen, displaying a red banner if mismatches are discovered.

### Check 2: Sequential Crypto Chain (Cryptographic Integrity)
- **Objective**: Verify that transaction logs form an un-broken chain of hashes.
- **Rule**: Recomputed SHA-256 (Canonical Payload + Previous Hash) must match `stateHash` recorded in local logs.
- **Verification Tool**: Scans database blocks sequentially. Indicates exact local index location of any broken links.

---

## 2. Dynamic Performance Stress Test
Eazy-Billing is stress-tested inside production-like client environments to guarantee long-term stability:
- **Test Protocol**: Automatically insert 100 random Sales, Purchases, Returns, and cash journal entries sequentially in rapid succession.
- **Execution Strategy**: Run tests in timed browser micro-batches to prevent UI frames from locking or stuttering.
- **Pass Threshold**: All 100 entries must be written, double-entry ledgers recalculated, and cryptographic hash chains extended without emitting a single exception.

---

## 3. Crucial Fix: The Aggregate Reconciliation Rule
Calculations using floating-point numbers in JavaScript/TypeScript frequently suffer from binary rounding limits:
- Adding fractional currency amounts like `101.12` and `98.03` inside looping structures can yield numbers like `199.15000000000002` instead of exactly `199.15`.
- Comparing raw, unrounded sums directly in an ledger audit results in false positives, alerting users to a "mismatch" of a few paisa when the financial double-entry is actually perfectly balanced.

### The Solution: Direct Totals Matching and the ₹0.05 Tolerance Guard
To resolve this float rounding issue, Eazy-Billing applies two robust safeguards:

1. **Direct Totals Accounting**: When summing ledger balances for trade invoices, sum the recorded `totalAmount` property of the ledger journal directly rather than adding up unrounded sub-rows or calculated tax cells sequentially. This matches the exact math printed on the hard-copy bill.
   ```typescript
   const ledgerCreditsSum = invoiceJournals.reduce((sum, j) => {
       return sum + (j.totalAmount || 0);
   }, 0);
   ```

2. **The ₹0.05 Tolerance Rule**: When running final system health assertions, checks must allow a tiny buffer limit of ₹0.05 to safely filter out benign floating-point rounding errors.

   ```typescript
   // Use Math.abs threshold matching rather than absolute strict equality
   const difference = Math.abs(invoiceSum - ledgerCreditsSum);
   const isValid = difference <= 0.05; // Guard threshold set at 5 paisa
   ```

   - **If Difference <= ₹0.05**: Accounting Health marks the ledger as "Balanced". No discrepancy banner is shown.
   - **If Difference > ₹0.05**: Represents actual financial drift or missing database transactions. System Health identifies it as a true "Mismatch Found" state.
