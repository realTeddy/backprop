import type { TutorPyodideSection } from "@/lib/ai/tutor-inline-pyodide";

export function TutorInlinePyodideSections({
  messageId,
  sections,
}: {
  messageId: string;
  sections: TutorPyodideSection[];
}) {
  return (
    <ol className="mt-3 flex flex-col gap-3">
      {sections.map((section, index) => (
        <li
          key={`${messageId}-section-${index}`}
          className="rounded-md border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        >
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">
            {section.title}
          </p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            {section.instructions}
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-neutral-100 px-3 py-2 font-mono text-xs text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
            {section.code}
          </pre>
        </li>
      ))}
    </ol>
  );
}
