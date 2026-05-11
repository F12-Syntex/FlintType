import { cn } from "@/lib/utils";
import type { PersonalBest } from "./derive-stats";
import { ProfileSection } from "./profile-section";

/** MonkeyType-style personal bests. Casual first, then Training.
 *  Each mode block carries Time + Words sub-strips with fixed
 *  standard amounts (15s/30s/60s/120s and 10/25/50/100). Empty
 *  cells render with `—` so the user sees what they haven't
 *  attempted — same invitational pattern MT uses on a fresh profile.
 *
 *  Sizes follow ui-law §4 stat-xl (text-4xl sm:text-[44px]) — the
 *  marquee numbers are the page's emotional anchor. */
export function PersonalBests({ bests }: { bests: PersonalBest[] }) {
  const lookup = new Map<string, PersonalBest>();
  for (const b of bests) lookup.set(`${b.mode}|${b.amount}`, b);

  return (
    <ProfileSection label="Personal bests">
      <div className="flex flex-col gap-10 sm:gap-12">
        {MODE_ORDER.map((mode) => (
          <ModeBlock key={mode} mode={mode} lookup={lookup} />
        ))}
      </div>
    </ProfileSection>
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
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
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
    <div className="flex flex-col gap-2.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <div className="grid grid-cols-2 divide-x divide-y divide-border/60 sm:grid-cols-4 sm:divide-y-0">
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
  // No bg fill — cells separate via divider hairlines only, matching
  // the un-carded lifetime-totals strip.
  const empty = best == null;
  return (
    <div className="flex flex-col gap-2 px-4 py-5">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
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
            "font-bold tracking-[-0.04em] tabular-nums leading-none text-4xl sm:text-[44px]",
            empty ? "text-foreground/25" : "text-primary",
          )}
        >
          {empty ? "—" : Math.round(best.bestWpm)}
        </span>
      </div>
      <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
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
