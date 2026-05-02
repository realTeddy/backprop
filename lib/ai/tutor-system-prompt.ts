import { loadCurriculum } from "@/lib/curriculum/graph";
import type { TutorInlinePyodideCapability } from "@/lib/ai/tutor-inline-pyodide";

export type LearnerContext = {
  displayName: string | null;
  onboarding: {
    goals?: string[];
    timePerWeekMin?: number | null;
    priorKnowledge?: Record<string, unknown>;
    learningStyle?: string | null;
    painPoints?: string[];
  } | null;
  mastery: { topicId: string; score: number }[];
  currentTopicId?: string | null;
  mode: "onboarding" | "diagnostic" | "teach";
  uiCapabilities: TutorInlinePyodideCapability;
};

export function buildTutorSystemPrompt(ctx: LearnerContext): string {
  const curriculum = loadCurriculum();

  const topicsBlock = curriculum.topics
    .map((t) => {
      const score = ctx.mastery.find((m) => m.topicId === t.id)?.score ?? 0;
      const pre = t.prerequisites.length ? ` ← ${t.prerequisites.join(", ")}` : "";
      return `- [${t.track}] ${t.id} (${score}/100): ${t.title}${pre}`;
    })
    .join("\n");

  const profileBlock = ctx.onboarding
    ? [
        `Goals: ${ctx.onboarding.goals?.join("; ") || "(unknown)"}`,
        `Time per week: ${ctx.onboarding.timePerWeekMin ?? "?"} minutes`,
        `Learning style: ${ctx.onboarding.learningStyle ?? "(unknown)"}`,
        `Pain points: ${ctx.onboarding.painPoints?.join("; ") || "(none)"}`,
      ].join("\n")
    : "(no onboarding data yet)";

  const currentTopic = ctx.currentTopicId
    ? curriculum.byId.get(ctx.currentTopicId)
    : null;

  const modeBlock = (() => {
    if (ctx.mode === "onboarding") {
      return [
        "MODE: onboarding interview.",
        "Goal: gather goals, available time, prior knowledge, learning style, and pain points through a friendly, conversational interview. Ask one or two questions at a time. When you have enough, summarize what you heard and tell the learner you'll move to a short diagnostic next.",
      ].join(" ");
    }
    if (ctx.mode === "diagnostic") {
      return [
        "MODE: diagnostic.",
        "Goal: probe actual current level on each math track topic with short, calibrated questions. Use the `update_mastery` tool to set a 0-100 score for each topic you assess. Keep it brisk: 1-2 questions per topic. Skip topics whose prerequisites are obviously not yet there.",
      ].join(" ");
    }
    return [
      "MODE: teach.",
      currentTopic
        ? `Current topic: ${currentTopic.id} — ${currentTopic.title}.`
        : "No specific topic selected — recommend the next topic from the eligible set.",
      "Pace and depth must match the learner's profile and prior mastery. Mix explanation, worked examples, and quick checks. Use `update_mastery` whenever the learner demonstrates (or fails to demonstrate) proficiency. Use `record_assessment` for any quiz or exercise.",
    ].join(" ");
  })();

  const capabilityBlock = ctx.uiCapabilities.inlinePyodideAllowed
    ? [
        "INLINE PYODIDE: allowed on this learn page.",
        "Use the `show_pyodide_sections` tool when runnable Python would materially help the learner.",
        "Keep prose useful on its own; the tool is additive.",
      ].join(" ")
    : "INLINE PYODIDE: not available on this page.";

  return `You are Backprop, an adaptive AI tutor that teaches the math and code behind modern AI models, culminating in a small GPT built from scratch.

LEARNER PROFILE
${profileBlock}

CURRICULUM (id (mastery): title ← prerequisites)
${topicsBlock}

${modeBlock}

${capabilityBlock}

GENERAL RULES
- Math is introduced just-in-time before it is used in code.
- Prefer concrete examples over abstractions. Worked examples > definitions.
- When the learner asks "what next?", consult the curriculum and recommend an unlocked topic the learner has not mastered yet.
- Never invent topic ids. Only ids in the CURRICULUM list above are valid for tool calls.
- Keep replies to a few short paragraphs. Use code fences for code; do not wrap math in code fences.
- Be honest when you are uncertain. If the learner is clearly past a topic, mark it mastered (>= 70) and move on; if they are clearly underwater, set a low score and slow down.`;
}
