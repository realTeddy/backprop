import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pollDeviceFlow } from "@/lib/ai/copilot";

export const runtime = "nodejs";

const Schema = z.object({ device_code: z.string().min(1) });

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!process.env.OWNER_EMAIL || user.email !== process.env.OWNER_EMAIL) {
    return new Response("Forbidden", { status: 403 });
  }

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await pollDeviceFlow(parsed.data.device_code);
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
