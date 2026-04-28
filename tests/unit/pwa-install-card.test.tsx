import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("getInstallCardMode", () => {
  it("prefers a real install button when a deferred prompt exists", async () => {
    const { getInstallCardMode } = await import("@/lib/pwa/installability");

    expect(
      getInstallCardMode({
        isStandalone: false,
        isIos: false,
        hasPrompt: true,
      }),
    ).toBe("prompt");
  });

  it("shows iOS instructions when Safari has no prompt API", async () => {
    const { getInstallCardMode } = await import("@/lib/pwa/installability");

    expect(
      getInstallCardMode({
        isStandalone: false,
        isIos: true,
        hasPrompt: false,
      }),
    ).toBe("ios");
  });

  it("hides the card when the app is already running in standalone mode", async () => {
    const { getInstallCardMode } = await import("@/lib/pwa/installability");

    expect(
      getInstallCardMode({
        isStandalone: true,
        isIos: false,
        hasPrompt: true,
      }),
    ).toBe("hidden");
  });
});

describe("PwaInstallCardView", () => {
  it("renders an install button in prompt mode", async () => {
    const { PwaInstallCardView } = await import("@/components/pwa-install-card");

    const html = renderToStaticMarkup(
      <PwaInstallCardView mode="prompt" onInstall={() => {}} />,
    );

    expect(html).toContain("Install app");
    expect(html).toContain("Install Backprop");
  });

  it("renders Add to Home Screen guidance in ios mode", async () => {
    const { PwaInstallCardView } = await import("@/components/pwa-install-card");

    const html = renderToStaticMarkup(<PwaInstallCardView mode="ios" />);

    expect(html).toContain("Add to Home Screen");
    expect(html).toContain("Share");
  });
});
