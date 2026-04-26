import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const owner = process.env.OWNER_EMAIL;
  return Response.json({
    email: user.email,
    isOwner: !!owner && user.email === owner,
  });
}
