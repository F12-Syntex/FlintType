"use client";

import { ChevronRight, Lock, Skull, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Tag } from "@/components/ft";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import type { HistorySummaryOutput } from "@/types/history";
import {
  buildDrills,
  type DrillCategory,
  type DrillSpec,
} from "./drills-data";

/** Drills picker page — every card is a Link to `/app/drills/<id>`.
 *  The runners themselves live as their own routes; this view's only
 *  job is fetching the user snapshot, building the catalog, and
 *  laying out the cards in two groups (tailored / generic). Locked
 *  drills render as a non-link card and surface what unlocks them. */
export function DrillsView() {
  const backend = useBackend();
  const [snapshot, setSnapshot] = useState<HistorySummaryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const drills = useMemo<DrillSpec[]>(() => {
    return buildDrills({
      weakestPairs: snapshot?.weakestPairs ?? [],
      weakestTrigrams: snapshot?.weakestTrigrams ?? [],
      weakestWords: snapshot?.weakestWords ?? [],
      cold: snapshot?.cold ?? false,
      seed: Date.now(),
    });
  }, [snapshot]);

  const tailored = drills.filter((d) => d.category === "tailored");
  const generic = drills.filter((d) => d.category === "generic");

  return (
    <>
      <Hero />
      <section className="px-5 py-8 pb-14 sm:px-16">
        {loading ? (
          <p className="text-sm text-muted-foreground">Reading your model…</p>
        ) : error ? (
          <p className="text-sm text-primary">{error}</p>
        ) : (
          <div className="flex flex-col gap-10">
            <DrillsGroup
              category="tailored"
              label="Tailored to you"
              blurb="Built from the bigrams and trigrams you keep stalling on. Locked until we've seen enough of your typing."
              drills={tailored}
            />
            <DrillsGroup
              category="generic"
              label="Generic"
              blurb="Curated word and sentence sets that work without a model. Warm-up runs and universal drills."
              drills={generic}
            />
          </div>
        )}
      </section>
    </>
  );
}

function Hero() {
  return (
    <section className="border-b border-border px-5 pt-12 pb-8 sm:px-16">
      <div className="mb-5 flex items-center gap-3.5">
        <span className="inline-block h-px w-7 bg-primary" aria-hidden />
        <Tag>Focused practice · minigames</Tag>
      </div>
      <h1 className="m-0 max-w-4xl text-3xl leading-tight font-extrabold tracking-[-0.03em] sm:text-4xl lg:text-5xl">
        Drills
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Short, focused mini-games tuned to your typing data. Each drill
        opens at its own URL so you can bookmark or link straight to
        one — the practice surface (font, caret, colours) carries
        through unchanged.
      </p>
    </section>
  );
}

function DrillsGroup({
  category,
  label,
  blurb,
  drills,
}: {
  category: DrillCategory;
  label: string;
  blurb: string;
  drills: readonly DrillSpec[];
}) {
  if (drills.length === 0) return null;
  return (
    <section aria-labelledby={`drills-group-${category}`}>
      <div className="mb-3 flex items-center gap-3">
        <span aria-hidden className="inline-block h-px w-5 bg-primary" />
        <h2
          id={`drills-group-${category}`}
          className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-sm"
        >
          {label}
        </h2>
      </div>
      <p className="mb-5 max-w-3xl text-sm leading-relaxed text-muted-foreground/85">
        {blurb}
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {drills.map((d) => (
          <DrillCard key={d.id} drill={d} />
        ))}
      </div>
    </section>
  );
}

function DrillCard({ drill }: { drill: DrillSpec }) {
  const ready = drill.ready;
  const isSuddenDeath = drill.kind === "sudden-death";
  const inner = (
    <>
      {/* Top hairline accent on hover for the editorial-mechanical
       *  flavour. Sudden-death pulls destructive; burst pulls primary. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity",
          ready ? "opacity-0 group-hover:opacity-100" : "opacity-30",
          isSuddenDeath ? "bg-destructive" : "bg-primary",
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Tag>{drill.contextLabel}</Tag>
          <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {drill.title}
          </h3>
        </div>
        <FlavourGlyph
          kind={isSuddenDeath ? "sudden-death" : "burst"}
          locked={!ready}
        />
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {drill.description}
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground/75">
        {drill.payoff}
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
        <RuleStrip drill={drill} />
        {ready ? (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
            Start <ChevronRight size={14} />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <Lock size={12} aria-hidden />
            Need more data
          </span>
        )}
      </div>
    </>
  );

  const cardCls = cn(
    "group relative flex flex-col gap-4 overflow-hidden rounded-md border bg-card p-5 text-left transition-colors sm:p-6",
    ready
      ? "border-border hover:border-primary/60 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      : "cursor-not-allowed border-border opacity-65",
  );

  if (!ready) {
    // Locked drill — render as a static card. The drill-runner page
    // at /app/drills/<id> handles the locked branch with its own
    // explainer, so we don't need to navigate just to read why.
    return (
      <div className={cardCls} aria-disabled>
        {inner}
      </div>
    );
  }

  return (
    <Link href={`/app/drills/${drill.id}`} className={cardCls}>
      {inner}
    </Link>
  );
}

function FlavourGlyph({
  kind,
  locked,
}: {
  kind: "sudden-death" | "burst";
  locked: boolean;
}) {
  if (locked) {
    return (
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground"
      >
        <Sparkles size={16} />
      </span>
    );
  }
  return kind === "sudden-death" ? (
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
