import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCurriculum } from "@/lib/curriculum/graph";
import type { TutorInlinePyodideCapability } from "@/lib/ai/tutor-inline-pyodide";
import { tutorPyodideSectionsPayloadSchema } from "@/lib/ai/tutor-inline-pyodide";

/**
 * Tools the tutor can call to update the learner's mastery state, record
 * assessments, or look up topic metadata. Every tool is bound to the
 * authenticated `userId` server-side — the model cannot specify a different
 * user.
 */
export function buildTutorTools(args: {
  supabase: SupabaseClient;
  userId: string;
  uiCapabilities?: TutorInlinePyodideCapability;
}) {
  const { supabase, userId, uiCapabilities } = args;
  const curriculum = loadCurriculum();

  return {
    fetch_topic: tool({
      description:
        "Look up a topic by id and return its title, summary, prerequisites, and any associated coding project.",
      inputSchema: z.object({
        topic_id: z.string().describe("kebab-case topic id from the curriculum graph"),
      }),
      execute: async ({ topic_id }) => {
        const t = curriculum.byId.get(topic_id);
        if (!t) return { error: `Unknown topic: ${topic_id}` };
        return {
          id: t.id,
          title: t.title,
          track: t.track,
          summary: t.summary,
          prerequisites: t.prerequisites,
          project: t.project ?? null,
          optional: t.optional ?? false,
        };
      },
    }),

    update_mastery: tool({
      description:
        "Update the learner's mastery score for a topic after observing demonstrated proficiency. Score is 0-100; 70 unlocks downstream topics. Always include a short rationale (one sentence) the learner will see.",
      inputSchema: z.object({
        topic_id: z.string(),
        score: z.number().int().min(0).max(100),
        rationale: z.string().min(1).max(280),
      }),
      execute: async ({ topic_id, score, rationale }) => {
        if (!curriculum.byId.has(topic_id)) {
          return { error: `Unknown topic: ${topic_id}` };
        }
        const { error } = await supabase
          .from("topic_mastery")
          .upsert(
            {
              user_id: userId,
              topic_id,
              score,
              last_practiced_at: new Date().toISOString(),
              notes: rationale,
            },
            { onConflict: "user_id,topic_id" },
          );
        if (error) return { error: error.message };
        return { ok: true, topic_id, score };
      },
    }),

    record_assessment: tool({
      description:
        "Record an assessment exchange (diagnostic, quiz, or exercise) so the learner can review history. Returns the assessment id.",
      inputSchema: z.object({
        topic_id: z.string(),
        kind: z.enum(["diagnostic", "quiz", "exercise"]),
        prompt: z.unknown(),
        response: z.unknown().optional(),
        score: z.number().int().min(0).max(100).optional(),
        feedback: z.string().optional(),
      }),
      execute: async (args) => {
        const { error, data } = await supabase
          .from("assessments")
          .insert({
            user_id: userId,
            topic_id: args.topic_id,
            kind: args.kind,
            prompt: args.prompt,
            response: args.response ?? null,
            score: args.score ?? null,
            feedback: args.feedback ?? null,
          })
          .select("id")
          .single();
        if (error) return { error: error.message };
        return { id: data.id };
      },
    }),
    ...(uiCapabilities?.inlinePyodideAllowed
      ? {
          show_pyodide_sections: tool({
            description:
              "Attach one or more inline runnable Pyodide sections to this assistant turn. Use only when code materially helps.",
            inputSchema: tutorPyodideSectionsPayloadSchema,
            execute: async ({ sections }) => ({ ok: true, count: sections.length }),
          }),
        }
      : {}),
  } as const;
}
