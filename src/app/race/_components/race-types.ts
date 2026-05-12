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
  /** Progress through the race. In passage mode this is the user's
   *  cursor position in chars; in burst mode it's total reps cleared
   *  (`burstItemIdx × repsPerItem + burstReps`). Either way it's a
   *  monotonic 0..totalChars counter that drives lane bars, leader
   *  detection, and finish checks. */
  correctChars: number;
  /** Instantaneous WPM — bots: jitter around target; you: cumulative
   *  since GO, mirrored from practice's calcWpmAndRaw. */
  wpm: number;
  /** Race-clock seconds when this racer crossed the finish line. */
  finishedAt: number | null;
  /** Place 1..N when finished, null while still racing. */
  place: number | null;
  /** Bot-only: fractional progress accumulator so a sub-1 advance
   *  per tick still produces smooth motion. Burst mode uses the same
   *  accumulator for fractional reps; the bot ticks add reps/sec
   *  instead of chars/sec. */
  charProgress: number;
  /** When this racer entered the lobby. Null for bots that haven't
   *  joined yet (during the matching phase). You are always joined
   *  at time 0. Used by lanes to filter and by the feed for
   *  "@damiel joined the lobby" entries. */
  joinedAt: number | null;
  /** Burst-mode only: which item this racer is currently on. 0-based;
   *  equals items.length when finished. Undefined in passage mode. */
  burstItemIdx?: number;
  /** Burst-mode only: reps cleared on the current item (resets on
   *  advance). Undefined in passage mode. */
  burstReps?: number;
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
    }
  | {
      /** Burst mode only — fired by the burst surface after the user
       *  commits an attempt with space. `success` is true when the
       *  attempt passed the threshold WPM and matched the target, in
       *  which case reps += 1 (and on the threshold-hit, itemIdx
       *  advances). On failure reps reset to 0 — the user has to
       *  rebuild their streak on the current item. `wpm` is the
       *  attempt's measured WPM, surfaced as the racer's live wpm so
       *  the lane number reads honestly. */
      type: "USER_BURST_COMMIT";
      now: number;
      success: boolean;
      wpm: number;
    };
