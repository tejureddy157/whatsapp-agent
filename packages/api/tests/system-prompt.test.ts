import { afterAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../src/shared/config.js";
import {
  __resetSystemPromptCacheForTests,
  loadSystemPromptForBusiness,
} from "../src/modules/llm/system-prompt.js";

const TEST_PHONE_NUMBER_ID = "999999999test";
const testBusinessDir = path.join(repoRoot, "config", "businesses", TEST_PHONE_NUMBER_ID);
const testBusinessPromptPath = path.join(testBusinessDir, "system-prompt.txt");

describe("loadSystemPromptForBusiness", () => {
  beforeEach(() => {
    __resetSystemPromptCacheForTests();
  });

  afterAll(() => {
    fs.rmSync(testBusinessDir, { recursive: true, force: true });
    __resetSystemPromptCacheForTests();
  });

  it("falls back to the default business prompt when no matching subfolder exists", () => {
    const prompt = loadSystemPromptForBusiness("no-such-phone-number-id");
    expect(prompt).toContain("Brunda Traders");
  });

  it("uses a business-specific prompt when its subfolder exists", () => {
    fs.mkdirSync(testBusinessDir, { recursive: true });
    fs.writeFileSync(testBusinessPromptPath, "You are the assistant for Test Business Two.");

    const prompt = loadSystemPromptForBusiness(TEST_PHONE_NUMBER_ID);
    expect(prompt).toContain("Test Business Two");
  });

  it("caches per business so a second call doesn't re-read the file", () => {
    fs.mkdirSync(testBusinessDir, { recursive: true });
    fs.writeFileSync(testBusinessPromptPath, "Original content");

    const first = loadSystemPromptForBusiness(TEST_PHONE_NUMBER_ID);
    fs.writeFileSync(testBusinessPromptPath, "Changed content");
    const second = loadSystemPromptForBusiness(TEST_PHONE_NUMBER_ID);

    expect(first).toBe("Original content");
    expect(second).toBe("Original content");
  });
});
