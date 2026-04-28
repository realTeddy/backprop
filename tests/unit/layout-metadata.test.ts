import { describe, expect, it } from "vitest";

describe("root layout metadata", () => {
  it("exports manifest and Apple web app metadata for the app shell", async () => {
    const { metadata } = await import("@/app/layout");

    expect(metadata.manifest).toBe("/manifest.webmanifest");
    expect(metadata.appleWebApp).toEqual({
      capable: true,
      statusBarStyle: "default",
      title: "Backprop",
    });
  });

  it("exports a dark theme color for the browser chrome", async () => {
    const { viewport } = await import("@/app/layout");

    expect(viewport.themeColor).toBe("#0a0a0a");
  });
});
