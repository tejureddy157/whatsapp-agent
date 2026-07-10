import { Redis } from "ioredis";
import { appConfig } from "../shared/config.js";

// The worker process (where the conversation pipeline runs) has no HTTP
// server of its own, so it can't emit Socket.IO events directly — it
// publishes here instead, and the server process's socket-server.ts
// subscribes and re-broadcasts to connected CRM clients. Keeping this on
// its own ioredis connection since a subscribed connection can't run other
// commands.
export const REALTIME_CHANNEL = "crm:realtime-events";

export interface RealtimeEvent {
  event: string;
  payload: unknown;
}

const publisher = new Redis(appConfig.REDIS_URL);
publisher.on("error", (err) => {
  console.error("Realtime event-bus publisher connection error:", err.message);
});

export async function publishRealtimeEvent(event: string, payload: unknown): Promise<void> {
  const message: RealtimeEvent = { event, payload };
  await publisher.publish(REALTIME_CHANNEL, JSON.stringify(message));
}
