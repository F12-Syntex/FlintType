"use client";

import Link from "next/link";
import { DeltaText } from "@/components/analysis/delta-text";
import { RangeTrack } from "@/components/analysis/range-track";
import { useSignInHref } from "@/components/auth/use-sign-in-href";
import { Button } from "@/components/ui/button";
import { speed } from "@/lib/format-figure";
import type { InsightsUsualOutput, RangeSummary } from "@/types/insights";
import type { RunAnalysisView } from "../use-run-analysis";
import type { CopyUnit } from "./finding-copy";
import { useUsual } from "./use-usual";
import {
  ADAPT_NOTE,
  COMPARE_HEADING,
  LOAD_ERROR,
  SIGN_IN_TAIL,
  learningLine,
  rangeLabel,
  rangePhrase,
  referenceLine,
  sliceLineFor,
  sliceLines,
} from "./usual-copy";

/** The anonymous result's line in the comparison's place: an underlined
 *  ink link (never orange: the hero and "Next test" keep the orange). */
export function SignInLine() {
  const href = useSignInHref();
  return (
    <p className="text-sm text-muted-foreground">
      <Link
        href={href}
        className="relative touch-hit font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-primary"
      >
        Sign in
      </Link>
      {SIGN_IN_TAIL}
    </p>
  );
}

const pct = (v: number) => `${Math.round(v * 10) / 10}%`;

function Row({ label, kind, range, value, fmt }: {
  label: string;
  kind: "speed" | "accuracy";
  range: RangeSummary;
  value: number;
  fmt: (n: number) => string;
}) {
  return (
    <>
      <span className="text-sm text-muted-foreground">{label}</span>
      <RangeTrack low={range.low} high={range.high} value={value} format={fmt} label={rangeLabel(kind, range, value, fmt)} />
      <span className="col-start-2 text-sm font-medium text-foreground sm:col-start-auto">{rangePhrase(value, range)}</span>
    </>
  );
}

function Ready({ view, data, accuracy, unit }: { view: RunAnalysisView; data: InsightsUsualOutput; accuracy: number; unit: CopyUnit }) {
  const fmtSpeed = (v: number) => speed(v, unit.unit, unit.decimals);
  const slice = sliceLineFor({ analysis: view.analysis, usual: data.slices, fixMode: view.source.fixMode });
  const lines = slice ? sliceLines(slice.key, slice.thisPerMin, slice.usualPerMin) : null;
  return (
    <>
      {data.reference ? (
        <p className="text-sm text-muted-foreground">{referenceLine(data.reference, view.group)}</p>
      ) : null}
      {data.speed || data.accuracy ? (
        <div className="mt-1 grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-4 sm:grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,14rem)]">
          {data.speed ? <Row label="Speed" kind="speed" range={data.speed} value={view.input.wpm} fmt={fmtSpeed} /> : null}
          {data.accuracy ? <Row label="Accuracy" kind="accuracy" range={data.accuracy} value={accuracy} fmt={pct} /> : null}
        </div>
      ) : null}
      {slice && lines ? (
        <p className="mt-1 text-sm text-foreground">
          <DeltaText direction={slice.thisPerMin > slice.usualPerMin ? "up" : "down"}>{lines.lead}</DeltaText>
          <span className="text-muted-foreground"> {lines.follow}</span>
        </p>
      ) : null}
      {view.isAdapt ? <p className="mt-1 text-xs text-muted-foreground">{ADAPT_NOTE}</p> : null}
    </>
  );
}

/** "Compared with your usual" (spec-50 §3.7): signed in, on a real
 *  result screen only. `accuracy` is the run's keystroke accuracy, the
 *  headline figure. A missing analysis table renders nothing. */
export function CompareUsual({ view, accuracy, unit }: { view: RunAnalysisView; accuracy: number; unit: CopyUnit }) {
  const state = useUsual(view.source);
  if (!state) return null;
  if (state.kind === "signed-out") return <SignInLine />;
  if (state.kind === "ready" && state.data.status === "not-ready") return null;

  return (
    // A plain block with its heading, at the same level as the card's
    // other two: the card around it is the one region (index.tsx).
    <div aria-busy={state.kind === "loading"} className="flex min-w-0 flex-col gap-3 border-t border-border/70 pt-5">
      <h2 className="text-sm font-semibold text-foreground">{COMPARE_HEADING}</h2>
      {state.kind === "loading" ? (
        <div aria-hidden className="h-4 w-48 rounded-full bg-muted motion-safe:animate-pulse" />
      ) : state.kind === "error" ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm text-muted-foreground">{LOAD_ERROR}</p>
          <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={state.retry}>
            Try again
          </Button>
        </div>
      ) : state.data.status === "learning" && state.data.gate ? (
        <p className="text-sm text-muted-foreground">{learningLine(state.data.gate, view.noun, view.group)}</p>
      ) : state.data.status === "ready" ? (
        <Ready view={view} data={state.data} accuracy={accuracy} unit={unit} />
      ) : null}
    </div>
  );
}
