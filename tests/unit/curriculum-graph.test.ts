import { describe, expect, it } from "vitest";
import { CurriculumError, parseCurriculum } from "@/lib/curriculum/graph";
import {
  isUnlocked,
  masteryMap,
  nextEligibleTopics,
} from "@/lib/curriculum/prerequisites";

const validYaml = `
topics:
  - id: a
    title: A
    track: math
    summary: ok
    prerequisites: []
  - id: b
    title: B
    track: math
    summary: ok
    prerequisites: [a]
  - id: c
    title: C
    track: code
    summary: ok
    prerequisites: [a, b]
`;

describe("parseCurriculum", () => {
  it("parses valid YAML and indexes by id", () => {
    const c = parseCurriculum(validYaml);
    expect(c.topics).toHaveLength(3);
    expect(c.byId.get("b")?.title).toBe("B");
  });

  it("rejects duplicate ids", () => {
    const yaml = `
topics:
  - id: a
    title: A
    track: math
    summary: x
  - id: a
    title: A2
    track: math
    summary: x
`;
    expect(() => parseCurriculum(yaml)).toThrow(CurriculumError);
  });

  it("rejects unknown prerequisites", () => {
    const yaml = `
topics:
  - id: a
    title: A
    track: math
    summary: x
    prerequisites: [does-not-exist]
`;
    expect(() => parseCurriculum(yaml)).toThrow(/unknown prerequisite/);
  });

  it("rejects cycles", () => {
    const yaml = `
topics:
  - id: a
    title: A
    track: math
    summary: x
    prerequisites: [b]
  - id: b
    title: B
    track: math
    summary: x
    prerequisites: [a]
`;
    expect(() => parseCurriculum(yaml)).toThrow(/Cycle/);
  });

  it("rejects non-kebab ids", () => {
    const yaml = `
topics:
  - id: BadID
    title: x
    track: math
    summary: x
`;
    expect(() => parseCurriculum(yaml)).toThrow(CurriculumError);
  });
});

describe("prerequisites", () => {
  it("locks topics until all prerequisites pass the threshold", () => {
    const c = parseCurriculum(validYaml);
    const m = masteryMap([{ topicId: "a", score: 80 }]);
    expect(isUnlocked(c.byId.get("a")!, m)).toBe(true);
    expect(isUnlocked(c.byId.get("b")!, m)).toBe(true);
    expect(isUnlocked(c.byId.get("c")!, m)).toBe(false);
  });

  it("sorts eligible topics by current progress descending", () => {
    const c = parseCurriculum(validYaml);
    const m = masteryMap([
      { topicId: "a", score: 100 },
      { topicId: "b", score: 50 },
    ]);
    const eligible = nextEligibleTopics(c, m).map((t) => t.id);
    expect(eligible).toEqual(["b"]);
  });
});
