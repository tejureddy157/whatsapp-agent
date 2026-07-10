import fs from "node:fs";
import path from "node:path";
import { appConfig, repoRoot } from "../../shared/config.js";
import { logger } from "../../shared/logger.js";

const cache = new Map<string, string>();

/**
 * Resolves which business's system prompt to use for an inbound message,
 * based on the WhatsApp phone_number_id it arrived on
 * (config/businesses/<phoneNumberId>/system-prompt.txt). Falls back to
 * config/businesses/default/system-prompt.txt when no subfolder matches —
 * this is what makes a single-business setup work out of the box, and what
 * a second connected WhatsApp number needs to override.
 */
function resolveSystemPromptPath(businessPhoneNumberId: string): string {
  const businessSpecific = path.join(
    repoRoot,
    appConfig.BUSINESS_CONFIG_DIR,
    businessPhoneNumberId,
    "system-prompt.txt",
  );
  if (fs.existsSync(businessSpecific)) {
    return businessSpecific;
  }
  return path.join(repoRoot, appConfig.BUSINESS_CONFIG_DIR, "default", "system-prompt.txt");
}

/**
 * Loads and caches a business's system prompt in memory for the lifetime of
 * the process (keyed by phone_number_id). The file is hand-editable by the
 * business owner; a restart of the server/worker process picks up edits (no
 * file-watching — a fine trade-off for a low-traffic MVP).
 */
export function loadSystemPromptForBusiness(businessPhoneNumberId: string): string {
  const cached = cache.get(businessPhoneNumberId);
  if (cached !== undefined) {
    return cached;
  }

  const filePath = resolveSystemPromptPath(businessPhoneNumberId);
  try {
    const content = fs.readFileSync(filePath, "utf8");
    cache.set(businessPhoneNumberId, content);
    logger.info({ filePath, businessPhoneNumberId }, "Loaded system prompt for business");
    return content;
  } catch (err) {
    logger.error({ err, filePath, businessPhoneNumberId }, "Failed to load system prompt file");
    throw new Error(
      `Could not read system prompt for business "${businessPhoneNumberId}" at ${filePath}. ` +
        `Make sure config/businesses/default/system-prompt.txt exists.`,
    );
  }
}

/** Test-only escape hatch to force a re-read on the next call. */
export function __resetSystemPromptCacheForTests(): void {
  cache.clear();
}
