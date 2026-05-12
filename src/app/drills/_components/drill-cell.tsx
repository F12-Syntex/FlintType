"use client";

import { ChevronRight, Lock, Skull, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DrillSpec } from "./drills-data";

/** One drill rendered as a bento cell. Sits inside <DrillBento> on
 *  a hairline grid. No card chrome — the cell paints with
 *  bg-background and the grid wrapper paints the borders via a 1px
 *  gap. Ready drills are <Link>s with a soft hover tint; locked
 *  drills are inert <div>s in the same geometry so the rhythm holds. */
export function DrillCell({
  drill,
  recommended,
}: {
  drill: DrillSpec;
  recommended: boolean;
}) {
  const isSuddenDeath = drill.kind === "sudden-death";
  const isLocked = !drill.ready;
  const body = (
    <div className="flex h-full min-h-[180px] flex-col gap-3 p-6 sm:p-7">
      <Eyebrow drill={drill} isLocked={isLocked} recommended={recommended} />
      <div className="flex items-start justify-between gap-3">
        <h3
          className={cn(
            "text-[22px] font-bold tracking-[-0.015em] leading-[1.15] sm:text-[26px]",
            isLocked ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {drill.title}
        </h3>
        <KindGlyph isSuddenDeath={isSuddenDeath} isLocked={isLocked} recommended={recommended} />
      </div>
      <p
        className={cn(
          "flex-1 text-[13px] leading-relaxed",
          isLocked ? "text-muted-foreground/65" : "text-muted-foreground",
        )}
      >
        {cellDescription(drill)}
      </p>
      <CellFooter drill={drill} isLocked={isLocked} recommended={recommended} />
    </div>
  );

  if (isLocked) {
    return (
      <div
        aria-disabled
        className={cn(
          "bg-background",
          recommended && "bg-primary/[0.04]",
        )}
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/drills/${drill.id}`}
      className={cn(
        "group block bg-background transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none",
        recommended && "bg-primary/[0.05] hover:bg-primary/[0.08]",
      )}
    >
      {body}
    </Link>
  );
}

function Eyebrow({
  drill,
  isLocked,
  recommended,
}: {
  drill: DrillSpec;
  isLocked: boolean;
  recommended: boolean;
}) {
  const isSuddenDeath = drill.kind === "sudden-death";
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <span
        aria-hidden
        className={cn(
          "inline-block h-px w-4",
          isLocked
            ? "bg-foreground/20"
            : isSuddenDeath
              ? "bg-destructive"
              : recommended
                ? "bg-primary"
                : "bg-foreground/30",
        )}
      />
      <span
        className={cn(
          "font-mono text-[10px] font-semibold uppercase tracking-[0.22em]",
          isLocked
            ? "text-muted-foreground/70"
            : isSuddenDeath
              ? "text-destructive"
              : recommended
                ? "text-primary"
                : "text-muted-foreground",
        )}
      >
        {drill.contextLabel}
      </span>
      {recommended && !isLocked ? (
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
          · Recommended
        </span>
      ) : null}
      {isLocked ? (
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
          · Locked
        </span>
      ) : null}
    </div>
  );
}

function KindGlyph({
  isSuddenDeath,
  isLocked,
  recommended,
}: {
  isSuddenDeath: boolean;
  isLocked: boolean;
  recommended: boolean;
}) {
  const base =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border";
  if (isLocked) {
    return (
      <span
        aria-hidden
        className={cn(base, "border-foreground/10 text-muted-foreground/55")}
      >
        <Lock size={14} strokeWidth={1.6} />
      </span>
    );
  }
  if (isSuddenDeath) {
    return (
      <span
        aria-hidden
        className={cn(base, "border-destructive/30 text-destructive")}
      >
        <Skull size={15} strokeWidth={1.6} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        base,
        recommended
          ? "border-primary/35 bg-primary/10 text-primary"
          : "border-foreground/15 text-foreground/70",
      )}
    >
      <Zap size={15} strokeWidth={1.6} />
    </span>
  );
}

function CellFooter({
  drill,
  isLocked,
  recommended,
}: {
  drill: DrillSpec;
  isLocked: boolean;
  recommended: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <p
        className={cn(
          "truncate font-mono text-[10.5px] uppercase tracking-[0.18em] tabular-nums",
          isLocked ? "text-muted-foreground/55" : "text-muted-foreground/85",
        )}
      >
        {cellSpec(drill)}
      </p>
      {isLocked ? (
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/55">
          Waiting on data
        </span>
      ) : (
        <span
          aria-hidden
          className={cn(
            "inline-flex items-center gap-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em]",
            "transition-transform group-hover:translate-x-0.5",
            recommended
              ? "text-primary"
              : "text-foreground/70 group-hover:text-foreground",
          )}
        >
          Start
          <ChevronRight size={13} />
        </span>
      )}
    </div>
  );
}

function cellDescription(drill: DrillSpec): string {
  if (!drill.ready) {
    if (drill.kind === "sudden-death") {
      return "Surfaces once your model has enough signal to pick out the bigrams worth gauntletting.";
    }
    return "Surfaces once your model has logged enough completions to find the words you stall on.";
  }
  return drill.payoff;
}

function cellSpec(drill: DrillSpec): string {
  if (drill.kind === "sudden-death") {
    const n = drill.words.length || "—";
    return `${n} words · zero mistakes`;
  }
  const items =
    drill.tracker === "common-1000" ? 1000 : drill.items.length || "—";
  return `${items} items · ${drill.repsPerItem}× · ≥ ${drill.thresholdWpm} wpm`;
}
