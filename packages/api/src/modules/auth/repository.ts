import { prisma } from "../../shared/db.js";
import type { RefreshToken, Role, User } from "@prisma/client";

export function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export function createUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
}): Promise<User> {
  return prisma.user.create({ data: input });
}

export function touchLastLogin(userId: string): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

export function createRefreshToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<RefreshToken> {
  return prisma.refreshToken.create({ data: input });
}

export function findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null> {
  return prisma.refreshToken.findUnique({ where: { tokenHash } });
}

export function revokeRefreshToken(id: string): Promise<RefreshToken> {
  return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
}
