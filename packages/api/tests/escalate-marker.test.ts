import { describe, expect, it } from "vitest";
import { stripEscalateMarker } from "../src/modules/conversation/pipeline.js";

describe("stripEscalateMarker", () => {
  it("strips the marker and flags escalation when present", () => {
    const result = stripEscalateMarker("[[ESCALATE]] Let me get a team member to help with that.");
    expect(result.escalated).toBe(true);
    expect(result.text).toBe("Let me get a team member to help with that.");
  });

  it("leaves ordinary replies untouched and unescalated", () => {
    const result = stripEscalateMarker("We're open 9 AM to 8 PM Monday through Saturday.");
    expect(result.escalated).toBe(false);
    expect(result.text).toBe("We're open 9 AM to 8 PM Monday through Saturday.");
  });

  it("does not match the marker if it appears mid-message", () => {
    const result = stripEscalateMarker("Sure, here's the info you need [[ESCALATE]] just kidding");
    expect(result.escalated).toBe(false);
    expect(result.text).toBe("Sure, here's the info you need [[ESCALATE]] just kidding");
  });
});
