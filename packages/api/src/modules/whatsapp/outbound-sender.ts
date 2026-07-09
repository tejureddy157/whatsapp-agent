import { appConfig } from "../../shared/config.js";
import { logger } from "../../shared/logger.js";
import { WhatsAppSendError } from "../../shared/errors.js";

const GRAPH_API_VERSION = "v21.0";

export interface SendTextMessageParams {
  to: string; // WhatsApp ID, e.g. "919845000000" (no leading +)
  body: string;
}

export interface SendResult {
  waMessageId: string | null;
  dryRun: boolean;
}

/**
 * Single choke point for all outbound WhatsApp traffic. In dry-run mode
 * (default until real Meta credentials exist) it logs the call it would
 * have made and returns without hitting the network. Retries/backoff are
 * the responsibility of the BullMQ outbound-messages queue, not this
 * function — it makes exactly one attempt and throws on failure.
 */
export async function sendWhatsAppTextMessage(params: SendTextMessageParams): Promise<SendResult> {
  const { to, body } = params;

  if (appConfig.WHATSAPP_DRY_RUN) {
    logger.info({ to, body }, "[DRY RUN] Would send WhatsApp text message");
    return { waMessageId: null, dryRun: true };
  }

  if (!appConfig.WHATSAPP_ACCESS_TOKEN || !appConfig.WHATSAPP_PHONE_NUMBER_ID) {
    throw new WhatsAppSendError(
      "WHATSAPP_DRY_RUN is false but WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID are not configured",
    );
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${appConfig.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appConfig.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "<no body>");
      throw new WhatsAppSendError(`WhatsApp Graph API returned ${res.status}: ${errText}`);
    }

    const json = (await res.json()) as { messages?: { id: string }[] };
    const waMessageId = json.messages?.[0]?.id ?? null;
    return { waMessageId, dryRun: false };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * WhatsApp's 24-hour customer service window: free-form messages are only
 * allowed within 24h of the customer's last inbound message; otherwise a
 * pre-approved template is required. Not enforced yet in Phase 1 (every
 * outbound message here is a direct reply to a message that just arrived,
 * so it's always within the window) — this becomes load-bearing once
 * broadcasts/reminders ship in Phase 2.
 */
export function isWithinCustomerServiceWindow(windowExpiresAt: Date | null): boolean {
  if (!windowExpiresAt) return false;
  return windowExpiresAt.getTime() > Date.now();
}
