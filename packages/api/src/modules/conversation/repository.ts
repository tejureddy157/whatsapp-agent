import { prisma } from "../../shared/db.js";
import type { Conversation, Message, MessageDirection } from "@prisma/client";

export function getActiveConversation(customerId: string): Promise<Conversation | null> {
  return prisma.conversation.findFirst({
    where: { customerId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
}

export function createConversation(customerId: string, windowExpiresAt: Date): Promise<Conversation> {
  return prisma.conversation.create({
    data: { customerId, status: "ACTIVE", windowExpiresAt },
  });
}

export function closeConversation(conversationId: string): Promise<Conversation> {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { status: "CLOSED", endedAt: new Date() },
  });
}

export function refreshConversationWindow(conversationId: string, windowExpiresAt: Date): Promise<Conversation> {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { windowExpiresAt },
  });
}

export function markConversationEscalated(conversationId: string): Promise<Conversation> {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { needsHumanAttention: true, escalatedAt: new Date() },
  });
}

/** Most recent `limit` messages in the conversation, returned oldest-first for chat history ordering. */
export async function getRecentMessages(conversationId: string, limit: number): Promise<Message[]> {
  const rows = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.reverse();
}

export interface CreateMessageInput {
  conversationId: string;
  customerId: string;
  direction: MessageDirection;
  content: string;
  waMessageId?: string | null;
  mediaType?: string | null;
  mediaMimeType?: string | null;
  toolCalls?: unknown;
  tokensUsed?: unknown;
  isAutomated?: boolean;
  status?: "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED";
}

export function createMessage(input: CreateMessageInput): Promise<Message> {
  return prisma.message.create({
    data: {
      conversationId: input.conversationId,
      customerId: input.customerId,
      direction: input.direction,
      content: input.content,
      waMessageId: input.waMessageId ?? null,
      mediaType: input.mediaType ?? null,
      mediaMimeType: input.mediaMimeType ?? null,
      toolCalls: input.toolCalls as any,
      tokensUsed: input.tokensUsed as any,
      isAutomated: input.isAutomated ?? false,
      status: input.status,
    },
  });
}

export function findMessageByWaId(waMessageId: string): Promise<Message | null> {
  return prisma.message.findUnique({ where: { waMessageId } });
}

export function updateMessageAfterSend(
  messageId: string,
  data: { waMessageId: string | null; status: "SENT" | "FAILED" },
): Promise<Message> {
  return prisma.message.update({ where: { id: messageId }, data });
}
