import { createSupabaseServerClient } from "@/lib/supabase/server";
import { startDeviceFlow } from "@/lib/ai/copilot";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!process.env.OWNER_EMAIL || user.email !== process.env.OWNER_EMAIL) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const flow = await startDeviceFlow();
    return Response.json(flow);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
