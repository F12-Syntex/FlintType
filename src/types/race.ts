import { z } from "zod";

/** Race modes the client can request. Keeps this list aligned with
 *  `src/app/race/_components/race-data.ts` — the server only validates
 *  that the requested mode is in the union; the client picks display
 *  data + bot profiles.
 *
 *  Quote racing was retired — every race now draws from the
 *  MonkeyType english.json word list (the same pool single-player
 *  English mode uses), lowercase, no punctuation. Server-side
 *  quote handling in `src/server/race/{room,store,quotes}.ts`
 *  remains dormant; if the mode comes back, re-add "quote" here. */
export const RACE_MODE_IDS = ["1v1", "ffa"] as const;
export type RaceModeId = (typeof RACE_MODE_IDS)[number];

/** Cap on the word pool a host can attach to a challenge. The host
 *  picks any MonkeyType wordlist (same catalog as single-player
 *  practice); the client fetches it and sends a capped pool the server
 *  generates + re-rolls the passage from. Capped so a 450k-word list
 *  can't blow the request body — the head/sample is plenty of variety
 *  for a race passage. */
export const RACE_WORD_POOL_MAX = 2000;

/** Allowed word-count presets for a configurable challenge. */
export const RACE_WORD_COUNTS = [10, 25, 50, 100] as const;
/** Allowed timed-race durations (seconds). A timed race ends when the
 *  clock runs out, ranked by net WPM at that moment, instead of when a
 *  racer completes a fixed passage. */
export const RACE_DURATIONS = [15, 30, 60] as const;

/** Quote length buckets for a QUOTE race. The char-length brackets
 *  mirror monkeytype's (and single-player's `src/lib/quotes.ts`
 *  `QUOTE_GROUPS`) — the parallel is intentional: races keep their own
 *  copy here so these isomorphic types never pull the `"use client"`
 *  practice module onto the server. */
export const RACE_QUOTE_GROUPS = [
  { id: 0, label: "short", min: 0, max: 100 },
  { id: 1, label: "medium", min: 101, max: 300 },
  { id: 2, label: "long", min: 301, max: 600 },
  { id: 3, label: "thicc", min: 601, max: 9999 },
] as const;
export type RaceQuoteGroup = (typeof RACE_QUOTE_GROUPS)[number]["id"];
/** The default "small to large" range a fresh lobby draws from: short,
 *  medium, and long — excludes the 600+ char `thicc` bracket, which
 *  would push a race well past a minute. */
export const DEFAULT_RACE_QUOTE_LENGTHS: readonly RaceQuoteGroup[] = [0, 1, 2];

/** Lifecycle of a server-authoritative race room.
 *    matching   — 5s window for real players to arrive; bots fill in
 *                 every ~1s if seats stay open
 *    lobby      — locked roster; brief breath before countdown
 *    countdown  — fixed 3s, no input accepted, no words revealed
 *    racing     — input flows, server broadcasts progress at 10Hz
 *    finished   — every racer crossed; final placements assigned */
export type RacePhase =
  | "matching"
  | "lobby"
  | "countdown"
  | "racing"
  | "finished";

export type RaceRoomKind = "matchmaking" | "challenge";

/** Wire shape of a single racer in a snapshot. `progressChars` is
 *  the racer's cursor position in the passage (in chars, including
 *  spaces between completed words). Letter-by-letter live sync rides
 *  on this single integer — every keystroke from a real player and
 *  every bot tick on the server moves it forward. */
export type RoomRacer = {
  id: string;
  name: string;
  /** Short geo flag emoji for bots; "—" for real players (we don't
   *  know their location and don't want to guess). */
  flag: string;
  /** Tier/badge label (GRANDMASTER, EXPERT, ADEPT, GUEST, RACER). */
  badge: string;
  isBot: boolean;
  /** Challenge rooms only: marks the player who created the room and
   *  is allowed to press Start. */
  isHost: boolean;
  /** Whether this racer has readied up in the lobby. Bots are always
   *  ready; humans toggle it. The host's Start is gated until every
   *  non-host human is ready, so a challenge can't begin before
   *  everyone's set (issue #26). Meaningless outside the lobby phase. */
  ready: boolean;
  joinedAt: number;
  progressChars: number;
  /** Accumulated mistypes the racer has produced so far — wrong char
   *  presses and extras past the word's length, summed. Bots always
   *  report 0 (their motion is deterministic and error-free). Drives
   *  the destructive-coloured tail on the player-strip bar. */
  errors: number;
  /** Net WPM — correct characters (progress − errors) / 5 / minute,
   *  computed server-side from the gun (raceStartedAt) so every racer
   *  is measured from the same t=0. This is the ranking + headline
   *  "net wpm" value; the results panel and live lineup show it
   *  directly (no extra × accuracy — it's already error-adjusted). */
  wpm: number;
  /** Raw WPM — ALL characters typed / 5 / minute (gross, ignoring
   *  errors), server-side over the same window. raw ≥ wpm always.
   *  The results "raw" column reads this so the label is honest. */
  raw: number;
  /** Live accuracy percent (0–100). Bots are always 100; real
   *  players publish from the typed-vs-target diff. */
  accuracy: number;
  finishedAt: number | null;
  place: number | null;
  /** True once a real player has fired `race.leave` (or otherwise
   *  marked themselves gone). They stay in the snapshot so other
   *  racers can see the "(disconnected)" tag rather than the slot
   *  silently vanishing mid-race. */
  disconnected: boolean;
};

