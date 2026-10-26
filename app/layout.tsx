import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { vendor, market } from "@/lib/brand";

// Ben's own nav face is licensed; Figtree is the closest free geometric
// grotesque. Exposed as a variable and applied only to the landing page, so the
// studio UI keeps its neutral system stack.
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-ben", display: "swap" });
import "./globals.css";

export const metadata: Metadata = {
  title: `${vendor.fullName} — Ad Studio`,
  description: `Generate hyper-personalised, social-proof ads for any ${market.prospectNoun}.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
