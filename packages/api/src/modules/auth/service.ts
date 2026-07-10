import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { appConfig } from "../../shared/config.js";

const BCRYPT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Refresh tokens are opaque random values — never JWTs — so a stolen DB
 * dump alone can't be used to forge one. The raw token goes to the client
 * (httpOnly cookie); only its SHA-256 hash is stored, matching what's
 * looked up on refresh.
 */
export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(token);
  return { token, tokenHash };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + appConfig.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
