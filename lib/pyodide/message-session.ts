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
    async run(code: string) {
      const { kernel, namespace } = await getKernelAndNamespace();
      await kernel.loadPackagesFromImports(code);
      return kernel.runPythonAsync(code, { globals: namespace });
    },
  };
}
