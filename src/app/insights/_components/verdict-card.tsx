import { RangeTrack } from "@/components/analysis/range-track";
import { TrendWord } from "@/components/analysis/trend-word";
import { Surface } from "@/components/page-shell";
import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { speed } from "@/lib/format-figure";
import { formatSpeed, SPEED_UNIT_LABEL } from "@/lib/speed-unit";
import type { NextStep, SpeedHeadline } from "@/types/insights";
import type { TestKind } from "./copy-phrases";
import { ADAPT_NOTE, READY_TESTS } from "./insights-copy";
import { NextStepPanel } from "./next-step-panel";
import { TREND_WORD, trendSentence } from "./next-step-copy";
import { rangeSentence, rangeTrackLabel, speedLabel } from "./verdict-copy";

/** The top of the page (spec-40 §3.1): how you're doing on the left,
 *  what to do next on the right. One Surface, split in two from md; on
 *  phones the next step sits under a hairline. The hero speed is ink:
 *  the orange belongs to the action. */
export function VerdictCard({
  headline,
  nextStep,
  analysed,
  tests,
  kind,
  unit,
  nowMs,
}: {
  headline: SpeedHeadline;
  nextStep: NextStep;
  /** False in the not-ready state: no pause or fix was measured. */
  analysed: boolean;
  tests: number;
  kind: TestKind;
  unit: TypingSpeedUnit;
  nowMs: number;
}) {
  const ready = tests >= READY_TESTS && headline.range !== null;
  const hero = ready ? headline.usual : headline.last;
  return (
    <Surface className="grid overflow-hidden md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">{speedLabel(ready)}</p>
          <p className="flex items-baseline gap-2 text-foreground">
            <span className="text-5xl font-bold tracking-[-0.03em]">{formatSpeed(hero, unit)}</span>
            <span className="text-xl font-semibold text-muted-foreground">{SPEED_UNIT_LABEL[unit]}</span>
          </p>
        </div>
        {ready && headline.range ? (
          <RangeTrack
            low={headline.range.low}
            high={headline.range.high}
            value={headline.last}
            format={(n) => speed(n, unit)}
            label={rangeTrackLabel(headline, unit)}
            className="max-w-sm"
          />
        ) : null}
        <p className="text-sm leading-relaxed text-foreground">{rangeSentence(headline, unit, kind, tests)}</p>
        {ready ? (
          <TrendWord
            state={headline.trend.state}
            word={TREND_WORD[headline.trend.state]}
            sentence={trendSentence(headline, unit, kind, nowMs)}
          />
        ) : null}
        {/* On phones the note waits under the chart (with its disclosure),
            so the next step stays near the top of the page. */}
        {ready && headline.adjusted ? (
          <p className="hidden text-xs leading-relaxed text-muted-foreground md:block">{ADAPT_NOTE}</p>
        ) : null}
      </div>
      <NextStepPanel step={nextStep} analysed={analysed} kind={kind} unit={unit} />
    </Surface>
  );
}
