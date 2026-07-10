import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import { appConfig } from "./shared/config.js";
import { logger } from "./shared/logger.js";
import { prisma } from "./shared/db.js";
import { redisConnection } from "./shared/redis.js";
import { whatsappWebhookRoutes } from "./modules/whatsapp/webhook.route.js";
import { authRoutes } from "./modules/auth/routes.js";
import { dashboardRoutes } from "./modules/crm/dashboard.route.js";
import { conversationsRoutes } from "./modules/crm/conversations.route.js";
import { customersRoutes } from "./modules/crm/customers.route.js";
import { initSocketServer } from "./realtime/socket-server.js";
import { AppError } from "./shared/errors.js";

async function buildServer() {
  const app = Fastify({ logger: false, trustProxy: true });

  await app.register(fastifyCors, {
    origin: appConfig.CRM_FRONTEND_ORIGIN.split(","),
    credentials: true,
  });
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, { secret: appConfig.JWT_ACCESS_SECRET });

  // Capture the raw request body bytes for webhook signature verification
  // (HMAC must run against exactly what Meta sent, not a re-serialized body).
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
    req.rawBody = body as Buffer;
    if (body.length === 0) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse((body as Buffer).toString("utf8")));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  app.get("/health", async (_request, reply) => {
    const checks: Record<string, "ok" | "error"> = { db: "ok", redis: "ok" };

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      checks.db = "error";
    }

    try {
      await redisConnection.ping();
    } catch {
      checks.redis = "error";
    }

    const healthy = Object.values(checks).every((v) => v === "ok");
    return reply.status(healthy ? 200 : 503).send({ status: healthy ? "ok" : "degraded", checks });
  });

  await app.register(whatsappWebhookRoutes);
  await app.register(authRoutes);
  await app.register(dashboardRoutes);
  await app.register(conversationsRoutes);
  await app.register(customersRoutes);

  app.setErrorHandler((err, request, reply) => {
    if (err instanceof AppError) {
      logger.warn({ err, url: request.url }, "Handled application error");
      reply.status(err.statusCode).send({ error: err.code, message: err.message });
      return;
    }
    logger.error({ err, url: request.url }, "Unhandled error");
    reply.status(500).send({ error: "INTERNAL_ERROR", message: "Something went wrong" });
  });

  return app;
}

async function main() {
  const app = await buildServer();
  const io = initSocketServer(app);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down server");
    io.close();
    await app.close();
    await prisma.$disconnect();
    await redisConnection.quit();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  try {
    await app.listen({ port: appConfig.PORT, host: "0.0.0.0" });
    logger.info({ port: appConfig.PORT }, "Server listening");
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
}

// Only auto-start when run directly (not when imported by tests).
const entryPoint = process.argv[1] ?? "";
if (entryPoint.endsWith("server.ts") || entryPoint.endsWith("server.js")) {
  void main();
}

export { buildServer };
