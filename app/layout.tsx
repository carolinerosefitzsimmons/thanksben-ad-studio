import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Legora — Ad Studio",
  description: "Generate hyper-personalised, social-proof ads for any law firm.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
