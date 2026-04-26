import { notFound } from "next/navigation";
import { loadCurriculum } from "@/lib/curriculum/graph";

export default async function LearnTopicPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const curriculum = loadCurriculum();
  const topic = curriculum.byId.get(topicId);
  if (!topic) notFound();

  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-widest text-neutral-500">
        {topic.track}
      </p>
      <h1 className="text-2xl font-semibold">{topic.title}</h1>
      <p className="text-neutral-600 dark:text-neutral-400">{topic.summary}</p>
      <div className="rounded-md border border-dashed border-neutral-300 p-6 text-sm text-neutral-500 dark:border-neutral-700">
        Tutor session UI lands in Phase C.
      </div>
    </div>
  );
}
