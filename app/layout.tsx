import type { Metadata } from "next";
import { vendor, market } from "@/lib/brand";
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
