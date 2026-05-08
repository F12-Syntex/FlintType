"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Tag } from "@/components/ft";
import { Button } from "@/components/ui/button";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import type { HistorySummaryOutput, HistoryWeakness } from "@/types/history";
import { TypingSurface } from "../../_components/typing-surface";
import { generateTrickyDrill, generateWeaknessDrill } from "./drills-data";

/** Drill kinds the picker offers. The id flows through to the
 *  generator + back into the UI so we can tell the user which drill
 *  they're running and pre-fill a reasonable rerun. */
type DrillKind = "weakness" | "tricky";

type Drill = {
  id: DrillKind;
  title: string;
  /** Why the user might want this drill — a short, plain-English line.
   *  Avoid algorithm jargon. */
  description: string;
  /** The actual passage. Empty array signals "not enough data yet" —
   *  the picker disables the start button and shows a hint. */
  words: readonly string[];
  /** Per-drill subtitle that appears once active — gives context like
   *  which bigrams the weakness drill is targeting. */
  contextLabel: string;
  /** Soft-warm pitch — what the user gets out of finishing it. */
  payoff: string;
};

const DRILL_LENGTH = 35;

export function DrillsView() {
  const backend = useBackend();
  const [snapshot, setSnapshot] = useState<HistorySummaryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Drill | null>(null);

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

  const drills = useMemo<Drill[]>(() => {
    return [
      buildWeaknessDrill(snapshot?.weakestPairs ?? [], snapshot?.cold ?? false),
      buildTrickyDrill(),
    ];
  }, [snapshot]);

  if (active) {
    return <ActiveDrill drill={active} onExit={() => setActive(null)} />;
  }

  return (
    <>
      <section className="border-b border-ft-line-soft px-5 pt-12 pb-8 sm:px-16">
        <div className="mb-5 flex items-center gap-3.5">
          <span className="inline-block h-px w-7 bg-ft-ember" aria-hidden />
          <Tag>FOCUSED PRACTICE · DAILY</Tag>
        </div>
        <h1 className="m-0 max-w-4xl text-3xl leading-tight font-extrabold tracking-[-0.03em] sm:text-4xl lg:text-5xl">
          Drills
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ft-dim-2 sm:text-base">
          Short, focused exercises tuned to your typing data. Pick a drill,
          finish the passage, and move on. Five minutes a day on the right
          drill outperforms an hour on random words.
        </p>
      </section>

      <section className="px-5 py-8 pb-14 sm:px-16">
        {loading ? (
          <p className="text-sm text-ft-dim">Reading your model…</p>
        ) : error ? (
          <p className="text-sm text-ft-ember">{error}</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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

// ─── picker card ─────────────────────────────────────────────────────

function DrillCard({
  drill,
  onStart,
}: {
  drill: Drill;
  onStart: () => void;
}) {
  const ready = drill.words.length > 0;
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border border-ft-line-soft bg-card p-6 transition-colors",
        ready && "hover:border-ft-ember",
      )}
    >
      <div className="flex flex-col gap-1">
        <Tag>{drill.contextLabel}</Tag>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-ft-ink sm:text-2xl">
          {drill.title}
        </h2>
      </div>
      <p className="text-sm leading-relaxed text-ft-dim-2">
        {drill.description}
      </p>
      <p className="text-xs leading-relaxed text-ft-dim">{drill.payoff}</p>
      <div className="mt-auto flex items-center gap-3">
        <Button
          onClick={onStart}
          disabled={!ready}
          variant={ready ? "default" : "outline"}
          size="sm"
        >
          {ready ? `Start drill · ${drill.words.length} words` : "Not enough data yet"}
        </Button>
      </div>
    </div>
  );
}

// ─── active drill view ───────────────────────────────────────────────

function ActiveDrill({
  drill,
  onExit,
}: {
  drill: Drill;
  onExit: () => void;
}) {
  return (
    <>
      <section className="border-b border-ft-line-soft px-5 pt-8 pb-5 sm:px-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Tag>{drill.contextLabel}</Tag>
            <h1 className="text-xl font-bold tracking-tight text-ft-ink sm:text-2xl">
              {drill.title}
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={onExit} className="gap-2">
            <ArrowLeft size={14} />
            Back to drills
          </Button>
        </div>
      </section>
      {/* Drill key forces a fresh PracticeProvider per drill so the
       *  state is genuinely reset (not just words swapped). The rest
       *  of the surface (caret, font, theme) tracks the user's normal
       *  appearance prefs — the drill renders identically to practice. */}
      <TypingSurface
        key={drill.id}
        lockedWords={[...drill.words]}
        showModeBar={false}
      />
    </>
  );
}

// ─── drill builders ──────────────────────────────────────────────────

function buildWeaknessDrill(
  pairs: readonly HistoryWeakness[],
  cold: boolean,
): Drill {
  if (cold || pairs.length === 0) {
    return {
      id: "weakness",
      title: "Weakness drill",
      description:
        "We'll surface words containing your slowest letter pairs. Right now we don't have enough samples to identify them — type a few regular tests and check back.",
      payoff: "Drilling your weakest 5 pairs is the highest-leverage way to lift your overall WPM.",
      words: [],
      contextLabel: "PERSONAL · ADAPTIVE",
    };
  }
  const targeted = pairs.slice(0, 6).map((p) => p.key);
  const words = generateWeaknessDrill(pairs, DRILL_LENGTH);
  return {
    id: "weakness",
    title: "Weakness drill",
    description: `Words built around your slowest pairs: ${targeted.map((k) => `"${k}"`).join(", ")}.`,
    payoff: `Each pair appears ~${Math.ceil(DRILL_LENGTH / Math.max(1, targeted.length))} times across the run, so the workout is concentrated where it counts.`,
    words,
    contextLabel: "PERSONAL · ADAPTIVE",
  };
}

function buildTrickyDrill(): Drill {
  return {
    id: "tricky",
    title: "Tongue-twister set",
    description:
      "A curated list of awkward words — heavy bigram density, cross-hand jumps, silent letters. Useful for breaking out of muscle-memory ruts.",
    payoff: "Universal — same drill regardless of your model. Good for warming up or when no signal is available.",
    words: generateTrickyDrill(DRILL_LENGTH),
    contextLabel: "CURATED · UNIVERSAL",
  };
}
