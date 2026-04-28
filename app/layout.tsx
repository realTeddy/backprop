import type { Metadata, Viewport } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { INSTALL_PROMPT_CAPTURE_SCRIPT } from "@/lib/pwa/install-prompt-capture";

export const metadata: Metadata = {
  title: "Backprop — Learn the math and code behind modern AI",
  description:
    "An adaptive AI tutor that takes you from linear algebra to building a small GPT from scratch.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Backprop",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <script
          dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_CAPTURE_SCRIPT }}
        />
        {children}
      </body>
    </html>
  );
}
