import type { Metadata } from "next";

import { vendor, market } from "@/lib/brand";

// Ben's own nav face is licensed; Figtree is the closest free geometric
// grotesque. Self-hosted via @fontsource rather than next/font/google so a
// build never depends on reaching Google at build time. Applied only to the
// landing page, so the studio UI keeps its neutral system stack.
import "@fontsource/figtree/400.css";
import "@fontsource/figtree/500.css";
import "@fontsource/figtree/600.css";
import "@fontsource/figtree/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: `${vendor.fullName} — Ad Studio`,
  description: `Generate hyper-personalised, social-proof ads for any ${market.prospectNoun}.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
