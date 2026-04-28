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
});
