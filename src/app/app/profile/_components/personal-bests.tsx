import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { PersonalBest } from "./derive-stats";

/** MonkeyType-style personal bests. Casual first, then Training (the
 *  user's primary modes are casual; training is the adaptive variant).
 *  Each mode block carries two sub-strips:
 *    - Time mode:  fixed cells 15s · 30s · 60s · 120s
 *    - Words mode: fixed cells 10 · 25 · 50 · 100
 *  Cells without a matching test render as a dashed-border `—` so the
 *  user sees what they haven't attempted yet — same invitational
 *  pattern MT uses on a fresh profile.
 *
 *  Data note: tests are stored with the algorithmic mode + a generic
 *  durationOrWordCount; player intent (TIME vs WORDS) isn't recorded
 *  per-test. Cells lookup against (mode, amount); a stored `(casual,
 *  30)` populates both `Time 30s` and `Words 30` since we can't tell
 *  which the user meant. In practice 15s / 120s are time-only and
 *  10 / 25 / 100 are words-only, so most cells land cleanly on one
 *  side; only `30` and `60` overlap. */
export function PersonalBests({ bests }: { bests: PersonalBest[] }) {
  const lookup = new Map<string, PersonalBest>();
  for (const b of bests) lookup.set(`${b.mode}|${b.amount}`, b);

  return (
    <section className="border-b border-border px-5 py-10 sm:px-16 sm:py-12">
      <div className="mb-7 flex items-center gap-3">
        <span aria-hidden className="inline-block h-px w-5 bg-primary" />
        <Tag>Personal bests</Tag>
      </div>

      <div className="flex flex-col gap-9">
        {MODE_ORDER.map((mode) => (
          <ModeBlock key={mode} mode={mode} lookup={lookup} />
        ))}
      </div>
    </section>
  );
}

const MODE_ORDER = ["casual", "training"] as const;

const TIME_AMOUNTS = [15, 30, 60, 120] as const;
const WORDS_AMOUNTS = [10, 25, 50, 100] as const;

function ModeBlock({
  mode,
  lookup,
}: {
  mode: string;
  lookup: Map<string, PersonalBest>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
        {prettyMode(mode)}
      </span>
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <SubStrip
          label="Time"
          unit="s"
          amounts={TIME_AMOUNTS}
          mode={mode}
          lookup={lookup}
        />
        <SubStrip
          label="Words"
          unit=""
          amounts={WORDS_AMOUNTS}
          mode={mode}
          lookup={lookup}
        />
      </div>
    </div>
  );
}

function SubStrip({
  label,
  unit,
  amounts,
  mode,
  lookup,
}: {
  label: string;
  unit: string;
  amounts: readonly number[];
  mode: string;
  lookup: Map<string, PersonalBest>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <div className="overflow-hidden rounded-md border border-border">
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          {amounts.map((amt) => (
            <BestCell
              key={amt}
              amount={amt}
              unit={unit}
              best={lookup.get(`${mode}|${amt}`) ?? null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BestCell({
  amount,
  unit,
  best,
}: {
  amount: number;
  unit: string;
  best: PersonalBest | null;
}) {
  const empty = best == null;
  return (
    <div
      className={cn(
        "flex flex-col gap-2 px-4 py-5 sm:px-5 sm:py-6",
        empty
          ? "border-dashed bg-card/40 text-muted-foreground"
          : "bg-card",
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <span
          className={cn("tabular-nums", empty ? "" : "text-foreground")}
        >
          {amount}
          {unit}
        </span>
      </span>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono text-[44px] font-bold tabular-nums leading-[0.95] sm:text-[56px]",
            empty ? "text-foreground/25" : "text-primary",
          )}
        >
          {empty ? "—" : Math.round(best.bestWpm)}
        </span>
      </div>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {empty ? (
          <span className="text-muted-foreground/60">no run yet</span>
        ) : (
          <>
            {best.bestAccuracy.toFixed(1)}%{" "}
            <span className="text-muted-foreground/60">acc</span>
          </>
        )}
      </span>
    </div>
  );
}

function prettyMode(mode: string): string {
  if (mode === "training") return "Training";
  if (mode === "casual") return "Casual";
  return mode;
}
