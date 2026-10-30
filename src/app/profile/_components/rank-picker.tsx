"use client";

import { cn } from "@/lib/utils";
import { RANK_IDS, RANKS, rankFromWpm, type RankId } from "@/types/rank";

/** The rank flair picker in Edit profile: a wrap of pill chips (None +
 *  every tier). The selected chip is the filled flame pill. Free
 *  choice; the caption only *suggests* the tier the best WPM maps to. */
export function RankPicker({
  selected,
  bestWpm,
  onPick,
}: {
  selected: RankId | null;
  bestWpm: number;
  onPick: (next: RankId | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-foreground">Your rank</span>
        <span className="text-xs text-muted-foreground">
          {selected ? RANKS[selected].label : "None"}
        </span>
      </div>
      <p className="text-xs leading-snug text-muted-foreground">
        A flame badge beside your name. Wear any tier you like.
        {bestWpm > 0
          ? ` Your best maps to ${RANKS[rankFromWpm(bestWpm)].label}.`
          : ""}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <RankChip
          label="None"
          active={selected == null}
          onClick={() => onPick(null)}
        />
        {RANK_IDS.map((id) => (
          <RankChip
            key={id}
            label={RANKS[id].label}
            active={selected === id}
            onClick={() => onPick(id)}
          />
        ))}
      </div>
    </div>
  );
}

function RankChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-11 items-center rounded-pill px-3.5 text-xs font-medium transition-[color,background-color,box-shadow] duration-200 sm:h-8 sm:px-3",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "brand-surface font-semibold text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
