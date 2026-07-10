import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { prisma } from "../../shared/db.js";
import { requireRole } from "../auth/rbac.js";

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export const dashboardRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get(
    "/api/crm/dashboard/stats",
    { preHandler: requireRole() },
    async (_request, reply) => {
      const [
        totalCustomers,
        newCustomers,
        activeConversations,
        closedConversations,
        needsAttention,
        aiResponses,
        humanResponses,
        todaysMessageRows,
        dailyVolume,
      ] = await Promise.all([
        prisma.customer.count(),
        prisma.customer.count({ where: { isNew: true } }),
        prisma.conversation.count({ where: { status: "ACTIVE" } }),
        prisma.conversation.count({ where: { status: "CLOSED" } }),
        prisma.conversation.count({ where: { needsHumanAttention: true } }),
        prisma.message.count({ where: { senderType: "AI" } }),
        prisma.message.count({ where: { senderType: "HUMAN_AGENT" } }),
        prisma.message.findMany({
          where: { createdAt: { gte: startOfToday() } },
          select: { conversationId: true },
          distinct: ["conversationId"],
        }),
        prisma.$queryRaw<{ day: Date; count: bigint }[]>`
          SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
          FROM "Message"
          WHERE "createdAt" >= NOW() - INTERVAL '7 days'
          GROUP BY day
          ORDER BY day ASC
        `,
      ]);

      return reply.send({
        totalCustomers,
        newCustomers,
        returningCustomers: totalCustomers - newCustomers,
        activeConversations,
        closedConversations,
        conversationsNeedingAttention: needsAttention,
        aiResponses,
        humanResponses,
        todaysChats: todaysMessageRows.length,
        dailyMessageVolume: dailyVolume.map((row) => ({
          date: row.day.toISOString().slice(0, 10),
          count: Number(row.count),
        })),
      });
    },
  );
};
