import type { Curriculum, Topic } from "./graph";

export type MasteryRow = { topicId: string; score: number };

const UNLOCK_THRESHOLD = 70;

/**
 * A topic is unlocked when every prerequisite has reached UNLOCK_THRESHOLD
 * mastery. Topics with no prerequisites are always unlocked.
 */
export function isUnlocked(
  topic: Topic,
  mastery: Map<string, number>,
): boolean {
  return topic.prerequisites.every(
    (prereq) => (mastery.get(prereq) ?? 0) >= UNLOCK_THRESHOLD,
  );
}

/**
 * Topics the learner can currently start: unlocked, but not yet mastered.
 * Sorted to put the closest-to-mastery in-progress topics first.
 */
export function nextEligibleTopics(
  curriculum: Curriculum,
  mastery: Map<string, number>,
): Topic[] {
  const eligible = curriculum.topics.filter(
    (t) => isUnlocked(t, mastery) && (mastery.get(t.id) ?? 0) < UNLOCK_THRESHOLD,
  );
  eligible.sort((a, b) => {
    const sa = mastery.get(a.id) ?? 0;
    const sb = mastery.get(b.id) ?? 0;
    return sb - sa;
  });
  return eligible;
}

export function masteryMap(rows: MasteryRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.topicId, r.score);
  return m;
}

export const MASTERY_UNLOCK_THRESHOLD = UNLOCK_THRESHOLD;
