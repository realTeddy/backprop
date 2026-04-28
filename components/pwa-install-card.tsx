"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getInstallCardMode,
  isIosInstallBrowser,
  type InstallCardMode,
} from "@/lib/pwa/installability";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSAL_STORAGE_KEY = "backprop.pwa.install-card-dismissed";

type InstallCardState = {
  promptEvent: BeforeInstallPromptEvent | null;
  standalone: boolean;
  ios: boolean;
  dismissed: boolean;
};

declare global {
  interface Window {
    __backpropInstallPromptEvent?: BeforeInstallPromptEvent | null;
  }
}

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

function reportInstallStorageError(action: "load" | "save" | "clear", error: Error) {
  console.error(`[pwa-install-card] failed to ${action} dismissed state`, error);
}

export function loadInstallCardDismissed(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(DISMISSAL_STORAGE_KEY) === "1";
  } catch (error) {
    reportInstallStorageError(
      "load",
      error instanceof Error ? error : new Error("Storage read failed"),
    );
    return false;
  }
}

export function saveInstallCardDismissed(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(DISMISSAL_STORAGE_KEY, "1");
  } catch (error) {
    reportInstallStorageError(
      "save",
      error instanceof Error ? error : new Error("Storage write failed"),
    );
  }
}

export function clearInstallCardDismissed(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(DISMISSAL_STORAGE_KEY);
  } catch (error) {
    reportInstallStorageError(
      "clear",
      error instanceof Error ? error : new Error("Storage clear failed"),
    );
  }
}

function getCapturedInstallPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === "undefined") return null;

  return window.__backpropInstallPromptEvent ?? null;
}

function setCapturedInstallPrompt(promptEvent: BeforeInstallPromptEvent | null): void {
  if (typeof window === "undefined") return;

  window.__backpropInstallPromptEvent = promptEvent;
}

function getStandaloneState(): boolean {
  if (typeof window === "undefined") return false;

  const mediaMatches =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: standalone)").matches
      : false;
  const navigatorStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true;

  return mediaMatches || navigatorStandalone;
}

function getInitialInstallCardState(): InstallCardState {
  const promptEvent = getCapturedInstallPrompt();

  return {
    promptEvent,
    standalone: getStandaloneState(),
    ios:
      typeof window !== "undefined"
        ? isIosInstallBrowser(
            window.navigator as Navigator & {
              userAgent: string;
              maxTouchPoints?: number;
            },
          )
        : false,
    dismissed: promptEvent ? false : loadInstallCardDismissed(),
  };
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
  const [state, setState] = useState<InstallCardState>(getInitialInstallCardState);

  const updateDismissed = useCallback((nextDismissed: boolean) => {
    setState((current) => ({
      ...current,
      dismissed: nextDismissed,
    }));
    if (nextDismissed) {
      saveInstallCardDismissed();
      return;
    }
    clearInstallCardDismissed();
  }, []);

  useEffect(() => {
    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(display-mode: standalone)")
        : null;

    const initialState = getInitialInstallCardState();
    if (initialState.promptEvent) {
      clearInstallCardDismissed();
    }
    setState(initialState);

    const onBeforeInstallPrompt = (event: Event) => {
      const deferred = event as BeforeInstallPromptEvent;
      deferred.preventDefault();
      setCapturedInstallPrompt(deferred);
      setState((current) => ({
        ...current,
        promptEvent: deferred,
        dismissed: false,
      }));
      updateDismissed(false);
    };

    const onDisplayModeChange = (event: MediaQueryListEvent) => {
      setState((current) => ({
        ...current,
        standalone:
          event.matches ||
          (window.navigator as Navigator & { standalone?: boolean })
            .standalone === true,
      }));
    };

    const onInstalled = () => {
      setCapturedInstallPrompt(null);
      setState((current) => ({
        ...current,
        promptEvent: null,
        standalone: true,
      }));
      updateDismissed(false);
    };

    media?.addEventListener("change", onDisplayModeChange);
    window.addEventListener(
      "beforeinstallprompt",
      onBeforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      media?.removeEventListener("change", onDisplayModeChange);
      window.removeEventListener(
        "beforeinstallprompt",
        onBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [updateDismissed]);

  const mode = useMemo(
    () =>
      getInstallCardMode({
        isStandalone: state.standalone,
        isIos: state.ios,
        hasPrompt: Boolean(state.promptEvent),
        dismissed: state.dismissed,
      }),
    [state],
  );

  async function onInstall() {
    if (!state.promptEvent) return;
    await runInstallPrompt({
      promptEvent: state.promptEvent,
      clearPrompt: () => {
        setCapturedInstallPrompt(null);
        setState((current) => ({
          ...current,
          promptEvent: null,
        }));
      },
      setDismissed: updateDismissed,
    });
  }

  return <PwaInstallCardView mode={mode} onInstall={onInstall} />;
}
