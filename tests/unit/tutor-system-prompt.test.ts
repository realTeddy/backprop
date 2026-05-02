import { describe, expect, it } from "vitest";
import { buildTutorSystemPrompt } from "@/lib/ai/tutor-system-prompt";

describe("buildTutorSystemPrompt", () => {
  it("tells the tutor when inline pyodide is allowed", () => {
    const prompt = buildTutorSystemPrompt({
      displayName: null,
      onboarding: null,
      mastery: [],
      currentTopicId: "vectors-basics",
      mode: "teach",
      uiCapabilities: {
        inlinePyodideAllowed: true,
        staticProjectRuntime: null,
      },
    });

    expect(prompt).toContain("INLINE PYODIDE: allowed on this learn page.");
    expect(prompt).toContain("Use the `show_pyodide_sections` tool");
  });

  it("tells the tutor when inline pyodide is not available", () => {
    const prompt = buildTutorSystemPrompt({
      displayName: null,
      onboarding: null,
      mastery: [],
      currentTopicId: "vectors-basics",
      mode: "teach",
      uiCapabilities: {
        inlinePyodideAllowed: false,
        staticProjectRuntime: null,
      },
    });

    expect(prompt).toContain("INLINE PYODIDE: not available on this page.");
  });
});
