/** Length unit for a shared test's `durationOrWordCount` figure.
 *  Persisted on the test row from the practice client; `null` on legacy
 *  rows submitted before the discriminator column existed. */
export type LengthMode = "words" | "time" | "quote" | null;

/** Quote-group names, indexed by group id (0..3) — mirrors
 *  `QUOTE_GROUPS` in `src/lib/quotes.ts`. Inlined here (rather than
 *  imported) because `quotes.ts` is a `"use client"` module and this
 *  helper runs in the edge OG-image runtime too. */
const QUOTE_GROUP_LABELS = ["short", "medium", "long", "thicc"] as const;

/** Friendly length label for a shared run, branched on the persisted
 *  `lengthMode` discriminator rather than the algorithmic `mode` string
 *  (which is only ever casual/training/reverse_adaptive/race and never
 *  carries the words-vs-time-vs-quote distinction):
 *
 *  - 'time'  → `Time · 60s`
 *  - 'quote' → `Quote · long` (group name; bare `Quote` if out of range)
 *  - 'words' → `Words · 50`
 *  - null    → bare `50` (legacy rows — never guess "Words")
 *
 *  Shared by `share-card.tsx` and `opengraph-image.tsx` so the two
 *  surfaces always agree. */
export function shareLengthLabel(lengthMode: LengthMode, amount: number): string {
  if (lengthMode === "time") return `Time · ${amount}s`;
  if (lengthMode === "quote") {
    const name = QUOTE_GROUP_LABELS[amount];
    return name ? `Quote · ${name}` : "Quote";
  }
  if (lengthMode === "words") return `Words · ${amount}`;
  return String(amount);
}
