"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DataSettingsPage() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    if (
      !confirm(
        "Permanently delete your account and all associated data? This cannot be undone.",
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    const res = await fetch("/api/account/delete", { method: "POST" });
    setDeleting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not delete account.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Your data</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Export everything we have stored about you, or delete your account
          and all associated data.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-neutral-300 p-5 dark:border-neutral-700">
        <h2 className="text-lg font-medium">Export</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          A JSON file containing your profile, onboarding answers, mastery
          scores, assessments, and decrypted tutor conversations.
        </p>
        <a
          href="/api/account/export"
          className="inline-block rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Download export
        </a>
      </section>

      <section className="space-y-3 rounded-lg border border-red-300 p-5 dark:border-red-900">
        <h2 className="text-lg font-medium text-red-700 dark:text-red-300">
          Delete account
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Removes your Supabase auth user. All rows in profiles,
          onboarding_responses, topic_mastery, assessments, tutor_sessions,
          tutor_messages, and code_submissions cascade-delete with the auth
          user. There is no undo.
        </p>
        {error && (
          <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={deleteAccount}
          disabled={deleting}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete my account"}
        </button>
      </section>
    </div>
  );
}