/** Snapshot the client renders from. Server pushes this on every
 *  state change, capped at ~10 Hz when only ticks are arriving.
 *  `words` is intentionally absent during pre-race so no racer can
 *  see the passage before the countdown ends — fairness over
 *  bandwidth, the array adds maybe 200 bytes once it's included. */
export type RoomSnapshot = {
  roomId: string;
  /** Friendly slug for challenge rooms; null for matchmaking rooms
   *  (whose ids don't surface in any URL the user touches). */
  slug: string | null;
  kind: RaceRoomKind;
  modeId: RaceModeId;
  phase: RacePhase;
  /** Only revealed in racing/finished so racers can't pre-read. */
  words?: readonly string[];
  totalChars: number;
  /** Server's wall-clock at snapshot time. Clients compute deltas
   *  against this rather than local clock so a slow client tab doesn't
   *  drift relative to the countdown / race elapsed. */
  serverNowMs: number;
  /** Wall-clock when the matchmaking 5s window closes. Drives the
   *  in-passage poster's subtitle countdown on the client. */
  matchmakingEndsAt: number | null;
  countdownStartedAt: number | null;
  raceStartedAt: number | null;
  raceEndedAt: number | null;
  /** Set for a TIMED race — the race ends this many seconds after it
   *  starts, ranked by net WPM at the buzzer (rather than first to
   *  finish). Absent for the default word-count races. */
  durationSec?: number;
  racers: readonly RoomRacer[];
  /** Set on the final snapshot a challenge room emits before it
   *  disposes itself, when the host hit Cancel. Clients use this to
   *  redirect everyone in the room back to /race with a notice. */
  cancelled?: boolean;
  /** Author / source attribution for quote rooms. Sent on every
   *  snapshot (alongside `words` once racing starts) so the client
   *  can render a "— Source" line under the passage. Absent for
   *  non-quote modes. */
  quoteSource?: string;
  /** 1-indexed round number inside this room. Increments each time
   *  the room transitions back to lobby after a rematch. Clients use
   *  the delta to detect "a new round started" — when this rises,
   *  the practice + race state needs to reset for the new passage. */
  roundNumber: number;
  /** Session tokens of real players who've clicked Rematch since the
   *  current round finished. Bots are implicitly ready (no token,
   *  not in this list). Cleared when the new round transitions to
   *  lobby. Drives the "Ready · waiting for opponent" UI on the
   *  post-race surface. */
  rematchReady: readonly string[];
};

/* ─── Request schemas ──────────────────────────────────────────── */

export const queueInputSchema = z.object({
  modeId: z.enum(RACE_MODE_IDS),
});
export type QueueInput = z.infer<typeof queueInputSchema>;

export type QueueOutput = {
  roomId: string;
  sessionToken: string;
  /** Passage words. Returned at join so the client's PracticeProvider
   *  can mount with them immediately — the UI still hides the text
   *  via the pre-race poster, but PracticeProvider needs them to
   *  drive cursor / error tracking the moment racing begins. */
  words: readonly string[];
  totalChars: number;
  modeId: RaceModeId;
};

export const keystrokeInputSchema = z.object({
  roomId: z.string().min(1),
  sessionToken: z.string().min(1),
  /** Char position in the passage. Capped server-side at totalChars. */
  progressChars: z.number().int().min(0),
  /** Live WPM mirrored from the client's practice calc. */
  wpm: z.number().int().min(0).max(500),
  /** Accumulated mistype count (wrong + extra chars). Optional so
   *  callers from older builds keep working without an explicit 0. */
  errors: z.number().int().min(0).max(10_000).optional(),
  /** Live accuracy percent (0–100). Defaults to 100 if omitted so
   *  older clients don't surface a phantom "0% accuracy" stat. */
  accuracy: z.number().min(0).max(100).optional(),
  /** True the moment the client's practice phase flips to `done`. */
  finished: z.boolean().optional(),
});
export type KeystrokeInput = z.infer<typeof keystrokeInputSchema>;

