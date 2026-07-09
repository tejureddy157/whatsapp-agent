import fs from "node:fs";
import path from "node:path";
import { appConfig, repoRoot } from "../../shared/config.js";
import { logger } from "../../shared/logger.js";

let cachedSystemPrompt: string | null = null;

/**
 * Loads config/system-prompt.txt from disk once and caches it in memory for
 * the lifetime of the process. The file is hand-editable by the business
 * owner; a restart of the server/worker process picks up edits (no
 * file-watching in Phase 1 — a fine trade-off for a low-traffic MVP).
 */
export function loadSystemPrompt(): string {
  if (cachedSystemPrompt !== null) {
    return cachedSystemPrompt;
  }

  const filePath = path.join(repoRoot, appConfig.SYSTEM_PROMPT_PATH);
  try {
    cachedSystemPrompt = fs.readFileSync(filePath, "utf8");
    logger.info({ filePath }, "Loaded system prompt file");
    return cachedSystemPrompt;
  } catch (err) {
    logger.error({ err, filePath }, "Failed to load system prompt file");
    throw new Error(
      `Could not read system prompt file at ${filePath}. Make sure config/system-prompt.txt exists.`,
    );
  }
}

/** Test-only escape hatch to force a re-read on the next call. */
export function __resetSystemPromptCacheForTests(): void {
  cachedSystemPrompt = null;
}
