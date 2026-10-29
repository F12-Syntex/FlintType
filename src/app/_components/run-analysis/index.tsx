"use client";

import { useUser } from "@clerk/nextjs";
import { MethodDisclosure } from "@/components/analysis/method-disclosure";
import { Surface } from "@/components/page-shell";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { keystrokeAccuracy } from "@/lib/wpm";
import { usePractice } from "../practice-state";
import type { RunAnalysisView } from "../use-run-analysis";
import { CompareUsual, SignInLine } from "./compare-usual";
import { methodParagraphs } from "./finding-copy";
import { TimeCard } from "./time-card";
import { WhatHappened } from "./what-happened";

/** The result screen's analysis card (spec-50 §3, ui-law §22.3a): what
 *  happened and where the time went, then how the run compares with the
 *  user's usual, then how it's measured. All ink, left out of Save image
 *  (`data-no-export`), and gated by Settings > Show analysis. `view`
 *  comes from the one `useRunAnalysis()` call in `TestSummary`.
 *  `preview` (the settings preview, the AI studio tile, the live clone)
 *  turns off everything personal: the comparison and the practise link. */
export function RunAnalysis({
  view,
  preview,
  isNewPb,
}: {
  view: RunAnalysisView | null;
  preview: boolean;
  isNewPb: boolean;
}) {
  const { prefs } = useAppearancePrefs();
  const { isLoaded, isSignedIn } = useUser();
  const { lastPreviousBest } = usePractice();
  if (!prefs.resultShowAnalysis || !view) return null;

  const { analysis } = view;
  const partial = analysis.quality.partial;
  const unit = { unit: prefs.typingSpeedUnit, decimals: prefs.alwaysShowDecimal };
  const showTime = analysis.slices !== null && !partial;
  const signedIn = isLoaded && isSignedIn === true;
  const compare = preview || !isLoaded ? null : signedIn ? (
    <CompareUsual view={view} accuracy={keystrokeAccuracy(view.input.timings)} unit={unit} />
  ) : (
    <SignInLine />
  );
  const method = methodParagraphs({
    // A partial view's typing time covers only its part, so its flow
    // speed would read far above the run's.
    flowWpm: partial ? null : analysis.flowWpm,
    catchFactor: analysis.pace?.catchFactor ?? null,
    breakMs: analysis.pace?.breakMs ?? 2000,
    fixMode: analysis.mistakes.fixMode,
  });

  return (
    // A direct child of the capture node, so Save image leaves it out
    // and closes the gap it would leave (result-export.ts).
    <div data-no-export="true">
      {/* One region for the whole card; its parts are headed blocks. */}
      <Surface as="section" data-ft-result-card aria-label="Analysis of this test" className="flex flex-col gap-5 p-4 sm:p-5">
        <div
          className={cn(
            "grid items-start gap-6",
            // From lg the time column spans both rows, so the comparison
            // (or the sign-in line) sits under the findings instead of
            // below the taller time column. The DOM order stays findings,
            // time, comparison, so phones and screen readers keep it.
            showTime && "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10",
          )}
        >
          <WhatHappened
            view={view}
            isNewPb={isNewPb}
            previousBest={preview ? undefined : lastPreviousBest}
            practise={!preview && signedIn}
            unit={unit}
          />
          {showTime ? <TimeCard view={view} unit={unit} className="lg:row-span-2" /> : null}
          {compare}
        </div>
        <MethodDisclosure>
          {method.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </MethodDisclosure>
      </Surface>
    </div>
  );
}
