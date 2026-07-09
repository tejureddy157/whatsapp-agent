# Brunda Traders — WhatsApp AI Assistant (Phase 1)

An AI-powered WhatsApp customer support assistant for Brunda Traders, built directly on
the Meta WhatsApp Business Cloud API (no Twilio/BSP layer) with OpenRouter as the LLM
gateway. See `docs/` — actually the full architecture plan lives at the path Claude Code
used during planning; ask Claude Code to show it again if you need the full rationale.

This is **Phase 1**: a working, testable WhatsApp assistant with memory, a restart
command, and a hand-editable system prompt carrying placeholder Brunda Traders business
data. Phase 2 (admin dashboard, database-backed pricing, RAG knowledge base, CRM) comes
later, once this is validated on real conversations.

## What's already done and self-tested

Claude Code built and tested this end-to-end locally before handing it back — including:
webhook signature verification (valid + invalid + missing), the verification handshake,
duplicate-webhook idempotency, the full inbound → LLM → outbound pipeline, the `restart`
command (conversation reset + fixed confirmation reply), and the fallback-reply path when
the LLM call fails. All of this ran against real local Postgres/Redis via Docker, with
WhatsApp sends in dry-run mode (logged, not actually sent, since no real Meta credentials
exist yet). The automated test suite (`npm test`) covers signature verification, the
restart-command matcher, the 24h window calculation, the date/time formatting, and the
webhook route's security paths — all passing.

## Prerequisites

- Node.js 20+ (developed and tested on Node 24)
- Docker Desktop (for local Postgres + Redis)

## Setup

```sh
npm install
cp .env.example .env      # already done in this checkout — edit .env with real values when ready
npm run db:up              # starts Postgres + Redis via docker-compose
npm run prisma:migrate     # applies the database schema
npm run dev:server         # terminal 1 — Fastify webhook server
npm run dev:worker         # terminal 2 — BullMQ worker (LLM calls, sending)
```

Health check: `curl http://localhost:3000/health` should return
`{"status":"ok","checks":{"db":"ok","redis":"ok"}}`.

## Configuration (`.env`)

All settings are in `.env` (see `.env.example` for the full list with comments). The
important ones:

| Variable | Purpose |
|---|---|
| `OPENROUTER_API_KEY` | Your OpenRouter key — get one at https://openrouter.ai/settings/keys |
| `OPENROUTER_MODEL` | Which model to use (default: `anthropic/claude-sonnet-4.6`). Change this one line to swap models — no code changes needed. |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | Real Meta WhatsApp Cloud API credentials (see below) |
| `WHATSAPP_APP_SECRET` | Used to verify incoming webhooks are really from Meta — **required** once you go live |
| `WHATSAPP_DRY_RUN` | `true` (default) logs outbound WhatsApp sends instead of calling the real API. Set to `false` once real WhatsApp credentials are configured. |
| `CONTEXT_MESSAGE_LIMIT` | Exactly how many prior messages are sent to the model for memory (default: 15, per spec) |

## The system prompt — `config/system-prompt.txt`

This is a **plain text file**, not code. It contains the assistant's tone/behavior rules
and all of Brunda Traders' business info (address, hours, rice varieties, pricing,
delivery, policies). **Edit it directly** to change how the assistant behaves or to
update business facts — no code changes needed. Restart the server/worker to pick up
edits.

The data currently in there is **placeholder/hypothetical**, generated for initial
testing (Gangavathi, Karnataka; example pricing; example hours). Replace it with real
Brunda Traders details whenever you're ready — just edit the file.

## The `restart` command

Send the word `restart` (any case, extra whitespace is fine) from WhatsApp to reset your
conversation — the bot forgets everything before that point and replies with a fixed
confirmation message. Useful for repeated testing. Currently works from any number; if
you'd rather this only work for specific test numbers once real customers are on the
line, say so and it's a one-line change.

## Testing locally without real WhatsApp/OpenRouter credentials

With `WHATSAPP_DRY_RUN=true` (the default) and no `OPENROUTER_API_KEY` set, you can drive
the whole pipeline with a simulated Meta webhook payload:

```sh
curl -X POST http://localhost:3000/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "1234567890",
      "changes": [{
        "field": "messages",
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {"display_phone_number": "911234567890", "phone_number_id": "999888777"},
          "contacts": [{"profile": {"name": "Test Customer"}, "wa_id": "919845000001"}],
          "messages": [{"from": "919845000001", "id": "wamid.UNIQUE_ID_HERE", "timestamp": "1751000000", "type": "text", "text": {"body": "Hello, what rice varieties do you have?"}}]
        }
      }]
    }]
  }'
```

Without an `OPENROUTER_API_KEY`, the LLM call fails and you'll see the built-in fallback
reply — this confirms the "must not break" behavior (§10 of the architecture plan): a
failed LLM call never leaves the customer without *some* response. Add a real
`OPENROUTER_API_KEY` to get real replies.

## Running tests

```sh
npm test
```

## What's needed from you to go live

Claude Code self-generated and self-tested everything that didn't require your
involvement. These genuinely need you:

1. **A real Meta Developer account + WhatsApp Business app + verified phone number.**
   Meta requires the account owner's own identity/business verification — this can't be
   done on your behalf.
2. **A permanent System User access token** (not the default 24-hour test token):
   Meta Business Settings → System Users → create/select a system user → generate a
   token with `business_management`, `whatsapp_business_messaging`,
   `whatsapp_business_management` permissions → set expiration to **"Never"**. Put it in
   `.env` as `WHATSAPP_ACCESS_TOKEN`, along with `WHATSAPP_PHONE_NUMBER_ID` and
   `WHATSAPP_APP_SECRET`.
3. **A real OpenRouter account + API key** — https://openrouter.ai/settings/keys.
4. **A public HTTPS URL** for Meta to deliver webhooks to (e.g. via `ngrok http 3000`
   during testing, or your production domain once deployed). Point Meta's webhook config
   at `https://<your-url>/webhooks/whatsapp` with the verify token from
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in `.env`.
5. **Real business data**, whenever you're ready to replace the placeholder content in
   `config/system-prompt.txt`.
6. Once real credentials are in `.env`, set `WHATSAPP_DRY_RUN=false`.

## Project structure

```
config/system-prompt.txt      # hand-editable business data + assistant behavior rules
packages/api/
  prisma/schema.prisma        # Customer / Conversation / Message models
  src/modules/whatsapp/       # webhook ingress, signature verification, outbound sender
  src/modules/customers/      # customer recognition (lookup/create by WhatsApp ID)
  src/modules/conversation/   # pipeline orchestration, restart command, 24h window
  src/modules/llm/            # OpenRouter client, system prompt loader, date/time context
  src/queues/                 # BullMQ queue definitions + processors (inbound/outbound)
  src/server.ts               # Fastify HTTP entrypoint (webhook + health check)
  src/worker.ts               # BullMQ worker entrypoint
  tests/                      # Vitest suite
```
