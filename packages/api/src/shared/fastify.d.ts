import "fastify";
import type { Role } from "@prisma/client";

declare module "fastify" {
  interface FastifyRequest {
    // Raw request body bytes, captured by the custom JSON content-type
    // parser in server.ts so webhook signature verification can HMAC the
    // exact bytes Meta sent (a re-serialized body would not match).
    rawBody?: Buffer;
  }
}

// @fastify/jwt's decoded-payload shape, used by request.user after
// request.jwtVerify() — see modules/auth/rbac.ts.
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string; role: Role };
    user: { sub: string; email: string; role: Role };
  }
}
