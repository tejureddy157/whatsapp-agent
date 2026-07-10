import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { appConfig } from "../../shared/config.js";
import {
  createRefreshToken,
  findRefreshTokenByHash,
  findUserByEmail,
  findUserById,
  revokeRefreshToken,
  touchLastLogin,
} from "./repository.js";
import { generateRefreshToken, hashToken, refreshTokenExpiry, verifyPassword } from "./service.js";
import { requireRole } from "./rbac.js";

const REFRESH_COOKIE_NAME = "refreshToken";

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function refreshCookieOptions() {
  const isProd = appConfig.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    path: "/api/auth",
    maxAge: appConfig.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  };
}

function signAccessToken(app: FastifyInstance, user: { id: string; email: string; role: Role }): string {
  return app.jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    { expiresIn: appConfig.JWT_ACCESS_TOKEN_TTL },
  );
}

function toPublicUser(user: { id: string; email: string; name: string; role: Role }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export const authRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.post("/api/auth/login", async (request, reply) => {
    const parsed = loginBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "INVALID_BODY", message: "email and password are required" });
    }

    const user = await findUserByEmail(parsed.data.email);
    const valid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
    if (!user || !valid) {
      return reply.status(401).send({ error: "INVALID_CREDENTIALS", message: "Incorrect email or password" });
    }

    const accessToken = signAccessToken(app, user);
    const { token: refreshToken, tokenHash } = generateRefreshToken();
    await createRefreshToken({ userId: user.id, tokenHash, expiresAt: refreshTokenExpiry() });
    await touchLastLogin(user.id);

    reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
    return reply.send({ accessToken, user: toPublicUser(user) });
  });

  app.post("/api/auth/refresh", async (request, reply) => {
    const raw = request.cookies[REFRESH_COOKIE_NAME];
    if (!raw) {
      return reply.status(401).send({ error: "NO_REFRESH_TOKEN", message: "Not logged in" });
    }

    const tokenHash = hashToken(raw);
    const existing = await findRefreshTokenByHash(tokenHash);
    if (!existing || existing.revokedAt || existing.expiresAt.getTime() < Date.now()) {
      reply.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
      return reply.status(401).send({ error: "INVALID_REFRESH_TOKEN", message: "Please log in again" });
    }

    const user = await findUserById(existing.userId);
    if (!user) {
      return reply.status(401).send({ error: "INVALID_REFRESH_TOKEN", message: "Please log in again" });
    }

    // Rotate: revoke the used token, issue a fresh one — limits the blast
    // radius of a leaked refresh token to a single use.
    await revokeRefreshToken(existing.id);
    const { token: nextRefreshToken, tokenHash: nextHash } = generateRefreshToken();
    await createRefreshToken({ userId: user.id, tokenHash: nextHash, expiresAt: refreshTokenExpiry() });

    const accessToken = signAccessToken(app, user);
    reply.setCookie(REFRESH_COOKIE_NAME, nextRefreshToken, refreshCookieOptions());
    return reply.send({ accessToken, user: toPublicUser(user) });
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const raw = request.cookies[REFRESH_COOKIE_NAME];
    if (raw) {
      const existing = await findRefreshTokenByHash(hashToken(raw));
      if (existing && !existing.revokedAt) {
        await revokeRefreshToken(existing.id);
      }
    }
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    return reply.send({ status: "ok" });
  });

  app.get("/api/auth/me", { preHandler: requireRole() }, async (request, reply) => {
    const user = await findUserById(request.user.sub);
    if (!user) {
      return reply.status(404).send({ error: "USER_NOT_FOUND", message: "User no longer exists" });
    }
    return reply.send({ user: toPublicUser(user) });
  });
};
