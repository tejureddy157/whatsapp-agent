import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireRole } from "../auth/rbac.js";
import { getCustomerWithConversations, listCustomers } from "./repository.js";

const listQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});

export const customersRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/api/crm/customers", { preHandler: requireRole() }, async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "INVALID_QUERY", message: parsed.error.message });
    }
    const { rows, total } = await listCustomers(parsed.data);
    return reply.send({
      customers: rows,
      pagination: { page: parsed.data.page, pageSize: parsed.data.pageSize, total },
    });
  });

  app.get("/api/crm/customers/:id", { preHandler: requireRole() }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customer = await getCustomerWithConversations(id);
    if (!customer) {
      return reply.status(404).send({ error: "NOT_FOUND", message: "Customer not found" });
    }
    return reply.send({ customer });
  });
};
