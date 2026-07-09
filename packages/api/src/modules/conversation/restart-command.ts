export const RESTART_CONFIRMATION_MESSAGE =
  "🔄 Conversation has been restarted. Let's start fresh! How can I help you today?";

/**
 * Deterministic — never routed through the LLM, so it can't be
 * misinterpreted or fail. Checked immediately after customer lookup, before
 * any context assembly or model call.
 */
export function isRestartCommand(text: string): boolean {
  return text.trim().toLowerCase() === "restart";
}
