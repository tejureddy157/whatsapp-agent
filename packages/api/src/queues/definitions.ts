import { Queue, type QueueOptions } from "bullmq";
import { redisConnection } from "../shared/redis.js";

export const QUEUE_NAMES = {
  INBOUND_MESSAGES: "inbound-messages",
  OUTBOUND_MESSAGES: "outbound-messages",
} as const;

const defaultQueueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: { count: 1_000, age: 24 * 60 * 60 },
    // Keep failed jobs around (bounded) as the de-facto dead-letter record —
    // inspectable via BullMQ's failed-job APIs for manual triage.
    removeOnFail: { count: 5_000 },
  },
};

export interface InboundMessageJobData {
  waMessageId: string;
  fromWaId: string;
  contactName: string | null;
  timestamp: string;
  text: string;
  phoneNumberId: string;
  mediaId?: string;
  mediaType?: string;
  mimeType?: string;
}

export interface OutboundMessageJobData {
  conversationId: string;
  customerId: string;
  toWaId: string;
  body: string;
  isAutomated: boolean;
  /** Pre-created Message row (status QUEUED) to update once the send completes. */
  messageId: string;
}

export const inboundMessagesQueue = new Queue<InboundMessageJobData>(
  QUEUE_NAMES.INBOUND_MESSAGES,
  defaultQueueOptions,
);

export const outboundMessagesQueue = new Queue<OutboundMessageJobData>(
  QUEUE_NAMES.OUTBOUND_MESSAGES,
  defaultQueueOptions,
);
