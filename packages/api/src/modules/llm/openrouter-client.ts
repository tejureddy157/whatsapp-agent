import OpenAI from "openai";
import { appConfig } from "../../shared/config.js";

/**
 * The only module that talks to the LLM gateway. OpenRouter exposes an
 * OpenAI-compatible Chat Completions API, so the official `openai` SDK is
 * pointed at OpenRouter's base URL instead of using a bespoke client.
 * Swapping the underlying model is a one-line env var change
 * (OPENROUTER_MODEL) — no code here is specific to any one provider/model.
 */
export const openrouterClient = new OpenAI({
  apiKey: appConfig.OPENROUTER_API_KEY || "unset",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    // Optional OpenRouter attribution headers — safe to leave as-is.
    "HTTP-Referer": "https://brundatraders.example.com",
    "X-Title": "Brunda Traders WhatsApp Assistant",
  },
});
