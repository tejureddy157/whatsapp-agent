const WHATSAPP_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Recomputed on every inbound message: the customer-service window resets to 24h from now. */
export function computeWindowExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + WHATSAPP_SERVICE_WINDOW_MS);
}
