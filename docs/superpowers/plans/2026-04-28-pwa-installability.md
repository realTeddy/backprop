# PWA Installability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Backprop installable as a lightweight PWA with a visible homepage install card and installed launches that reopen the last signed-in route.

**Architecture:** Use Next.js App Router metadata conventions for the manifest and generated icons, a client install card for browser-specific install UX, and a dedicated `/launch` route plus `localStorage`-backed route tracking to resume installed launches. Keep the scope strictly to installability and launch behavior; do not add offline caching or a service worker.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Vitest

**Execution note:** The shipped implementation kept the same overall architecture but refined a few details during review: Task 1 used `/` until `/launch` existed, the final manifest exposes both `192x192` and `512x512` generated icons with dark theme colors, the install card now captures `beforeinstallprompt` early and persists dismissal state, and `/launch` is covered by the repo's existing graceful missing-config middleware path.

---

## File map

- `app/manifest.ts` — web app manifest with Backprop install metadata and manifest icon entries.
- `app/icon.tsx` — generated primary app icon served at `/icon`.
- `app/apple-icon.tsx` — generated Apple touch icon served at `/apple-icon`.
- `app/layout.tsx` — root metadata and viewport wiring for the manifest and theme color.
- `lib/pwa/installability.ts` — pure helpers for install-card mode selection and iOS detection.
- `components/pwa-install-card.tsx` — homepage install UI plus `beforeinstallprompt` handling.
- `app/page.tsx` — landing-page composition that renders the install card near existing CTAs.
- `lib/pwa/launch-resume.ts` — pure helpers for route validation plus `localStorage` read/write wrappers.
- `components/pwa-last-route-tracker.tsx` — tiny authenticated-layout tracker that persists the current route.
- `components/pwa-launch-resume.tsx` — client redirect component used by the launch route.
- `app/launch/page.tsx` — install entry route that either redirects to login or resumes the last route.
- `app/(app)/layout.tsx` — mounts the route tracker inside the signed-in shell.
- `tests/unit/pwa-manifest.test.ts` — manifest regression test.
- `tests/unit/pwa-install-card.test.tsx` — install-card mode and markup tests.
- `tests/unit/pwa-launch-resume.test.ts` — route validation and launch-target tests.

### Task 1: PWA manifest and icon metadata

**Files:**
- Create: `tests/unit/pwa-manifest.test.ts`
- Create: `app/manifest.ts`
- Create: `app/icon.tsx`
- Create: `app/apple-icon.tsx`
- Modify: `app/layout.tsx:1-20`

- [ ] **Step 1: Write the failing manifest test**

```ts
import { describe, expect, it } from "vitest";

describe("manifest", () => {
  it("declares Backprop as a standalone installable app", async () => {
    const { default: manifest } = await import("@/app/manifest");

    expect(manifest()).toEqual(
      expect.objectContaining({
        name: "Backprop",
        short_name: "Backprop",
        start_url: "/launch",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0a0a0a",
        icons: expect.arrayContaining([
          expect.objectContaining({ src: "/icon", type: "image/png" }),
          expect.objectContaining({ src: "/apple-icon", type: "image/png" }),
        ]),
      }),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- tests/unit/pwa-manifest.test.ts`  
Expected: FAIL with a module resolution error for `@/app/manifest`.

- [ ] **Step 3: Add the manifest, generated icons, and root metadata**

Create `app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Backprop",
    short_name: "Backprop",
    description:
      "An adaptive AI tutor that takes you from linear algebra to building a small GPT from scratch.",
    start_url: "/launch",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
```

Create `app/icon.tsx`:

```tsx
import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#ffffff",
          fontSize: 240,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-0.08em",
        }}
      >
        B
      </div>
    ),
    size,
  );
}
```

Create `app/apple-icon.tsx`:

```tsx
import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#ffffff",
          fontSize: 84,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-0.08em",
        }}
      >
        B
      </div>
    ),
    size,
  );
}
```

Update `app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "Backprop — Learn the math and code behind modern AI",
  description:
    "An adaptive AI tutor that takes you from linear algebra to building a small GPT from scratch.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Backprop",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Run the manifest test again**

Run: `pnpm test -- tests/unit/pwa-manifest.test.ts`  
Expected: PASS with 1 passing test file.

- [ ] **Step 5: Commit the metadata work**

```bash
git add tests/unit/pwa-manifest.test.ts app/manifest.ts app/icon.tsx app/apple-icon.tsx app/layout.tsx
git commit -m "feat: add Backprop PWA metadata" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: Homepage install card

