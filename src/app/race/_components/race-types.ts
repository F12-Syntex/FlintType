import type { BotId, BotProfile, RaceModeId } from "./race-data";

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
  id: BotId | "you";
  name: string;
  flag: string;
  badge: string;
  isYou: boolean;
  /** Bot profile, null for the human. */
  bot: BotProfile | null;
  /** Number of correctly-typed chars (incl. spaces between words). */
  correctChars: number;
  /** Instantaneous WPM — bots: jitter around target; you: cumulative
   *  since GO, mirrored from practice's calcWpmAndRaw. */
  wpm: number;
  /** Race-clock seconds when this racer crossed the finish line. */
  finishedAt: number | null;
  /** Place 1..N when finished, null while still racing. */
  place: number | null;
  /** Bot-only: fractional char accumulator so a sub-1-char advance
   *  per tick still produces smooth motion. */
  charProgress: number;
  /** When this racer entered the lobby. Null for bots that haven't
   *  joined yet (during the matching phase). You are always joined
   *  at time 0. Used by lanes to filter and by the feed for
   *  "@damiel joined the lobby" entries. */
  joinedAt: number | null;
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

export type Action =
  | {
      type: "SET_MODE";
      modeId: RaceModeId;
      seed: number;
      now: number;
      /** When true (mode change / first load) we drop straight into
       *  the queue so the user goes through matching. When false
       *  (race-again) we skip ahead to lobby so the bots stay in
       *  place and the user doesn't replay the intro. */
      withQueue: boolean;
    }
  | {
      type: "RESTART";
      seed: number;
      now: number;
      withQueue: boolean;
    }
  | { type: "ENTER_QUEUE"; now: number }
  | { type: "BOT_JOIN"; botIdx: number; now: number }
  | { type: "START_COUNTDOWN"; now: number }
  | { type: "START_RACE"; now: number }
  | {
      type: "TICK";
      now: number;
      /** Snapshot of the user's typing supplied by the bridge so the
       *  reducer doesn't need to cross-read PracticeContext. */
      youCorrectChars: number;
      youWpm: number;
      youFinished: boolean;
      trace?: TraceSample;
    };
