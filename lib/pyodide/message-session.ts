"use client";

import { getPyodide } from "./kernel";

export function createMessageSession(args: {
  loadKernel?: typeof getPyodide;
}) {
  const loadKernel = args.loadKernel ?? getPyodide;
  // NOTE: A failed kernel load permanently poisons the session since
  // kernelAndNamespacePromise is cached. Callers must recreate the session to retry.
  let kernelAndNamespacePromise: Promise<{
    kernel: Awaited<ReturnType<typeof loadKernel>>;
    namespace: unknown;
  }> | null = null;
  let runQueue = Promise.resolve<unknown>(undefined);

  async function getKernelAndNamespace() {
    if (!kernelAndNamespacePromise) {
      kernelAndNamespacePromise = loadKernel().then(async (kernel) => ({
        kernel,
        namespace: await kernel.createNamespace(),
      }));
    }
    return kernelAndNamespacePromise;
  }

  return {
    async run(code: string, opts?: { onOutput?: (s: string) => void }) {
      const result = runQueue.then(async () => {
        const { kernel, namespace } = await getKernelAndNamespace();
        // NOTE: stdout/stderr handlers are global on the shared Pyodide singleton.
        // If multiple message sessions run concurrently, output may cross over.
        kernel.setStdout({ batched: () => {} });
        kernel.setStderr({ batched: () => {} });
        if (opts?.onOutput) {
          kernel.setStdout({ batched: opts.onOutput });
          kernel.setStderr({ batched: opts.onOutput });
        }
        await kernel.loadPackagesFromImports(code);
        return kernel.runPythonAsync(code, { globals: namespace });
      });
      runQueue = result.catch(() => undefined);
      return result;
    },
  };
}
