import { describe, expect, it } from "vitest";
import { buildTutorTools } from "@/lib/ai/tools";

describe("buildTutorTools", () => {
  it("only exposes show_pyodide_sections when inline pyodide is allowed", () => {
    const enabled = buildTutorTools({
      supabase: {} as never,
      userId: "user-1",
      uiCapabilities: {
        inlinePyodideAllowed: true,
        staticProjectRuntime: null,
      },
    });

    const disabled = buildTutorTools({
      supabase: {} as never,
      userId: "user-1",
      uiCapabilities: {
        inlinePyodideAllowed: false,
        staticProjectRuntime: null,
      },
    });

    expect(enabled).toHaveProperty("show_pyodide_sections");
    expect(disabled).not.toHaveProperty("show_pyodide_sections");
  });

  it("omits show_pyodide_sections when uiCapabilities is not provided", () => {
    const result = buildTutorTools({
      supabase: {} as never,
      userId: "user-1",
    });

    expect(result).not.toHaveProperty("show_pyodide_sections");
    expect(result).toHaveProperty("fetch_topic");
    expect(result).toHaveProperty("update_mastery");
    expect(result).toHaveProperty("record_assessment");
  });
});
