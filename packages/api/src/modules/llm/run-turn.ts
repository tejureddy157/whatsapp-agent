import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { appConfig } from "../../shared/config.js";
import { LlmError } from "../../shared/errors.js";
import { openrouterClient } from "./openrouter-client.js";
import { loadSystemPrompt } from "./system-prompt.js";
import { buildCurrentDateTimeBlock } from "./datetime-context.js";
import type { Message as PrismaMessage } from "@prisma/client";

export interface RunTurnResult {
  replyText: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
}

function historyToChatMessages(history: PrismaMessage[]): ChatCompletionMessageParam[] {
  return history.map((m) => ({
    role: m.direction === "IN" ? "user" : "assistant",
    content: m.content,
  }));
}

/**
 * Runs one conversation turn against OpenRouter: static system prompt +
 * dynamic current-date/time block + the last N prior messages (memory) +
 * the new inbound message. Phase 1 has no tools registered — this is a
 * single request/response call. Phase 2 wraps this in a tool-call loop
 * (append tool results as `role: "tool"` messages and re-call) once
 * price/availability/order tools exist.
 */
export async function runConversationTurn(params: {
  history: PrismaMessage[];
  userMessage: string;
}): Promise<RunTurnResult> {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: loadSystemPrompt() },
    { role: "system", content: buildCurrentDateTimeBlock() },
    ...historyToChatMessages(params.history),
    { role: "user", content: params.userMessage },
  ];

  let response;
  try {
    response = await openrouterClient.chat.completions.create({
      model: appConfig.OPENROUTER_MODEL,
      messages,
      max_tokens: 1024,
      temperature: 0.4,
    });
  } catch (err) {
    throw new LlmError(err instanceof Error ? err.message : "Unknown OpenRouter request failure");
  }

  const choice = response.choices[0];
  if (!choice) {
    throw new LlmError("OpenRouter response contained no choices");
  }

  const usage = response.usage
    ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      }
    : null;

  return { replyText: choice.message.content ?? "", usage };
}
