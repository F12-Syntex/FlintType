// For adding custom fonts with other frameworks, see:
// https://tailwindcss.com/docs/font-family
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Lora, IBM_Plex_Mono } from "next/font/google";
import { VersionProvider } from "@/lib/version-context";
import { siteConfig } from "@/server/seo";
import { getAppVersion } from "@/server/version";
import { Providers } from "./providers";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontSerif = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
});

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  // Required so file-based opengraph-image / twitter-image resolve to
  // absolute URLs (https://flinttype.com/opengraph-image) instead of
  // localhost. Without it Discord / Slack / Twitter scrapers can't fetch
  // the card and the link preview falls back to a bare title.
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "flinttype",
    template: "%s · flinttype",
  },
  description:
    "flinttype is a free, open-source typing speed test. Practise, race, and sharpen your accuracy with adaptive drills, live stats, and shareable results.",
  applicationName: "flinttype",
};

// viewport-fit=cover is what activates env(safe-area-inset-*) on iOS;
// without it those values stay 0 even on notched devices.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const version = getAppVersion();
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* All catalog fonts are shipped under /public/fonts and declared
              via @font-face here. Browser still lazy-fetches the woff2 for
              whichever family the user picks — the @font-face rule is
              cheap, the binary is only pulled on first paint. */}
          <link rel="stylesheet" href="/fonts/fonts.css" />
        </head>
        <body className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}>
          <VersionProvider value={version}>
            <Providers>{children}</Providers>
          </VersionProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
