import { describe, expect, it, vi } from "vitest";

describe("createTutorChatTransport", () => {
  it("posts to /api/tutor using the latest loaded choice", async () => {
    const { createTutorChatTransport } = await import("@/lib/ai/tutor-transport");

    const fetchMock = vi.fn(async () => {
      return new Response(new ReadableStream({ start(controller) { controller.close(); } }), {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    });

    let choice: {
      provider: "openai" | "anthropic" | "google" | "copilot";
      model: string;
      apiKey: string;
    } | null = null;

    const transport = createTutorChatTransport({
      getChoice: () => choice,
      mode: "teach",
      topicId: "vectors-basics",
      sessionId: "session-1",
      fetch: fetchMock as typeof fetch,
    });

    choice = {
      provider: "openai",
      model: "gpt-5",
      apiKey: "sk-test",
    };

    await transport.sendMessages({
      trigger: "submit-message",
      chatId: "chat-1",
      messageId: undefined,
      messages: [],
      abortSignal: undefined,
      body: undefined,
      headers: undefined,
      metadata: undefined,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const [api, init] = call as unknown as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];
    expect(api).toBe("/api/tutor");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      provider: "openai",
      model: "gpt-5",
      apiKey: "sk-test",
      mode: "teach",
      topicId: "vectors-basics",
      sessionId: "session-1",
      id: "chat-1",
      trigger: "submit-message",
    });
  });
});
