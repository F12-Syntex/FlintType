import { drillCopyFor } from "@/app/drills/_components/drill-catalog";
import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { ago, keysWorth, oneIn, perMinute, speed } from "@/lib/format-figure";
import type { BarrierDetail, NextStep, PracticeAction, SpeedHeadline, TrendState } from "@/types/insights";
import type { FrictionKey } from "@/types/typing-analysis";
import {
  cap,
  earlierRate,
  fixCostRose,
  moreOf,
  oneDecimal,
  ofEveryMinute,
  remaining,
  shareOf,
  speedDelta,
  worthPhrase,
  type TestKind,
} from "./copy-phrases";

/** The verdict card's copy (spec-40 §3.1): the trend word and its
 *  sentence, and the next step's title, "because" and action label.
 *  Pure, no JSX. */

export const TREND_WORD: Record<TrendState, string> = {
  improving: "Improving.",
  steady: "Holding steady.",
  levelled: "Levelled off.",
  slipping: "A little slower lately.",
  early: "Early days.",
};

const GAIN_FROM: Record<FrictionKey, string> = {
  fixing: "fewer mistakes",
  before: "shorter pauses before words",
  inside: "fewer hesitations inside words",
};
const DROP_FROM: Record<FrictionKey, string> = {
  fixing: "more time fixing mistakes",
  before: "longer pauses before words",
  inside: "more hesitations inside words",
};

export function trendSentence(h: SpeedHeadline, unit: TypingSpeedUnit, kind: TestKind, nowMs: number): string {
  const t = h.trend;
  const d = speedDelta(t.deltaWpm ?? 0, unit);
  switch (t.state) {
    case "improving": {
      const since = t.sinceMs !== null ? ` than ${ago(t.sinceMs, nowMs)}` : " than before";
      const why = t.explanation ? ` Most of the gain came from ${GAIN_FROM[t.explanation]}.` : "";
      return `About ${d} faster${since}.${why}`;
    }
    case "slipping": {
      const why = t.explanation ? ` Most of the drop came from ${DROP_FROM[t.explanation]}.` : "";
      return `Your last 10 tests are about ${d} below the ones before. Tired days and harder passages can both do this.${why}`;
    }
    case "levelled":
      return `You've stayed around ${speed(h.usual, unit)} for about ${t.weeks ?? 2} weeks.`;
    case "steady":
      return "Your recent tests are about where they usually are.";
    case "early":
      if (t.gate?.unit === "sessions") return "We'll call a trend once your recent tests span 2 sessions.";
      return `${cap(moreOf(t.gate ? remaining(t.gate) : 1, kind))} and we can tell which way you're heading.`;
  }
}

export const NEXT_STEP_LABEL = "Your next step";
const PUSH_BECAUSE =
  "Nothing in particular is holding you back. A few tests slightly faster than feels comfortable is how speed grows from here, and some extra mistakes are fine.";

export function nextStepTitle(step: NextStep): string {
  if (step.kind !== "barrier") {
    return {
      levelled: "Push a little past comfortable",
      steady: "Push a little past comfortable",
      improving: "Stretch to a longer test",
      slipping: "Take it easy for a test or two",
      learning: "Keep typing",
    }[step.kind];
  }
  const { barrier, variant, detail } = step;
  if (barrier === "fixing") {
    if (variant === "frequency") return "Make fewer mistakes";
    return fixCostRose(detail) ? "Fix mistakes faster" : "Spend less time fixing mistakes";
  }
  if (barrier === "before") return variant === "longWords" ? "Get ready for longer words" : "Keep moving between words";
  return variant === "pair" && detail.pair ? `Smooth out “${detail.pair}”` : "Type words in one go";
}

/** The step a rate prints as. "1 in 2" (rates from about 0.41) and
 *  "about half" (from 0.45) say the same thing, so they are one step. */
const shareStep = (rate: number) => {
  const s = oneIn(rate);
  return s === "1 in 2" ? "about half" : s;
};

/** True only when you pause before words more often now than on your
 *  better days, by a step the "1 in N" figures show. The barrier is
 *  ranked by seconds a minute, which longer pauses alone can raise, so
 *  copy compares how often only when this holds (like `fixCostRose`). */
export function pauseShareRose(d: BarrierDetail): boolean {
  const r = d.pauseOneIn;
  return !!r && r[0] > r[1] && shareStep(r[0]) !== shareStep(r[1]);
}

/** The better-days side of a comparison whose first figure already says
 *  "about": "1.2 seconds", "half" (ui-law §27 rule 6, one hedge a
 *  sentence). A bound such as "under half a second" stays as it is. */
const againstSeconds = (better: number) => `against ${perMinute(better, "")} on your better days`;
const againstShare = (rate: number) => `against ${oneIn(rate).replace(/^about /, "")} on your better days`;

