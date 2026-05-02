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

    expect(setStdout).toHaveBeenCalledWith({ batched: expect.any(Function) });
    expect(setStderr).toHaveBeenCalledWith({ batched: expect.any(Function) });
    const noopFn = setStdout.mock.calls[0]?.[0]?.batched;
    expect(noopFn).toBeDefined();
    if (noopFn) {
      expect(() => noopFn("test")).not.toThrow();
    }
  });

  it("resets handlers between runs when onOutput changes", async () => {
    const runPythonAsync = vi.fn().mockResolvedValue(undefined);
    const createNamespace = vi.fn(async () => ({}));
    const setStdout = vi.fn();
    const setStderr = vi.fn();
    const firstOutput = vi.fn();
    const secondOutput = vi.fn();

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

    await session.run("print('first')", { onOutput: firstOutput });
    await session.run("print('second')", { onOutput: secondOutput });

    expect(setStdout).toHaveBeenCalledTimes(4);
    expect(setStderr).toHaveBeenCalledTimes(4);
    
    // First run: reset to no-op, then set to firstOutput
    expect(setStdout.mock.calls[0]?.[0]?.batched).toBeInstanceOf(Function);
    expect(setStdout.mock.calls[1]?.[0]?.batched).toBe(firstOutput);
    
    // Second run: reset to no-op, then set to secondOutput
    expect(setStdout.mock.calls[2]?.[0]?.batched).toBeInstanceOf(Function);
    expect(setStdout.mock.calls[3]?.[0]?.batched).toBe(secondOutput);
  });

  it("resets handlers when onOutput is omitted after being set", async () => {
    const runPythonAsync = vi.fn().mockResolvedValue(undefined);
    const createNamespace = vi.fn(async () => ({}));
    const setStdout = vi.fn();
    const setStderr = vi.fn();
    const firstOutput = vi.fn();

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

    await session.run("print('first')", { onOutput: firstOutput });
    await session.run("print('second')");

    expect(setStdout).toHaveBeenCalledTimes(3);
    expect(setStderr).toHaveBeenCalledTimes(3);
    
    // First run: reset to no-op, then set to firstOutput
    expect(setStdout.mock.calls[0]?.[0]?.batched).toBeInstanceOf(Function);
    expect(setStdout.mock.calls[1]?.[0]?.batched).toBe(firstOutput);
    
    // Second run: reset to no-op (onOutput not provided, so only one call)
    expect(setStdout.mock.calls[2]?.[0]?.batched).toBeInstanceOf(Function);
    expect(setStdout.mock.calls[2]?.[0]?.batched).not.toBe(firstOutput);
  });
});
