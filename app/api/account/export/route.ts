import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptMessage } from "@/lib/crypto/conversations";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const [profile, onboarding, mastery, assessments, sessions] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("onboarding_responses")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("topic_mastery").select("*").eq("user_id", user.id),
    supabase.from("assessments").select("*").eq("user_id", user.id),
    supabase
      .from("tutor_sessions")
      .select("id, topic_id, started_at, ended_at")
      .eq("user_id", user.id),
  ]);

  const sessionIds = (sessions.data ?? []).map((s) => s.id);
  let messages: Array<{
    session_id: string;
    role: string;
    plaintext: string;
    provider: string | null;
    model: string | null;
    created_at: string;
  }> = [];

  if (sessionIds.length > 0) {
    const { data: rows } = await supabase
      .from("tutor_messages")
      .select(
        "session_id, role, ciphertext_b64, nonce_b64, provider, model, created_at",
      )
      .in("session_id", sessionIds);
    messages = (rows ?? []).map((m) => {
      const ciphertext = Buffer.from(m.ciphertext_b64 as string, "base64");
      const nonce = Buffer.from(m.nonce_b64 as string, "base64");
      let plaintext = "";
      try {
        plaintext = decryptMessage({ ciphertext, nonce });
      } catch (err) {
        plaintext = `[decryption failed: ${(err as Error).message}]`;
      }
      return {
        session_id: m.session_id,
        role: m.role,
        plaintext,
        provider: m.provider,
        model: m.model,
        created_at: m.created_at,
      };
    });
  }

  const payload = {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
    },
    profile: profile.data,
    onboarding: onboarding.data,
    topic_mastery: mastery.data ?? [],
    assessments: assessments.data ?? [],
    tutor_sessions: sessions.data ?? [],
    tutor_messages: messages,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="backprop-export-${user.id}.json"`,
    },
  });
}
