import { z } from "zod";

export const tutorInlinePyodideCapabilitySchema = z.object({
  inlinePyodideAllowed: z.boolean(),
  staticProjectRuntime: z.enum(["pyodide", "colab"]).nullable(),
});

export type TutorInlinePyodideCapability = z.infer<
  typeof tutorInlinePyodideCapabilitySchema
>;

export const MAX_PYODIDE_SECTIONS_PER_MESSAGE = 3;

export const tutorPyodideSectionSchema = z.object({
  title: z.string().min(1).max(80),
  instructions: z.string().min(1).max(280),
  code: z.string().min(1).max(4000),
  runLabel: z.string().min(1).max(24).optional(),
});

export const tutorPyodideSectionsPayloadSchema = z.object({
  sections: z
    .array(tutorPyodideSectionSchema)
    .min(1)
    .max(MAX_PYODIDE_SECTIONS_PER_MESSAGE),
});

export type TutorPyodideSection = z.infer<typeof tutorPyodideSectionSchema>;

export const SHOW_PYODIDE_SECTIONS_TOOL_NAME = "show_pyodide_sections" as const;
export const SHOW_PYODIDE_SECTIONS_PART_TYPE =
  `tool-${SHOW_PYODIDE_SECTIONS_TOOL_NAME}` as const;
