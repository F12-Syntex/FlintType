import { z } from "zod";
import {
  liveAppearanceSchema,
  liveCaretSchema,
  liveThemeVarsSchema,
  type LiveAppearance,
  type LiveCaret,
  type LiveThemeVars,
} from "./live-screen-meta";
import type { UserTagId } from "./user-tag";

/** The extra payload that lets a spectator render a faithful CLONE of
 *  the broadcaster's practice screen — the same passage state plus the
 *  broadcaster's appearance, caret, behaviour, and resolved theme CSS
 *  vars. Optional: an old client (or a future lighter mode) can omit it,
 *  and the spectator falls back to the read-only progress mirror.
 *
 *  `appearance` / `caret` are schema-validated partial pref shapes
 *  (merged over the client defaults on render); `themeVars` is an
 *  allowlisted map of resolved CSS custom properties (e.g.
 *  `--background`, `--ft-passage-typed`) applied to the clone container
 *  so colours + fonts match. */
/** One keystroke in a finished run's event log — drives the results
 *  chart + heatmap. `wordIndex` is rebased to the windowed `words`. */
export type LiveKeyEvent = {
  t: number;
  expected: string;
  typed: string;
  correct: boolean;
  wordIndex: number;
};

/** Per-second WPM sample for the results chart. */
export type LiveWpmSample = { t: number; wpm: number; raw: number };

export type LiveScreen = {
  /** Practice phase — the spectator renders the matching surface:
   *  rest/running → passage, done → the results report. */
  phase: string;
  /** Per-word typed text, aligned with `words` (windowed identically). */
  typed: string[];
  cursorWord: number;
  cursorChar: number;
  mode: string;
  /** Word count / seconds / quote-group, for the mode bar + results. */
  length: number;
  quoteSource: string | null;
  elapsedMs: number;
  raw: number;
  /** The static "meta" block. Optional because the broadcaster sends it
   *  only every ~8th frame; the server backfills lean frames from the
   *  last stored value, and consumers merge over client defaults, so a
   *  rare gap degrades to defaults rather than breaking. */
  appearance?: LiveAppearance;
  caret?: LiveCaret;
  behaviour?: { blindMode?: boolean };
  themeVars?: LiveThemeVars;
  /** Sent on the `done` frame so the spectator's results report (chart,
   *  heatmap, per-letter) renders from the broadcaster's real run. */
  wpmHistory?: LiveWpmSample[];
  events?: LiveKeyEvent[];
};

/** A broadcaster's latest live-practice state. Snapshotted ~every
 *  700ms while they practice (if sharing is on). Carries the passage so
 *  a spectator can render it, plus the optional `screen` clone payload. */
export type LiveSnapshot = {
  words: string[];
  /** Cursor position (chars typed). */
  progressChars: number;
  totalChars: number;
  wpm: number;
  accuracy: number;
  screen?: LiveScreen;
};

/** Max words a single live snapshot may carry. The broadcaster windows
 *  the passage to this many words around the caret before pushing, so an
 *  unbounded TIME run (whose word buffer grows past this) never blows the
 *  cap and 400s. Shared by the schema and the windowing helper so the two
 *  can't drift. */
export const LIVE_MAX_WORDS = 300;

const liveScreenSchema = z.object({
  phase: z.string().max(12),
  typed: z.array(z.string().max(160)).max(LIVE_MAX_WORDS),
  cursorWord: z.number().int().min(0).max(100_000),
  cursorChar: z.number().int().min(0).max(2_000),
  mode: z.string().max(16),
  length: z.number().int().min(0).max(100_000),
  quoteSource: z.string().max(400).nullable(),
  elapsedMs: z.number().min(0).max(86_400_000),
  raw: z.number().min(0).max(1000),
  // The static "meta" block (appearance, caret, behaviour, resolved
  // theme vars) — shape-validated against the real pref types (see
  // live-screen-meta.ts): unknown keys are stripped, invalid values
  // degrade to the field's default on the clone rather than 400ing.
  // OPTIONAL on the wire: the broadcaster only sends them every ~8th
  // frame, and the server backfills the lean frames in between from the
  // last stored value — so the steady-state push is tiny.
  appearance: liveAppearanceSchema.optional(),
  caret: liveCaretSchema.optional(),
  behaviour: z.object({ blindMode: z.boolean().optional() }).optional(),
  themeVars: liveThemeVarsSchema.optional(),
  wpmHistory: z
    .array(
      z.object({
        t: z.number(),
        wpm: z.number(),
        raw: z.number(),
      }),
    )
    .max(3_600)
    .optional(),
  events: z
    .array(
      z.object({
        t: z.number(),
        expected: z.string().max(4),
        typed: z.string().max(4),
        correct: z.boolean(),
        wordIndex: z.number().int().min(0).max(100_000),
      }),
    )
    .max(3_000)
    .optional(),
});

export const liveProgressInputSchema = z.object({
  words: z.array(z.string().min(1).max(80)).min(1).max(LIVE_MAX_WORDS),
  progressChars: z.number().int().min(0).max(100_000),
  totalChars: z.number().int().min(0).max(100_000),
  wpm: z.number().min(0).max(500),
  accuracy: z.number().min(0).max(100),
  screen: liveScreenSchema.optional(),
});
export type LiveProgressInput = z.infer<typeof liveProgressInputSchema>;
/** `accepted` is false when sharing is off — the broadcaster stops
 *  pushing. `watchers` is how many people are currently watching, so the
 *  broadcaster can stream lazily: full rate when watched, a slow
 *  heartbeat while typing-but-unwatched, and stop when idle + unwatched. */
export type LiveProgressOutput = { accepted: boolean; watchers: number };

export const watchInputSchema = z.object({
  userId: z.string().min(1).max(64),
});
export type WatchInput = z.infer<typeof watchInputSchema>;

export type LiveSubject = {
  userId: string;
  username: string | null;
  name: string;
  tags: UserTagId[];
  /** Clerk avatar URL; null when unresolved. */
  imageUrl: string | null;
};

/** A mutual friend who is currently broadcasting a live practice run.
 *  Surfaced in the friends hub's "live now" section: display + avatar
 *  plus a snapshot of how the run is going, so a row can show live WPM
 *  and a progress bar without a per-friend `watch` poll. */
export type LiveFriend = {
  userId: string;
  username: string | null;
  name: string;
  tags: UserTagId[];
  imageUrl: string | null;
  wpm: number;
  accuracy: number;
  progressChars: number;
  totalChars: number;
};

export type FriendsLiveOutput = { users: LiveFriend[] };

/** A poll result. `live: false` covers every "can't watch right now"
 *  case — not mutual friends, blocked, not opted in, or simply not
 *  currently practicing — without leaking which. */
export type WatchOutput =
  | { live: false }
  | {
      live: true;
      subject: LiveSubject;
      snapshot: LiveSnapshot;
      updatedAtMs: number;
    };

export type StopLiveOutput = { ok: true };

/** One person currently watching the caller's live run. */
export type LiveSpectator = {
  userId: string;
  /** `@handle` display name. */
  name: string;
};

/** Who is watching the caller right now — drives the broadcaster's
 *  "N people are spectating" readout. */
export type SpectatorsOutput = { watchers: LiveSpectator[] };
