import { describe, expect, it } from "vitest";

describe("buildTutorChatResumeState", () => {
  it("reuses stored messages and suppresses the fallback seed prompt", async () => {
    const { buildTutorChatResumeState } = await import("@/lib/ai/tutor-history");

    const result = buildTutorChatResumeState({
      sessionId: "session-123",
      storedMessages: [
        { id: 1, role: "user", plaintext: "What is a vector?" },
        { id: 2, role: "assistant", plaintext: "A vector is an ordered list of numbers." },
      ],
      fallbackInitialUserMessage:
        'Let\'s work on "Vectors and vector operations". Start where I am and adapt as we go.',
    });

    expect(result).toEqual({
      sessionId: "session-123",
      initialUserMessage: undefined,
      initialMessages: [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "What is a vector?", state: "done" }],
        },
        {
          id: "2",
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "A vector is an ordered list of numbers.",
              state: "done",
            },
          ],
        },
      ],
    });
  });

  it("uses the fallback seed prompt when no stored messages exist", async () => {
    const { buildTutorChatResumeState } = await import("@/lib/ai/tutor-history");

    const result = buildTutorChatResumeState({
      sessionId: null,
      storedMessages: [],
      fallbackInitialUserMessage:
        'Let\'s work on "Vectors and vector operations". Start where I am and adapt as we go.',
    });

    expect(result).toEqual({
      sessionId: null,
      initialMessages: [],
      initialUserMessage:
        'Let\'s work on "Vectors and vector operations". Start where I am and adapt as we go.',
    });
  });
});
