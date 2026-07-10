import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "@prisma/client";

/**
 * Fastify preHandler: verifies the access-token JWT (populates
 * request.user), then checks its role against the allowed list. Attach to
 * any CRM route via `{ preHandler: requireRole("ADMIN", "MANAGER") }`.
 * Call with no arguments to require authentication only, any role.
 */
export function requireRole(...allowed: Role[]) {
  return async function rbacPreHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: "UNAUTHENTICATED", message: "Missing or invalid access token" });
      return;
    }

    if (allowed.length > 0 && !allowed.includes(request.user.role)) {
      reply.status(403).send({ error: "FORBIDDEN", message: "Your role cannot access this resource" });
    }
  };
}
