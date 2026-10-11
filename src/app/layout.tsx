import type { Metadata, Viewport } from "next";
import "@phosphor-icons/web/regular";
import { BRAND } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: `${BRAND.name} — Markdown slide decks synced to GitHub`, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  applicationName: BRAND.name,
  openGraph: { title: BRAND.name, description: BRAND.tagline, siteName: BRAND.name, type: "website" },
  twitter: { card: "summary_large_image", title: BRAND.name, description: BRAND.tagline },
};

export const viewport: Viewport = { themeColor: "#09090b" };

const FONTS =
  "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Instrument+Serif&family=JetBrains+Mono:wght@400;500;700&display=swap";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* CORS so PDF export can read the @font-face rules and embed the fonts. */}
        <link rel="stylesheet" href={FONTS} crossOrigin="anonymous" />
        <link rel="preload" href="/wasm/slide_engine_bg.wasm" as="fetch" type="application/wasm" crossOrigin="" />
      </head>
      <body className="bg-zinc-950 text-[13px] text-zinc-50 antialiased">{children}</body>
    </html>
  );
}
