import { BudgetTable } from "@/components/analysis/budget-table";
import { MethodDisclosure } from "@/components/analysis/method-disclosure";
import { MinuteBar } from "@/components/analysis/minute-bar";
import { PageSection, Surface } from "@/components/page-shell";
import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { breakClause, fixingClause } from "@/lib/format-figure";
import { formatSpeed } from "@/lib/speed-unit";
import type { TimeSection as TimeData } from "@/types/insights";
import { SLICE_ORDER, type SliceSet } from "@/types/typing-analysis";
import type { TestKind } from "./copy-phrases";
import {
  BETTER_BAR_LABEL,
  COARSE_NOTE,
  flowLine,
  LAST_BAR_LABEL,
  NOT_READY_LINE,
  RECENT_BAR_LABEL,
  TIME_LEARNING_DESCRIPTION,
  TIME_TITLE,
  timeDescription,
  timeLearningLine,
  timeMethod,
  whatIfLine,
} from "./insights-copy";
import { DashedNote } from "./dashed-note";
import {
  COLUMN_BETTER,
  COLUMN_LAST,
  COLUMN_RECENT,
  LAST_BREAK_CLAUSE,
  LAST_FIXING_CLAUSE,
  MINUTE_TICKS as TICKS,
} from "./labels-copy";

/** "0 s", "30 s" and "60 s" under the bars (the bar's own `ends` takes two). */
function MinuteTicks() {
  return (
    <div aria-hidden className="relative h-4 text-xs tabular-nums text-muted-foreground">
      <span className="absolute left-0">{TICKS[0]}</span>
      <span className="absolute left-1/2 -translate-x-1/2">{TICKS[1]}</span>
      <span className="absolute right-0">{TICKS[2]}</span>
    </div>
  );
}
const rowsOf = (...sets: SliceSet[]) => SLICE_ORDER.map((key) => ({ key, values: sets.map((s) => s[key]) }));

/** "Where your time goes" (spec-40 §3.2): a typical recent minute beside
 *  a minute of your better days, on one 0 to 60 s scale, with the table
 *  that is their accessible twin. The slice the next step targets is the
 *  page's one orange data mark, on the recent bar only. */
export function TimeSection({
  time,
  kind,
  unit,
  usual,
}: {
  time: TimeData;
  kind: TestKind;
  unit: TypingSpeedUnit;
  /** The headline usual speed, for the flow line's "worth saying" check. */
  usual: number;
}) {
  if (time.status === "not-ready") {
    return (
      <PageSection id="time" title={TIME_TITLE}>
        <p className="text-sm text-muted-foreground">{NOT_READY_LINE}</p>
      </PageSection>
    );
  }
  if (time.status === "learning") {
    const line = timeLearningLine(time.gate, kind);
    if (!time.last) {
      return (
        <PageSection id="time" title={TIME_TITLE}>
          <DashedNote>{line}</DashedNote>
        </PageSection>
      );
    }
    return (
      <PageSection id="time" title={TIME_TITLE} description={TIME_LEARNING_DESCRIPTION}>
        <Surface className="flex flex-col gap-5 p-4 sm:p-5">
          <div className="flex flex-col gap-1.5">
            <MinuteBar slices={time.last} total={60} label={LAST_BAR_LABEL} />
            <MinuteTicks />
          </div>
          <BudgetTable
            rows={rowsOf(time.last)}
            columns={[COLUMN_LAST]}
            unit="perMinute"
            breakClause={LAST_BREAK_CLAUSE}
            fixingClause={LAST_FIXING_CLAUSE}
          />
          <p className="text-sm text-muted-foreground">{line}</p>
        </Surface>
      </PageSection>
    );
  }

  const showFlow = time.flowWpm !== null && Math.round(time.flowWpm) >= Math.round(usual) + 3;
  // Same rounding as the copy, so the line never reads "about 72" over 72.
  const showWhatIf = time.whatIf !== null && formatSpeed(time.whatIf.low, unit) !== formatSpeed(usual, unit);
  return (
    <PageSection id="time" title={TIME_TITLE} description={timeDescription(time.tests, kind)}>
      <Surface className="flex flex-col gap-5 p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <MinuteBar slices={time.recent} total={60} focus={time.focus} label={RECENT_BAR_LABEL} />
          <div className="flex flex-col gap-1.5">
            <MinuteBar slices={time.better} total={60} label={BETTER_BAR_LABEL} />
            <MinuteTicks />
          </div>
        </div>
        <BudgetTable
          rows={rowsOf(time.recent, time.better)}
          columns={[COLUMN_RECENT, COLUMN_BETTER]}
          focus={time.focus}
          unit="perMinute"
          breakClause={breakClause(time.breakMs)}
          fixingClause={fixingClause(time.fixMode)}
        />
        {showFlow || showWhatIf || time.coarse ? (
          <div className="flex flex-col gap-1.5">
            {showFlow ? <p className="text-sm text-foreground">{flowLine(time.flowWpm!, unit)}</p> : null}
            {showWhatIf ? <p className="text-sm text-foreground">{whatIfLine(time.whatIf!, unit)}</p> : null}
            {time.coarse ? <p className="text-xs text-muted-foreground">{COARSE_NOTE}</p> : null}
          </div>
        ) : null}
        <MethodDisclosure>
          {timeMethod({ keysPerSecond: time.keysPerSecond, catchFactor: time.catchFactor, tests: time.tests, kind }).map(
            (p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ),
          )}
        </MethodDisclosure>
      </Surface>
    </PageSection>
  );
}
