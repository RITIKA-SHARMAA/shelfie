import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "./globals.css";

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Shelfie · a quiet reading shelf",
  description:
    "Keep your books on one calm shelf: what you're reading, what's next and what you've finished, with an AI that suggests real books to read next.",
  openGraph: { title: "Shelfie", description: "A calm reading shelf with AI suggestions for what to read next.", type: "website" },
};

export const viewport: Viewport = { themeColor: "#f2ede4", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
