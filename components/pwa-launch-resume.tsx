"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  buildLaunchTarget,
  loadTrackedRoute,
} from "@/lib/pwa/launch-resume";

export function PwaLaunchResume() {
  const router = useRouter();

  useEffect(() => {
    router.replace(buildLaunchTarget(loadTrackedRoute()));
  }, [router]);

  return <p className="text-sm text-neutral-500">Resuming your last lesson…</p>;
}
