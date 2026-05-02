"use client";

import { useEffect, useRef, useState } from "react";
import { getPyodide } from "@/lib/pyodide/kernel";
import { createMessageSession } from "@/lib/pyodide/message-session";
import type { TutorPyodideSection } from "@/lib/ai/tutor-inline-pyodide";
import type { Status } from "./pyodide-cell";

export function TutorInlinePyodideCell(props: {
  session: ReturnType<typeof createMessageSession>;
  section: TutorPyodideSection;
}) {
  const { session, section } = props;
  const [code, setCode] = useState(section.code);
  const [status, setStatus] = useState<Status>("idle");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const stdoutRef = useRef<string>("");
  const mountedRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getPyodide()
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setError((err as Error).message);
      });
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  async function run() {
    setStatus("running");
    setError(null);
    stdoutRef.current = "";
    try {
      const value = await session.run(code, {
        onOutput: (s) => {
          // Pyodide batched handlers provide lines without trailing newlines.
          stdoutRef.current += s + "\n";
        },
      });
      if (!mountedRef.current) return;
      const tail =
        typeof value === "undefined" || value === null
          ? ""
          : `${String(value)}\n`;
      setOutput(stdoutRef.current + tail);
      setStatus("ready");
    } catch (err) {
      if (!mountedRef.current) return;
      setOutput(stdoutRef.current);
      setError((err as Error).message);
      setStatus("error");
    }
  }

  const runLabel = section.runLabel ?? "Run";

  return (
    <div className="space-y-2 rounded-lg border border-neutral-300 p-3 dark:border-neutral-700">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {section.title}
        </span>
        <span className="text-xs text-neutral-500">
          {status === "loading" && "Loading kernel…"}
          {status === "ready" && "Ready"}
          {status === "running" && "Running…"}
          {status === "error" && "Error"}
        </span>
      </div>
      {section.instructions && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {section.instructions}
        </p>
      )}
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={Math.max(3, code.split("\n").length + 1)}
        spellCheck={false}
        className="w-full resize-y rounded border border-neutral-300 bg-neutral-50 p-3 font-mono text-xs leading-relaxed dark:border-neutral-700 dark:bg-neutral-950"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={status === "loading" || status === "running"}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {runLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            setOutput("");
            setError(null);
          }}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Clear
        </button>
      </div>
      {(output || error) && (
        <pre className="max-h-72 overflow-auto rounded border border-neutral-200 bg-white p-3 font-mono text-xs leading-relaxed dark:border-neutral-800 dark:bg-neutral-950">
          {output}
          {error && (
            <span className="text-red-600 dark:text-red-400">{error}</span>
          )}
        </pre>
      )}
    </div>
  );
}
