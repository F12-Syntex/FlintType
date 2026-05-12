"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DrillSpec } from "./drills-data";

/** Editorial hero for /drills. Shows the single recommended drill at
 *  the top of the page with a *real* large-typeset sample of the
 *  text the user will be typing — same family + tracking as the
 *  practice passage on `/` — so the drill feels familiar before the
 *  user starts it. When there's no recommended drill yet (cold start
 *  or all locked) the spotlight flips to a quiet pre-flight panel
 *  explaining what unlocks the recommendation. */
export function DrillsSpotlight({
  recommended,
  cold,
  loading,
}: {
  recommended: DrillSpec | null;
  cold: boolean;
  loading: boolean;
}) {
  if (loading) return <SpotlightSkeleton />;
  if (!recommended) return <SpotlightCold cold={cold} />;

  const isSuddenDeath = recommended.kind === "sudden-death";
  return (
    <section className="flex flex-col gap-7 pb-14 sm:pb-20">
      <Eyebrow tone={isSuddenDeath ? "destructive" : "primary"}>
        Recommended · {recommended.contextLabel}
      </Eyebrow>

      <h1 className="text-[40px] font-extrabold leading-[0.95] tracking-[-0.035em] text-foreground sm:text-[60px] lg:text-[84px]">
        {recommended.title}
      </h1>

      <SamplePassage tokens={sampleTokens(recommended)} />

      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
        {recommended.description}
      </p>

      <div className="mt-2 flex flex-col gap-6 border-t border-foreground/10 pt-7 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
        <SpecStrip drill={recommended} />
        <Link
          href={`/drills/${recommended.id}`}
          className={cn(
            "inline-flex items-center justify-center gap-2 self-start rounded-md px-5 py-3 sm:self-auto",
            "font-mono text-[11px] font-semibold uppercase tracking-[0.22em]",
            "transition-transform hover:-translate-y-[1px] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2",
            isSuddenDeath
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/40"
              : "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/40",
          )}
        >
          Start drill
          <ChevronRight size={15} aria-hidden />
        </Link>
      </div>
    </section>
  );
}

/** First few items rendered like a practice passage — same mono, same
 *  leading. The leading token sits at full foreground (suggests
 *  "you're about to type this") while the rest drop to muted. No
 *  primary tint here — the spark already lives on the Start button
 *  and the eyebrow tick, per ui-law §2. */
function SamplePassage({ tokens }: { tokens: readonly string[] }) {
  if (tokens.length === 0) return null;
  return (
    <p className="font-mono text-[20px] leading-[1.6] tracking-[-0.005em] text-muted-foreground/65 sm:text-[24px] lg:text-[28px]">
      {tokens.map((tok, i) => (
        <span key={i}>
          <span className={i === 0 ? "text-foreground/85" : undefined}>
            {tok}
          </span>
          {i < tokens.length - 1 ? (
            <span className="px-2 text-foreground/20">·</span>
          ) : null}
        </span>
      ))}
      <span className="pl-2 text-foreground/25">…</span>
    </p>
  );
}

function SpecStrip({ drill }: { drill: DrillSpec }) {
  const cells = specCells(drill);
  return (
    <ul className="flex flex-wrap items-end gap-x-9 gap-y-3 tabular-nums sm:gap-x-12">
      {cells.map((c) => (
        <li key={c.label} className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {c.label}
          </span>
          <span className="font-mono text-[28px] font-bold leading-none tracking-[-0.02em] text-foreground sm:text-[32px]">
            {c.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Eyebrow({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "primary" | "destructive";
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className={cn(
          "inline-block h-px w-10",
          tone === "destructive" ? "bg-destructive" : "bg-primary",
        )}
      />
      <span
        className={cn(
          "font-mono text-[11px] font-semibold uppercase tracking-[0.24em]",
          tone === "destructive" ? "text-destructive" : "text-primary",
        )}
      >
        {children}
      </span>
    </div>
  );
}

function SpotlightSkeleton() {
  return (
    <section className="flex animate-pulse flex-col gap-7 pb-14 sm:pb-20">
      <div className="h-3 w-56 rounded-sm bg-foreground/10" />
      <div className="h-14 w-2/3 rounded-md bg-foreground/10 sm:h-20" />
      <div className="h-7 w-5/6 rounded-md bg-foreground/[0.06]" />
      <div className="h-4 w-1/2 rounded-md bg-foreground/[0.06]" />
      <div className="mt-2 h-16 w-full rounded-md border-t border-foreground/10 bg-transparent pt-7" />
    </section>
  );
}

function SpotlightCold({ cold }: { cold: boolean }) {
  return (
    <section className="flex flex-col gap-7 pb-14 sm:pb-20">
      <Eyebrow tone="primary">Pre-flight</Eyebrow>
      <h1 className="text-[40px] font-extrabold leading-[0.95] tracking-[-0.035em] text-foreground sm:text-[60px] lg:text-[80px]">
        Warm up first.
      </h1>
      <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-[17px]">
        {cold
          ? "Your tailored drill needs a few more practice passages to read. Run a quick warm-up — the spotlight here will swap to your personal recommendation as soon as we can see your slowest bigrams and trigrams."
          : "A touch more typing data and the personal recommendation unlocks. The catalog below works either way."}
      </p>
      <Link
        href="/"
        className={cn(
          "mr-auto inline-flex items-center gap-2 rounded-md border border-foreground/15 px-4 py-2.5",
          "font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground",
          "transition-colors hover:border-foreground/30 hover:bg-accent/40 active:translate-y-[1px]",
        )}
      >
        Run practice
        <ChevronRight size={14} aria-hidden />
      </Link>
    </section>
  );
}

function sampleTokens(drill: DrillSpec): readonly string[] {
  if (drill.kind === "sudden-death") return drill.words.slice(0, 10);
  if (drill.tracker === "common-1000")
    return ["the", "of", "and", "to", "a", "in", "is", "you", "for", "it"];
  if (drill.items.length === 0) return [];
  if (drill.items[0]!.includes(" ")) {
    return drill.items[0]!.split(/\s+/).slice(0, 10);
  }
  return drill.items.slice(0, 10);
}

function specCells(drill: DrillSpec): { label: string; value: string }[] {
  if (drill.kind === "sudden-death") {
    return [
      { label: "Words", value: String(drill.words.length || "—") },
      { label: "Mistakes", value: "0" },
    ];
  }
  const items =
    drill.tracker === "common-1000" ? 1000 : drill.items.length || "—";
  return [
    { label: "Items", value: String(items) },
    { label: "Reps", value: `${drill.repsPerItem}×` },
    { label: "Threshold", value: `${drill.thresholdWpm} wpm` },
  ];
}
