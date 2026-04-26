import { readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const TopicSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "topic id must be kebab-case"),
  title: z.string(),
  track: z.enum(["math", "code"]),
  prerequisites: z.array(z.string()).default([]),
  summary: z.string(),
  sources: z.array(z.string()).optional(),
  project: z.string().optional(),
  optional: z.boolean().default(false),
});

const CurriculumFileSchema = z.object({
  topics: z.array(TopicSchema).min(1),
});

export type Topic = z.infer<typeof TopicSchema>;
export type Curriculum = {
  topics: Topic[];
  byId: Map<string, Topic>;
};

export class CurriculumError extends Error {}

/**
 * Parse + validate a curriculum YAML string. Throws CurriculumError on:
 *   - schema mismatch
 *   - duplicate ids
 *   - unknown prerequisite ids
 *   - cycles in the prerequisite graph
 */
export function parseCurriculum(source: string): Curriculum {
  let raw: unknown;
  try {
    raw = parseYaml(source);
  } catch (err) {
    throw new CurriculumError(`YAML parse error: ${(err as Error).message}`);
  }

  const parsed = CurriculumFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CurriculumError(
      `Schema error: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }

  const topics = parsed.data.topics;
  const byId = new Map<string, Topic>();
  for (const t of topics) {
    if (byId.has(t.id)) {
      throw new CurriculumError(`Duplicate topic id: ${t.id}`);
    }
    byId.set(t.id, t);
  }

  for (const t of topics) {
    for (const prereq of t.prerequisites) {
      if (!byId.has(prereq)) {
        throw new CurriculumError(
          `Topic "${t.id}" lists unknown prerequisite "${prereq}"`,
        );
      }
    }
  }

  detectCycle(topics, byId);

  return { topics, byId };
}

function detectCycle(topics: Topic[], byId: Map<string, Topic>): void {
  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const t of topics) color.set(t.id, WHITE);

  const stack: string[] = [];

  function visit(id: string): void {
    color.set(id, GREY);
    stack.push(id);
    const t = byId.get(id)!;
    for (const next of t.prerequisites) {
      const c = color.get(next);
      if (c === GREY) {
        const cycleStart = stack.indexOf(next);
        const cycle = [...stack.slice(cycleStart), next].join(" -> ");
        throw new CurriculumError(`Cycle in prerequisites: ${cycle}`);
      }
      if (c === WHITE) visit(next);
    }
    color.set(id, BLACK);
    stack.pop();
  }

  for (const t of topics) {
    if (color.get(t.id) === WHITE) visit(t.id);
  }
}

let cached: Curriculum | undefined;

/** Load + cache the curriculum from `content/curriculum.yaml`. */
export function loadCurriculum(): Curriculum {
  if (cached) return cached;
  const filePath = path.join(process.cwd(), "content", "curriculum.yaml");
  const source = readFileSync(filePath, "utf8");
  cached = parseCurriculum(source);
  return cached;
}
