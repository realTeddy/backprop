import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-widest text-neutral-500">
          Backprop
        </p>
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          Learn the math and code behind modern AI.
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          An adaptive tutor that diagnoses what you already know and walks you
          from linear algebra to building a small GPT from scratch.
        </p>
      </header>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Sign in with Google
        </Link>
        <a
          href="https://github.com/realteddy/backprop"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Source
        </a>
      </div>
    </main>
  );
}
