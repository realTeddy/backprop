"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPyodide } from "@/lib/pyodide/kernel";

type Status = "idle" | "loading" | "ready" | "running" | "error";

export function PyodideCell(props: {
  initialCode?: string;
  packages?: string[];
}) {
  const { initialCode = "", packages = [] } = props;
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState<Status>("idle");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const stdoutRef = useRef<string>("");

  const ensureReady = useCallback(async () => {
    const pyodide = await getPyodide();
    pyodide.setStdout({
      batched: (s: string) => {
        stdoutRef.current += s + "\n";
      },
    });
    pyodide.setStderr({
      batched: (s: string) => {
        stdoutRef.current += s + "\n";
      },
    });
    return pyodide;
  }, []);

  // Warm Pyodide once the user mounts the cell. The tutor's first message
  // typically takes long enough that the kernel finishes loading by the
  // time the user is ready to run code.
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
    };
  }, []);

  async function run() {
    setStatus("running");
    setError(null);
    stdoutRef.current = "";
    try {
      const pyodide = await ensureReady();
      if (packages.length > 0 || /import\s/.test(code)) {
        await pyodide.loadPackagesFromImports(code);
      }
      const value = await pyodide.runPythonAsync(code);
      const tail =
        typeof value === "undefined" || value === null
          ? ""
          : `${String(value)}\n`;
      setOutput(stdoutRef.current + tail);
      setStatus("ready");
    } catch (err) {
      setOutput(stdoutRef.current);
      setError((err as Error).message);
      setStatus("error");
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-neutral-300 p-3 dark:border-neutral-700">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-neutral-500">
          Python (Pyodide)
        </span>
        <span className="text-xs text-neutral-500">
          {status === "loading" && "Loading kernel…"}
          {status === "ready" && "Ready"}
          {status === "running" && "Running…"}
          {status === "error" && "Error"}
        </span>
      </div>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={Math.max(4, code.split("\n").length + 1)}
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
          Run
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
