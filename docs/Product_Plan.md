# EAZY BILLING - Product Segmentation & Test Strategy

As the Product Manager & Lead Developer, I have segmented the **EAZY BILLING** application into logical functional modules. This structure helps in organizing development, ensuring feature coverage, and maintaining high quality through targeted testing.

---

## 1. Core Transactions Segment
**Focus:** Revenue operations and basic business flow.
- **Key Features:** Sale Invoices, Purchase Invoices, Sale/Purchase Returns, Quotes, and Sale/Purchase Orders.
- **Why:** This is the heart of the business where actual transactions are recorded.

### Test Cases:
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| CT-01 | Create a Sale Invoice with GST | Invoice is saved, Voucher number increments, and Party balance increases. |
| CT-02 | Edit a Saved Invoice | Old stock and balance impacts are reversed; new impacts are applied correctly. |
| CT-03 | Convert a Quote to Invoice | Quote status changes, and a new Invoice is generated with same items. |
| CT-04 | Record a Sale Return | Stock is added back to inventory; Party balance is reduced. |
| CT-05 | Import Invoice via JSON (WhatsApp Share) | All items and party details are correctly mapped from the decoded string. |

---

## 2. Inventory & Masters Segment
**Focus:** Data consistency and catalog management.
- **Key Features:** Item management, Unit definitions, Category grouping, Tax rates, and HSN codes.
- **Why:** Correct master data ensures that calculations and statutory compliance (GST) are accurate.

### Test Cases:
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| IM-01 | Add Item with Opening Stock | Item is searchable, and stock summary reflects initial quantity immediately. |
| IM-02 | Multilingual Category Search | Searching for "Milk" or "दूध" returns the same category/items. |
| IM-03 | Bulk Delete Items | Selected items are removed from DB; linked transactions remain (history preserved). |
| IM-04 | HSN & Tax Linkage | Selecting an Item in an invoice auto-populates the correct Tax % and HSN code. |

---

## 3. CRM & Party Management Segment
**Focus:** Relationship management and credit tracking.
- **Key Features:** Party list (Customers/Suppliers), Account Groups (Sundry Debtors/Creditors), and Balance History.
- **Why:** Essential for tracking who owes what and managing vendor relationships.

### Test Cases:
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| CP-01 | Create unique Party by Mobile | System prevents duplicate mobile numbers if configured; saves profile correctly. |
| CP-02 | Party Balance Sync | Every invoice/payment linked to a party updates their `currentBalance` in real-time. |
| CP-03 | Account Grouping | Grouping parties into "Bank" or "Cash" allows correct filtering in accounting reports. |

---

## 4. Financial Accounting Segment
**Focus:** Cash flow and reconciliation.
- **Key Features:** Payments, Receipts, Journal Entries, Contra (Bank-to-Cash), and Financial Year management.
- **Why:** Moves the app from simple "billing" to a complete "accounting" solution for small businesses.

### Test Cases:
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| FA-01 | Record Voucher Payment | Cash/Bank balance reduces; Party outstanding balance reduces. |
| FA-02 | Contra Entry (Cash Depost) | Cash in hand reduces; Bank account balance increases. |
| FA-03 | Financial Year Switch | Data is separated by FY id; previous year balances can be imported as opening. |
| FA-04 | Journal Adjustment | Non-cash entries (like depreciation) correctly affect the Ledger. |

---

## 5. Reports & Analytics Segment
**Focus:** Business intelligence and compliance.
- **Key Features:** GSTR-1 preparation, Stock Summary, P&L, Balance Sheet, and Date-filtered reports.
- **Why:** Helps the business owner (the CEO) make data-driven decisions and file taxes.

### Test Cases:
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| RA-01 | GSTR-1 (B2B/B2C) Summary | Sales are correctly grouped by GST Type for easy tax filing. |
| RA-02 | Average Rate Stock Valuation | Stock value is calculated correctly based on Purchase rates. |
| RA-03 | Profit & Loss Statement | (Sales - Cost of Goods - Expenses) matches manual calculations. |

---

## 6. UX, security & AI Segment
**Focus:** User productivity and data safety.
- **Key Features:** AI Assistant (Gemini), Multi-language (English/Hindi), App Lock (PIN), and Nearby Shops.
- **Why:** Differentiates the product in the market by being "Smart" and "Secure".

### Test Cases:
| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| UX-01 | AI Invoice Pre-filling | Prompting "Sell 2kg milk to John" correctly identifies the items and party. |
| UX-02 | PIN Lock Validation | App remains locked until correct PIN is entered; respects 'session' timeout. |
| UX-03 | Theme Toggling | Light/Dark mode transitions without UI glitches on mobile view. |
| UX-04 | Broadcast Messaging | Sending a message to "All Customers" group correctly triggers cloud sync. |

---

## Conclusion
This roadmap ensures that we aren't just writing code, but building a robust business ecosystem. My next step will be to implement specific unit tests for the **Core Transactions** logic, as that carries the highest risk.