const mistakesAMinute = (n: number) => `${oneDecimal(n)} ${oneDecimal(n) === "1" ? "mistake" : "mistakes"} a minute`;

/** Without the detailed analysis (`analysed: false`, the not-ready
 *  state) no pause or fix was measured, so these make no claim about
 *  them. */
const UNMEASURED_BECAUSE: Record<"improving" | "slipping" | "push", string> = {
  improving: "Your speed is improving. A longer test shows how well it holds.",
  slipping: "Tired days and harder passages both slow tests down. Try a relaxed test or two before pushing again.",
  push: "A few tests slightly faster than feels comfortable is how speed grows from here, and some extra mistakes are fine.",
};

/** One or two sentences saying why this step, in seconds or counts. */
export function nextStepBecause(step: NextStep, kind: TestKind, o: { analysed: boolean } = { analysed: true }): string {
  if (step.kind !== "barrier") {
    if (step.kind === "learning") {
      // Without the analysis, more tests unlock the trend, not barriers.
      const unlocks = o.analysed ? "show you what would help most" : "tell which way you're heading";
      if (step.gate?.unit === "sessions") return `Once your recent tests span 2 sessions, we can ${unlocks}.`;
      return `${cap(moreOf(step.gate ? remaining(step.gate) : 1, kind))} and we can ${unlocks}.`;
    }
    if (!o.analysed) {
      return UNMEASURED_BECAUSE[step.kind === "improving" || step.kind === "slipping" ? step.kind : "push"];
    }
    if (step.kind === "improving") {
      return "Your pauses and fixes are already close to your better days. A longer test shows how well your speed holds.";
    }
    if (step.kind === "slipping") return "Nothing in particular stands out. Try a relaxed test or two before pushing again.";
    return PUSH_BECAUSE;
  }
  const { barrier, variant, detail, recent, better } = step;
  if (barrier === "fixing" && variant === "frequency" && detail.perMin) {
    const [a, b] = detail.perMin;
    return `You're making about ${mistakesAMinute(a)}, up from ${earlierRate(b, { about: false })} in the tests before. Fixing them takes ${ofEveryMinute(recent)}.`;
  }
  if (barrier === "fixing") {
    const tail = "Fix it the moment you feel it, and delete only the wrong letters.";
    // A per-mistake comparison only when each fix really got slower;
    // otherwise the per-minute figures the slice is ranked by.
    if (fixCostRose(detail)) {
      const [a, b] = detail.costKeys!;
      return `Each mistake takes you about as long as ${keysWorth(a)} to fix, against ${keysWorth(b)} usually. ${tail}`;
    }
    return `Fixing mistakes takes you ${ofEveryMinute(recent)}, ${againstSeconds(better)}. ${tail}`;
  }
  if (barrier === "before") {
    const [a, b] = detail.pauseOneIn ?? [0, 0];
    if (variant === "longWords") {
      return `You pause before ${shareOf(a, "words")}, more often before long ones. Let your eyes read the next word while you finish this one.`;
    }
    const tail = "Short, common words help you flow from one to the next.";
    // How often only when it rose; otherwise the per-minute figures the
    // slice is ranked by (longer pauses alone can raise them).
    if (pauseShareRose(detail)) return `You pause before ${shareOf(a, "words")}, ${againstShare(b)}. ${tail}`;
    return `Pauses before words take you ${ofEveryMinute(recent)}, ${againstSeconds(better)}. ${tail}`;
  }
  if (variant === "pair" && detail.pair) {
    return `You stall partway through words, especially at “${detail.pair}”. Practising your slowest letter pairs trains exactly that.`;
  }
  return `Hesitations inside words take you ${ofEveryMinute(recent)}, ${againstSeconds(better)}.`;
}

/** "Typing like your better days is worth about 3 to 5 wpm." */
export function gainLine(step: NextStep, unit: TypingSpeedUnit): string | null {
  if (step.kind !== "barrier") return null;
  return `Typing like your better days is worth ${worthPhrase(step.gain, unit)}.`;
}

/** The button's words: "Start Tongue-twister gauntlet" or "Take a test". */
export function actionLabel(a: PracticeAction): string {
  if (a.kind === "test") return "Take a test";
  return `Start ${drillCopyFor(a.drillId)?.title ?? a.drillId}`;
}

export function actionHref(a: PracticeAction): string {
  return a.kind === "test" ? "/" : `/drills/${a.drillId}`;
}

/** An alternative's two lines: the drill's title over its `about`. */
export function alternativeLines(a: PracticeAction): { title: string; about: string } {
  if (a.kind === "test") return { title: "Take a test", about: "A normal test of the kind you picked." };
  const copy = drillCopyFor(a.drillId);
  return { title: copy?.title ?? a.drillId, about: copy?.about ?? "" };
}

export const OTHER_WAYS = "Other ways to practise";
