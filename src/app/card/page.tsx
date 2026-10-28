import type { Metadata } from "next";
import { buildPageMetadata } from "@/server/seo";
import { BrandCard, CARD_H as H, CARD_W as W } from "./_components/brand-card";
import { CardStage } from "./_components/card-stage";
import { ScreenshotButton } from "./_components/screenshot-button";

export const metadata: Metadata = buildPageMetadata({
  title: "Card",
  description: "Screenshot-ready social card for flinttype.",
  path: "/card",
  noIndex: true,
});

/** Widest the card (and the header above it) may be: its natural width,
 *  or less when the viewport is short, so header + card fit one screen
 *  without scrolling (a 1440 × 900 laptop used to scroll a few px). The
 *  12rem covers the page padding, the header row and the gap. */
const FIT_WIDTH = `min(${W}px, calc((100dvh - 12rem) * ${W} / ${H}))`;

/** The brand card's page: a small header with the download button over
 *  the card, scaled down to fit narrow screens (the PNG export always
 *  renders it at its natural 1500 × 787). */
export default function CardPage() {
  return (
    <main className="safe-pt safe-pb flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-4 py-8 text-foreground sm:gap-6 sm:px-6 sm:py-12">
      <div
        className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        style={{ maxWidth: FIT_WIDTH }}
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Brand card</h1>
          <p className="text-sm text-muted-foreground">
            A {W} × {H} image for Twitter, Discord and link previews.
          </p>
        </div>
        <ScreenshotButton />
      </div>
      <div className="w-full" style={{ maxWidth: FIT_WIDTH }}>
        <CardStage width={W} height={H}>
          <BrandCard />
        </CardStage>
      </div>
    </main>
  );
}
