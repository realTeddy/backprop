import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createServerClient = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient,
}));

describe("updateSession", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("redirects /launch to login with the missing-config banner before creating a Supabase client", async () => {
    const { updateSession } = await import("@/lib/supabase/middleware");

    const response = await updateSession(
      new NextRequest("https://backprop.test/launch"),
    );

    expect(createServerClient).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://backprop.test/login?error=Supabase+is+not+configured+on+the+server.",
    );
  });

  it("redirects unauthenticated /launch requests to login when Supabase is configured", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    });

    const { updateSession } = await import("@/lib/supabase/middleware");

    const response = await updateSession(
      new NextRequest("https://backprop.test/launch"),
    );
    const location = new URL(response.headers.get("location")!);

    expect(createServerClient).toHaveBeenCalledOnce();
    expect(createServerClient).toHaveBeenCalledWith(
      "https://supabase.test",
      "anon-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      }),
    );
    expect(response.status).toBe(307);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/launch");
  });
});
