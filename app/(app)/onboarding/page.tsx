"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TutorChat } from "@/components/tutor-chat";

type Step = "form" | "diagnostic" | "done";

const LEARNING_STYLES = [
  "Worked examples I can imitate",
  "First principles, then examples",
  "Quick checks and short quizzes",
  "Long readings I can absorb at my own pace",
];

const PAIN_POINT_OPTIONS = [
  "Linear algebra feels rusty",
  "Calculus chain rule trips me up",
  "I can read code but freeze on a blank editor",
  "Math notation slows me down more than the math",
  "I lose context across long sessions",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [goals, setGoals] = useState("Build a small GPT from scratch");
  const [timePerWeek, setTimePerWeek] = useState(180);
  const [learningStyle, setLearningStyle] = useState(LEARNING_STYLES[0]!);
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePain(p: string) {
    setPainPoints((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goals: goals.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
        timePerWeekMin: timePerWeek,
        learningStyle,
        painPoints,
        priorKnowledge: {},
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error?.formErrors?.join("; ") ?? "Could not save onboarding.");
      return;
    }
    setStep("diagnostic");
  }

  if (step === "done") {
    router.push("/dashboard");
    return null;
  }

  if (step === "diagnostic") {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Diagnostic</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            The tutor will ask short questions to gauge your current level on
            each math topic. It will fill in your mastery scores as you answer.
            When you&apos;re ready, head to the dashboard.
          </p>
        </header>

        <TutorChat
          mode="diagnostic"
          initialUserMessage="Please run a quick diagnostic to gauge my current level. Probe one or two topics at a time and use the update_mastery tool to set my scores."
        />

        <div className="pt-4">
          <button
            type="button"
            onClick={() => setStep("done")}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            I&apos;m done — go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Welcome to Backprop</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          A few quick questions so the tutor can adapt to you. You can update
          these later in Settings.
        </p>
      </header>

      <form onSubmit={submitForm} className="space-y-5">
        <Field label="What's your goal?">
          <textarea
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            rows={2}
            className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <p className="mt-1 text-xs text-neutral-500">
            One per line, or comma-separated.
          </p>
        </Field>

        <Field label="How much time per week (minutes)?">
          <input
            type="number"
            min={0}
            max={3000}
            step={15}
            value={timePerWeek}
            onChange={(e) => setTimePerWeek(Number(e.target.value))}
            className="w-32 rounded border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </Field>

        <Field label="Learning style">
          <div className="space-y-2">
            {LEARNING_STYLES.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="style"
                  checked={learningStyle === s}
                  onChange={() => setLearningStyle(s)}
                />
                {s}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Pain points (pick any that apply)">
          <div className="space-y-2">
            {PAIN_POINT_OPTIONS.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={painPoints.includes(p)}
                  onChange={() => togglePain(p)}
                />
                {p}
              </label>
            ))}
          </div>
        </Field>

        {error && (
          <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {submitting ? "Saving…" : "Continue to diagnostic"}
        </button>
      </form>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{props.label}</p>
      {props.children}
    </div>
  );
}
