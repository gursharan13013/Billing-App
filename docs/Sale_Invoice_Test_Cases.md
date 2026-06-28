# Test Execution Plan: Sale Invoice (Core Feature #1)

As your Lead Developer, I've prepared this specific test plan for our first core module: **Sale Invoices**. We will perform these tests to ensure the backbone of the application (Calculations, Inventory, and Financials) is rock-solid.

## Pre-requisites (Setup Step)
Before we start, please ensure you have:
1. Gone to **Settings > Company Profile** and filled in:
   - Name: *Your Company Name*
   - Mobile: *Your Mobile*
   - State: *Your State (e.g., Punjab)*
   - GST Registered: **Yes**
2. Gone to **Master > Items** and added:
   - Item Name: `Test Item A`, Sale Rate: `100`, GST: `5%`, Opening Stock: `50`.

---

## Test Scenario 1: Basic Invoice Creation & Math
**Objective:** Verify that the app calculates totals correctly and updates the database.

1. **Step:** Open **Sale Invoice** from the Dashboard.
2. **Step:** Select a Party (or use 'Cash').
3. **Step:** Search and add `Test Item A`. set Quantity = `2`.
4. **Step:** Observe UI: 
   - [ ] Is Line Total = 210? (200 + 5% GST excluded)
   - [ ] Is Grand Total = 210?
5. **Step:** Click **Save**.
6. **Verification:**
   - [ ] Does a "Saved Successfully" message appear?
   - [ ] Does the **Sale No** increment for the next entry?

## Test Scenario 2: Inventory & Ledger Impact
**Objective:** Most critical part—ensuring "Double Entry" logic works.

1. **Verification (Stock):**
   - Go to **Report > Stock Summary**.
   - [ ] Search for `Test Item A`. Is the Current Stock now `48`? (50 - 2)
2. **Verification (Ledger):**
   - Go to **Report > Party Ledger** (Select the party you used).
   - [ ] Is there an entry for this invoice?
   - [ ] Is the "Closing Balance" of the party increased by `210`?

## Test Scenario 3: Real-time Editing (The Reversal Test)
**Objective:** Verify that editing an invoice correctly "reverses" old stock/balance before applying new ones.

1. **Step:** Go to **Sale List** (from Dashboard or Reports).
2. **Step:** Open the invoice we just created and click **Edit**.
3. **Step:** Change the Quantity of `Test Item A` from `2` to `5`.
4. **Step:** Click **Save**.
5. **Verification:**
   - [ ] **Stock:** Check Stock Summary. Is it now `45`? (50 - 5)
   - [ ] **Ledger:** Check Party Balance. Is it now `525`? (5 * 105)

## Test Scenario 4: Deletion (The Cleanup Test)
**Objective:** Ensure that deleting a mistake wipes away all its financial/stock traces.

1. **Step:** Go to **Sale List** and delete the invoice.
2. **Verification:**
   - [ ] **Stock:** Is `Test Item A` stock back to `50`?
   - [ ] **Ledger:** Is the Party Balance back to its original state (before testing)?

---

## Next Steps for CEO:
Please perform **Test Scenario 1** in the preview. If you encounter any UI glitches or calculation errors, report them to me immediately and I will fix the code. once Scenario 1 passes, we will move to Scenario 2.
