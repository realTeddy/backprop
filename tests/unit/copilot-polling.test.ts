import { describe, expect, it } from "vitest";

describe("beginPollingLifecycle", () => {
  it("resets cancellation state for a new mount after cleanup", async () => {
    const { beginPollingLifecycle } = await import("@/lib/ai/copilot-polling");

    const cancelRef = { current: false };

    const cleanupFirstMount = beginPollingLifecycle(cancelRef);
    cleanupFirstMount();

    beginPollingLifecycle(cancelRef);

    expect(cancelRef.current).toBe(false);
  });
});
