export type InstallCardMode =
  | "hidden"
  | "prompt"
  | "dismissed"
  | "ios"
  | "info";

export function isIosInstallBrowser(
  navigatorLike: string | { userAgent: string; maxTouchPoints?: number },
): boolean {
  const userAgent =
    typeof navigatorLike === "string"
      ? navigatorLike
      : navigatorLike.userAgent;

  if (/iPad|iPhone|iPod/.test(userAgent)) return true;

  return (
    /Macintosh/.test(userAgent) &&
    typeof navigatorLike !== "string" &&
    (navigatorLike.maxTouchPoints ?? 0) > 1
  );
}

export function getInstallCardMode(args: {
  isStandalone: boolean;
  isIos: boolean;
  hasPrompt: boolean;
  dismissed: boolean;
}): InstallCardMode {
  if (args.isStandalone) return "hidden";
  if (args.hasPrompt) return "prompt";
  if (args.isIos) return "ios";
  if (args.dismissed) return "dismissed";
  return "info";
}
