"use client";

import { ChevronRight, Lock, Skull, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DrillSpec } from "./drills-data";

/** Card variants used by the drills grid. `featured` is the bigger
 *  spotlight surfaced for the first ready tailored drill; `compact`
 *  is the regular grid card; `lockedRow` is a quiet single-row
 *  affordance for drills that aren't ready yet so they don't occupy
 *  a full card while they wait for data.
 *
 *  The footer "rule strip" — count, reps, threshold WPM — is laid
 *  out as small bordered stat chips instead of inline text so that
 *  big values (e.g. 100 items, 70 wpm) wrap cleanly under the title
 *  without colliding with the CTA. Mobile keeps every chip on one
 *  row via flex-wrap; lg+ everything sits inline. */

export function FeaturedDrillCard({ drill }: { drill: DrillSpec }) {
  const isSuddenDeath = drill.kind === "sudden-death";
  return (
    <Link
      href={`/drills/${drill.id}`}
      className={cn(
        "group relative flex flex-col gap-5 overflow-hidden rounded-md border bg-card p-6 sm:p-8",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSuddenDeath
          ? "border-destructive/30 hover:border-destructive/60"
          : "border-primary/30 hover:border-primary/60",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px",
          isSuddenDeath ? "bg-destructive" : "bg-primary",
        )}
      />
      <div className="flex items-start gap-3">
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

      <h2 className="text-2xl font-bold tracking-[-0.02em] text-foreground sm:text-3xl">
        {drill.title}
      </h2>

      <p className="max-w-3xl text-sm leading-relaxed text-foreground/85 sm:text-base">
        {drill.description}
      </p>
      <p className="max-w-3xl text-[12.5px] leading-relaxed text-muted-foreground">
        {drill.payoff}
      </p>

      <RuleChips drill={drill} large />

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
      href={`/drills/${drill.id}`}
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-md border bg-card p-5 sm:p-6",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSuddenDeath
          ? "border-border hover:border-destructive/60"
          : "border-border hover:border-primary/60",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100",
          isSuddenDeath ? "bg-destructive" : "bg-primary",
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
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

      <RuleChips drill={drill} />

      <div className="mt-auto flex items-center justify-end pt-1">
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
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground"
        >
          <Lock size={13} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold text-foreground">
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

/** Compact stat chips that summarise the drill's rules. Each chip
 *  is `eyebrow over value`, same shape across burst + sudden-death
 *  so the row reads consistently. flex-wraps cleanly at narrow
 *  viewports so big numbers can't push into the CTA. */
function RuleChips({
  drill,
  large = false,
}: {
  drill: DrillSpec;
  large?: boolean;
}) {
  const isSuddenDeath = drill.kind === "sudden-death";
  const chips: { label: string; value: string; accent?: boolean }[] = [];
  if (isSuddenDeath) {
    chips.push({ label: "Words", value: String(drill.words.length) });
    chips.push({
      label: "Rule",
      value: "1 miss = restart",
      accent: true,
    });
  } else {
    chips.push({ label: "Items", value: String(drill.items.length) });
    chips.push({ label: "Reps", value: `${drill.repsPerItem}×` });
    chips.push({
      label: "Threshold",
      value: `${drill.thresholdWpm} wpm`,
      accent: true,
    });
  }
  return (
    <ul
      className={cn(
        "flex flex-wrap gap-2",
        large ? "gap-2.5" : "gap-2",
      )}
    >
      {chips.map((c) => (
        <li
          key={c.label}
          className={cn(
            "inline-flex items-baseline gap-1.5 rounded-md border bg-background/60 px-2.5 py-1",
            large ? "py-1.5" : "py-1",
            c.accent
              ? isSuddenDeath
                ? "border-destructive/30"
                : "border-primary/30"
              : "border-border",
          )}
        >
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {c.label}
          </span>
          <span
            className={cn(
              "font-mono tabular-nums",
              large ? "text-[12.5px]" : "text-[11.5px]",
              c.accent
                ? isSuddenDeath
                  ? "text-destructive"
                  : "text-primary"
                : "text-foreground",
            )}
          >
            {c.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
