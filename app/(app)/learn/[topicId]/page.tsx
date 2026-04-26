import { notFound, redirect } from "next/navigation";
import { loadCurriculum } from "@/lib/curriculum/graph";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TutorChat } from "@/components/tutor-chat";

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

  return (
    <div className="space-y-6">
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

      <TutorChat
        mode="teach"
        topicId={topic.id}
        initialUserMessage={`Let's work on "${topic.title}". Start where I am and adapt as we go.`}
      />
    </div>
  );
}
