import { describe, expect, it } from "vitest";

describe("normalizeTrackedRoute", () => {
  it("keeps safe internal app routes", async () => {
    const { normalizeTrackedRoute } = await import("@/lib/pwa/launch-resume");

    expect(normalizeTrackedRoute("/learn/vectors")).toBe("/learn/vectors");
    expect(normalizeTrackedRoute("/settings?tab=data")).toBe(
      "/settings?tab=data",
    );
  });

  it("keeps nested settings routes for signed-in users", async () => {
    const { normalizeTrackedRoute } = await import("@/lib/pwa/launch-resume");

    expect(normalizeTrackedRoute("/settings/data")).toBe("/settings/data");
  });

  it("rejects external and auth-only routes", async () => {
    const { normalizeTrackedRoute } = await import("@/lib/pwa/launch-resume");

    expect(normalizeTrackedRoute("https://example.com")).toBeNull();
    expect(normalizeTrackedRoute("//example.com")).toBeNull();
    expect(normalizeTrackedRoute("/login")).toBeNull();
    expect(normalizeTrackedRoute("/launch")).toBeNull();
    expect(normalizeTrackedRoute("/totally-new")).toBeNull();
  });
});

describe("buildLaunchTarget", () => {
  it("falls back to the dashboard when nothing usable is stored", async () => {
    const { buildLaunchTarget } = await import("@/lib/pwa/launch-resume");

    expect(buildLaunchTarget(null)).toBe("/dashboard");
    expect(buildLaunchTarget("/login")).toBe("/dashboard");
  });
});
