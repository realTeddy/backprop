import { streamText } from "ai";
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
import { encryptMessage } from "@/lib/crypto/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google"]),
  model: z.string(),
  apiKey: z.string().min(1),
  mode: z.enum(["onboarding", "diagnostic", "teach"]).default("teach"),
  topicId: z.string().nullable().optional(),
  sessionId: z.string().uuid().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { provider, model, apiKey, messages, mode, topicId, sessionId } =
    parsed.data;

  const knownModels = PROVIDER_CATALOG[provider as ProviderId].models.map(
    (m) => m.id,
  );
  if (!knownModels.includes(model)) {
    return Response.json(
      { error: `Unknown model "${model}" for provider "${provider}"` },
      { status: 400 },
    );
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
  };

  const system = buildTutorSystemPrompt(learner);
  const languageModel = resolveModel({ provider, model, apiKey });
  const tools = buildTutorTools({ supabase, userId: user.id });

  // Ensure a tutor_sessions row exists so messages can attach to it. We
  // upsert with ON CONFLICT DO NOTHING so repeated turns of the same
  // conversation reuse the same session id.
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

  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  const result = streamText({
    model: languageModel,
    system,
    messages,
    tools,
    maxSteps: 5,
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
        if (lastUser) {
          const enc = encryptMessage(lastUser.content);
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
        // Persistence errors must not fail the streaming response. Log only.
        console.error("[tutor] failed to persist messages", err);
      }
    },
  });

  return result.toDataStreamResponse();
}
