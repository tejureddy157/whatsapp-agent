import { PrismaClient } from "@prisma/client";
import { appConfig } from "./config.js";

export const prisma = new PrismaClient({
  log: appConfig.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
