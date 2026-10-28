"use client";

import { Surface } from "@/components/page-shell";
import {
  FINGER_NAME,
  LEFT_FINGERS,
  RIGHT_FINGERS,
  type FingerId,
  type HandLayoutPrefs,
} from "@/lib/hand-layout";
import { relativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import type { AdaptTestSummary } from "@/types/adapt";

/* ─── Recent tests ─────────────────────────────────────────────── */

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function RecentTests({ tests }: { tests: AdaptTestSummary[] }) {
  if (tests.length === 0) {
    return <EmptyNote>No finished tests yet. Take one and refresh.</EmptyNote>;
  }
  return (
    <Surface className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-3 pl-5 pr-3 font-medium">When</th>
              <th className="py-3 pr-3 font-medium">Mode</th>
              <th className="py-3 pr-3 text-right font-medium">WPM</th>
              <th className="py-3 pr-3 text-right font-medium">Accuracy</th>
              <th className="py-3 pr-3 text-right font-medium">Errors</th>
              <th className="py-3 pr-5 text-right font-medium">Finished</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((t) => (
              <tr
                key={t.id}
                className="border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent/50"
              >
                <td className="whitespace-nowrap py-2.5 pl-5 pr-3 text-muted-foreground">
                  {relativeTime(t.startedAtMs)}
                </td>
                <td className="py-2.5 pr-3 capitalize text-foreground">
                  {t.mode.replace(/_/g, " ")}
                </td>
                <td className="py-2.5 pr-3 text-right font-medium text-foreground">
                  {t.wpm.toFixed(0)}
                </td>
                <td className="py-2.5 pr-3 text-right text-foreground">
                  {t.accuracy.toFixed(1)}%
                </td>
                <td className="py-2.5 pr-3 text-right text-muted-foreground">
                  {t.errorCount}
                </td>
                <td className="py-2.5 pr-5 text-right">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <span
                      aria-hidden
                      className={cn(
                        "size-1.5 rounded-full",
                        t.wasCompleted ? "bg-foreground/30" : "bg-primary",
                      )}
                    />
                    {t.wasCompleted ? "Yes" : "No"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

/* ─── Recency map ──────────────────────────────────────────────── */

export function RecencyMap({
  rows,
}: {
  rows: { word: string; testsAgo: number }[];
}) {
  if (rows.length === 0) {
    return <EmptyNote>Nothing held back right now.</EmptyNote>;
  }
  // Sort by recency (newest first) so the layout reads as a fade.
  const sorted = [...rows].sort((a, b) => a.testsAgo - b.testsAgo);
  const maxAgo = Math.max(...sorted.map((r) => r.testsAgo), 1);

  return (
    <ul className="flex flex-wrap gap-1.5">
      {sorted.map((r) => {
        // Fresher words (lower testsAgo) sit closer to full opacity.
        const opacity = 1 - (r.testsAgo / (maxAgo + 1)) * 0.55;
        return (
          <li
            key={r.word}
            style={{ opacity }}
            title={`Shown ${r.testsAgo} test${r.testsAgo === 1 ? "" : "s"} ago`}
            className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-border bg-card px-3 text-sm tabular-nums transition-opacity hover:opacity-100"
          >
            <span className="font-mono text-foreground">{r.word}</span>
            <span className="text-xs text-muted-foreground">{r.testsAgo}</span>
          </li>
        );
      })}
    </ul>
  );
}

/* ─── Finger map ───────────────────────────────────────────────── */

export function FingerMapView({
  layout,
  fingerMapHash,
}: {
  layout: HandLayoutPrefs;
  fingerMapHash: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FingerColumn label="Left hand" ids={LEFT_FINGERS} layout={layout} />
        <FingerColumn label="Right hand" ids={RIGHT_FINGERS} layout={layout} />
      </div>
      <p className="break-all text-xs text-muted-foreground">
        Layout hash{" "}
        <span className="font-mono text-foreground/70">{fingerMapHash}</span>
      </p>
    </div>
  );
}

/** `KeyA` → `A`, `Digit1` → `1`, `Semicolon` → `;`; anything else
 *  (Space, Shift, …) keeps its name. */
function keyLabel(code: string): string {
  const named: Record<string, string> = {
    Semicolon: ";",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Quote: "'",
    BracketLeft: "[",
    BracketRight: "]",
    Backquote: "`",
    Minus: "-",
    Equal: "=",
    Backslash: "\\",
  };
  if (named[code]) return named[code];
  return code.replace(/^(Key|Digit)/, "");
}

function FingerColumn({
  label,
  ids,
  layout,
}: {
  label: string;
  ids: readonly FingerId[];
  layout: HandLayoutPrefs;
}) {
  return (
    <Surface className="flex flex-col gap-1 p-4 sm:p-5">
      <h3 className="pb-1 text-sm font-medium text-foreground">{label}</h3>
      <ul className="flex flex-col text-sm">
        {ids.map((id) => {
          const f = layout.fingers[id];
          return (
            <li
              key={id}
              className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-b-0"
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "inline-block size-1.5 rounded-full",
                    f.enabled ? "bg-foreground/50" : "bg-foreground/15",
                  )}
                  aria-hidden
                />
                <span className={f.enabled ? "text-foreground" : "text-muted-foreground"}>
                  {FINGER_NAME[id]}
                </span>
              </span>
              {f.enabled ? (
                <span className="inline-flex min-w-7 items-center justify-center rounded-md border border-border border-b-2 bg-background px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">
                  {keyLabel(f.homeKey)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Off</span>
              )}
            </li>
          );
        })}
      </ul>
    </Surface>
  );
}
