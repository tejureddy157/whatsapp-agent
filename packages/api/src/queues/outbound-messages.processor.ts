import { Worker } from "bullmq";
import { redisConnection } from "../shared/redis.js";
import { logger } from "../shared/logger.js";
import { QUEUE_NAMES, type OutboundMessageJobData } from "./definitions.js";
import { sendWhatsAppTextMessage } from "../modules/whatsapp/outbound-sender.js";
import { updateMessageAfterSend } from "../modules/conversation/repository.js";

export function createOutboundMessagesWorker(): Worker<OutboundMessageJobData> {
  const worker = new Worker<OutboundMessageJobData>(
    QUEUE_NAMES.OUTBOUND_MESSAGES,
    async (job) => {
      const { toWaId, body, messageId } = job.data;

      try {
        const result = await sendWhatsAppTextMessage({ to: toWaId, body });
        await updateMessageAfterSend(messageId, { waMessageId: result.waMessageId, status: "SENT" });
      } catch (err) {
        // Mark FAILED for now; a later retry (BullMQ backoff, up to the
        // queue's configured attempts) will overwrite this with SENT if it
        // succeeds. If retries are exhausted, this is the final state and
        // the job lands in BullMQ's bounded failed-job set as a
        // dead-letter record for manual triage.
        await updateMessageAfterSend(messageId, { waMessageId: null, status: "FAILED" }).catch(() => {});
        throw err;
      }
    },
    { connection: redisConnection, concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Outbound message job failed");
  });

  worker.on("error", (err) => {
    logger.error({ err }, "Outbound messages worker error");
  });

  return worker;
}
