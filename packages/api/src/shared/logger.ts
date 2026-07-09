import pino from "pino";
import { appConfig } from "./config.js";

export const logger = pino({
  level: appConfig.LOG_LEVEL,
  transport:
    appConfig.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } }
      : undefined,
});

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
