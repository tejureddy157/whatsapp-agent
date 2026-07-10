import { appConfig } from "../../shared/config.js";
import { childLogger } from "../../shared/logger.js";
import { lookupOrCreateCustomer } from "../customers/service.js";
import { markNoLongerNew } from "../customers/repository.js";
import {
  closeConversation,
  createConversation,
  createMessage,
  findMessageByWaId,
  getActiveConversation,
  getRecentMessages,
  markConversationEscalated,
  refreshConversationWindow,
} from "./repository.js";
import { computeWindowExpiry } from "./window.js";
import { isRestartCommand, RESTART_CONFIRMATION_MESSAGE } from "./restart-command.js";
import { runConversationTurn } from "../llm/run-turn.js";
import { downloadWhatsAppMedia } from "../whatsapp/media.js";
import { sendWhatsAppTextMessage } from "../whatsapp/outbound-sender.js";
import { outboundMessagesQueue } from "../../queues/definitions.js";
import type { InboundMessageJobData } from "../../queues/definitions.js";

const FALLBACK_REPLY =
  "We're experiencing a temporary issue on our end. Please try again in a moment, " +
  "or call us directly and we'll help you right away.";

const ESCALATE_MARKER = "[[ESCALATE]]";

/**
 * The LLM signals it wants human follow-up by prefixing its reply with
 * ESCALATE_MARKER (see the "ESCALATING TO A HUMAN" section of the system
 * prompt). Strips the marker so the customer never sees it.
 */
export function stripEscalateMarker(replyText: string): { text: string; escalated: boolean } {
  if (replyText.startsWith(ESCALATE_MARKER)) {
    return { text: replyText.slice(ESCALATE_MARKER.length).trim(), escalated: true };
  }
  return { text: replyText, escalated: false };
}

// Vision-capable models across OpenRouter reliably accept these — anything
// else (audio, video, documents, unrecognized image formats) gets a
// graceful acknowledgment reply instead of being silently dropped.
const SUPPORTED_VISION_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function processInboundMessage(input: InboundMessageJobData): Promise<void> {
  const log = childLogger({ waMessageId: input.waMessageId, from: input.fromWaId });

  // Idempotency: if a full turn for this inbound wamid was already
  // persisted, this is a Meta retry (or a BullMQ retry after the earlier
  // attempt fully succeeded) — skip.
  const existing = await findMessageByWaId(input.waMessageId);
  if (existing) {
    log.info("Duplicate inbound message already processed — skipping");
    return;
  }

  const firstMessageText = input.text || (input.mediaType ? `[${input.mediaType}]` : "");
  const { customer, isNewlyCreated } = await lookupOrCreateCustomer(
    input.fromWaId,
    input.phoneNumberId,
    input.contactName,
    firstMessageText,
  );

  if (isRestartCommand(input.text)) {
    await handleRestartCommand(customer.id, input, log);
    return;
  }

  let conversation = await getActiveConversation(customer.id);
  if (!conversation) {
    conversation = await createConversation(customer.id, computeWindowExpiry());
  } else {
    await refreshConversationWindow(conversation.id, computeWindowExpiry());
  }

  // Fetch context BEFORE inserting the new message, so the LLM sees the
  // last N *prior* messages plus this one as the new user turn — not a
  // duplicate. Exactly appConfig.CONTEXT_MESSAGE_LIMIT messages, per the
  // owner's explicit instruction (a fixed count, not a token budget).
  const history = await getRecentMessages(conversation.id, appConfig.CONTEXT_MESSAGE_LIMIT);

  // Media messages: download and either fold the image in for vision-capable
  // models, or degrade to a text acknowledgment (and flag for a human) when
  // we can't process the type yet.
  let imageDataUrl: string | undefined;
  let userMessageText = input.text;
  let mediaNeedsEscalation = false;

  if (input.mediaId && input.mediaType) {
    try {
      const media = await downloadWhatsAppMedia(input.mediaId);
      if (input.mediaType === "image" && SUPPORTED_VISION_MIME_TYPES.has(media.mimeType)) {
        imageDataUrl = `data:${media.mimeType};base64,${media.buffer.toString("base64")}`;
        userMessageText = input.text || "[Customer sent an image with no caption]";
      } else {
        userMessageText =
          `[Customer sent a ${input.mediaType} file` +
          (input.text ? ` with caption: "${input.text}"` : "") +
          `. We can't automatically process this file type yet — acknowledge receipt warmly ` +
          `and let them know a team member will follow up on it shortly.]`;
        mediaNeedsEscalation = true;
      }
    } catch (err) {
      log.error({ err }, "Failed to download media — falling back to a text acknowledgment");
      userMessageText =
        `[Customer sent a ${input.mediaType} file that we couldn't retrieve. Acknowledge it and ` +
        `let them know a team member will follow up shortly.]`;
      mediaNeedsEscalation = true;
    }
  }

  // Persist the inbound message before calling the LLM. If persistence
  // itself fails, this throws and BullMQ retries the job — safe, because
  // nothing else was written yet, so the retry starts clean. If everything
  // past this point fails, we catch it below and still answer with a
  // fallback message rather than leaving the customer's message unanswered.
  await createMessage({
    conversationId: conversation.id,
    customerId: customer.id,
    direction: "IN",
    content: input.text || (input.mediaType ? `[${input.mediaType}]` : ""),
    waMessageId: input.waMessageId,
    mediaType: input.mediaType,
    mediaMimeType: input.mimeType,
  });

  let replyText = FALLBACK_REPLY;
  let tokensUsed: Record<string, number> | null = null;
  let llmFailed = false;

  try {
    const result = await runConversationTurn({
      history,
      userMessage: userMessageText,
      businessPhoneNumberId: input.phoneNumberId,
      imageDataUrl,
      isNewCustomer: isNewlyCreated,
    });
    replyText = result.replyText || FALLBACK_REPLY;
    tokensUsed = result.usage;
  } catch (err) {
    llmFailed = true;
    log.error({ err }, "LLM turn failed — replying with fallback message");
  }

  const { text: strippedReplyText, escalated } = stripEscalateMarker(replyText);
  replyText = strippedReplyText;
  const shouldEscalate = mediaNeedsEscalation || llmFailed || escalated;

  if (shouldEscalate) {
    await markConversationEscalated(conversation.id).catch((err) =>
      log.warn({ err }, "Failed to mark conversation escalated (non-fatal)"),
    );
    await notifyAdmin({
      customerWaId: customer.waPhoneNumber,
      reason: llmFailed
        ? "AI service failure"
        : mediaNeedsEscalation
          ? "Unsupported media received"
          : "AI requested human review",
      log,
    });
  }

  if (customer.isNew) {
    await markNoLongerNew(customer.id).catch((err) =>
      log.warn({ err }, "Failed to clear isNew flag (non-fatal)"),
    );
  }

  await enqueueReply({
    conversationId: conversation.id,
    customerId: customer.id,
    toWaId: input.fromWaId,
    body: replyText,
    isAutomated: false,
    tokensUsed,
    log,
  });
}

