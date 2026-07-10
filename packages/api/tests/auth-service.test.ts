import { describe, expect, it } from "vitest";
import {
  generateRefreshToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "../src/modules/auth/service.js";

describe("password hashing", () => {
  it("round-trips: a correct password verifies, a wrong one doesn't", async () => {
    const hash = await hashPassword("Correct-Horse-Battery-Staple-1");
    expect(await verifyPassword("Correct-Horse-Battery-Staple-1", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("never stores the plaintext password in the hash", async () => {
    const hash = await hashPassword("my-secret-password");
    expect(hash).not.toContain("my-secret-password");
  });
});

describe("generateRefreshToken", () => {
  it("produces a random raw token whose hash matches hashToken(token)", () => {
    const { token, tokenHash } = generateRefreshToken();
    expect(token).toHaveLength(96); // 48 bytes hex-encoded
    expect(tokenHash).toBe(hashToken(token));
  });

  it("produces different tokens on each call", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a.token).not.toBe(b.token);
  });
});
