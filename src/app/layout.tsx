import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

// JetBrains Mono 400 + 500 only, self-hosted by next/font. Exposed as --font-mono (overrides tokens.css fallback).
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Geste — paint it yourself", template: "%s · Geste" },
  description: "Step-by-step guides to paint gallery-level abstract works at home. From $12.",
  metadataBase: new URL("https://geste.studio"),
  // Mock phase on GitHub Pages: keep every page out of search engines. Remove at launch.
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body>{children}</body>
    </html>
  );
}
