import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { requireRole } from "../src/modules/auth/rbac.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  await app.register(fastifyJwt, { secret: "test-secret" });
  app.get("/admin-only", { preHandler: requireRole("ADMIN") }, async () => ({ ok: true }));
  app.get("/any-authenticated-role", { preHandler: requireRole() }, async () => ({ ok: true }));
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

function signToken(role: string) {
  return app.jwt.sign({ sub: "user-1", email: "a@b.com", role });
}

describe("requireRole", () => {
  it("rejects a request with no token", async () => {
    const res = await app.inject({ method: "GET", url: "/admin-only" });
    expect(res.statusCode).toBe(401);
  });

  it("rejects a request with an invalid token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/admin-only",
      headers: { authorization: "Bearer not-a-real-token" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects a valid token whose role isn't allowed", async () => {
    const token = signToken("VIEWER");
    const res = await app.inject({
      method: "GET",
      url: "/admin-only",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it("allows a valid token with an allowed role", async () => {
    const token = signToken("ADMIN");
    const res = await app.inject({
      method: "GET",
      url: "/admin-only",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it("with no roles specified, allows any authenticated role", async () => {
    const token = signToken("VIEWER");
    const res = await app.inject({
      method: "GET",
      url: "/any-authenticated-role",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });
});
