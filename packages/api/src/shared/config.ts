import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// packages/api/src/shared -> repo root is 4 levels up.
export const repoRoot = path.resolve(__dirname, "../../../../");

// Load .env from the repo root regardless of which package/cwd this runs from.
loadDotenv({ path: path.join(repoRoot, ".env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default("info"),
  BUSINESS_TIMEZONE: z.string().default("Asia/Kolkata"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  OPENROUTER_API_KEY: z.string().optional().default(""),
  OPENROUTER_MODEL: z.string().default("anthropic/claude-sonnet-4.6"),

  WHATSAPP_ACCESS_TOKEN: z.string().optional().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional().default(""),
  WHATSAPP_APP_SECRET: z.string().optional().default(""),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().default("change-me-to-a-random-string"),
  WHATSAPP_DRY_RUN: z
    .string()
    .default("true")
    .transform((v) => v.toLowerCase() === "true"),
  // WhatsApp ID (no leading +) of a staff/owner number to notify when the AI
  // escalates a conversation to a human. Optional — if unset, escalations
  // are still recorded on the Conversation row, just not pushed anywhere.
  ADMIN_WHATSAPP_NUMBER: z.string().optional().default(""),

  CONTEXT_MESSAGE_LIMIT: z.coerce.number().int().positive().default(15),
  // Directory of per-business config, resolved relative to the repository
  // root (see repoRoot above). Each business gets a subfolder named after
  // its WhatsApp phone_number_id, containing its own system-prompt.txt —
  // see modules/llm/system-prompt.ts. A `default/` folder is the fallback
  // when an inbound message's phone_number_id has no matching subfolder.
  BUSINESS_CONFIG_DIR: z.string().default("config/businesses"),
});

export type AppConfig = z.infer<typeof envSchema>;

function loadConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration — see errors above.");
  }
  return parsed.data;
}

export const appConfig = loadConfig();
