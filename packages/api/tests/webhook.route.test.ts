import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

// Set before the dynamic import below so shared/config.ts picks it up when
// it first evaluates process.env (config is parsed once at module load).
process.env.WHATSAPP_APP_SECRET = "test-webhook-secret";
process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "test-verify-token";

let app: FastifyInstance;

beforeAll(async () => {
  const { buildServer } = await import("../src/server.js");
  app = await (buildServer as () => Promise<FastifyInstance>)();
});

afterAll(async () => {
  await app.close();
});

describe("GET /webhooks/whatsapp (verification handshake)", () => {
  it("echoes the challenge when the verify token matches", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=abc123",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("abc123");
  });

  it("returns 403 when the verify token does not match", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123",
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("POST /webhooks/whatsapp (signature verification)", () => {
  it("rejects a request with no signature header", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/whatsapp",
      payload: { object: "whatsapp_business_account", entry: [] },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects a request with an invalid signature", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/whatsapp",
      headers: { "x-hub-signature-256": "sha256=deadbeef" },
      payload: { object: "whatsapp_business_account", entry: [] },
    });
    expect(res.statusCode).toBe(401);
  });
});
