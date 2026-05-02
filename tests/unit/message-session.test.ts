import { describe, expect, it, vi } from "vitest";
import { createMessageSession } from "@/lib/pyodide/message-session";

describe("createMessageSession", () => {
  it("reuses the same namespace across runs in one message", async () => {
    const runPythonAsync = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(4);
    const createNamespace = vi.fn(async () => ({ key: "ns-1" }));

    const session = createMessageSession({
      loadKernel: async () =>
        ({
          runPythonAsync,
          loadPackagesFromImports: vi.fn(),
          setStdout: vi.fn(),
          setStderr: vi.fn(),
          createNamespace,
        }) as never,
    });

    await session.run("x = 4");
    await session.run("x");

    expect(runPythonAsync.mock.calls[0]?.[1]).toEqual({ globals: { key: "ns-1" } });
    expect(runPythonAsync.mock.calls[1]?.[1]).toEqual({ globals: { key: "ns-1" } });
    expect(createNamespace).toHaveBeenCalledTimes(1);
  });
});
