"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getInstallCardMode,
  isIosInstallBrowser,
  type InstallCardMode,
} from "@/lib/pwa/installability";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaInstallCardView(props: {
  mode: InstallCardMode;
  onInstall?: () => Promise<void> | void;
}) {
  const { mode, onInstall } = props;

  if (mode === "hidden") return null;

  return (
    <section className="rounded-lg border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="space-y-2">
        <h2 className="text-sm font-medium">Install Backprop</h2>
        {mode === "prompt" ? (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Install Backprop for a faster, app-like launch experience from
              your home screen or desktop.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onInstall}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                Install app
              </button>
            </div>
          </>
        ) : mode === "dismissed" ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Install was dismissed for now. You can install Backprop later from
            your browser menu.
          </p>
        ) : mode === "ios" ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            On iPhone or iPad, open the Share menu and choose{" "}
            <strong>Add to Home Screen</strong>.
          </p>
        ) : (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Backprop can be installed from supported browsers once the page has
            been visited over HTTPS and the browser marks it as installable.
          </p>
        )}
      </div>
    </section>
  );
}

function reportInstallPromptError(error: Error) {
  console.error("[pwa-install-card] failed to show install prompt", error);
}

export async function runInstallPrompt(args: {
  promptEvent: BeforeInstallPromptEvent;
  clearPrompt: () => void;
  setDismissed: (dismissed: boolean) => void;
  reportError?: (error: Error) => void;
}) {
  const { promptEvent, clearPrompt, setDismissed, reportError = reportInstallPromptError } = args;

  try {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    clearPrompt();
    setDismissed(outcome === "dismissed");
  } catch (error) {
    const installError =
      error instanceof Error ? error : new Error("Install prompt failed");
    reportError(installError);
    clearPrompt();
    setDismissed(false);
  }
}

export default function PwaInstallCard() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const updateStandalone = (matches: boolean) => {
      const navigatorStandalone =
        (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
      setStandalone(matches || navigatorStandalone);
    };

    updateStandalone(media.matches);
    setIos(isIosInstallBrowser(window.navigator.userAgent));

    const onBeforeInstallPrompt = (event: Event) => {
      const deferred = event as BeforeInstallPromptEvent;
      deferred.preventDefault();
      setPromptEvent(deferred);
      setDismissed(false);
    };

    const onDisplayModeChange = (event: MediaQueryListEvent) => {
      updateStandalone(event.matches);
    };

    const onInstalled = () => {
      setPromptEvent(null);
      setStandalone(true);
    };

    media.addEventListener("change", onDisplayModeChange);
    window.addEventListener(
      "beforeinstallprompt",
      onBeforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      media.removeEventListener("change", onDisplayModeChange);
      window.removeEventListener(
        "beforeinstallprompt",
        onBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const mode = useMemo(
    () =>
      getInstallCardMode({
        isStandalone: standalone,
        isIos: ios,
        hasPrompt: Boolean(promptEvent),
        dismissed,
      }),
    [dismissed, ios, promptEvent, standalone],
  );

  async function onInstall() {
    if (!promptEvent) return;
    await runInstallPrompt({
      promptEvent,
      clearPrompt: () => setPromptEvent(null),
      setDismissed,
    });
  }

  return <PwaInstallCardView mode={mode} onInstall={onInstall} />;
}
