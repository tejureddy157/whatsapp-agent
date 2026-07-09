import { describe, expect, it } from "vitest";
import { computeWindowExpiry } from "../src/modules/conversation/window.js";

describe("computeWindowExpiry", () => {
  it("returns a timestamp exactly 24 hours after the given time", () => {
    const now = new Date("2026-07-09T10:00:00.000Z");
    const expiry = computeWindowExpiry(now);
    expect(expiry.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
