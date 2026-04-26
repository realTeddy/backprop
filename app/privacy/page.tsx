import { readFileSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-static";

export default function PrivacyPage() {
  const md = readFileSync(
    path.join(process.cwd(), "docs", "PRIVACY.md"),
    "utf8",
  );
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
        {md}
      </pre>
    </main>
  );
}
