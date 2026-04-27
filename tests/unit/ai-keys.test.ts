import { describe, expect, it } from "vitest";
import { activeChoice } from "@/lib/ai/keys";

describe("activeChoice", () => {
  it("falls back to the current default model when a stored model is outdated", () => {
    expect(
      activeChoice({
        default: "openai",
        openai: {
          apiKey: "sk-test",
          model: "gpt-4o",
        },
      }),
    ).toEqual({
      provider: "openai",
      model: "gpt-5",
      apiKey: "sk-test",
    });
  });
});
