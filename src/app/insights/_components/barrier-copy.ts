import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { SLICE_LABEL, seconds } from "@/lib/format-figure";
import type { Barrier, Gate } from "@/types/insights";
import {
  aboutSeconds,
  cap,
  earlierRate,
  fixCostRose,
  moreOf,
  oneDecimal,
  ofEveryMinute,
  remaining,
  worthPhrase,
  type TestKind,
} from "./copy-phrases";

/** "What would help most" rows (spec-40 §3.3.1). Pure, no JSX. */

export function barrierTitle(b: Barrier): string {
  return SLICE_LABEL[b.kind];
}

/** "About 4.5 seconds of every minute now. On your better days, about 1.2 seconds." */
export function barrierEvidence(b: Barrier): string {
  return `${cap(ofEveryMinute(b.recent))} now. On your better days, ${aboutSeconds(b.better)}.`;
}

/** One coaching line per variant. */
export function barrierCoaching(b: Barrier): string {
  switch (b.variant) {
    case "frequency": {
      if (!b.detail.perMin) return "More mistakes than in the tests before.";
      const [a, e] = b.detail.perMin;
      return `More mistakes than in the tests before: about ${oneDecimal(a)} a minute, up from ${earlierRate(e, { about: false })}.`;
    }
    case "cost": {
      // The server sends "cost" whenever the mistake rate test does not
      // pass, so fixing is called slower only when each fix got slower.
      // Otherwise the line adds what the time per fix shows, and never
      // repeats the evidence line unless there is nothing else to say.
      if (fixCostRose(b.detail)) return "Each mistake takes longer to fix than it usually does.";
      const k = b.detail.costKeys;
      if (!k) return "Fixing takes more of each minute than on your better days.";
      return k[0] === k[1] ? "Each fix takes about as long as usual." : "Each fix takes less time than usual.";
    }
    case "longWords":
      return "Longer words make you pause more often.";
    case "pair":
      return b.detail.pair ? `Especially at “${b.detail.pair}”.` : "Spread across many words.";
    case "flat":
      return b.kind === "before" ? "Spread across all kinds of words." : "Spread across many words.";
  }
}

/** "Worth about 3 to 5 wpm." */
export function barrierGain(b: Barrier, unit: TypingSpeedUnit): string {
  return `Worth ${worthPhrase(b.gain, unit)}.`;
}

/** The comparison track's spoken label. */
export function barrierTrackLabel(b: Barrier): string {
  return `Recently ${seconds(b.recent * 1000)} a minute, better days ${seconds(b.better * 1000)} a minute.`;
}

export const TRACK_LABELS: [string, string] = ["Better days", "Recently"];
export const NEXT_STEP_ROW = "This is your next step.";
export const BARRIERS_EMPTY =
  "Nothing stands out. Your pauses and fixes are close to your better days, which is where you want them.";

export function barriersLearning(gate: Gate, kind: TestKind): string {
  return `After ${moreOf(remaining(gate), kind)} we can rank what would help most.`;
}

export function barriersMethod(kind: TestKind): string[] {
  return [
    `We compare your last 10 ${kind.group} with your better days. The range allows for how much your tests vary.`,
    "We only list something when even the cautious end of that range is worth half a second a minute, and the speed you'd reach is an estimate.",
  ];
}
