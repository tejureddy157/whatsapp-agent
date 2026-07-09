import { prisma } from "../../shared/db.js";
import type { Customer } from "@prisma/client";

export function findCustomerByWaId(waPhoneNumber: string): Promise<Customer | null> {
  return prisma.customer.findUnique({ where: { waPhoneNumber } });
}

export function createCustomer(waPhoneNumber: string, name: string | null): Promise<Customer> {
  return prisma.customer.create({
    data: { waPhoneNumber, name: name ?? undefined },
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
