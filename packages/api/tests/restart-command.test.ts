import { describe, expect, it } from "vitest";
import { isRestartCommand } from "../src/modules/conversation/restart-command.js";

describe("isRestartCommand", () => {
  it("matches the exact word", () => {
    expect(isRestartCommand("restart")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isRestartCommand("Restart")).toBe(true);
    expect(isRestartCommand("RESTART")).toBe(true);
    expect(isRestartCommand("ReStArT")).toBe(true);
  });

  it("tolerates surrounding whitespace", () => {
    expect(isRestartCommand("  restart  ")).toBe(true);
    expect(isRestartCommand("\nrestart\t")).toBe(true);
  });

  it("does not match when restart is part of a longer message", () => {
    expect(isRestartCommand("please restart")).toBe(false);
    expect(isRestartCommand("restart the order")).toBe(false);
    expect(isRestartCommand("can you restart?")).toBe(false);
  });

  it("does not match unrelated messages", () => {
    expect(isRestartCommand("hello")).toBe(false);
    expect(isRestartCommand("")).toBe(false);
  });
});
