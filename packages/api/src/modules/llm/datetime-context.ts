import { appConfig } from "../../shared/config.js";

/**
 * The model has no innate sense of "now" — this is injected fresh on every
 * turn so date/time-sensitive answers (business hours open/closed right
 * now, "same-day delivery cutoff", etc.) are grounded in the actual current
 * moment rather than the model's training cutoff.
 */
export function buildCurrentDateTimeBlock(now: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: appConfig.BUSINESS_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);

  return `Current date & time: ${formatted} (${appConfig.BUSINESS_TIMEZONE})`;
}
