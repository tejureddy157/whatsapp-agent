import { logger } from "./shared/logger.js";
import { prisma } from "./shared/db.js";
import { redisConnection } from "./shared/redis.js";
import { createInboundMessagesWorker } from "./queues/inbound-messages.processor.js";
import { createOutboundMessagesWorker } from "./queues/outbound-messages.processor.js";

async function main() {
  const inboundWorker = createInboundMessagesWorker();
  const outboundWorker = createOutboundMessagesWorker();

  logger.info("Worker process started (inbound-messages, outbound-messages)");

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down worker");
    await Promise.all([inboundWorker.close(), outboundWorker.close()]);
    await prisma.$disconnect();
    await redisConnection.quit();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

void main();
