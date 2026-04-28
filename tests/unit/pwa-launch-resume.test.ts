import {
  buildLaunchTarget,
  loadTrackedRoute,
  normalizeTrackedRoute,
  saveTrackedRoute,
} from "@/lib/pwa/launch-resume";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type StorageStub = {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};

function installWindow(localStorage: StorageStub) {
  Object.defineProperty(globalThis, "window", {
    value: { localStorage },
    configurable: true,
    writable: true,
  });
}

describe("tracked route storage", () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    if (typeof originalWindow === "undefined") {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
        writable: true,
      });
    }

    vi.restoreAllMocks();
  });

  it("saves only normalized internal routes", () => {
    const localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
    };

    installWindow(localStorage);

    saveTrackedRoute("/learn/vectors?step=intro");
    saveTrackedRoute("/launch/foo");
    saveTrackedRoute("/login?next=/dashboard");
    saveTrackedRoute("/auth/callback");

    expect(localStorage.setItem).toHaveBeenCalledTimes(1);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "backprop.pwa.last-route",
      "/learn/vectors?step=intro",
    );
  });

  it("skips storage when window is unavailable", () => {
    const localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    installWindow(localStorage);

    Reflect.deleteProperty(globalThis, "window");

    expect(() => saveTrackedRoute("/learn/vectors")).not.toThrow();
    expect(loadTrackedRoute()).toBeNull();
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(localStorage.getItem).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("loads only normalized internal routes", () => {
    const localStorage = {
      getItem: vi
        .fn()
        .mockReturnValueOnce("/settings/data?tab=progress")
        .mockReturnValueOnce("/login?next=/dashboard")
        .mockReturnValueOnce("/launch/foo")
        .mockReturnValueOnce("/auth/callback")
        .mockReturnValueOnce(null),
      setItem: vi.fn(),
    };

    installWindow(localStorage);

    expect(loadTrackedRoute()).toBe("/settings/data?tab=progress");
    expect(loadTrackedRoute()).toBeNull();
    expect(loadTrackedRoute()).toBeNull();
    expect(loadTrackedRoute()).toBeNull();
    expect(loadTrackedRoute()).toBeNull();
    expect(localStorage.getItem).toHaveBeenCalledTimes(5);
    expect(localStorage.getItem).toHaveBeenNthCalledWith(
      1,
      "backprop.pwa.last-route",
    );
    expect(localStorage.getItem).toHaveBeenNthCalledWith(
      2,
      "backprop.pwa.last-route",
    );
    expect(localStorage.getItem).toHaveBeenNthCalledWith(
      3,
      "backprop.pwa.last-route",
    );
    expect(localStorage.getItem).toHaveBeenNthCalledWith(
      4,
      "backprop.pwa.last-route",
    );
    expect(localStorage.getItem).toHaveBeenNthCalledWith(
      5,
      "backprop.pwa.last-route",
    );
  });

  it("logs and swallows storage save failures", () => {
    const localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error("quota exceeded");
      }),
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    installWindow(localStorage);

    expect(() => saveTrackedRoute("/learn/vectors")).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(
      "[pwa] failed to save the last route",
      expect.any(Error),
    );
  });

  it("logs and returns null on storage load failures", () => {
    const localStorage = {
      getItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      setItem: vi.fn(),
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    installWindow(localStorage);

    expect(loadTrackedRoute()).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      "[pwa] failed to load the last route",
      expect.any(Error),
    );
  });
});

describe("normalizeTrackedRoute", () => {
  it("keeps safe internal app routes", () => {
    expect(normalizeTrackedRoute("/learn/vectors")).toBe("/learn/vectors");
    expect(normalizeTrackedRoute("/settings?tab=data")).toBe(
      "/settings?tab=data",
    );
  });

  it("keeps nested settings routes for signed-in users", () => {
    expect(normalizeTrackedRoute("/settings/data")).toBe("/settings/data");
  });

  it("rejects external and auth-only routes", () => {
    expect(normalizeTrackedRoute("https://example.com")).toBeNull();
    expect(normalizeTrackedRoute("//example.com")).toBeNull();
    expect(normalizeTrackedRoute("/login")).toBeNull();
    expect(normalizeTrackedRoute("/login?next=/dashboard")).toBeNull();
    expect(normalizeTrackedRoute("/launch")).toBeNull();
    expect(normalizeTrackedRoute("/launch/foo")).toBeNull();
    expect(normalizeTrackedRoute("/auth")).toBeNull();
    expect(normalizeTrackedRoute("/auth?next=/dashboard")).toBeNull();
    expect(normalizeTrackedRoute("/auth/callback")).toBeNull();
    expect(normalizeTrackedRoute("/totally-new")).toBeNull();
  });
});

describe("buildLaunchTarget", () => {
  it("falls back to the dashboard when nothing usable is stored", () => {
    expect(buildLaunchTarget(null)).toBe("/dashboard");
    expect(buildLaunchTarget(undefined)).toBe("/dashboard");
    expect(buildLaunchTarget("/login")).toBe("/dashboard");
  });

  it("keeps a normalized tracked route", () => {
    expect(buildLaunchTarget("/learn/vectors?step=intro")).toBe(
      "/learn/vectors?step=intro",
    );
  });
});
