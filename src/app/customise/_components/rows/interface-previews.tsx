"use client";

import { Passage } from "@/app/_components/passage";
import { Button } from "@/components/ui/button";
import { PreviewPracticeProvider } from "../preview-practice";

/** Settings → Interface previews: a passage beside the buttons, cards,
 *  dividers and chrome the Interface knobs reshape. The samples read
 *  CSS vars and data attributes from the cascade, so every knob shows
 *  without bespoke logic. */

/* ─── Geometry ─────────────────────────────────────────────────── */

export function GeometryPreview() {
  // Radius shows up everywhere — the passage card, buttons, chips,
  // popovers. A passage + a button row covers both surfaces.
  return (
    <div className="flex flex-col gap-4 px-4 py-5 sm:px-5 sm:py-6">
      <PreviewPracticeProvider>
        <div className="relative h-[140px] w-full">
          <Passage />
        </div>
      </PreviewPracticeProvider>
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button size="sm">Action</Button>
        <Button size="sm" variant="outline">
          Outline
        </Button>
        <Button size="sm" variant="ghost">
          Ghost
        </Button>
        <span className="inline-flex h-8 items-center rounded-pill border border-primary bg-primary/10 px-3.5 text-[13px] font-medium text-primary">
          Selected
        </span>
        <span className="inline-flex h-8 items-center rounded-pill bg-muted px-3.5 text-[13px] font-medium text-muted-foreground">
          Option
        </span>
      </div>
    </div>
  );
}

/* ─── Surface ──────────────────────────────────────────────────── */

/** Sampler that shows what the user's Surface choices do at a glance:
 *  a card, a divider, a button row, and a passage line. The whole
 *  preview reads CSS vars from the cascade so any data-attr-driven
 *  override (card surfaces, dividers, bg fill, monochrome) shows up
 *  here without bespoke logic. */
export function SurfacePreview() {
  return (
    <div className="flex flex-col gap-5 px-4 py-6 sm:px-5">
      <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
        <div className="mb-0.5 text-xs font-medium text-muted-foreground">
          A card
        </div>
        <div className="text-sm text-foreground">
          Floats on the page when cards are transparent.
        </div>
      </div>
      <div className="ft-divider border-t border-border pt-3 text-xs text-muted-foreground">
        A section divider
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm">Primary</Button>
        <Button size="sm" variant="outline">
          Outline
        </Button>
        <span className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          Tag
        </span>
      </div>
      <PreviewPracticeProvider>
        <div className="relative h-[64px] w-full">
          <Passage />
        </div>
      </PreviewPracticeProvider>
    </div>
  );
}

/* ─── Chrome ───────────────────────────────────────────────────── */

/** Two stacked mocks: the topbar at the top, the footer strip at the
 *  bottom, with a passage band sandwiched in the middle. Each band
 *  paints with the same classes the real chrome uses so a topbar
 *  style switch is visible immediately. The auto-hide knob can't be
 *  meaningfully demo'd here (it reacts to phase === "running" on a
 *  real run); the row blurb explains. */
export function ChromePreview() {
  return (
    <div className="flex flex-col gap-3 px-4 py-5 sm:px-5 sm:py-6">
      <div className="flex items-center justify-between gap-3 rounded-pill border border-border bg-background/85 px-4 py-2 backdrop-blur-md">
        <span className="text-sm font-semibold text-foreground">flinttype</span>
        <nav className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <span className="brand-surface rounded-pill px-2.5 py-1 font-medium text-primary-foreground">
            Practice
          </span>
          <span className="px-2">Drills</span>
          <span className="px-2">Races</span>
        </nav>
      </div>
      <PreviewPracticeProvider>
        <div className="relative h-[80px] w-full">
          <Passage />
        </div>
      </PreviewPracticeProvider>
      <div className="flex items-center justify-between gap-3 border-t border-border px-1 pt-2 text-xs text-muted-foreground">
        <span>flinttype</span>
        <span className="hidden gap-3 sm:flex">
          <span>GitHub</span>
          <span>Settings</span>
        </span>
      </div>
    </div>
  );
}