**Files:**
- Create: `tests/unit/pwa-install-card.test.tsx`
- Create: `lib/pwa/installability.ts`
- Create: `components/pwa-install-card.tsx`
- Modify: `app/page.tsx:1-34`

- [ ] **Step 1: Write the failing install-card tests**

Create `tests/unit/pwa-install-card.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run the install-card tests to verify they fail**

Run: `pnpm test -- tests/unit/pwa-install-card.test.tsx`  
Expected: FAIL with missing module errors for `@/lib/pwa/installability` and `@/components/pwa-install-card`.

- [ ] **Step 3: Add pure installability helpers, the client install card, and homepage wiring**

Create `lib/pwa/installability.ts`:

```ts
export type InstallCardMode = "hidden" | "prompt" | "ios" | "info";

export function isIosInstallBrowser(userAgent: string): boolean {
  return /iPad|iPhone|iPod/.test(userAgent);
}

export function getInstallCardMode(args: {
  isStandalone: boolean;
  isIos: boolean;
  hasPrompt: boolean;
}): InstallCardMode {
  if (args.isStandalone) return "hidden";
  if (args.hasPrompt) return "prompt";
  if (args.isIos) return "ios";
  return "info";
}
```

Create `components/pwa-install-card.tsx`:

```tsx
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
  dismissed?: boolean;
}) {
  const { mode, onInstall, dismissed = false } = props;

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
              {dismissed && (
                <p className="text-xs text-neutral-500">
                  You can install it later from your browser menu.
                </p>
              )}
            </div>
          </>
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
      }),
    [ios, promptEvent, standalone],
  );

  async function onInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    setPromptEvent(null);
    setDismissed(outcome === "dismissed");
  }

  return (
    <PwaInstallCardView
      mode={mode}
      onInstall={onInstall}
      dismissed={dismissed}
    />
  );
}
```

Update `app/page.tsx`:

```tsx
import Link from "next/link";
import PwaInstallCard from "@/components/pwa-install-card";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-widest text-neutral-500">
          Backprop
        </p>
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          Learn the math and code behind modern AI.
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          An adaptive tutor that diagnoses what you already know and walks you
          from linear algebra to building a small GPT from scratch.
        </p>
      </header>
      <PwaInstallCard />
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Sign in
        </Link>
        <a
          href="https://github.com/realteddy/backprop"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Source
        </a>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run the install-card tests again**

Run: `pnpm test -- tests/unit/pwa-install-card.test.tsx`  
Expected: PASS with 5 passing tests.

- [ ] **Step 5: Commit the install-card work**

