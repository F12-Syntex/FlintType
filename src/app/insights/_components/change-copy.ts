import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { perKey, perMinute, seconds, speed } from "@/lib/format-figure";
import { formatSpeed } from "@/lib/speed-unit";
import type { Change, ChangeKind, Gate } from "@/types/insights";
import { moreOf, remaining, speedDelta, type TestKind } from "./copy-phrases";

/** "What changed" rows (spec-40 §3.3.2). Pure, no JSX. */

const TITLES: Record<Exclude<ChangeKind, "pair">, [better: string, worse: string]> = {
  speed: ["You got faster.", "A little slower."],
  accuracy: ["More accurate.", "Less accurate."],
  fixing: ["Less time fixing mistakes.", "More time fixing mistakes."],
  before: ["Fewer pauses before words.", "More pauses before words."],
  inside: ["Fewer hesitations inside words.", "More hesitations inside words."],
  flow: ["Your flowing speed went up.", "Your flowing speed dipped."],
};

export function changeTitle(c: Change): string {
  if (c.kind === "pair") return `“${c.key ?? ""}” got ${c.direction === "better" ? "quicker" : "slower"}.`;
  return TITLES[c.kind][c.direction === "better" ? 0 : 1];
}

/** Lower is better for time a minute and for a pair's time. */
export function betterIsLower(kind: ChangeKind): boolean {
  return kind === "fixing" || kind === "before" || kind === "inside" || kind === "pair";
}

/** "About 2.1 seconds a minute, down from 3.4 seconds." */
function perMinuteDetail(before: number, after: number): string {
  const now = after < 0.5 ? "Under half a second a minute" : `About ${perMinute(after)}`;
  const was = before < 0.5 ? "under half a second" : seconds(before * 1000);
  return `${now}, ${after <= before ? "down" : "up"} from ${was}.`;
}

export function changeDetail(c: Change, unit: TypingSpeedUnit, earlierN: number): string {
  const up = c.after >= c.before;
  switch (c.kind) {
    case "speed":
      return `About ${speedDelta(c.after - c.before, unit)} ${up ? "more than" : "below"} the ${earlierN} tests before.`;
    case "accuracy":
      return `${Math.round(c.after)}% now, ${up ? "up" : "down"} from ${Math.round(c.before)}%.`;
    case "fixing":
    case "before":
    case "inside":
      return perMinuteDetail(c.before, c.after);
    case "flow":
      return `About ${speed(c.after, unit)} when nothing holds you up, ${up ? "up" : "down"} from ${formatSpeed(c.before, unit)}.`;
    case "pair":
      return `From about ${perKey(c.before)} to ${perKey(c.after)} each time, allowing for your overall speed.`;
  }
}

export const CHANGES_EMPTY =
  "Nothing has changed enough to call it real yet. Most stretches of practice look like this, and that's fine.";

export function changesLearning(gate: Gate, kind: TestKind): string {
  if (gate.unit === "sessions") return "Once your last 10 tests span 2 sessions, we can tell you what's changing.";
  return `After ${moreOf(remaining(gate), kind)} we can tell you what's changing.`;
}
