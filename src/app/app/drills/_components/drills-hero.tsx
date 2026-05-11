import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";

/** Editorial drills page hero — eyebrow + 2-line lockup on the left,
 *  ready/locked/generic stat strip on the right. The strip turns muted
 *  while the snapshot is loading so the chrome stays settled instead
 *  of flashing zero counts then jumping. */
export function DrillsHero({
  tailoredReady,
  tailoredLocked,
  genericReady,
  loading,
  cold,
}: {
  tailoredReady: number;
  tailoredLocked: number;
  genericReady: number;
  loading: boolean;
  cold: boolean;
}) {
  return (
    <header className="border-b border-border px-5 pt-12 pb-10 sm:px-16 sm:pt-14 sm:pb-12">
      <div className="mb-5 flex items-center gap-3">
        <span aria-hidden className="inline-block h-px w-7 bg-primary" />
        <Tag>Focused practice · minigames</Tag>
      </div>

      <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-12">
        <div className="flex flex-col gap-4">
          <h1 className="font-bold tracking-[-0.02em] text-foreground text-[28px] leading-[1.05] sm:text-[44px] lg:text-[56px]">
            Drills.
            <br />
            <span className="text-foreground/55">Targeted reps.</span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Short, focused mini-games tuned to the data the algorithm has
            on you. Each drill opens at its own URL — bookmark, link to
            one, or chain them as a warm-up.
            {cold ? (
              <>
                {" "}
                <span className="text-foreground/70">
                  Tailored drills unlock once we&apos;ve seen enough of
                  your typing.
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex shrink-0 items-stretch divide-x divide-border border-y border-border">
          <StatCell
            label="Tailored"
            value={loading ? "…" : tailoredReady.toString()}
            trailing={
              tailoredLocked > 0 && !loading ? (
                <span className="text-muted-foreground/70">
                  +{tailoredLocked} locked
                </span>
              ) : null
            }
            accent
          />
          <StatCell
            label="Generic"
            value={loading ? "…" : genericReady.toString()}
          />
        </div>
      </div>
    </header>
  );
}

function StatCell({
  label,
  value,
  trailing,
  accent,
}: {
  label: string;
  value: string;
  trailing?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex min-w-[7rem] flex-col gap-1.5 px-5 py-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-3xl font-bold tabular-nums leading-none",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
      {trailing ? (
        <span className="text-[10px] font-medium uppercase tracking-[0.16em]">
          {trailing}
        </span>
      ) : null}
    </div>
  );
}
