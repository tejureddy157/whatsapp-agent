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
  refreshConversationWindow,
} from "./repository.js";
import { computeWindowExpiry } from "./window.js";
import { isRestartCommand, RESTART_CONFIRMATION_MESSAGE } from "./restart-command.js";
import { runConversationTurn } from "../llm/run-turn.js";
import { outboundMessagesQueue } from "../../queues/definitions.js";
import type { InboundMessageJobData } from "../../queues/definitions.js";

const FALLBACK_REPLY =
  "We're experiencing a temporary issue on our end. Please try again in a moment, " +
  "or call us directly and we'll help you right away.";

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

  const { customer } = await lookupOrCreateCustomer(input.fromWaId, input.contactName);

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

  // Persist the inbound message before calling the LLM. If persistence
  // itself fails, this throws and BullMQ retries the job — safe, because
  // nothing was written yet, so the retry starts clean. If everything past
  // this point fails, we catch it below and still answer with a fallback
  // message rather than leaving the customer's message unanswered.
  await createMessage({
    conversationId: conversation.id,
    customerId: customer.id,
    direction: "IN",
    content: input.text,
    waMessageId: input.waMessageId,
  });

  let replyText = FALLBACK_REPLY;
  let tokensUsed: Record<string, number> | null = null;

  try {
    const result = await runConversationTurn({ history, userMessage: input.text });
    replyText = result.replyText || FALLBACK_REPLY;
    tokensUsed = result.usage;
  } catch (err) {
    log.error({ err }, "LLM turn failed — replying with fallback message");
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
