import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireRole } from "../auth/rbac.js";
import {
  getConversationMessages,
  getConversationWithCustomer,
  listConversations,
} from "./repository.js";
import { setConversationMode } from "../conversation/repository.js";
import { enqueueReply } from "../conversation/pipeline.js";
import { publishRealtimeEvent } from "../../realtime/event-bus.js";
import { childLogger } from "../../shared/logger.js";

const listQuerySchema = z.object({
  search: z.string().optional(),
  mode: z.enum(["AI", "HUMAN"]).optional(),
  status: z.enum(["ACTIVE", "CLOSED"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});

const modeBodySchema = z.object({ mode: z.enum(["AI", "HUMAN"]) });
const replyBodySchema = z.object({ body: z.string().min(1).max(4096) });

export const conversationsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/api/crm/conversations", { preHandler: requireRole() }, async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "INVALID_QUERY", message: parsed.error.message });
    }
    const { rows, total } = await listConversations(parsed.data);
    return reply.send({
      conversations: rows.map((c) => ({
        id: c.id,
        status: c.status,
        mode: c.mode,
        needsHumanAttention: c.needsHumanAttention,
        updatedAt: c.updatedAt,
        customer: {
          id: c.customer.id,
          name: c.customer.name,
          waPhoneNumber: c.customer.waPhoneNumber,
          isNew: c.customer.isNew,
        },
        lastMessage: c.messages[0]
          ? { content: c.messages[0].content, createdAt: c.messages[0].createdAt, direction: c.messages[0].direction }
          : null,
      })),
      pagination: { page: parsed.data.page, pageSize: parsed.data.pageSize, total },
    });
  });

  app.get("/api/crm/conversations/:id", { preHandler: requireRole() }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const conversation = await getConversationWithCustomer(id);
    if (!conversation) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Conversation not found" });
    }
    const messages = await getConversationMessages(id);
    return reply.send({ conversation, messages });
  });

  app.patch("/api/crm/conversations/:id/mode", { preHandler: requireRole() }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = modeBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "INVALID_BODY", message: "mode must be AI or HUMAN" });
    }

    const conversation = await getConversationWithCustomer(id);
    if (!conversation) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Conversation not found" });
    }

    const updated = await setConversationMode(id, parsed.data.mode);
    await publishRealtimeEvent("conversation:mode_changed", { conversationId: id, mode: updated.mode });
    return reply.send({ conversation: updated });
  });

  app.post("/api/crm/conversations/:id/reply", { preHandler: requireRole() }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = replyBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "INVALID_BODY", message: "body is required" });
    }

    const conversation = await getConversationWithCustomer(id);
    if (!conversation) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Conversation not found" });
    }

    await enqueueReply({
      conversationId: conversation.id,
      customerId: conversation.customerId,
      toWaId: conversation.customer.waPhoneNumber,
      body: parsed.data.body,
      isAutomated: false,
      senderType: "HUMAN_AGENT",
      sentByUserId: request.user.sub,
      tokensUsed: null,
      log: childLogger({ conversationId: conversation.id, sentByUserId: request.user.sub }),
    });

    return reply.status(202).send({ status: "queued" });
  });
};
