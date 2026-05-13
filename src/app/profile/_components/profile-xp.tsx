import { cn } from "@/lib/utils";
import type { ProfileTotals } from "./derive-stats";

const NUM_FMT = new Intl.NumberFormat("en-US");

/** Quiet, bare-bones XP lockup. Sits directly under the hero — same
 *  visual block, no border-rule between them. Three rows:
 *    1. LEVEL N · X xp
 *    2. flat 2px progress bar (no rounded chip)
 *    3. caption: `X / 1,000 to next`
 *
 *  Deliberately unadorned. The old hero embedded a rounded progress
 *  bar with a bigger lockup that fought for attention with the name;
 *  this version reads as a quiet caption beneath the identity block. */
export function ProfileXp({ totals }: { totals: ProfileTotals }) {
  return (
    <div className="mt-6 flex w-full flex-col gap-2 sm:mt-7">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Level{" "}
          <span className="text-foreground tabular-nums">{totals.level}</span>
          <span className="mx-2 text-foreground/30">·</span>
          <span className="text-foreground tabular-nums">
            {NUM_FMT.format(totals.totalXp)}
          </span>{" "}
          xp
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground/80">
          {NUM_FMT.format(totals.xpIntoLevel)} / 1,000
        </span>
      </div>
      <span
        aria-hidden
        className="relative block h-[2px] w-full overflow-hidden bg-foreground/[0.10]"
      >
        <span
          className={cn("absolute inset-y-0 left-0 origin-left bg-primary")}
          style={{
            transform: `scaleX(${totals.levelProgress})`,
            width: "100%",
          }}
        />
      </span>
    </div>
  );
}
