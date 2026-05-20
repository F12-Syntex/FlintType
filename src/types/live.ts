import { z } from "zod";
import type { UserTagId } from "./user-tag";

/** The extra payload that lets a spectator render a faithful CLONE of
 *  the broadcaster's practice screen — the same passage state plus the
 *  broadcaster's appearance, caret, behaviour, and resolved theme CSS
 *  vars. Optional: an old client (or a future lighter mode) can omit it,
 *  and the spectator falls back to the read-only progress mirror.
 *
 *  `appearance` / `caret` are opaque pref blobs (merged over the client
 *  defaults on render); `themeVars` is a map of resolved CSS custom
 *  properties (e.g. `--background`, `--ft-passage-typed`) applied to the
 *  clone container so colours + fonts match. */
export type LiveScreen = {
  /** Per-word typed text, aligned with `words` (windowed identically). */
  typed: string[];
  cursorWord: number;
  cursorChar: number;
  mode: string;
  quoteSource: string | null;
  elapsedMs: number;
  raw: number;
  appearance: Record<string, unknown>;
  caret: Record<string, unknown>;
  behaviour: { blindMode?: boolean };
  themeVars: Record<string, string>;
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
  typed: z.array(z.string().max(160)).max(LIVE_MAX_WORDS),
  cursorWord: z.number().int().min(0).max(100_000),
  cursorChar: z.number().int().min(0).max(2_000),
  mode: z.string().max(16),
  quoteSource: z.string().max(400).nullable(),
  elapsedMs: z.number().min(0).max(86_400_000),
  raw: z.number().min(0).max(1000),
  // Opaque pref blobs + resolved theme vars — bounded but not shape-
  // validated (they're the user's own settings, merged over defaults
  // defensively on the spectator side).
  appearance: z.record(z.string(), z.unknown()),
  caret: z.record(z.string(), z.unknown()),
  behaviour: z.object({ blindMode: z.boolean().optional() }),
  themeVars: z.record(z.string().max(64), z.string().max(200)),
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
/** `accepted` is false when the user hasn't opted in to being
 *  spectated — the broadcaster client stops pushing on a false. */
export type LiveProgressOutput = { accepted: boolean };

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
