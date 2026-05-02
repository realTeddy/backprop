import type { UIMessage } from "ai";
import {
  tutorPyodideSectionsPayloadSchema,
  type TutorPyodideSection,
  SHOW_PYODIDE_SECTIONS_PART_TYPE,
} from "@/lib/ai/tutor-inline-pyodide";

export function splitTutorMessageParts(parts: UIMessage["parts"]): {
  text: string;
  pyodideSections: TutorPyodideSection[];
} {
  const text = parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");

  const pyodideSections = parts.flatMap((part) => {
    if (part.type !== SHOW_PYODIDE_SECTIONS_PART_TYPE || part.state !== "output-available") {
      return [];
    }
    const parsed = tutorPyodideSectionsPayloadSchema.safeParse(part.output);
    return parsed.success ? parsed.data.sections : [];
  });

  return { text, pyodideSections };
}
