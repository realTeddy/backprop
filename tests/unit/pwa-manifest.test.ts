import { describe, expect, it } from "vitest";

describe("manifest", () => {
  it("declares Backprop as a standalone installable app", async () => {
    const { default: manifest } = await import("@/app/manifest");

    expect(manifest()).toEqual(
      expect.objectContaining({
        name: "Backprop",
        short_name: "Backprop",
        description:
          "An adaptive AI tutor that takes you from linear algebra to building a small GPT from scratch.",
        start_url: "/launch",
        display: "standalone",
        background_color: "#0a0a0a",
        theme_color: "#0a0a0a",
        icons: expect.arrayContaining([
          expect.objectContaining({
            src: "/icons/icon-192",
            sizes: "192x192",
            type: "image/png",
          }),
          expect.objectContaining({
            src: "/icon",
            sizes: "512x512",
            type: "image/png",
          }),
          expect.objectContaining({ src: "/apple-icon", type: "image/png" }),
        ]),
      }),
    );
  });
});
