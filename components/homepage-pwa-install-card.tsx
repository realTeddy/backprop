"use client";

import dynamic from "next/dynamic";

const PwaInstallCard = dynamic(() => import("@/components/pwa-install-card"), {
  ssr: false,
});

export default function HomepagePwaInstallCard() {
  return <PwaInstallCard />;
}
