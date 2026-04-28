export type InstallCardMode = "hidden" | "prompt" | "ios" | "info";

export function isIosInstallBrowser(userAgent: string): boolean {
  return /iPad|iPhone|iPod/.test(userAgent);
}

export function getInstallCardMode(args: {
  isStandalone: boolean;
  isIos: boolean;
  hasPrompt: boolean;
}): InstallCardMode {
  if (args.isStandalone) return "hidden";
  if (args.hasPrompt) return "prompt";
  if (args.isIos) return "ios";
  return "info";
}
