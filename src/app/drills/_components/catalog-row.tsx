"use client";

import { ChevronRight, Lock, Skull, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DrillSpec } from "./drills-data";

/** One row in the drills catalog. Replaces the old DrillCard /
 *  FeaturedDrillCard / LockedDrillRow trio with a single dense shape:
 *  glyph + title + tag, content excerpt in mono, spec strip, optional
 *  Start affordance. Ready rows render as `<Link>` and the whole row
 *  is the hit target; locked rows render as a dimmed `<div>` with no
 *  CTA. Only the recommended row carries the primary accent so the
 *  brand spark stays load-bearing instead of being repeated 6× across
 *  identical cards. */
export function CatalogRow({
  drill,
  recommended,
}: {
  drill: DrillSpec;
  recommended: boolean;
}) {
  const isSuddenDeath = drill.kind === "sudden-death";
  const isLocked = !drill.ready;

  const body = (
    <div className="flex w-full items-start gap-3 px-4 py-5 sm:gap-5 sm:px-6">
      <Glyph
        isSuddenDeath={isSuddenDeath}
        isLocked={isLocked}
        recommended={recommended}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3
            className={cn(
              "text-base font-bold tracking-[-0.01em] sm:text-lg",
              isLocked ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {drill.title}
          </h3>
          <RowTag
            recommended={recommended}
            isSuddenDeath={isSuddenDeath}
            isLocked={isLocked}
          />
        </div>
        <p
          className={cn(
            "truncate font-mono text-xs tabular-nums sm:text-[13px]",
            isLocked ? "text-muted-foreground/60" : "text-muted-foreground",
          )}
        >
          {buildExcerpt(drill)}
        </p>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
          {buildSpec(drill)}
        </p>
      </div>
      {!isLocked ? (
        <span
          aria-hidden
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 self-center font-mono text-[11px] font-semibold uppercase tracking-[0.18em]",
            "transition-transform group-hover:translate-x-0.5",
            recommended
              ? "text-primary"
              : "text-foreground/70 group-hover:text-foreground",
          )}
        >
          <span className="hidden sm:inline">Start</span>
          <ChevronRight size={14} />
        </span>
      ) : null}
    </div>
  );

  if (isLocked) {
    return (
      <div className="border-b border-foreground/10 bg-card/30 last:border-b-0">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/drills/${drill.id}`}
      className={cn(
        "group block border-b border-foreground/10 last:border-b-0",
        "transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none",
        recommended && "bg-primary/[0.04]",
      )}
    >
      {body}
    </Link>
  );
}

function Glyph({
  isSuddenDeath,
  isLocked,
  recommended,
}: {
  isSuddenDeath: boolean;
  isLocked: boolean;
  recommended: boolean;
}) {
  const cls =
    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border";
  if (isLocked) {
    return (
      <span
        aria-hidden
        className={cn(cls, "border-foreground/10 text-muted-foreground/60")}
      >
        <Lock size={15} />
      </span>
    );
  }
  if (isSuddenDeath) {
    return (
      <span
        aria-hidden
        className={cn(cls, "border-destructive/30 text-destructive")}
      >
        <Skull size={16} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        cls,
        recommended
          ? "border-primary/40 bg-primary/5 text-primary"
          : "border-foreground/15 text-foreground/70",
      )}
    >
      <Zap size={16} />
    </span>
  );
}

function RowTag({
  recommended,
  isSuddenDeath,
  isLocked,
}: {
  recommended: boolean;
  isSuddenDeath: boolean;
  isLocked: boolean;
}) {
  if (isLocked) {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        Locked · waiting on data
      </span>
    );
  }
  if (recommended) {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
        Recommended
      </span>
    );
  }
  if (isSuddenDeath) {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-destructive/85">
        1 miss = restart
      </span>
    );
  }
  return null;
}

/** A short mono-typeset preview of what the user will see on the
 *  drill screen. Burst drills with items show the first 6, joined by
 *  middle-dots; sudden-death shows the first words the same way;
 *  pangram drills show the first sentence truncated. burst-1000 is a
 *  tracker (items array is empty at build time) so we hard-code a
 *  representative tail to keep the row honest. */
function buildExcerpt(drill: DrillSpec): string {
  if (drill.kind === "sudden-death") {
    const sample = drill.words.slice(0, 6);
    if (sample.length === 0) return "—";
    return `${sample.join(" · ")}${drill.words.length > sample.length ? " · …" : ""}`;
  }
  if (drill.tracker === "common-1000") {
    return "the · of · and · to · a · in · …";
  }
  if (drill.items.length === 0) return "—";
  const looksLikeSentence = drill.items[0]!.includes(" ");
  if (looksLikeSentence) {
    const first = drill.items[0]!;
    return first.length > 60 ? `${first.slice(0, 56)}…` : `${first} …`;
  }
  const sample = drill.items.slice(0, 6);
  return `${sample.join(" · ")}${drill.items.length > sample.length ? " · …" : ""}`;
}

function buildSpec(drill: DrillSpec): string {
  if (drill.kind === "sudden-death") {
    const n = drill.words.length || "—";
    return `${n} words · 1 miss restart`;
  }
  const reps = `${drill.repsPerItem}× reps`;
  const threshold = `≥ ${drill.thresholdWpm} wpm`;
  if (drill.tracker === "common-1000") {
    return `1000 items · ${reps} · ${threshold}`;
  }
  return `${drill.items.length || "—"} items · ${reps} · ${threshold}`;
}
