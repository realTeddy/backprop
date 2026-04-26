"use client";

import Link from "next/link";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { activeChoice, loadKeys } from "@/lib/ai/keys";
import type { ProviderId } from "@/lib/ai/providers";

type Mode = "onboarding" | "diagnostic" | "teach";

export function TutorChat(props: {
  mode: Mode;
  topicId?: string | null;
  initialUserMessage?: string;
  onAssistantMessage?: (text: string) => void;
}) {
  const { mode, topicId, initialUserMessage, onAssistantMessage } = props;
  const [choice, setChoice] = useState<{
    provider: ProviderId;
    model: string;
    apiKey: string;
  } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : null,
  );

  useEffect(() => {
    setChoice(activeChoice(loadKeys()));
    setHydrated(true);
  }, []);

  const transport = useMemo(() => {
    if (!choice) return null;
    return new DefaultChatTransport({
      api: "/api/tutor",
      // If the route returns HTML (e.g. Next's 404/500 page) or a JSON
      // error envelope, throw a real Error here so useChat surfaces it
      // through `error` instead of trying to interpret HTML as a stream.
      fetch: async (input, init) => {
        const res = await fetch(input, init);
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
      body: {
        provider: choice.provider,
        model: choice.model,
        apiKey: choice.apiKey,
        mode,
        topicId: topicId ?? null,
        sessionId,
      },
    });
  }, [choice, mode, topicId, sessionId]);

  const { messages, sendMessage, status, error } = useChat({
    ...(transport ? { transport } : {}),
  });

  const [input, setInput] = useState("");

  // Kick the session off with an initial user message once we have a key.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!hydrated || !choice || seeded || !initialUserMessage) return;
    setSeeded(true);
    void sendMessage({ text: initialUserMessage });
  }, [hydrated, choice, seeded, initialUserMessage, sendMessage]);

  useEffect(() => {
    if (!onAssistantMessage) return;
    const last = messages[messages.length - 1];
    if (last?.role !== "assistant") return;
    const text = last.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
    if (text) onAssistantMessage(text);
  }, [messages, onAssistantMessage]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim()) return;
    void sendMessage({ text: input });
    setInput("");
  }

  if (!hydrated) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  if (!choice) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        No API key configured.{" "}
        <Link href="/settings" className="font-medium underline">
          Add one in Settings
        </Link>{" "}
        to start a tutor session.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-4">
        {messages.map((m) => (
          <Message
            key={m.id}
            role={m.role}
            text={m.parts
              .filter((p): p is { type: "text"; text: string } => p.type === "text")
              .map((p) => p.text)
              .join("")}
          />
        ))}
        {(status === "submitted" || status === "streaming") && (
          <p className="text-xs text-neutral-500">…</p>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error.message}
        </p>
      )}

      <form
        onSubmit={onSubmit}
        className="flex items-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Reply…"
          rows={2}
          className="flex-1 resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              (e.currentTarget.form as HTMLFormElement).requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={
            status === "submitted" || status === "streaming" || !input.trim()
          }
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function Message({ role, text }: { role: string; text: string }) {
  const isUser = role === "user";
  return (
    <div
      className={`whitespace-pre-wrap rounded-lg px-4 py-3 text-sm ${
        isUser
          ? "ml-auto max-w-[80%] bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
          : "max-w-[80%] bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
      }`}
    >
      {text}
    </div>
  );
}
