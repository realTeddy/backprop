import { DefaultChatTransport } from "ai";
import type { ProviderId } from "@/lib/ai/providers";
import type { TutorInlinePyodideCapability } from "@/lib/ai/tutor-inline-pyodide";

export type TutorMode = "onboarding" | "diagnostic" | "teach";

export type TutorChoice = {
  provider: ProviderId;
  model: string;
  apiKey: string;
};

export function createTutorChatTransport(args: {
  getChoice: () => TutorChoice | null;
  mode: TutorMode;
  topicId?: string | null;
  sessionId: string | null;
  capability?: TutorInlinePyodideCapability | null;
  fetch?: typeof fetch;
}) {
  const { getChoice, mode, topicId, sessionId, capability, fetch } = args;

  return new DefaultChatTransport({
    api: "/api/tutor",
    fetch: async (input, init) => {
      const res = await (fetch ?? globalThis.fetch)(input, init);
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.includes("text/event-stream")) {
        const body = await res.clone().text();
        let message = `Tutor request failed (HTTP ${res.status}).`;
        try {
          const json = JSON.parse(body) as { error?: unknown };
          if (typeof json.error === "string") message = json.error;
        } catch {
          // Body wasn't JSON — leave the generic HTTP-status message.
        }
        throw new Error(message);
      }
      return res;
    },
    body: () => {
      const choice = getChoice();
      if (!choice) {
        throw new Error("No API key configured.");
      }

      return {
        provider: choice.provider,
        model: choice.model,
        apiKey: choice.apiKey,
        mode,
        topicId: topicId ?? null,
        sessionId,
        capability: capability ?? {
          inlinePyodideAllowed: false,
          staticProjectRuntime: null,
        },
      };
    },
  });
}
