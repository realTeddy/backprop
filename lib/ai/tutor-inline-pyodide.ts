import { z } from "zod";

export const tutorInlinePyodideCapabilitySchema = z.object({
  inlinePyodideAllowed: z.boolean(),
  staticProjectRuntime: z.enum(["pyodide", "colab"]).nullable(),
});

export type TutorInlinePyodideCapability = z.infer<
  typeof tutorInlinePyodideCapabilitySchema
>;
