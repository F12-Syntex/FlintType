"use client";

import { Passage } from "@/app/_components/passage";
import { decorate } from "@/app/_components/practice-state";
import { type BehaviourPrefs } from "@/lib/behaviour-prefs";
import { cn } from "@/lib/utils";
import { PreviewPracticeProvider } from "../../_components/preview-practice";

/** Behaviour previews. Built from the real components — `<Passage />`
 *  — wrapped in `<PreviewPracticeProvider>` so every behaviour toggle
 *  (stop-on-error, allow extras, strict space, blind mode, …) flows
 *  through to the same UI the test screen runs. */

/* ─── Input handling ──────────────────────────────────────────── */

export function InputHandlingPreview() {
  // Real Passage with a deliberate error word so the error colour
  // token + decoration actually paints. stop-on-error and confidence
  // need live keystrokes to *fully* reveal — the description below
  // names that explicitly.
  return (
    <PreviewPracticeProvider
      words={["the", "quick", "brown", "fox", "jumps"]}
      finishedWords={2}
      cursorChar={3}
      errorWord={1}
    >
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="relative h-[140px] w-full">
          <Passage />
        </div>
      </div>
    </PreviewPracticeProvider>
  );
}

/* ─── Word list ───────────────────────────────────────────────── */

const SAMPLE_WORDS = [
  "a",
  "an",
  "be",
  "do",
  "go",
  "is",
  "to",
  "and",
  "the",
  "for",
  "you",
  "with",
  "their",
  "would",
  "should",
  "before",
  "another",
  "together",
];

export function WordListPreview({ prefs }: { prefs: BehaviourPrefs }) {
  // Run the *real* `decorate` (used by the practice surface) over a
  // filtered sample so the chip cloud reflects exactly what the user
  // would see in a fresh passage at these settings.
  const filtered = SAMPLE_WORDS.filter((w) => w.length >= prefs.minWordLength);
  const decorated = decorate(filtered, prefs, 42);
  const visible = decorated.slice(0, 12);

  return (
    <div className="flex flex-col gap-3 px-5 py-7 sm:py-8">
      <ul className="flex flex-wrap gap-1.5">
        {visible.map((t, i) => {
          const isSecondary = /\d|[.,;:!?]/.test(t);
          return (
            <li
              key={`${t}-${i}`}
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
        Words ≥ <span className="text-foreground tabular-nums">{prefs.minWordLength}</span>{" "}
        chars
        {prefs.showSecondary ? " · numbers + punctuation sprinkled in" : ""}
      </span>
    </div>
  );
}
