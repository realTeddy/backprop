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

export function buildLaunchTarget(path: string | null | undefined): string {
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
