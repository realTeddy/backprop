"use client";

import { getPyodide } from "./kernel";

export function createMessageSession(args: {
  loadKernel?: typeof getPyodide;
}) {
  const loadKernel = args.loadKernel ?? getPyodide;
  let kernelAndNamespacePromise: Promise<{
    kernel: Awaited<ReturnType<typeof loadKernel>>;
    namespace: unknown;
  }> | null = null;

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
      const { kernel, namespace } = await getKernelAndNamespace();
      if (opts?.onOutput) {
        kernel.setStdout({ batched: opts.onOutput });
        kernel.setStderr({ batched: opts.onOutput });
      }
      await kernel.loadPackagesFromImports(code);
      return kernel.runPythonAsync(code, { globals: namespace });
    },
  };
}
