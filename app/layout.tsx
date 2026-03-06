import type { Metadata, Viewport } from "next";
import "./globals.css";

// ─────────────────────────────────────────────────────────────
// METADATA  (used by Vercel / search engines / social sharing)
// ─────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "The Gator Grid | Bessey Creek Elementary PTA",
  description:
    "Stay connected with Bessey Creek Elementary PTA — track fundraising progress, upcoming events, volunteer hours, and school sponsors all in one place.",
  keywords: [
    "Bessey Creek Elementary",
    "PTA",
    "school events",
    "volunteer",
    "fundraising",
    "Gator Grid",
  ],
  authors: [{ name: "Bessey Creek Elementary PTA" }],
  // Open Graph (Facebook / LinkedIn previews)
  openGraph: {
    title: "The Gator Grid | Bessey Creek Elementary PTA",
    description:
      "Your hub for PTA news, events, volunteer hours, and community partners.",
    siteName: "The Gator Grid",
    locale: "en_US",
    type: "website",
  },
  // Twitter card
  twitter: {
    card: "summary_large_image",
    title: "The Gator Grid | Bessey Creek Elementary PTA",
    description:
      "Your hub for PTA news, events, volunteer hours, and community partners.",
  },
  // Prevent indexing while in development (remove for production launch)
  // robots: { index: false },
};

export const viewport: Viewport = {
  themeColor: "#006400",
  width: "device-width",
  initialScale: 1,
};

// ─────────────────────────────────────────────────────────────
// ROOT LAYOUT
// ─────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
        suppressHydrationWarning on <html> prevents React from warning
        about browser extensions (e.g. Grammarly) that inject attributes.
      */}
      <head>
        {/*
          Preconnect to Google Fonts for faster font loading.
          The actual @import lives in globals.css; these hints
          just open the TCP connection earlier.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Favicon — replace with your actual school logo */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        {/*
          No wrapper div needed — page.tsx owns its own full-bleed layout.
          Adding a wrapper here would fight the body background gradient.
        */}
        {children}
      </body>
    </html>
  );
}
