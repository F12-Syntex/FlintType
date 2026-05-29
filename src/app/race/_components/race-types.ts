import type { BotProfile, RaceModeId } from "./race-data";

/** Phases of a single race session.
 *    queue      — first paint; only you in the lobby. User clicks
 *                 "Find race" to enter the matching pool
 *    matching   — bots progressively "join" over a short window;
 *                 lasts ~1–3 seconds depending on mode
 *    lobby      — full grid present, user clicks Start when ready
 *    countdown  — 3..2..1..GO, no input accepted, bots not yet moving
 *    racing     — input flows through PracticeProvider, bots tick
 *    finished   — every racer crossed the line; results panel */
export type RacePhase =
  | "queue"
  | "matching"
  | "lobby"
  | "countdown"
  | "racing"
  | "finished";

export type FeedEvent = {
  /** Race-clock seconds when the event happened. */
  t: number;
  who: string;
  text: string;
  /** Whether to paint this entry in the brand spark — used for
   *  milestones (overtakes, finishes, leader-pulls). */
  accent: boolean;
};

export type TraceSample = {
  /** Race-clock seconds at sample time. */
  t: number;
  /** Map of racer id → instantaneous WPM at this sample. */
  wpmByRacer: Record<string, number>;
};

/** Generic racer snapshot. The human's typing data lives in the
 *  PracticeProvider state — the race layer mirrors a subset
 *  (correctChars, wpm) into a Racer object so lanes / ranking /
 *  finish logic operate on a uniform shape across humans + bots. */
export type Racer = {
  /** Racer id. `"you"` for the local player, a `BotId` for a server
   *  bot, or a server-issued session token for a remote real player.
   *  `isYou` is the canonical check; only the bot-id case is also a
   *  meaningful key (playerColorFor looks it up). */
  id: string;
  name: string;
  flag: string;
  badge: string;
  isYou: boolean;
  /** Bot profile, null for the human. */
  bot: BotProfile | null;
  /** True for the challenge-room host. */
  isHost: boolean;
  /** Lobby ready flag (#26). Bots are always ready; humans toggle it.
   *  Host Start is gated until every non-host human is ready. */
  ready: boolean;
  /** Cursor position in the passage (chars, includes the spaces
   *  between completed words). Monotonic 0..totalChars; drives lane
   *  bars, leader detection, and finish checks. */
  correctChars: number;
  /** Net WPM — server-authoritative for every racer (correct chars / 5
   *  / minute from the gun). Shown directly as "net wpm" — already
   *  error-adjusted, so no extra × accuracy. */
  wpm: number;
  /** Raw WPM — server-authoritative gross speed (all chars / 5 / min).
   *  raw ≥ wpm. Shown as the results "raw" column. */
  raw: number;
  /** Race-clock seconds when this racer crossed the finish line. */
  finishedAt: number | null;
  /** Place 1..N when finished, null while still racing. */
  place: number | null;
  /** Bot-only: fractional progress accumulator so a sub-1 advance
   *  per tick still produces smooth motion. */
  charProgress: number;
  /** When this racer entered the lobby. Null for bots that haven't
   *  joined yet (during the matching phase). You are always joined
   *  at time 0. Used by lanes to filter and by the feed for
   *  "@damiel joined the lobby" entries. */
  joinedAt: number | null;
  /** Accumulated mistype count for this racer (wrong + extra chars).
   *  Drives the destructive-coloured tail on the player-strip bar.
   *  Bots are always 0; the user's number is published per-keystroke. */
  errors: number;
  /** Live accuracy percent (0–100). Bots are always 100. */
  accuracy: number;
  /** True once the racer has fired `race.leave` (or otherwise dropped
   *  out mid-race). Renders a "(disconnected)" tag on the strip. */
  disconnected: boolean;
};

export type RaceState = {
  modeId: RaceModeId;
  phase: RacePhase;
  raceSeed: number;
  words: readonly string[];
  totalChars: number;
  /** Wall-clock when the user clicked Find race; bots join relative
   *  to this. Null in queue/lobby/countdown/racing/finished — only
   *  meaningful during matching. */
  queueStartedAt: number | null;
  countdownStartedAt: number | null;
  raceStartedAt: number | null;
  raceEndedAt: number | null;
  nowMs: number;
  racers: Racer[];
  feed: FeedEvent[];
  trace: TraceSample[];
  /** Tracks the last leader so a feed entry fires once per change. */
  lastLeaderId: string | null;
  /** Which 25/50/75% milestones each racer has already triggered. */
  milestonesByRacer: Record<string, number[]>;
};
