import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

describe("getInstallCardMode", () => {
  it("prefers a real install button when a deferred prompt exists", async () => {
    const { getInstallCardMode } = await import("@/lib/pwa/installability");

    expect(
      getInstallCardMode({
        isStandalone: false,
        isIos: false,
        hasPrompt: true,
        dismissed: false,
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
        dismissed: false,
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
        dismissed: false,
      }),
    ).toBe("hidden");
  });

  it("shows dismissal guidance after the install prompt is dismissed", async () => {
    const { getInstallCardMode } = await import("@/lib/pwa/installability");

    expect(
      getInstallCardMode({
        isStandalone: false,
        isIos: false,
        hasPrompt: false,
        dismissed: true,
      }),
    ).toBe("dismissed");
  });

  it("shows iOS instructions even if prompt was previously dismissed", async () => {
    const { getInstallCardMode } = await import("@/lib/pwa/installability");

    expect(
      getInstallCardMode({
        isStandalone: false,
        isIos: true,
        hasPrompt: false,
        dismissed: true,
      }),
    ).toBe("ios");
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

  it("renders browser-menu guidance in dismissed mode", async () => {
    const { PwaInstallCardView } = await import("@/components/pwa-install-card");

    const html = renderToStaticMarkup(<PwaInstallCardView mode="dismissed" />);

    expect(html).toContain("browser menu");
    expect(html).not.toContain("Install app");
  });
});

describe("runInstallPrompt", () => {
  it("clears the prompt without marking dismissal when install is accepted", async () => {
    const { runInstallPrompt } = await import("@/components/pwa-install-card");
    const clearPrompt = vi.fn();
    const setDismissed = vi.fn();
    const reportError = vi.fn();

    await runInstallPrompt({
      promptEvent: {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({
          outcome: "accepted",
          platform: "web",
        }),
      } as never,
      clearPrompt,
      setDismissed,
      reportError,
    });

    expect(clearPrompt).toHaveBeenCalledTimes(1);
    expect(setDismissed).toHaveBeenCalledWith(false);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("marks the card dismissed when the browser prompt is dismissed", async () => {
    const { runInstallPrompt } = await import("@/components/pwa-install-card");
    const clearPrompt = vi.fn();
    const setDismissed = vi.fn();
    const reportError = vi.fn();

    await runInstallPrompt({
      promptEvent: {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({
          outcome: "dismissed",
          platform: "web",
        }),
      } as never,
      clearPrompt,
      setDismissed,
      reportError,
    });

    expect(clearPrompt).toHaveBeenCalledTimes(1);
    expect(setDismissed).toHaveBeenCalledWith(true);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("logs and clears stale prompt state when prompt() throws", async () => {
    const { runInstallPrompt } = await import("@/components/pwa-install-card");
    const clearPrompt = vi.fn();
    const setDismissed = vi.fn();
    const reportError = vi.fn();
    const error = new Error("prompt failed");

    await runInstallPrompt({
      promptEvent: {
        prompt: vi.fn().mockRejectedValue(error),
        userChoice: Promise.resolve({
          outcome: "accepted",
          platform: "web",
        }),
      } as never,
      clearPrompt,
      setDismissed,
      reportError,
    });

    expect(reportError).toHaveBeenCalledWith(error);
    expect(clearPrompt).toHaveBeenCalledTimes(1);
    expect(setDismissed).toHaveBeenCalledWith(false);
  });
});
