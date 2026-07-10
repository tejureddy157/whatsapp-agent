import { prisma } from "../../shared/db.js";
import type { Customer } from "@prisma/client";

export function findCustomerByWaId(
  waPhoneNumber: string,
  businessPhoneNumberId: string,
): Promise<Customer | null> {
  return prisma.customer.findUnique({
    where: { waPhoneNumber_businessPhoneNumberId: { waPhoneNumber, businessPhoneNumberId } },
  });
}

export function createCustomer(
  waPhoneNumber: string,
  businessPhoneNumberId: string,
  name: string | null,
  firstMessageText: string | null,
): Promise<Customer> {
  return prisma.customer.create({
    data: {
      waPhoneNumber,
      businessPhoneNumberId,
      name: name ?? undefined,
      firstMessageText: firstMessageText ?? undefined,
    },
  });
}

export function touchLastSeen(customerId: string): Promise<Customer> {
  return prisma.customer.update({
    where: { id: customerId },
    data: { lastSeenAt: new Date() },
  });
}

export function markNoLongerNew(customerId: string): Promise<Customer> {
  return prisma.customer.update({
    where: { id: customerId },
    data: { isNew: false },
  });
}
