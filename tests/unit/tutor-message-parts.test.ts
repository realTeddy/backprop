import { describe, expect, it } from "vitest";
import { splitTutorMessageParts } from "@/lib/ai/tutor-message-parts";

describe("splitTutorMessageParts", () => {
  it("keeps prose and flattens show_pyodide_sections tool output", () => {
    const parsed = splitTutorMessageParts([
      { type: "text", text: "Try this in Python." },
      {
        type: "tool-show_pyodide_sections",
        state: "output-available",
        output: {
          sections: [
            {
              title: "Vector warm-up",
              instructions: "Run the dot product.",
              code: "print(1)",
            },
          ],
        },
      },
    ] as never);

    expect(parsed.text).toContain("Try this in Python.");
    expect(parsed.pyodideSections).toHaveLength(1);
    expect(parsed.pyodideSections[0]?.title).toBe("Vector warm-up");
  });

  it("returns empty sections when no tool parts present", () => {
    const parsed = splitTutorMessageParts([
      { type: "text", text: "Hello!" },
    ] as never);

    expect(parsed.text).toBe("Hello!");
    expect(parsed.pyodideSections).toHaveLength(0);
  });

  it("drops malformed tool output and keeps text", () => {
    const parsed = splitTutorMessageParts([
      { type: "text", text: "Here is some content." },
      {
        type: "tool-show_pyodide_sections",
        state: "output-available",
        output: { sections: [{ title: "", instructions: "", code: "" }] },
      },
    ] as never);

    expect(parsed.text).toBe("Here is some content.");
    expect(parsed.pyodideSections).toHaveLength(0);
  });

  it("ignores tool parts that are not output-available", () => {
    const parsed = splitTutorMessageParts([
      { type: "text", text: "Thinking…" },
      {
        type: "tool-show_pyodide_sections",
        state: "input-available",
        input: { sections: [] },
      },
    ] as never);

    expect(parsed.text).toBe("Thinking…");
    expect(parsed.pyodideSections).toHaveLength(0);
  });

  it("concatenates multiple text parts", () => {
    const parsed = splitTutorMessageParts([
      { type: "text", text: "Part one. " },
      { type: "text", text: "Part two." },
    ] as never);

    expect(parsed.text).toBe("Part one. Part two.");
  });
});
