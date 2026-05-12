"use client";

import { ChevronRight, Lock, Skull, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DrillSpec } from "./drills-data";

/** Catalog index below the spotlight. Two groups (tailored / generic)
 *  rendered as dense, scannable rows with hairline dividers — no
 *  card chrome, no per-row CTAs that compete with the spotlight's
 *  Start button. The whole row is the click target on a ready drill;
 *  locked drills sit dim and inert in the same row geometry so the
 *  visual rhythm holds. */
export function DrillsIndex({
  tailored,
  generic,
  recommendedId,
  loading,
}: {
  tailored: readonly DrillSpec[];
  generic: readonly DrillSpec[];
  recommendedId: string | null;
  loading: boolean;
}) {
  const total = tailored.length + generic.length;
  return (
    <div className="flex flex-col gap-14">
      <header className="flex items-baseline justify-between gap-4 border-t border-foreground/10 pt-10">
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-10 bg-primary" />
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            Full catalog
          </h2>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {loading ? "—" : `${total} drills`}
        </span>
      </header>

      <IndexGroup
        label="Tailored"
        subtitle="Built from your slowest pairs and words"
        drills={tailored}
        recommendedId={recommendedId}
      />
      <IndexGroup
        label="Generic"
        subtitle="Curated drills that always work"
        drills={generic}
        recommendedId={recommendedId}
      />
    </div>
  );
}

function IndexGroup({
  label,
  subtitle,
  drills,
  recommendedId,
}: {
  label: string;
  subtitle: string;
  drills: readonly DrillSpec[];
  recommendedId: string | null;
}) {
  if (drills.length === 0) return null;
  return (
    <section aria-label={label} className="flex flex-col">
      <header className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
          {label}
        </h3>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {subtitle}
        </p>
      </header>
      <ul className="flex flex-col divide-y divide-foreground/10 border-y border-foreground/10">
        {drills.map((d) => (
          <DrillRow
            key={d.id}
            drill={d}
            recommended={recommendedId === d.id}
          />
        ))}
      </ul>
    </section>
  );
}

function DrillRow({
  drill,
  recommended,
}: {
  drill: DrillSpec;
  recommended: boolean;
}) {
  const isSuddenDeath = drill.kind === "sudden-death";
  const isLocked = !drill.ready;
  const body = (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-4 px-1 py-5 sm:gap-x-6 sm:py-6">
      <RowGlyph
        isSuddenDeath={isSuddenDeath}
        isLocked={isLocked}
        recommended={recommended}
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h4
            className={cn(
              "text-base font-bold tracking-[-0.01em] sm:text-lg",
              isLocked ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {drill.title}
          </h4>
          <RowTag
            recommended={recommended}
            isSuddenDeath={isSuddenDeath}
            isLocked={isLocked}
          />
        </div>
        <p
          className={cn(
            "truncate font-mono text-[11px] uppercase tracking-[0.16em] tabular-nums sm:text-xs",
            isLocked ? "text-muted-foreground/55" : "text-muted-foreground/85",
          )}
        >
          {rowSummary(drill)}
        </p>
      </div>
      <RowAction isLocked={isLocked} recommended={recommended} />
    </div>
  );

  if (isLocked) {
    return (
      <li aria-disabled className="cursor-not-allowed opacity-90">
        {body}
      </li>
    );
  }
  return (
    <li>
      <Link
        href={`/drills/${drill.id}`}
        className={cn(
          "group block transition-colors hover:bg-accent/30 focus-visible:bg-accent/30 focus-visible:outline-none",
          recommended && "bg-primary/[0.035]",
        )}
      >
        {body}
      </Link>
    </li>
  );
}

function RowGlyph({
  isSuddenDeath,
  isLocked,
  recommended,
}: {
  isSuddenDeath: boolean;
  isLocked: boolean;
  recommended: boolean;
}) {
  if (isLocked) {
    return (
      <span
        aria-hidden
        className="flex h-10 w-10 items-center justify-center rounded-md border border-foreground/10 text-muted-foreground/55"
      >
        <Lock size={15} strokeWidth={1.6} />
      </span>
    );
  }
  if (isSuddenDeath) {
    return (
      <span
        aria-hidden
        className="flex h-10 w-10 items-center justify-center rounded-md border border-destructive/30 text-destructive"
      >
        <Skull size={17} strokeWidth={1.6} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-md border",
        recommended
          ? "border-primary/40 bg-primary/5 text-primary"
          : "border-foreground/15 text-foreground/70 group-hover:border-foreground/25",
      )}
    >
      <Zap size={17} strokeWidth={1.6} />
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
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/55">
        Waiting on data
      </span>
    );
  }
  if (recommended) {
    return (
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
        Recommended
      </span>
    );
  }
  if (isSuddenDeath) {
    return (
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-destructive/80">
        1 miss = restart
      </span>
    );
  }
  return null;
}

function RowAction({
  isLocked,
  recommended,
}: {
  isLocked: boolean;
  recommended: boolean;
}) {
  if (isLocked) {
    return (
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/55">
        Locked
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em]",
        "transition-transform group-hover:translate-x-0.5",
        recommended
          ? "text-primary"
          : "text-foreground/65 group-hover:text-foreground",
      )}
    >
      <span className="hidden sm:inline">Start</span>
      <ChevronRight size={14} />
    </span>
  );
}

function rowSummary(drill: DrillSpec): string {
  if (drill.kind === "sudden-death") {
    const n = drill.words.length || "—";
    return `${n} words · zero mistakes`;
  }
  const items =
    drill.tracker === "common-1000" ? 1000 : drill.items.length || "—";
  return `${items} items · ${drill.repsPerItem}× reps · ≥ ${drill.thresholdWpm} wpm`;
}
