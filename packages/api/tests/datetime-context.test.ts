import { describe, expect, it } from "vitest";
import { buildCurrentDateTimeBlock } from "../src/modules/llm/datetime-context.js";

describe("buildCurrentDateTimeBlock", () => {
  it("formats the given date in the business timezone with weekday and time", () => {
    const fixedDate = new Date("2026-07-09T08:30:00.000Z"); // 14:00 IST
    const block = buildCurrentDateTimeBlock(fixedDate);

    expect(block).toContain("Current date & time:");
    expect(block).toContain("Asia/Kolkata");
    expect(block).toContain("Thursday");
    expect(block).toContain("July");
    expect(block).toContain("2026");
  });
});
