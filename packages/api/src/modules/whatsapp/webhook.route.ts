import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { appConfig } from "../../shared/config.js";
import { logger } from "../../shared/logger.js";
import { prisma } from "../../shared/db.js";
import { verifyMetaSignature } from "./verify-signature.js";
import type { WhatsAppWebhookEnvelope } from "./types.js";
import { inboundMessagesQueue } from "../../queues/definitions.js";

export const whatsappWebhookRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Meta's one-time webhook verification handshake.
  app.get("/webhooks/whatsapp", async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    if (mode === "subscribe" && token === appConfig.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      logger.info("WhatsApp webhook verification handshake succeeded");
      return reply.status(200).send(challenge);
    }

    logger.warn({ mode }, "WhatsApp webhook verification handshake failed");
    return reply.status(403).send("Forbidden");
  });

  // Inbound message / status-update events.
  app.post("/webhooks/whatsapp", async (request, reply) => {
    const signatureHeader = request.headers["x-hub-signature-256"] as string | undefined;

    if (appConfig.WHATSAPP_APP_SECRET) {
      const rawBody = request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {}));
      const valid = verifyMetaSignature(rawBody, signatureHeader, appConfig.WHATSAPP_APP_SECRET);
      if (!valid) {
        logger.warn("Rejected WhatsApp webhook with invalid signature");
        return reply.status(401).send({ error: "invalid_signature" });
      }
    } else {
      logger.warn(
        "WHATSAPP_APP_SECRET is not set — skipping signature verification. " +
          "Do not run in production without it.",
      );
    }

    // Ack immediately — Meta requires a fast response or it backs off
    // retrying the webhook. All real processing happens off this request.
    reply.status(200).send({ status: "received" });

    const payload = request.body as WhatsAppWebhookEnvelope;
    await handleWebhookPayload(payload).catch((err) => {
      logger.error({ err }, "Failed to handle WhatsApp webhook payload");
    });
  });
};

async function handleWebhookPayload(payload: WhatsAppWebhookEnvelope): Promise<void> {
  if (payload.object !== "whatsapp_business_account") {
    logger.warn({ object: payload.object }, "Ignoring webhook for unexpected object type");
    return;
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;

      for (const message of value.messages ?? []) {
        const contactName =
          value.contacts?.find((c) => c.wa_id === message.from)?.profile.name ?? null;

        const baseJobData = {
          waMessageId: message.id,
          fromWaId: message.from,
          contactName,
          timestamp: message.timestamp,
          phoneNumberId: value.metadata.phone_number_id,
        };

        if (message.type === "text" && message.text) {
          await inboundMessagesQueue.add(
            "process-inbound-message",
            { ...baseJobData, text: message.text.body },
            { jobId: message.id }, // BullMQ-level dedupe on top of the DB-level unique constraint
          );
          continue;
        }

        const media = message.image ?? message.video ?? message.audio ?? message.document ?? message.sticker;
        if (media) {
          await inboundMessagesQueue.add(
            "process-inbound-message",
            {
              ...baseJobData,
              text: media.caption ?? "",
              mediaId: media.id,
              mediaType: message.type,
              mimeType: media.mime_type,
            },
            { jobId: message.id },
          );
          continue;
        }

        logger.info({ type: message.type }, "Ignoring unsupported inbound message type");
      }

      for (const status of value.statuses ?? []) {
        await prisma.message
          .updateMany({
            where: { waMessageId: status.id },
            data: { status: mapWhatsAppStatus(status.status) },
          })
          .catch((err) => logger.warn({ err, statusId: status.id }, "Failed to record status update"));
      }
    }
  }
}

function mapWhatsAppStatus(status: string): "SENT" | "DELIVERED" | "READ" | "FAILED" {
  switch (status) {
    case "sent":
      return "SENT";
    case "delivered":
      return "DELIVERED";
    case "read":
      return "READ";
    default:
      return "FAILED";
  }
}
