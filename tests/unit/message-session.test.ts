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

  it("sets stdout and stderr handlers when onOutput is provided", async () => {
    const runPythonAsync = vi.fn().mockResolvedValue(undefined);
    const createNamespace = vi.fn(async () => ({}));
    const setStdout = vi.fn();
    const setStderr = vi.fn();
    const onOutput = vi.fn();

    const session = createMessageSession({
      loadKernel: async () =>
        ({
          runPythonAsync,
          loadPackagesFromImports: vi.fn(),
          setStdout,
          setStderr,
          createNamespace,
        }) as never,
    });

    await session.run("print('hello')", { onOutput });

    expect(setStdout).toHaveBeenCalledWith({ batched: onOutput });
    expect(setStderr).toHaveBeenCalledWith({ batched: onOutput });
  });

  it("does not set stdout and stderr handlers when onOutput is absent", async () => {
    const runPythonAsync = vi.fn().mockResolvedValue(undefined);
    const createNamespace = vi.fn(async () => ({}));
    const setStdout = vi.fn();
    const setStderr = vi.fn();

    const session = createMessageSession({
      loadKernel: async () =>
        ({
          runPythonAsync,
          loadPackagesFromImports: vi.fn(),
          setStdout,
          setStderr,
          createNamespace,
        }) as never,
    });

    await session.run("print('hello')");

    expect(setStdout).not.toHaveBeenCalled();
    expect(setStderr).not.toHaveBeenCalled();
  });
});
