import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Schema = z.object({
  goals: z.array(z.string().min(1)).min(1),
  timePerWeekMin: z.number().int().min(0).max(60 * 50),
  learningStyle: z.string().min(1).max(120),
  painPoints: z.array(z.string()).default([]),
  priorKnowledge: z.record(z.unknown()).default({}),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await supabase.from("onboarding_responses").upsert({
    user_id: user.id,
    goals: parsed.data.goals,
    time_per_week_min: parsed.data.timePerWeekMin,
    learning_style: parsed.data.learningStyle,
    pain_points: parsed.data.painPoints,
    prior_knowledge: parsed.data.priorKnowledge,
    completed_at: new Date().toISOString(),
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
