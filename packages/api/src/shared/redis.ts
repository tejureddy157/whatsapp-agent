import { Redis } from "ioredis";
import { appConfig } from "./config.js";

// NOTE: package.json pins "ioredis" to the exact version BullMQ depends on.
// BullMQ pins an exact ioredis version internally; if our own ioredis
// resolves to a different version, npm installs two separate copies and
// TypeScript then treats BullMQ's Redis type and this one as structurally
// incompatible (a shared Redis connection can't type-check against both).
// Keep this version in lockstep with `bullmq`'s ioredis dependency.

// BullMQ requires maxRetriesPerRequest: null on the connection it manages.
export const redisConnection = new Redis(appConfig.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redisConnection.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Redis connection error:", err.message);
});
