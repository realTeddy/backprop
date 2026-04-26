import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadCurriculum } from "@/lib/curriculum/graph";
import {
  isUnlocked,
  masteryMap,
  MASTERY_UNLOCK_THRESHOLD,
  type MasteryRow,
} from "@/lib/curriculum/prerequisites";

async function fetchMastery(userId: string): Promise<MasteryRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("topic_mastery")
    .select("topic_id, score")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => ({ topicId: r.topic_id, score: r.score }));
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const curriculum = loadCurriculum();
  const rows = await fetchMastery(user.id);
  const mastery = masteryMap(rows);

  const tracks: Array<{ key: "math" | "code"; label: string }> = [
    { key: "math", label: "Math" },
    { key: "code", label: "Code" },
  ];

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Mastery map</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Topics unlock once their prerequisites reach{" "}
          {MASTERY_UNLOCK_THRESHOLD}/100. Click any unlocked topic to start a
          tutor session.
        </p>
      </header>

      {tracks.map(({ key, label }) => (
        <section key={key} className="space-y-3">
          <h2 className="text-lg font-medium uppercase tracking-wider text-neutral-500">
            {label}
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {curriculum.topics
              .filter((t) => t.track === key)
              .map((t) => {
                const score = mastery.get(t.id) ?? 0;
                const unlocked = isUnlocked(t, mastery);
                const mastered = score >= MASTERY_UNLOCK_THRESHOLD;
                return (
                  <li key={t.id}>
                    <TopicCard
                      id={t.id}
                      title={t.title}
                      summary={t.summary}
                      score={score}
                      unlocked={unlocked}
                      mastered={mastered}
                      optional={t.optional}
                    />
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TopicCard(props: {
  id: string;
  title: string;
  summary: string;
  score: number;
  unlocked: boolean;
  mastered: boolean;
  optional?: boolean;
}) {
  const { id, title, summary, score, unlocked, mastered, optional } = props;
  const base =
    "block rounded-lg border p-4 transition-colors h-full focus:outline-none focus:ring-2 focus:ring-blue-500";
  const enabled =
    "border-neutral-300 bg-white hover:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-500";
  const disabled =
    "border-neutral-200 bg-neutral-50 opacity-60 cursor-not-allowed dark:border-neutral-800 dark:bg-neutral-950";

  const card = (
    <div className={`${base} ${unlocked ? enabled : disabled}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug">{title}</h3>
        {optional && (
          <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            optional
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-3 text-xs text-neutral-600 dark:text-neutral-400">
        {summary}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
          aria-label="mastery"
        >
          <div
            className={`h-full ${mastered ? "bg-emerald-500" : "bg-blue-500"}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-neutral-500">
          {score}/100
        </span>
      </div>
    </div>
  );

  if (!unlocked) return card;
  return <Link href={`/learn/${id}`}>{card}</Link>;
}
