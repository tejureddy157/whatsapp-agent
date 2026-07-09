import type { Customer } from "@prisma/client";
import { createCustomer, findCustomerByWaId, touchLastSeen } from "./repository.js";

/** Meta already sends wa_id as bare E.164 digits (no leading +) — normalize defensively anyway. */
export function normalizeWaId(rawWaId: string): string {
  return rawWaId.replace(/[^\d]/g, "");
}

export interface ResolvedCustomer {
  customer: Customer;
  isNewlyCreated: boolean;
}

/**
 * The sole customer-recognition mechanism: the inbound WhatsApp ID is the
 * only identity anchor, looked up on every inbound message. No separate
 * customer-side login/auth step exists or is needed.
 */
export async function lookupOrCreateCustomer(
  rawWaId: string,
  contactName: string | null,
): Promise<ResolvedCustomer> {
  const waPhoneNumber = normalizeWaId(rawWaId);

  const existing = await findCustomerByWaId(waPhoneNumber);
  if (existing) {
    await touchLastSeen(existing.id);
    return { customer: existing, isNewlyCreated: false };
  }

  const created = await createCustomer(waPhoneNumber, contactName);
  return { customer: created, isNewlyCreated: true };
}
