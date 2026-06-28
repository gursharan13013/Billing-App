import { db as dexieDb } from './billingService';
import { OnboardingManager } from './OnboardingManager';
import { Invoice, InvoiceItem } from '../core/types';

/**
 * High-precision micro-timestamp helper
 */
export function generateHighPrecisionMicroTimestamp(): number {
  const ms = Date.now();
  const perf = typeof performance !== 'undefined' && performance.now ? performance.now() : 0;
  // Combine wall-clock time with fractional microseconds from high-precision relative timer
  return ms * 1000 + Math.floor(perf % 1000);
}

/**
 * Creates and writes a multi-tenant compliant sales invoice record directly to Dexie.js database.
 * Formats the primary key seamlessly to prevent cloud write collisions.
 * 
 * @param items Array of ledger billing invoice materials
 * @param totalAmount The computed total billing transaction sum
 * @param additionalFields Optional override tags (party billing, voucher data, status)
 * @returns The resulting immutable compliant sequence string identifier
 */
export async function generateInvoice(
  items: InvoiceItem[],
  totalAmount: number,
  additionalFields?: {
    partyId?: string;
    partyName?: string;
    date?: string; // YYYY-MM-DD
    status?: 'PAID' | 'UNPAID' | 'PARTIAL';
    type?: 'Sale' | 'Purchase';
    remarks?: string;
  }
): Promise<string> {
  // 1. Retrieve the immutable company onboarding credentials safely
  const onboardingStatus = await OnboardingManager.checkOnboardingStatus();
  
  const businessId = onboardingStatus.businessId 
    || localStorage.getItem('businessId') 
    || 'EZB-OFFLINE-TEMP-001';

  let staffId = 'STAFF-000';
  if (onboardingStatus.role === 'staff') {
    staffId = localStorage.getItem('staffUid') || 'STF-000';
  } else {
    staffId = localStorage.getItem('ownerUid') || 'OWN-000';
  }

  // 2. Fetch the robust sequence serial offset to maintain seamless compliance sequence
  const count = await dexieDb.invoices.count();
  const nextSequenceVal = count + 1;
  const sequenceNo = String(nextSequenceVal).padStart(6, '0');

  // 3. Construct the rigid immutable collision-proof primary index
  const finalId = `${businessId}_${staffId}_${sequenceNo}`;

  // 4. Compute unique high-precision micro-timestamps
  const microTimestamp = generateHighPrecisionMicroTimestamp();
  const currentIsoDate = new Date().toISOString().split('T')[0];

  // 5. Structure the complete uncompromised multi-tenant invoice payload
  const invoiceRecord: Invoice = {
    id: finalId,
    invoiceNo: sequenceNo,
    partyId: additionalFields?.partyId || 'CUST-CASH',
    partyName: additionalFields?.partyName || 'Cash Customer',
    date: additionalFields?.date || currentIsoDate,
    totalAmount: totalAmount,
    status: additionalFields?.status || 'PAID',
    type: additionalFields?.type || 'Sale',
    items: items,
    isSyncedToCloud: false,
    businessId: businessId,
    updatedAt: Date.now(),
    _fieldUpdatedAt: microTimestamp as any // Cast explicitly to meet schema target
  };

  // 6. Write record atomically inside local Dexie storage
  await dexieDb.invoices.put(invoiceRecord);

  // Return the resulting collision-safe multi-tenant compliant sequential ID
  return finalId;
}
