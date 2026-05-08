"use client";

import { ChevronRight, Skull, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Tag } from "@/components/ft";
import { Button } from "@/components/ui/button";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import type { HistorySummaryOutput } from "@/types/history";
import { BurstGame } from "./burst-game";
import { buildDrills, type DrillSpec } from "./drills-data";
import { SuddenDeath } from "./sudden-death";

/** Drills page — picker on entry, runs the chosen drill in-place
 *  via the kind-specific engine. Each engine renders its own header
 *  and exit affordance, so this view's job is just data fetching,
 *  list layout, and routing the active drill to the right runner. */
export function DrillsView() {
  const backend = useBackend();
  const [snapshot, setSnapshot] = useState<HistorySummaryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<DrillSpec | null>(null);

  useEffect(() => {
    let cancelled = false;
    backend.history
      .summary()
      .then((r) => {
        if (cancelled) return;
        setSnapshot(r);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
          setError("Sign in to load your weakness data.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to load drills.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  // Build drills once per data load — generators bake in word
  // selections so the same drill instance plays consistently across
  // restarts within a single mount.
  const drills = useMemo<DrillSpec[]>(() => {
    return buildDrills({
      weakestPairs: snapshot?.weakestPairs ?? [],
      weakestTrigrams: snapshot?.weakestTrigrams ?? [],
      cold: snapshot?.cold ?? false,
      seed: Date.now(),
    });
  }, [snapshot]);

  if (active) {
    return <DrillRunner drill={active} onExit={() => setActive(null)} />;
  }

  return (
    <>
      <Hero />
      <section className="px-5 py-8 pb-14 sm:px-16">
        {loading ? (
          <p className="text-sm text-muted-foreground">Reading your model…</p>
        ) : error ? (
          <p className="text-sm text-primary">{error}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {drills.map((d) => (
              <DrillCard
                key={d.id}
                drill={d}
                onStart={() => setActive(d)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Hero() {
  return (
    <section className="border-b border-foreground/10 px-5 pt-12 pb-8 sm:px-16">
      <div className="mb-5 flex items-center gap-3.5">
        <span className="inline-block h-px w-7 bg-primary" aria-hidden />
        <Tag>FOCUSED PRACTICE · MINIGAMES</Tag>
      </div>
      <h1 className="m-0 max-w-4xl text-3xl leading-tight font-extrabold tracking-[-0.03em] sm:text-4xl lg:text-5xl">
        Drills
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Short, focused mini-games tuned to your typing data. Each drill
        has its own rules — sudden death, burst rhythm, trigram
        precision — so the practice surface stays distinct from a
        regular session. Five minutes a day on the right drill
        outperforms an hour on random words.
      </p>
    </section>
  );
}

// ─── card ─────────────────────────────────────────────────────────

function DrillCard({
  drill,
  onStart,
}: {
  drill: DrillSpec;
  onStart: () => void;
}) {
  const ready = drill.ready;
  const flavour = drillFlavour(drill);
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={!ready}
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden border bg-card p-6 text-left transition-all",
        ready
          ? "border-foreground/10 hover:border-primary/60 hover:shadow-[0_0_0_1px_var(--primary)] focus-visible:border-primary focus-visible:outline-none"
          : "cursor-not-allowed border-foreground/10 opacity-60",
      )}
    >
      {/* Subtle accent bar in the top-right that paints the drill's
       *  flavour — sudden-death = destructive tint, burst = primary. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-px right-6 h-1 w-12",
          flavour === "sudden-death" ? "bg-destructive" : "bg-primary",
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Tag>{drill.contextLabel}</Tag>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {drill.title}
          </h2>
        </div>
        <FlavourGlyph flavour={flavour} />
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {drill.description}
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground/80">
        {drill.payoff}
      </p>
      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
        <RuleStrip drill={drill} />
        {ready ? (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
            Start <ChevronRight size={14} />
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Need more data
          </span>
        )}
      </div>
    </button>
  );
}

function FlavourGlyph({ flavour }: { flavour: "sudden-death" | "burst" }) {
  return flavour === "sudden-death" ? (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-destructive/40 text-destructive"
    >
      <Skull size={18} />
    </span>
  ) : (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/40 text-primary"
    >
      <Zap size={18} />
    </span>
  );
}

function RuleStrip({ drill }: { drill: DrillSpec }) {
  // Per-kind "rule" line that summarises the mechanic: tells the
  // user what they're signing up for before they hit Start.
  if (drill.kind === "sudden-death") {
    return (
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {drill.words.length} words · 1 mistake = restart
      </span>
    );
  }
  return (
    <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
      {drill.items.length} items · {drill.repsPerItem}× at {drill.thresholdWpm} wpm
    </span>
  );
}

function drillFlavour(drill: DrillSpec): "sudden-death" | "burst" {
  return drill.kind === "sudden-death" ? "sudden-death" : "burst";
}

// ─── runner ───────────────────────────────────────────────────────

function DrillRunner({
  drill,
  onExit,
}: {
  drill: DrillSpec;
  onExit: () => void;
}) {
  if (drill.kind === "sudden-death") {
    return (
      <SuddenDeath
        key={drill.id}
        title={drill.title}
        subtitle={drill.contextLabel}
        words={drill.words}
        onExit={onExit}
      />
    );
  }
  return (
    <BurstGame
      key={drill.id}
      title={drill.title}
      subtitle={drill.contextLabel}
      items={drill.items}
      thresholdWpm={drill.thresholdWpm}
      repsPerItem={drill.repsPerItem}
      onExit={onExit}
    />
  );
}
