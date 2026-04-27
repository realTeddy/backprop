import { notFound, redirect } from "next/navigation";
import { loadCurriculum } from "@/lib/curriculum/graph";
import { PROJECTS } from "@/lib/curriculum/projects";
import { buildTutorChatResumeState, type StoredTutorMessage } from "@/lib/ai/tutor-history";
import { decryptMessage } from "@/lib/crypto/conversations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TutorChat } from "@/components/tutor-chat";
import { PyodideCell } from "@/components/pyodide-cell";
import { ColabButton } from "@/components/colab-button";

export default async function LearnTopicPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const curriculum = loadCurriculum();
  const topic = curriculum.byId.get(topicId);
  if (!topic) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fallbackInitialUserMessage = `Let's work on "${topic.title}". Start where I am and adapt as we go.`;
  const { data: latestSession } = await supabase
    .from("tutor_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("topic_id", topic.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let storedMessages: StoredTutorMessage[] = [];
  if (latestSession) {
    const { data: rows } = await supabase
      .from("tutor_messages")
      .select("id, role, ciphertext_b64, nonce_b64, created_at")
      .eq("session_id", latestSession.id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    storedMessages = (rows ?? []).map((row) => {
      let plaintext = "";
      try {
        plaintext = decryptMessage({
          ciphertext: Buffer.from(row.ciphertext_b64, "base64"),
          nonce: Buffer.from(row.nonce_b64, "base64"),
        });
      } catch (err) {
        plaintext = `[previous message unavailable: ${
          err instanceof Error ? err.message : "decryption failed"
        }]`;
      }

      return {
        id: row.id,
        role: row.role,
        plaintext,
      };
    });
  }

  const resumeState = buildTutorChatResumeState({
    sessionId: latestSession?.id ?? null,
    storedMessages,
    fallbackInitialUserMessage,
  });

  const project = topic.project ? PROJECTS[topic.project] : undefined;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-neutral-500">
          {topic.track}
        </p>
        <h1 className="text-2xl font-semibold">{topic.title}</h1>
        <p className="text-neutral-600 dark:text-neutral-400">{topic.summary}</p>
        {topic.prerequisites.length > 0 && (
          <p className="text-xs text-neutral-500">
            Prerequisites: {topic.prerequisites.join(", ")}
          </p>
        )}
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Tutor
        </h2>
        <TutorChat
          mode="teach"
          topicId={topic.id}
          initialMessages={resumeState.initialMessages}
          initialSessionId={resumeState.sessionId}
          initialUserMessage={resumeState.initialUserMessage}
        />
      </section>

      {project && project.runtime === "pyodide" && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Practice cell
          </h2>
          <PyodideCell initialCode={project.starter ?? ""} />
        </section>
      )}

      {project && project.runtime === "colab" && project.notebook && (
        <section className="space-y-3 rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
          <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Training run
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            This project trains beyond what Pyodide can handle in-browser.
            Open the pre-populated notebook on your free Colab runtime, then
            paste the final loss / sample output back here so the tutor can
            score your work.
          </p>
          <ColabButton notebook={project.notebook} />
        </section>
      )}
    </div>
  );
}