async function handleRestartCommand(
  customerId: string,
  input: InboundMessageJobData,
  log: ReturnType<typeof childLogger>,
): Promise<void> {
  const currentConversation = await getActiveConversation(customerId);

  if (currentConversation) {
    // Log the "restart" message itself against the conversation being closed, for audit.
    await createMessage({
      conversationId: currentConversation.id,
      customerId,
      direction: "IN",
      content: input.text,
      waMessageId: input.waMessageId,
    });
    await closeConversation(currentConversation.id);
  }

  const freshConversation = await createConversation(customerId, computeWindowExpiry());
  log.info({ newConversationId: freshConversation.id }, "Conversation restarted");

  await enqueueReply({
    conversationId: freshConversation.id,
    customerId,
    toWaId: input.fromWaId,
    body: RESTART_CONFIRMATION_MESSAGE,
    isAutomated: true,
    tokensUsed: null,
    log,
  });
}

async function enqueueReply(args: {
  conversationId: string;
  customerId: string;
  toWaId: string;
  body: string;
  isAutomated: boolean;
  tokensUsed: Record<string, number> | null;
  log: ReturnType<typeof childLogger>;
}): Promise<void> {
  const outboundMessage = await createMessage({
    conversationId: args.conversationId,
    customerId: args.customerId,
    direction: "OUT",
    content: args.body,
    isAutomated: args.isAutomated,
    tokensUsed: args.tokensUsed ?? undefined,
    status: "QUEUED",
  });

  await outboundMessagesQueue.add("send-outbound-message", {
    conversationId: args.conversationId,
    customerId: args.customerId,
    toWaId: args.toWaId,
    body: args.body,
    isAutomated: args.isAutomated,
    messageId: outboundMessage.id,
  });

  args.log.info({ messageId: outboundMessage.id }, "Reply enqueued for sending");
}

/**
 * Best-effort staff alert on escalation. Sent directly (not via the
 * customer-scoped outbound queue, since there's no Customer/Conversation
 * row to attach it to) — a failure here must never affect the customer's
 * own reply.
 */
async function notifyAdmin(args: {
  customerWaId: string;
  reason: string;
  log: ReturnType<typeof childLogger>;
}): Promise<void> {
  if (!appConfig.ADMIN_WHATSAPP_NUMBER) {
    args.log.warn(
      { reason: args.reason },
      "Conversation escalated but no ADMIN_WHATSAPP_NUMBER configured — skipping notification",
    );
    return;
  }

  await sendWhatsAppTextMessage({
    to: appConfig.ADMIN_WHATSAPP_NUMBER,
    body: `⚠️ Needs attention: customer ${args.customerWaId} — ${args.reason}. Check the conversation and follow up.`,
  }).catch((err) => args.log.error({ err }, "Failed to send admin escalation notification"));
}