```bash
git add tests/unit/pwa-install-card.test.tsx lib/pwa/installability.ts components/pwa-install-card.tsx app/page.tsx
git commit -m "feat: add homepage PWA install card" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: Launch resume and last-route tracking

**Files:**
- Create: `tests/unit/pwa-launch-resume.test.ts`
- Create: `lib/pwa/launch-resume.ts`
- Create: `components/pwa-last-route-tracker.tsx`
- Create: `components/pwa-launch-resume.tsx`
- Create: `app/launch/page.tsx`
- Modify: `app/(app)/layout.tsx:1-43`

- [ ] **Step 1: Write the failing route-resume tests**

Create `tests/unit/pwa-launch-resume.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("normalizeTrackedRoute", () => {
  it("keeps safe internal app routes", async () => {
    const { normalizeTrackedRoute } = await import("@/lib/pwa/launch-resume");

    expect(normalizeTrackedRoute("/learn/vectors")).toBe("/learn/vectors");
    expect(normalizeTrackedRoute("/settings?tab=data")).toBe(
      "/settings?tab=data",
    );
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
```

- [ ] **Step 2: Run the route-resume tests to verify they fail**

Run: `pnpm test -- tests/unit/pwa-launch-resume.test.ts`  
Expected: FAIL with a missing module error for `@/lib/pwa/launch-resume`.

- [ ] **Step 3: Add route validation, the launch route, and the authenticated tracker**

Create `lib/pwa/launch-resume.ts`:

```ts
const STORAGE_KEY = "backprop.pwa.last-route";
const FALLBACK_ROUTE = "/dashboard";
const BLOCKED_PREFIXES = ["/login", "/launch", "/auth"];
const ALLOWED_EXACT_PATHS = new Set(["/dashboard", "/settings", "/onboarding"]);

export function normalizeTrackedRoute(
  path: string | null | undefined,
): string | null {
  if (!path || !path.startsWith("/")) return null;
  if (path.startsWith("//")) return null;
  if (path.includes("://")) return null;

  if (
    BLOCKED_PREFIXES.some(
      (prefix) =>
        path === prefix ||
        path.startsWith(`${prefix}/`) ||
        path.startsWith(`${prefix}?`),
    )
  ) {
    return null;
  }

  const [pathname] = path.split("?");

  if (pathname && ALLOWED_EXACT_PATHS.has(pathname)) {
    return path;
  }

  if (pathname?.startsWith("/learn/")) {
    return path;
  }

  return null;
}

export function buildLaunchTarget(
  path: string | null | undefined,
): string {
  return normalizeTrackedRoute(path) ?? FALLBACK_ROUTE;
}

export function saveTrackedRoute(path: string): void {
  if (typeof window === "undefined") return;

  const normalized = normalizeTrackedRoute(path);
  if (!normalized) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  } catch (error) {
    console.error("[pwa] failed to save the last route", error);
  }
}

export function loadTrackedRoute(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return normalizeTrackedRoute(window.localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    console.error("[pwa] failed to load the last route", error);
    return null;
  }
}
```

Create `components/pwa-last-route-tracker.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { saveTrackedRoute } from "@/lib/pwa/launch-resume";

export function PwaLastRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  useEffect(() => {
    const route = query ? `${pathname}?${query}` : pathname;
    saveTrackedRoute(route);
  }, [pathname, query]);

  return null;
}
```

Create `components/pwa-launch-resume.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  buildLaunchTarget,
  loadTrackedRoute,
} from "@/lib/pwa/launch-resume";

export function PwaLaunchResume() {
  const router = useRouter();

  useEffect(() => {
    router.replace(buildLaunchTarget(loadTrackedRoute()));
  }, [router]);

  return (
    <p className="text-sm text-neutral-500">
      Resuming your last lesson…
    </p>
  );
}
```

Create `app/launch/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { PwaLaunchResume } from "@/components/pwa-launch-resume";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LaunchPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
      <PwaLaunchResume />
    </main>
  );
}
```

Update `app/(app)/layout.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { PwaLastRouteTracker } from "@/components/pwa-last-route-tracker";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PwaLastRouteTracker />
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="text-sm font-semibold">
            Backprop
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/settings" className="hover:underline">
              Settings
            </Link>
            <span className="text-neutral-400">|</span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Run the route-resume tests again**

Run: `pnpm test -- tests/unit/pwa-launch-resume.test.ts`  
Expected: PASS with 3 passing tests.

- [ ] **Step 5: Commit the launch-resume work**

```bash
git add tests/unit/pwa-launch-resume.test.ts lib/pwa/launch-resume.ts components/pwa-last-route-tracker.tsx components/pwa-launch-resume.tsx app/launch/page.tsx app/(app)/layout.tsx
git commit -m "feat: resume the last route on installed launch" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 4: Final verification and manual install smoke

**Files:**
- Verify: `tests/unit/pwa-manifest.test.ts`
- Verify: `tests/unit/pwa-install-card.test.tsx`
- Verify: `tests/unit/pwa-launch-resume.test.ts`
- Verify: `app/layout.tsx`
- Verify: `app/page.tsx`
- Verify: `app/(app)/layout.tsx`
- Verify: `app/launch/page.tsx`

- [ ] **Step 1: Run the focused PWA tests together**

Run: `pnpm test -- tests/unit/pwa-manifest.test.ts tests/unit/pwa-install-card.test.tsx tests/unit/pwa-launch-resume.test.ts`  
Expected: PASS with all new PWA-focused tests green.

- [ ] **Step 2: Run the full unit suite**

Run: `pnpm test`  
Expected: PASS with the existing Vitest suite and the new PWA tests all green.

- [ ] **Step 3: Run lint, typecheck, and production build**

Run: `pnpm lint && pnpm typecheck && pnpm build`  
Expected: all three commands succeed with no new lint, type, or build failures.

- [ ] **Step 4: Do the manual install smoke check**

Run: `pnpm dev -- --experimental-https`  
Expected:
- the homepage shows the new install card in browser mode
- Chromium eventually exposes the install button after the site becomes eligible
- iPhone/iPad Safari shows Add to Home Screen guidance instead of a dead button
- visiting a signed-in app route, closing the app, and reopening `/launch` sends the user back to the stored route
- signed-out visits to `/launch` redirect to `/login`

- [ ] **Step 5: Commit any verification-driven fixes**

If manual or automated verification required follow-up edits, commit them with:

```bash
git add app components lib tests
git commit -m "fix: polish Backprop PWA install flow" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

If no fixes were needed, skip this step and leave the three feature commits as the final history.
