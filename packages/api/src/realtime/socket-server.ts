import { Server as SocketIOServer } from "socket.io";
import { Redis } from "ioredis";
import type { FastifyInstance } from "fastify";
import { appConfig } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import { REALTIME_CHANNEL, type RealtimeEvent } from "./event-bus.js";

/**
 * Attaches Socket.IO to the same underlying HTTP server Fastify already
 * listens on (app.server) — no second port/process. Auth mirrors the REST
 * API: the client sends the same short-lived access token used for HTTP
 * calls in the connection handshake.
 */
export function initSocketServer(app: FastifyInstance): SocketIOServer {
  const io = new SocketIOServer(app.server, {
    cors: { origin: appConfig.CRM_FRONTEND_ORIGIN.split(","), credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error("unauthorized"));
      return;
    }
    try {
      socket.data.user = app.jwt.verify(token);
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket.data.user as { sub?: string } | undefined)?.sub;
    logger.info({ userId }, "CRM socket connected");
    socket.on("disconnect", () => logger.info({ userId }, "CRM socket disconnected"));
  });

  const subscriber = new Redis(appConfig.REDIS_URL);
  subscriber.on("error", (err) => logger.error({ err }, "Realtime event-bus subscriber connection error"));
  subscriber
    .subscribe(REALTIME_CHANNEL)
    .catch((err) => logger.error({ err }, "Failed to subscribe to realtime channel"));
  subscriber.on("message", (_channel, message) => {
    try {
      const { event, payload } = JSON.parse(message) as RealtimeEvent;
      io.emit(event, payload);
    } catch (err) {
      logger.error({ err }, "Failed to relay realtime event to CRM clients");
    }
  });

  return io;
}
