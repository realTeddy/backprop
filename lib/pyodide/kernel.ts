"use client";

const PYODIDE_VERSION = "0.27.2";
const CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full`;

type PyodideNamespace = unknown;

type PyodideAPI = {
  runPythonAsync: (
    code: string,
    opts?: { globals?: PyodideNamespace },
  ) => Promise<unknown>;
  loadPackagesFromImports: (code: string) => Promise<void>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
  createNamespace: () => Promise<PyodideNamespace>;
};

type LoadPyodide = (opts: { indexURL: string }) => Promise<PyodideAPI>;

declare global {
  interface Window {
    loadPyodide?: LoadPyodide;
  }
}

let kernelPromise: Promise<PyodideAPI> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[data-pyodide-loader="${src}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error(`Failed to load ${src}`)),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.pyodideLoader = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Lazy, single-instance Pyodide kernel for the current tab. Subsequent
 * calls return the same kernel; concurrent first-time callers share the
 * same in-flight load promise.
 */
export function getPyodide(): Promise<PyodideAPI> {
  if (kernelPromise) return kernelPromise;
  kernelPromise = (async () => {
    await loadScript(`${CDN_BASE}/pyodide.js`);
    if (!window.loadPyodide) {
      throw new Error("loadPyodide global not present after script load");
    }
    const raw = await window.loadPyodide({ indexURL: `${CDN_BASE}/` });
    return {
      ...raw,
      createNamespace: async () => raw.globals.copy(),
    };
  })();
  return kernelPromise;
}
