"use client";

import { MobileReadouts, Readouts } from "@/app/_components/readouts";
import { TestSummary } from "@/app/_components/test-summary";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { PREVIEW_PANGRAM, PreviewPracticeProvider } from "../preview-practice";

/** Stats & results previews: the real live readouts and the real
 *  result screen, fed by a frozen practice context. */

/* ─── Live stats ───────────────────────────────────────────────── */

export function LiveStatsPreview() {
  // The real Readouts strip — colour, opacity, style (off / text /
  // mini / flash), unit, decimal-toggle and progress mode all flow
  // through unchanged.
  const { prefs } = useAppearancePrefs();
  if (prefs.statStripSurface === "none") {
    return (
      <div className="flex min-h-[120px] items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">
        Live stats are hidden. Turn on Show live stats to see them.
      </div>
    );
  }
  return (
    <PreviewPracticeProvider>
      <div className="px-4 py-7 sm:px-5 sm:py-9">
        <div className="md:hidden">
          <MobileReadouts />
        </div>
        <div className="hidden md:block">
          <Readouts />
        </div>
      </div>
    </PreviewPracticeProvider>
  );
}

/* ─── Result ───────────────────────────────────────────────────── */

export function ResultLivePreview() {
  // Real <TestSummary preview /> — exactly the same component the
  // user sees after a real run, fed by PreviewPracticeProvider with
  // a seeded completed-run state. Every appearance pref that lives
  // on the result screen (typingSpeedUnit, alwaysShowDecimal,
  // startGraphsAtZero, --ft-passage-* tokens, font + caret) flows
  // through unchanged because the real component is doing the work.
  return (
    <PreviewPracticeProvider words={PREVIEW_PANGRAM} phase="done">
      <div className="min-h-[420px] px-4 py-5 sm:px-5 sm:py-6">
        <TestSummary preview />
      </div>
    </PreviewPracticeProvider>
  );
}
