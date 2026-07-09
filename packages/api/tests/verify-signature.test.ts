import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { verifyMetaSignature } from "../src/modules/whatsapp/verify-signature.js";

const SECRET = "test-app-secret";

function sign(body: Buffer, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyMetaSignature", () => {
  it("accepts a correctly signed payload", () => {
    const body = Buffer.from(JSON.stringify({ hello: "world" }));
    const signature = sign(body, SECRET);
    expect(verifyMetaSignature(body, signature, SECRET)).toBe(true);
  });

  it("rejects a payload signed with the wrong secret", () => {
    const body = Buffer.from(JSON.stringify({ hello: "world" }));
    const signature = sign(body, "wrong-secret");
    expect(verifyMetaSignature(body, signature, SECRET)).toBe(false);
  });

  it("rejects a tampered body (signature no longer matches)", () => {
    const originalBody = Buffer.from(JSON.stringify({ amount: 100 }));
    const signature = sign(originalBody, SECRET);
    const tamperedBody = Buffer.from(JSON.stringify({ amount: 999999 }));
    expect(verifyMetaSignature(tamperedBody, signature, SECRET)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    const body = Buffer.from(JSON.stringify({ hello: "world" }));
    expect(verifyMetaSignature(body, undefined, SECRET)).toBe(false);
  });

  it("rejects a malformed signature header (missing sha256= prefix)", () => {
    const body = Buffer.from(JSON.stringify({ hello: "world" }));
    expect(verifyMetaSignature(body, "not-a-valid-signature", SECRET)).toBe(false);
  });
});
