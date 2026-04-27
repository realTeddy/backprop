import type { UIMessage } from "ai";

export type StoredTutorMessage = {
  id: number | string;
  role: "user" | "assistant";
  plaintext: string;
};

export function buildTutorChatResumeState(args: {
  sessionId: string | null;
  storedMessages: StoredTutorMessage[];
  fallbackInitialUserMessage?: string;
}): {
  sessionId: string | null;
  initialMessages: UIMessage[];
  initialUserMessage?: string;
} {
  const initialMessages: UIMessage[] = args.storedMessages.map((message) => ({
    id: String(message.id),
    role: message.role,
    parts: [{ type: "text", text: message.plaintext, state: "done" }],
  }));

  return {
    sessionId: args.sessionId,
    initialMessages,
    initialUserMessage:
      initialMessages.length > 0 ? undefined : args.fallbackInitialUserMessage,
  };
}
