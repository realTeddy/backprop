const REPO = "realteddy/backprop";
const BRANCH = "main";

export function ColabButton({ notebook }: { notebook: string }) {
  const href = `https://colab.research.google.com/github/${REPO}/blob/${BRANCH}/notebooks/${notebook}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
    >
      Open in Colab →
    </a>
  );
}
