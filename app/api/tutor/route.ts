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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google"]),
  model: z.string(),
  apiKey: z.string().min(1),
  mode: z.enum(["onboarding", "diagnostic", "teach"]).default("teach"),
  topicId: z.string().nullable().optional(),
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
  const { provider, model, apiKey, messages, mode, topicId } = parsed.data;

  // Validate model is one we list, so a typo doesn't silently send to a wrong
  // endpoint.
  const knownModels = PROVIDER_CATALOG[provider as ProviderId].models.map(
    (m) => m.id,
  );
  if (!knownModels.includes(model)) {
    return Response.json(
      { error: `Unknown model "${model}" for provider "${provider}"` },
      { status: 400 },
    );
  }

  // Pull learner context for the system prompt.
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

  const result = streamText({
    model: languageModel,
    system,
    messages,
    tools,
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
