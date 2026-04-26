import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listCopilotModels } from "@/lib/ai/copilot";

export const runtime = "nodejs";

const Schema = z.object({ githubAccessToken: z.string().min(1) });

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
    return Response.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  try {
    const models = await listCopilotModels(parsed.data.githubAccessToken);
    return Response.json({ models });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
