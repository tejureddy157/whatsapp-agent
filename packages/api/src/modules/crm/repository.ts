import { prisma } from "../../shared/db.js";
import type { ConversationStatus, ConversationMode } from "@prisma/client";

export interface ListConversationsParams {
  search?: string;
  mode?: ConversationMode;
  status?: ConversationStatus;
  page: number;
  pageSize: number;
}

export async function listConversations(params: ListConversationsParams) {
  const where = {
    ...(params.mode ? { mode: params.mode } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.search
      ? {
          customer: {
            OR: [
              { name: { contains: params.search, mode: "insensitive" as const } },
              { waPhoneNumber: { contains: params.search } },
            ],
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        customer: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  return { rows, total };
}

export function getConversationWithCustomer(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { customer: true },
  });
}

export function getConversationMessages(conversationId: string, limit = 200) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: { sentByUser: { select: { id: true, name: true } } },
  });
}

export interface ListCustomersParams {
  search?: string;
  page: number;
  pageSize: number;
}

export async function listCustomers(params: ListCustomersParams) {
  const where = params.search
    ? {
        OR: [
          { name: { contains: params.search, mode: "insensitive" as const } },
          { waPhoneNumber: { contains: params.search } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { lastSeenAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.customer.count({ where }),
  ]);

  return { rows, total };
}

export function getCustomerWithConversations(customerId: string) {
  return prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      conversations: { orderBy: { createdAt: "desc" } },
    },
  });
}
