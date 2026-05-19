"use client";

import { ArrowUpRight, Lock, Skull, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DrillSpec } from "./drills-data";

/** A single drill rendered as a discrete card. Same width across the
 *  grid, same `min-h-[14rem]` floor so the rhythm is even regardless
 *  of how long any individual title or description runs. Ready drills
 *  are `<Link>`s with a subtle hover lift; locked drills are inert
 *  containers in the same geometry so the grid stays uniform.
 *
 *  Recommended drills get a primary-tinted border and a small primary
 *  pip in the top-right; locked drills get a muted border and a lock
 *  glyph. Everything else reads as a neutral card on bg-card. */
export function DrillCell({
  drill,
  recommended,
}: {
  drill: DrillSpec;
  recommended: boolean;
}) {
  const isSuddenDeath = drill.kind === "sudden-death";
  const isLocked = !drill.ready;

  const surfaceClass = cn(
    "group flex h-full min-h-[14rem] flex-col gap-4 rounded-md border p-5 transition-all sm:p-6",
    isLocked
      ? "border-border/80 bg-card/60"
      : recommended
        ? "border-primary/40 bg-card hover:-translate-y-px hover:border-primary/60 hover:bg-card"
        : "border-border bg-card hover:-translate-y-px hover:border-foreground/25",
  );

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <KindBadge
          isSuddenDeath={isSuddenDeath}
          isLocked={isLocked}
          recommended={recommended}
          label={drill.contextLabel}
        />
        <StatusPip
          isLocked={isLocked}
          recommended={recommended}
        />
      </div>

      <h3
        className={cn(
          "text-[20px] font-semibold leading-[1.2] tracking-[-0.01em] sm:text-[22px]",
          isLocked ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {drill.title}
      </h3>

      <p
        className={cn(
          "flex-1 text-[13px] leading-relaxed",
          isLocked ? "text-muted-foreground/65" : "text-muted-foreground",
        )}
      >
        {cellDescription(drill)}
      </p>

      <CellFooter
        drill={drill}
        isLocked={isLocked}
        recommended={recommended}
      />
    </>
  );

  if (isLocked) {
    return (
      <div aria-disabled className={surfaceClass}>
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/drills/${drill.id}`}
      className={cn(surfaceClass, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40")}
    >
      {body}
    </Link>
  );
}

/** Top-left kind badge: tinted icon + short label. Replaces the
 *  hairline-tick eyebrow — this reads cleaner and gives the kind
 *  identity a visual anchor instead of a typographic one. */
function KindBadge({
  isSuddenDeath,
  isLocked,
  recommended,
  label,
}: {
  isSuddenDeath: boolean;
  isLocked: boolean;
  recommended: boolean;
  label: string;
}) {
  const Glyph = isLocked ? Lock : isSuddenDeath ? Skull : Zap;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em]",
        isLocked
          ? "bg-muted text-muted-foreground"
          : isSuddenDeath
            ? "bg-destructive/10 text-destructive"
            : recommended
              ? "bg-primary/12 text-primary"
              : "bg-muted text-muted-foreground",
      )}
    >
      <Glyph size={13} strokeWidth={2} aria-hidden />
      {label}
    </span>
  );
}

/** Tiny status pip in the top-right — primary dot when this is the
 *  recommended drill, nothing otherwise (locked already reads as
 *  locked via the muted treatment everywhere else). */
function StatusPip({
  isLocked,
  recommended,
}: {
  isLocked: boolean;
  recommended: boolean;
}) {
  if (isLocked) {
    return (
      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
        Locked
      </span>
    );
  }
  if (!recommended) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
      <span aria-hidden className="size-1.5 rounded-full bg-primary" />
      Recommended
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
    <div className="flex items-end justify-between gap-3 pt-1">
      <p
        className={cn(
          "truncate text-[11px] tabular-nums",
          isLocked ? "text-muted-foreground/55" : "text-muted-foreground/85",
        )}
      >
        {cellSpec(drill)}
      </p>
      {isLocked ? (
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/55">
          Waiting on data
        </span>
      ) : (
        <span
          aria-hidden
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition-transform",
            "group-hover:translate-x-0.5",
            recommended
              ? "text-primary"
              : "text-foreground/70 group-hover:text-foreground",
          )}
        >
          Start
          <ArrowUpRight size={13} strokeWidth={2.25} />
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
