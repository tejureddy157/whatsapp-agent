import { Worker } from "bullmq";
import { redisConnection } from "../shared/redis.js";
import { logger } from "../shared/logger.js";
import { QUEUE_NAMES, type InboundMessageJobData } from "./definitions.js";
import { processInboundMessage } from "../modules/conversation/pipeline.js";

export function createInboundMessagesWorker(): Worker<InboundMessageJobData> {
  const worker = new Worker<InboundMessageJobData>(
    QUEUE_NAMES.INBOUND_MESSAGES,
    async (job) => {
      await processInboundMessage(job.data);
    },
    { connection: redisConnection, concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Inbound message job failed");
  });

  worker.on("error", (err) => {
    logger.error({ err }, "Inbound messages worker error");
  });

  return worker;
}
