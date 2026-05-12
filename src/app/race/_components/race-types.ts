import type { BotProfile } from "./race-data";

/** Phases of a single race session.
 *    lobby      — waiting for the user to press start
 *    countdown  — 3..2..1..GO, no input accepted, bots not yet moving
 *    racing     — input accepted, bots ticking, trace sampling
 *    finished   — every racer crossed the finish line; results overlay */
export type RacePhase = "lobby" | "countdown" | "racing" | "finished";

export type FeedEvent = {
  /** Race-clock seconds when the event happened. */
  t: number;
  who: string;
  text: string;
  /** Whether to paint this entry in the brand spark — used for
   *  milestones (overtakes, finishes, leader-pulls). */
  accent: boolean;
};

export type Racer = {
  id: string;
  name: string;
  flag: string;
  badge: string;
  isYou: boolean;
  /** Bot profile, null for the human racer. */
  bot: BotProfile | null;
  /** Number of correctly-typed chars (incl. spaces between words). */
  correctChars: number;
  /** Cumulative wrong-char keystrokes for accuracy math. */
  errorChars: number;
  /** Instantaneous WPM, refreshed by the bot tick / user input. */
  wpm: number;
  /** Race-clock seconds when this racer crossed the finish line. */
  finishedAt: number | null;
  /** Place 1..N when finished, null while still racing. */
  place: number | null;
  /** Bot-only: fractional char accumulator so a sub-1-char advance
   *  per tick still produces smooth motion over multiple ticks. */
  charProgress: number;
};

export type TraceSample = {
  /** Race-clock seconds at sample time. */
  t: number;
  /** Map of racer id → instantaneous WPM at this sample. */
  wpmByRacer: Record<string, number>;
};

export type RaceState = {
  phase: RacePhase;
  raceSeed: number;
  words: string[];
  /** Cumulative char counts before each word index (incl trailing
   *  space). Computed once per race so a racer's correctChars maps
   *  to a (wordIdx, charIdx) cursor in O(words). */
  charsBeforeWord: number[];
  totalChars: number;
  /** Set on countdown start; used to compute the countdown number. */
  countdownStartedAt: number | null;
  /** Set when GO fires. */
  raceStartedAt: number | null;
  /** Set when the last racer finishes. */
  raceEndedAt: number | null;
  /** Most recent now-tick the reducer has seen, used by the UI for
   *  the live elapsed clock without taking another Date.now(). */
  nowMs: number;
  racers: Racer[];
  feed: FeedEvent[];
  trace: TraceSample[];
  /** What you've typed inside the current word, since the last space. */
  typedInWord: string;
  /** Tracks the last leader so a feed entry fires once per change. */
  lastLeaderId: string | null;
  /** Which 25/50/75% milestones each racer has already triggered. */
  milestonesByRacer: Record<string, number[]>;
};

export type Action =
  | { type: "START_COUNTDOWN"; now: number }
  | { type: "START_RACE"; now: number }
  | { type: "TICK"; now: number; trace?: TraceSample }
  | { type: "TYPE_CHAR"; ch: string; now: number }
  | { type: "BACKSPACE" }
  | { type: "SPACE"; now: number }
  | { type: "RESTART"; now: number; seed: number };
