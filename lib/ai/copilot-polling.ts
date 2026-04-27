export function beginPollingLifecycle(cancelRef: { current: boolean }) {
  cancelRef.current = false;

  return () => {
    cancelRef.current = true;
  };
}