export type KeystrokeOutput = { ok: true };

export const leaveInputSchema = z.object({
  roomId: z.string().min(1),
  sessionToken: z.string().min(1),
});
export type LeaveInput = z.infer<typeof leaveInputSchema>;

export type LeaveOutput = { ok: true };

export const setReadyInputSchema = z.object({
  roomId: z.string().min(1),
  sessionToken: z.string().min(1),
  ready: z.boolean(),
});
export type SetReadyInput = z.infer<typeof setReadyInputSchema>;
/** `canStart` mirrors the room's all-humans-ready gate so the host's
 *  client can enable/disable Start without waiting for the next SSE
 *  snapshot. */
export type SetReadyOutput = { ok: boolean; canStart: boolean };

export const createChallengeInputSchema = z.object({
  modeId: z.enum(RACE_MODE_IDS),
  /** Passage length for a word-count race. Ignored when `durationSec`
   *  is set (a timed race generates its own long passage). */
  wordCount: z
    .number()
    .int()
    .refine((v) => (RACE_WORD_COUNTS as readonly number[]).includes(v), {
      message: "unsupported word count",
    })
    .optional(),
  /** When set, the race is timed: it runs for this many seconds and is
   *  ranked by net WPM at the buzzer, rather than first-to-finish. */
  durationSec: z
    .number()
    .int()
    .refine((v) => (RACE_DURATIONS as readonly number[]).includes(v), {
      message: "unsupported duration",
    })
    .optional(),
  /** Id of the chosen MonkeyType wordlist (display only — the words
   *  themselves arrive in `wordPool`). */
  wordListId: z.string().min(1).max(64).optional(),
  /** Capped word pool from the chosen wordlist. The server generates
   *  (and re-rolls on rematch) the passage from this pool. Omit to use
   *  the default embedded English pool. */
  wordPool: z
    .array(z.string().min(1).max(60))
    .min(1)
    .max(RACE_WORD_POOL_MAX)
    .optional(),
  /** When true, the challenge is a QUOTE race: the server draws a
   *  random quote whose char-length falls in one of `quoteLengths`.
   *  Takes precedence over `wordCount` / `wordPool` / `durationSec` —
   *  the quote determines the passage. */
  quote: z.boolean().optional(),
  /** Quote length buckets to draw from (ids into `RACE_QUOTE_GROUPS`:
   *  0 short, 1 medium, 2 long, 3 thicc). Defaults to short..long
   *  (`DEFAULT_RACE_QUOTE_LENGTHS`). Ignored unless `quote` is true. */
  quoteLengths: z
    .array(z.number().int().min(0).max(3))
    .min(1)
    .max(4)
    .optional(),
});
export type CreateChallengeInput = z.infer<typeof createChallengeInputSchema>;

export type CreateChallengeOutput = {
  roomId: string;
  slug: string;
  sessionToken: string;
  words: readonly string[];
  totalChars: number;
  modeId: RaceModeId;
};

export const joinChallengeInputSchema = z.object({
  slug: z.string().min(1).max(64),
});
export type JoinChallengeInput = z.infer<typeof joinChallengeInputSchema>;

export type JoinChallengeOutput = {
  roomId: string;
  /** Session token for the joiner. Empty string when the response
   *  represents a spectator slot — spectators don't write to the
   *  room (no keystroke / leave / start) and therefore don't need
   *  a token, but the field is kept for the existing client shape. */
  sessionToken: string;
  words: readonly string[];
  totalChars: number;
  modeId: RaceModeId;
  /** True when the requested challenge was full or already past the
   *  lobby phase — the response represents a read-only spectator
   *  subscription rather than a participant slot. The client renders
   *  the race in view-only mode and never sends keystrokes. */
  spectate?: boolean;
};

export const cancelChallengeInputSchema = z.object({
  roomId: z.string().min(1),
  sessionToken: z.string().min(1),
});
export type CancelChallengeInput = z.infer<typeof cancelChallengeInputSchema>;
export type CancelChallengeOutput = { ok: true };

export const startChallengeInputSchema = z.object({
  roomId: z.string().min(1),
  sessionToken: z.string().min(1),
  /** Host override: start even if not everyone has readied up. */
  force: z.boolean().optional(),
});
export type StartChallengeInput = z.infer<typeof startChallengeInputSchema>;

export type StartChallengeOutput = { ok: true };

export const rematchInputSchema = z.object({
  roomId: z.string().min(1),
  sessionToken: z.string().min(1),
});
export type RematchInput = z.infer<typeof rematchInputSchema>;
export type RematchOutput = {
  ok: true;
  /** True when the caller's ready vote met threshold and the room
   *  has already transitioned into the new round. False means we
   *  recorded the ready state and are waiting for more votes. */
  started: boolean;
};
