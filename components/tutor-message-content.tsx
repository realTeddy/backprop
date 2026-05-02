import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

function normalizeTutorMarkdown(text: string): string {
  return text
    .replace(/\\\[((?:.|\r?\n)+?)\\\]/g, (_, math: string) => `$$${math}$$`)
    .replace(/\\\(((?:.|\r?\n)+?)\\\)/g, (_, math: string) => `$${math}$`);
}

/**
 * Renders text content from tutor message parts.
 * Supports markdown, LaTeX math, and GFM formatting.
 */
export function TutorMessageContent({ text }: { text: string }) {
  const normalized = normalizeTutorMarkdown(text);

  return (
    <div className="tutor-richtext">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex]}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
