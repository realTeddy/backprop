"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { saveTrackedRoute } from "@/lib/pwa/launch-resume";

export function PwaLastRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  useEffect(() => {
    const route = query ? `${pathname}?${query}` : pathname;
    saveTrackedRoute(route);
  }, [pathname, query]);

  return null;
}
