"use client";

import { CornerDownLeft } from "lucide-react";
import { Kbd } from "@/components/ft";
import type { BehaviourPrefs } from "@/lib/behaviour-prefs";
import { cn } from "@/lib/utils";

/** Bespoke per-section previews for the behaviour page. Same contract
 *  as appearance/section-previews.tsx — static, real, and foregrounding
 *  the section's own setting (not a generic everything-card). */

/* ─── Restart ──────────────────────────────────────────────────── */

export function RestartPreview({ prefs }: { prefs: BehaviourPrefs }) {
  return (
    <div className="flex items-center justify-center gap-4 px-5 py-9 sm:gap-6 sm:py-11">
      <Kbd className="px-3 py-1 text-sm">Tab</Kbd>
      <CornerDownLeft
        size={20}
        aria-hidden
        className={cn(
          "shrink-0",
          prefs.quickRestart ? "text-primary" : "text-muted-foreground/40",
        )}
      />
      <span
        className={cn(
          "font-mono text-[12px] uppercase tracking-[0.16em]",
          prefs.quickRestart ? "text-foreground" : "text-muted-foreground/60",
        )}
      >
        {prefs.quickRestart ? "Instant restart, focus kept" : "Tab tabs out"}
      </span>
    </div>
  );
}

/* ─── Live signal ─────────────────────────────────────────────── */

export function LiveSignalPreview({ prefs }: { prefs: BehaviourPrefs }) {
  const blind = prefs.blindMode;
  return (
    <div className="flex flex-col gap-4 px-5 py-7 sm:px-7 sm:py-9">
      <div
        className={cn(
          "flex items-baseline gap-6 font-mono text-2xl sm:text-3xl",
          blind && "opacity-30",
        )}
      >
        <Stat
          label="WPM"
          value="68"
          on={prefs.liveWpm && !blind}
          accent
        />
        <Stat label="ACC" value="96" on={prefs.liveAccuracy && !blind} />
        <Stat
          label="KEYS"
          value="•••"
          on={prefs.liveKeyboard && !blind}
        />
      </div>
      {blind ? (
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-primary">
          Blind mode · live signal hidden
        </span>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  on,
  accent,
}: {
  label: string;
  value: string;
  on: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums font-bold tracking-[-0.03em] transition-colors",
          on
            ? accent
              ? "text-primary"
              : "text-foreground"
            : "text-foreground/15",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Input handling ──────────────────────────────────────────── */

export function InputHandlingPreview({ prefs }: { prefs: BehaviourPrefs }) {
  const stop = prefs.stopOnError;
  const confidence = prefs.confidence;

  // The sample mirrors a typo: user typed "thq" instead of "the".
  // Stop-on-error keeps the cursor on the wrong letter (red caret on q);
  // Confidence accepts and moves on (faded q, caret advances).
  const text = "the quick";
  const typed = 3; // user has typed "thq"
  const errorIdx = 2;

  return (
    <div className="flex flex-col gap-3 px-5 py-7 sm:py-9">
      <div className="font-mono text-[26px] leading-[1.4]">
        {[...text].map((ch, i) => {
          const isError = i === errorIdx;
          if (i < typed) {
            return (
              <span
                key={i}
                className={cn(
                  isError
                    ? "text-primary underline decoration-primary decoration-1 underline-offset-[6px]"
                    : "text-foreground",
                )}
              >
                {/* show the actually-typed wrong char */}
                {isError ? "q" : ch}
              </span>
            );
          }
          if (i === typed) {
            return (
              <span key={i} className="relative text-muted-foreground/60">
                {stop ? (
                  <span
                    aria-hidden
                    className="absolute -left-[1px] top-0 h-[1.2em] w-[2px] bg-primary"
                  />
                ) : null}
                {ch}
              </span>
            );
          }
          return (
            <span key={i} className="text-muted-foreground/40">
              {ch}
            </span>
          );
        })}
      </div>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
        {stop ? "Cursor stuck · " : "Cursor advances · "}
        {confidence === "off"
          ? "backspace allowed"
          : confidence === "word"
            ? "backspace blocked at word boundary"
            : "backspace blocked"}
      </span>
    </div>
  );
}

/* ─── Word list ───────────────────────────────────────────────── */

const WORD_POOL = [
  "a",
  "an",
  "be",
  "do",
  "go",
  "is",
  "it",
  "to",
  "we",
  "and",
  "are",
  "for",
  "has",
  "you",
  "their",
  "would",
  "should",
  "before",
  "another",
  "together",
];

const SECONDARY_POOL = ["123", "+", ".", "?", "!"];

export function WordListPreview({ prefs }: { prefs: BehaviourPrefs }) {
  const filtered = WORD_POOL.filter((w) => w.length >= prefs.minWordLength);
  const visible = filtered.slice(0, 9);
  const tokens = prefs.showSecondary
    ? [...visible, ...SECONDARY_POOL]
    : visible;

  return (
    <div className="flex flex-col gap-4 px-5 py-7 sm:py-8">
      <ul className="flex flex-wrap gap-1.5">
        {tokens.map((t) => {
          const isSecondary = SECONDARY_POOL.includes(t);
          return (
            <li
              key={t}
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-1 font-mono text-xs tabular-nums",
                isSecondary
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-border bg-card text-foreground",
              )}
            >
              {t}
            </li>
          );
        })}
      </ul>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
        Words ≥ <span className="text-foreground tabular-nums">{prefs.minWordLength}</span> chars
        {prefs.showSecondary ? " · numbers + punctuation sprinkled in" : ""}
      </span>
    </div>
  );
}
