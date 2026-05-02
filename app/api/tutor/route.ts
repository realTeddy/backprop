import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PROVIDER_CATALOG,
  resolveModel,
  type ProviderId,
} from "@/lib/ai/providers";
import { buildTutorTools } from "@/lib/ai/tools";
import {
  buildTutorSystemPrompt,
  type LearnerContext,
} from "@/lib/ai/tutor-system-prompt";
import { tutorInlinePyodideCapabilitySchema } from "@/lib/ai/tutor-inline-pyodide";
import { encryptMessage } from "@/lib/crypto/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "copilot"]),
  model: z.string(),
  apiKey: z.string().min(1),
  mode: z.enum(["onboarding", "diagnostic", "teach"]).default("teach"),
  topicId: z.string().nullable().optional(),
  sessionId: z.string().uuid().optional(),
  // useChat (v6) sends UIMessage[] with `parts: [{type: 'text', text}, ...]`.
  // We accept it as `unknown[]` and cast — Zod schema for UIMessage is
  // verbose and adds little value vs the type narrowing convertToModelMessages
  // already performs.
  messages: z.array(z.unknown()),
  capability: tutorInlinePyodideCapabilitySchema.optional(),
});

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (err) {
    console.error("[tutor] unhandled", err);
    return Response.json(
      { error: (err as Error).message ?? "Tutor request failed." },
      { status: 500 },
    );
  }
}

async function handle(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }
  const { provider, model, apiKey, messages, mode, topicId, sessionId, capability } =
    parsed.data;
  const uiMessages = messages as UIMessage[];

  if (provider === "copilot") {
    const owner = process.env.OWNER_EMAIL;
    if (!owner || user.email !== owner) {
      return Response.json(
        { error: "Copilot is restricted to the project owner." },
        { status: 403 },
      );
    }
  }

  // Copilot's model list is fetched live from api.githubcopilot.com/models,
  // so we trust the client's choice; for other providers we validate against
  // the editable PROVIDER_CATALOG to catch typos.
  if (provider !== "copilot") {
    const knownModels = PROVIDER_CATALOG[provider as ProviderId].models.map(
      (m) => m.id,
    );
    if (!knownModels.includes(model)) {
      return Response.json(
        { error: `Unknown model "${model}" for provider "${provider}"` },
        { status: 400 },
      );
    }
  }

  const [{ data: onboardingRow }, { data: masteryRows }] = await Promise.all([
    supabase
      .from("onboarding_responses")
      .select("goals, time_per_week_min, prior_knowledge, learning_style, pain_points")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("topic_mastery")
      .select("topic_id, score")
      .eq("user_id", user.id),
  ]);

  const learner: LearnerContext = {
    displayName: user.user_metadata?.name ?? null,
    onboarding: onboardingRow
      ? {
          goals: onboardingRow.goals as string[] | undefined,
          timePerWeekMin: onboardingRow.time_per_week_min as number | null,
          priorKnowledge: onboardingRow.prior_knowledge as Record<string, unknown>,
          learningStyle: onboardingRow.learning_style as string | null,
          painPoints: onboardingRow.pain_points as string[] | undefined,
        }
      : null,
    mastery: (masteryRows ?? []).map((r) => ({
      topicId: r.topic_id,
      score: r.score,
    })),
    currentTopicId: topicId ?? null,
    mode,
    uiCapabilities: capability ?? {
      inlinePyodideAllowed: false,
      staticProjectRuntime: null,
    },
  };

  const system = buildTutorSystemPrompt(learner);
  const languageModel = await resolveModel({ provider, model, apiKey });
  // TODO: Task 2 — forward `capability` to buildTutorTools when show_pyodide_sections tool is added
  const tools = buildTutorTools({ supabase, userId: user.id });

  const resolvedSessionId = sessionId ?? null;
  if (resolvedSessionId) {
    await supabase.from("tutor_sessions").upsert(
      {
        id: resolvedSessionId,
        user_id: user.id,
        topic_id: topicId ?? null,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  }

  const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
  const lastUserText = lastUser ? extractText(lastUser) : "";

  const modelMessages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model: languageModel,
    system,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
    onError({ error }) {
      console.error("[tutor] streamText error", error);
    },
    async onFinish({ text }) {
      if (!resolvedSessionId) return;
      try {
        const inserts: Array<{
          session_id: string;
          role: "user" | "assistant";
          ciphertext_b64: string;
          nonce_b64: string;
          provider?: string;
          model?: string;
        }> = [];
        if (lastUserText) {
          const enc = encryptMessage(lastUserText);
          inserts.push({
            session_id: resolvedSessionId,
            role: "user",
            ciphertext_b64: enc.ciphertext.toString("base64"),
            nonce_b64: enc.nonce.toString("base64"),
          });
        }
        if (text) {
          const enc = encryptMessage(text);
          inserts.push({
            session_id: resolvedSessionId,
            role: "assistant",
            ciphertext_b64: enc.ciphertext.toString("base64"),
            nonce_b64: enc.nonce.toString("base64"),
            provider,
            model,
          });
        }
        if (inserts.length > 0) {
          await supabase.from("tutor_messages").insert(inserts);
        }
      } catch (err) {
        console.error("[tutor] failed to persist messages", err);
      }
    },
  });

  // Forward backend errors through the UI message stream so the client
  // shows a real message instead of disconnecting silently.
  return result.toUIMessageStreamResponse({
    onError(error) {
      const e = error as Error;
      return e?.message ?? "Tutor request failed.";
    },
  });
}
