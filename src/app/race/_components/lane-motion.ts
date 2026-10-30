/** Frame-by-frame motion for a race lane's stone (pure, tested).
 *
 *  Server snapshots move an opponent's progress in steps (bots tick at
 *  10 Hz, people post every ~120 ms, and the stream can bunch them), so
 *  pinning the stone to the latest value makes it jump and stall. Each
 *  animation frame instead:
 *
 *    1. predicts where the racer is now: the last known progress plus
 *       their current speed for the time since that update, capped at a
 *       few characters so a racer who stopped never runs far ahead;
 *    2. eases the drawn position toward that prediction, and never
 *       backwards (a prediction that overshot just waits for the next
 *       update), except for a real drop of a word or more, which is a
 *       restart and snaps back;
 *    3. rolls the stone by the distance it travelled.
 *
 *  Finishing pins the stone to the line, and outside a race it rests at
 *  the start. */

/** Characters per word in the wpm formula. */
const CHARS_PER_WORD = 5;
/** Longest gap between updates that prediction covers. */
const MAX_PREDICT_MS = 600;
/** The furthest a prediction may run past the last known progress. */
const MAX_LEAD_CHARS = 4;
/** A drop at least this big is a restart, not snapshot jitter. */
const RESTART_DROP_CHARS = 5;
/** Easing time constant: about 63% of the way to the target per tau. */
const TAU_MS = 90;

export type LaneMotion = {
  /** Drawn position, 0 (start) to 1 (finish line). */
  pos: number;
  /** Stone rotation in degrees (it rolls as it moves). */
  angle: number;
};

export type LaneTarget = {
  /** Last known correct characters. */
  chars: number;
  totalChars: number;
  /** Current speed, used to predict between updates (0 = none). */
  wpm: number;
  /** Time since `chars` last changed. */
  sinceUpdateMs: number;
  finished: boolean;
  /** False before the gun: the stone rests at the start. */
  racing: boolean;
};

/** Where the racer probably is right now, 0 to 1. */
export function predictedProgress(t: LaneTarget): number {
  if (!t.racing || t.totalChars <= 0) return 0;
  if (t.finished) return 1;
  const since = Math.min(Math.max(0, t.sinceUpdateMs), MAX_PREDICT_MS);
  const lead = Math.min(
    (Math.max(0, t.wpm) * CHARS_PER_WORD * since) / 60_000,
    MAX_LEAD_CHARS,
  );
  // A racer who hasn't finished never reaches the line on a guess.
  const chars = Math.min(t.chars + lead, t.totalChars - 0.5);
  return clamp01(Math.max(t.chars, chars) / t.totalChars);
}

/** One animation frame. `trackPx` and `stonePx` size the roll (the
 *  stone turns once per circumference travelled); `roll` is false under
 *  reduced motion. */
export function stepLaneMotion(
  prev: LaneMotion,
  target: LaneTarget,
  dtMs: number,
  trackPx: number,
  stonePx: number,
  roll = true,
): LaneMotion {
  const goal = predictedProgress(target);
  let pos: number;
  if (!target.racing) {
    pos = 0;
  } else if (target.finished) {
    pos = ease(prev.pos, 1, dtMs);
  } else if (
    target.totalChars > 0 &&
    (prev.pos - goal) * target.totalChars >= RESTART_DROP_CHARS
  ) {
    pos = goal;
  } else if (goal <= prev.pos) {
    pos = prev.pos;
  } else {
    pos = ease(prev.pos, goal, dtMs);
  }
  const moved = (pos - prev.pos) * Math.max(0, trackPx);
  const turn =
    roll && stonePx > 0 ? (moved / (Math.PI * stonePx)) * 360 : 0;
  return { pos, angle: roll ? (prev.angle + turn) % 360 : 0 };
}

/** True once the drawn stone has caught up and nothing more will move it
 *  until the next update (lets the frame loop sleep). */
export function isSettled(m: LaneMotion, target: LaneTarget): boolean {
  if (target.racing && !target.finished && target.wpm > 0) return false;
  return Math.abs(predictedProgress(target) - m.pos) < 1e-4;
}

function ease(from: number, to: number, dtMs: number): number {
  const k = 1 - Math.exp(-Math.max(0, dtMs) / TAU_MS);
  const next = from + (to - from) * k;
  return Math.abs(to - next) < 1e-4 ? to : next;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
