import { z } from "zod";

/** Capture v2 wire schema (the typing-analysis redesign). Every field
 *  here is an optional addition to the adapt.submit payload:
 *
 *  - `timings` stays characters only. Each timing gains `pos` (the
 *    cursor column before the key), `src` (soft keyboard / IME text) and
 *    `ht` (the event's high-resolution timeStamp, relative to the run's
 *    first recorded key, used only for gap statistics).
 *  - Backspaces and spaces travel in their own arrays, `edits` and
 *    `spaces`, each mark placed in the key stream by `at` (the number of
 *    char events before it) and ordered by `seq`.
 *  - `ctx` describes the run's settings, so the analysis knows the fix
 *    mode and whether QWERTY gap classes apply.
 *
 *  A bad value never rejects the submit (invariant I3). A lenient field
 *  drops to `undefined`, and a bad element inside `edits` or `spaces`
 *  drops that whole array (see `submitTestInputSchema` in ./adapt). What
 *  a drop means for the analysis depends on the field (spec-10 §4.2):
 *  - A dropped `pos`, a dropped array or `ctx.capped: true` makes the run
 *    capture v1, with no digest. So does a mark the engine can't place
 *    (`at` above the number of timings, or a repeated or out-of-order
 *    `seq`), and a replay that disagrees with the recorded `pos` (spec-10
 *    §6.1): a dropped `cross`, or a dropped `ctx.stopOnError` or
 *    `ctx.suddenDeath` in a run that needed it, can cause that.
 *  - A dropped `ht` only turns off the high-resolution clock.
 *  - A dropped `src`, `early` or other `ctx` field reads as absent, and the
 *    run stays v2. A run with no `ctx` at all stores no digest (spec-30
 *    §4.1). A bad `ctx.capped` reads as not capped. */

/** An invalid value drops to undefined instead of rejecting the submit
 *  (I3). Same pattern as live-screen-meta. See above for what a dropped
 *  field means for the analysis. */
const lenient = <T extends z.ZodTypeAny>(s: T) => s.optional().catch(undefined);

/** Client caps on the two mark arrays. A run that reaches either cap sets
 *  `ctx.capped` and is analysed as v1. 5,000 each keeps the worst-case
 *  body (20,000 timings plus both arrays full) near 2.6 MB, well under
 *  the 4.5 MB request limit. */
export const EDITS_MAX = 5_000;
export const SPACES_MAX = 5_000;

/** Same bound as `timings.max(20000)` in ./adapt: a mark sits between
 *  char events, so `at` can be at most the number of timings. */
const MARK_AT_MAX = 20_000;
/** One clock bound for every `t` and `ht`: 24 hours in ms. */
const CLOCK_MAX_MS = 86_400_000;
/** Cursor column inside one word's typed buffer. */
const POS_MAX = 4096;

/** Spread into `keystrokeTimingSchema` (./adapt). All three are lenient,
 *  so a bad value leaves the timing itself intact. */
export const keystrokeCaptureFields = {
  pos: lenient(z.number().int().min(0).max(POS_MAX)),
  src: lenient(z.literal("input")),
  ht: lenient(z.number().min(0).max(CLOCK_MAX_MS)),
};

/** Fields shared by an edit and a space. The placement fields (`t`, `at`,
 *  `seq`, `wordIndex`, `pos`) are strict: a mark without them can't be
 *  merged, so a bad one fails its element and the array-level catch in
 *  ./adapt drops the whole array. */
const markBase = {
  /** ms since the run started, on the same Date.now clock as timings. */
  t: z.number().nonnegative().max(CLOCK_MAX_MS),
  ht: lenient(z.number().min(0).max(CLOCK_MAX_MS)),
  /** Char events recorded before this mark (0 … timings.length). */
  at: z.number().int().min(0).max(MARK_AT_MAX),
  /** Order across both arrays: unique, strictly increasing per run. */
  seq: z.number().int().min(0).max(EDITS_MAX + SPACES_MAX),
  wordIndex: z.number().int().min(0).max(100_000),
  /** cursorChar before the mark applied. */
  pos: z.number().int().min(0).max(POS_MAX),
  src: lenient(z.literal("input")),
};

/** One applied backspace. `backWord` is Ctrl/Alt+Backspace; `cross` marks
 *  a backspace that moved the cursor into the previous word. */
export const editTimingSchema = z.object({
  ...markBase,
  kind: z.enum(["back", "backWord"]),
  cross: lenient(z.literal(true)),
});

/** One applied Space. `early` marks a Space pressed before the word was
 *  typed exactly (the reducer still moved on). */
export const spaceTimingSchema = z.object({
  ...markBase,
  early: lenient(z.literal(true)),
});

/** The run's settings, as the client applied them. */
export const runContextSchema = z.object({
  stopOnError: lenient(z.boolean()),
  allowExtras: lenient(z.boolean()),
  strictSpace: lenient(z.boolean()),
  confidence: lenient(z.enum(["off", "word", "all"])),
  suddenDeath: lenient(z.boolean()),
  drill: lenient(z.boolean()),
  race: lenient(z.boolean()),
  wordlist: lenient(z.string().max(64)),
  punctuation: lenient(z.boolean()),
  input: lenient(z.enum(["keyboard", "touch", "mixed"])),
  /** Share of letter keydowns whose KeyboardEvent.code matched the letter (spec-10 §4.1). */
  codeMatch: lenient(z.number().min(0).max(1)),
  /** The client dropped edits or spaces at its cap: analyse as v1. */
  capped: lenient(z.literal(true)),
});
// No `layout` field: the on-screen keyboard's layout setting is a display
// preference (it defaults to "qwerty" and is often hidden), and imported
// MonkeyType layout ids are arbitrary strings. codeMatch replaces it. An
// old client's `layout` key is stripped like any unknown key.

export type EditTiming = z.infer<typeof editTimingSchema>;
export type SpaceTiming = z.infer<typeof spaceTimingSchema>;
export type RunContext = z.infer<typeof runContextSchema>;
/** Structural type of one timing after this change (matches adapt.ts's schema). */
export type KeystrokeTimingV2 = {
  t: number; expected: string; typed: string; correct: boolean; wordIndex: number;
  pos?: number; src?: "input"; ht?: number;
};
