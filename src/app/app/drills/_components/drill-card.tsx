"use client";

import { ChevronRight, Lock, Skull, Zap } from "lucide-react";
import Link from "next/link";
import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { DrillSpec } from "./drills-data";

/** Card variants used by the drills grid. `featured` is the bigger
 *  spotlight card surfaced for the first ready tailored drill;
 *  `compact` is the regular grid card; `lockedRow` is a quiet single-
 *  row affordance for drills that aren't ready yet so they don't
 *  occupy a full card while they wait for data. */

export function FeaturedDrillCard({ drill }: { drill: DrillSpec }) {
  const isSuddenDeath = drill.kind === "sudden-death";
  return (
    <Link
      href={`/app/drills/${drill.id}`}
      className={cn(
        "group relative flex flex-col gap-5 overflow-hidden rounded-md border bg-card p-6 sm:p-8",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSuddenDeath
          ? "border-destructive/30 hover:border-destructive/60"
          : "border-primary/30 hover:border-primary/60",
      )}
    >
      {/* Top accent bar — always visible on the featured card so it
       *  reads as the hero pick instead of a normal card. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px",
          isSuddenDeath ? "bg-destructive" : "bg-primary",
        )}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <KindGlyph kind={drill.kind} size="lg" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Recommended for you
            </span>
            <span
              className={cn(
                "text-[11px] font-medium uppercase tracking-[0.16em]",
                isSuddenDeath ? "text-destructive" : "text-primary",
              )}
            >
              {drill.contextLabel}
            </span>
          </div>
        </div>
        <RuleStrip drill={drill} large />
      </div>

      <h2 className="text-2xl font-bold tracking-[-0.02em] text-foreground sm:text-3xl">
        {drill.title}
      </h2>

      <p className="max-w-3xl text-sm leading-relaxed text-foreground/85 sm:text-base">
        {drill.description}
      </p>
      <p className="max-w-3xl text-[12.5px] leading-relaxed text-muted-foreground">
        {drill.payoff}
      </p>

      <div className="mt-2 flex items-center justify-end">
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em]",
            "transition-colors",
            isSuddenDeath
              ? "bg-destructive text-white group-hover:bg-destructive/90"
              : "bg-primary text-primary-foreground group-hover:bg-primary/90",
          )}
        >
          Start drill
          <ChevronRight size={14} aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export function DrillCard({ drill }: { drill: DrillSpec }) {
  const isSuddenDeath = drill.kind === "sudden-death";
  return (
    <Link
      href={`/app/drills/${drill.id}`}
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-md border bg-card p-5 sm:p-6",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSuddenDeath
          ? "border-border hover:border-destructive/60"
          : "border-border hover:border-primary/60",
      )}
    >
      {/* Hairline accent on hover so the kind reads even before the
       *  user hovers the card. Subtler than the featured card. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100",
          isSuddenDeath ? "bg-destructive" : "bg-primary",
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.18em]",
              isSuddenDeath ? "text-destructive" : "text-primary",
            )}
          >
            {drill.contextLabel}
          </span>
          <h3 className="text-lg font-bold tracking-[-0.01em] text-foreground sm:text-xl">
            {drill.title}
          </h3>
        </div>
        <KindGlyph kind={drill.kind} />
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {drill.description}
      </p>
      <p className="text-[12px] leading-relaxed text-muted-foreground/75">
        {drill.payoff}
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
        <RuleStrip drill={drill} />
        <span
          className={cn(
            "inline-flex items-center gap-1 text-sm font-semibold transition-transform group-hover:translate-x-0.5",
            isSuddenDeath ? "text-destructive" : "text-primary",
          )}
        >
          Start <ChevronRight size={14} />
        </span>
      </div>
    </Link>
  );
}

export function LockedDrillRow({ drill }: { drill: DrillSpec }) {
  return (
    <div
      aria-disabled
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border bg-card/40 px-4 py-3 sm:px-5"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground"
        >
          <Lock size={13} />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">
            {drill.title}
          </span>
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {drill.contextLabel} · waiting on data
          </span>
        </div>
      </div>
      <span className="max-w-md text-[12px] leading-snug text-muted-foreground/85">
        {drill.description}
      </span>
    </div>
  );
}

function KindGlyph({
  kind,
  size = "md",
}: {
  kind: DrillSpec["kind"];
  size?: "md" | "lg";
}) {
  const cls =
    size === "lg"
      ? "h-12 w-12 rounded-md border"
      : "h-9 w-9 rounded-md border";
  if (kind === "sudden-death") {
    return (
      <span
        aria-hidden
        className={cn(
          cls,
          "flex shrink-0 items-center justify-center border-destructive/40 text-destructive",
        )}
      >
        <Skull size={size === "lg" ? 22 : 18} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        cls,
        "flex shrink-0 items-center justify-center border-primary/40 text-primary",
      )}
    >
      <Zap size={size === "lg" ? 22 : 18} />
    </span>
  );
}

function RuleStrip({
  drill,
  large = false,
}: {
  drill: DrillSpec;
  large?: boolean;
}) {
  if (drill.kind === "sudden-death") {
    return (
      <span
        className={cn(
          "font-mono uppercase tracking-[0.14em] text-muted-foreground",
          large ? "text-xs" : "text-[11px]",
        )}
      >
        <span className="text-foreground tabular-nums">
          {drill.words.length}
        </span>{" "}
        words ·{" "}
        <span className="text-destructive">1 mistake = restart</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "font-mono uppercase tracking-[0.14em] text-muted-foreground",
        large ? "text-xs" : "text-[11px]",
      )}
    >
      <span className="text-foreground tabular-nums">
        {drill.items.length}
      </span>{" "}
      items ·{" "}
      <span className="text-foreground tabular-nums">{drill.repsPerItem}×</span>{" "}
      at{" "}
      <span className="text-foreground tabular-nums">{drill.thresholdWpm}</span>{" "}
      wpm
    </span>
  );
}
