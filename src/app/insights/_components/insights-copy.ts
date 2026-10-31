import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { speed, speedRange } from "@/lib/format-figure";
import { formatTestName } from "@/lib/test-name";
import type { Gate, InsightsBucket, InsightsOverviewOutput, Range } from "@/types/insights";
import { countOf, moreOf, remaining, type TestKind } from "./copy-phrases";

/** Page-level copy for /insights (spec-40 §2, §3.2, §4, §5): header and
 *  section descriptions, the time section's lines, the disclosures,
 *  page states and the learning steps. Pure, no JSX. Every string passes
 *  `bannedPatterns` (insights-copy.test.ts). */

/** The usual window: the newest 30 tests of the bucket. */
const USUAL_WINDOW = 30;
/** Below this many tests the page is in its learning state. */
export const READY_TESTS = 5;

const ONE_DP = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

export const PAGE_TITLE = "How you type";

export function headerDescription(o: {
  status: InsightsOverviewOutput["status"]; tests: number; kind: TestKind; every?: boolean;
}): string {
  if (o.status === "empty" || o.tests < 1) return "Your analysis builds from every test you finish.";
  const of = o.every ? ", of every length" : "";
  if (o.tests < READY_TESTS) return `Based on the ${countOf(o.tests, o.kind)} you've finished so far${of}.`;
  return `Based on your last ${countOf(Math.min(o.tests, USUAL_WINDOW), o.kind)}${of}.`;
}

// Where your time goes (§3.2)

export const TIME_TITLE = "Where your time goes";

export function timeDescription(tests: number, kind: TestKind): string {
  return `A typical minute from your last ${countOf(tests, kind)}.`;
}

export const TIME_LEARNING_DESCRIPTION = "Your last test, scaled to one minute.";
export const RECENT_BAR_LABEL = "Your recent minute";
export const BETTER_BAR_LABEL = "On your better days";
export const LAST_BAR_LABEL = "Your last test";

export function timeLearningLine(gate: Gate, kind: TestKind): string {
  return `After ${moreOf(remaining(gate), kind)} you'll see a typical minute, and how it compares with your better days.`;
}

export function flowLine(flowWpm: number, unit: TypingSpeedUnit): string {
  return `When nothing holds you up, you type at about ${speed(flowWpm, unit)}.`;
}

export function whatIfLine(whatIf: Range, unit: TypingSpeedUnit): string {
  return `If your pauses and fixes matched your better days, you'd type ${speedRange(whatIf.low, whatIf.high, unit)}.`;
}

export const COARSE_NOTE = "Your browser rounds key timings, so hesitations inside words can't be measured.";
export const NOT_READY_LINE =
  "Detailed analysis isn't available yet. Your speed and trend are still up to date.";

/** "How we measure this" under the minute bars (§5). */
export function timeMethod(o: { keysPerSecond: number | null; catchFactor: number; tests: number; kind: TestKind }): string[] {
  const pace =
    "We look at the gap before every key you press and compare it with your own pace: how quickly you type when nothing gets in the way.";
  return [
    o.keysPerSecond === null ? pace : `${pace} Lately that's about ${ONE_DP.format(o.keysPerSecond)} keys a second.`,
    `A key inside a word that takes noticeably longer than your pace for that kind of key (lately about ${ONE_DP.format(o.catchFactor)} times as long) counts as a hesitation. A gap before a word counts as a pause in the same way, measured against your usual gap between words. Only the extra time goes into those rows; the rest counts as typing. Fixing mistakes is the extra time from the key before a mistake until you're back on track, or until you move on. Breaks are stops of 2 seconds or more (longer if you type slowly), plus the wait before your first key in a race.`,
    `For each row, better days is the level of your better quarter of tests, after allowing for how much short tests vary by chance. Every row comes from your last ${countOf(o.tests, o.kind)}, and each minute always adds up to 60 seconds.`,
  ];
}

// Other sections' frames

export const HELP_TITLE = "What would help most";
export const HELP_DESCRIPTION = "Ranked by the time you'd get back.";
export const CHANGES_TITLE = "What changed";

export function changesDescription(earlierN: number): string {
  return `Your last 10 tests against the ${earlierN} before.`;
}

export const PRACTICE_TITLE = "Where it shows";
export const PRACTICE_DESCRIPTION = "The letter pairs and words that are slowest for you each time you type them.";
export const TREND_TITLE = "Your speed over time";
export const HABITS_TITLE = "Your habits";
export const HABITS_DESCRIPTION = "Answers from your own tests.";
export const PLAYGROUND_TITLE = "Try any text";
export const PLAYGROUND_DESCRIPTION = "See how fast you'd likely type any words.";
export const LEARNING_TITLE = "More as you practise";

export const PRACTICE_METHOD = [
  "Each pair's extra time is measured against your usual time for the same kind of move (same finger, same hand or switching hands), and it includes the time its mistakes cost you to fix. Words are compared with how long words of the same length usually take you, using only words you typed without a mistake.",
  "We only list something once we're fairly sure it's slower, so the figures are on the careful side.",
];

export const CHANGES_METHOD = [
  "We compare the middle of your last 10 tests with the middle of the ones before. Tests from one session tend to move together, so we count sessions as well as tests.",
  "We only call it a change when it's clearly bigger than your normal swing and big enough to matter, so most weeks show nothing. Letter pairs are compared with your overall speed taken out, so getting faster everywhere doesn't count as a pair improving.",
];

export const ADAPT_NOTE =
  "Adapt picks words you find harder, and how hard depends on your recent form, so these speeds allow for how hard each passage was for you.";

export const ADAPT_METHOD = [
  "Adapt picks words you find harder, and how hard depends on your recent form. We estimate how hard each passage was for you from your own letter-pair times.",
  "Only the part of a test spent inside words depends on that, so we scale that part to a passage that's typical for you. Casual tests and races aren't adjusted.",
];

// The pooled "All Adapt tests" view (pooled/all-adapt.ts)

function anchorGroup(b: InsightsBucket): string {
  return formatTestName({ mode: b.mode, lengthMode: b.lengthMode, length: b.length, touch: b.touch }).group;
}

/** What the pooled view's speeds are, plus the tests it leaves out. */
export function scaledNote(b: InsightsBucket): string {
  const base = `Speeds are scaled to your ${anchorGroup(b)}, so every length counts on one footing.`;
  const left = b.all?.leftOut ?? 0;
  if (left === 0) return base;
  return left === 1
    ? `${base} One test joins once its length has 5 tests.`
    : `${base} ${left} tests join once their length has 5 tests.`;
}

/** The note under the speed figures: the pooled scaling, the Adapt
 *  difficulty allowance, both, or nothing. */
export function speedNote(adjusted: boolean, bucket: InsightsBucket | null): string | null {
  if (bucket?.all) {
    const note = scaledNote(bucket);
    return adjusted ? `${note} They also allow for how hard each passage was for you.` : note;
  }
  return adjusted ? ADAPT_NOTE : null;
}

/** "How we measure this" for those notes. */
export function speedMethod(adjusted: boolean, bucket: InsightsBucket | null): string[] {
  const out: string[] = [];
  if (bucket?.all) {
    out.push(
      "A short test usually runs faster than a long one. So each test is compared with your usual for its own length.",
      `Then it's scaled to your ${anchorGroup(bucket)}. A length joins once it has 5 tests, so its usual can be trusted.`,
    );
  }
  if (adjusted) out.push(...ADAPT_METHOD);
  return out;
}

// Page states (§4)

export const EMPTY_TITLE = "Take your first test";
export const EMPTY_BODY = "After one test you'll see where its time went. After a few more, what would help you most.";
export const TAKE_A_TEST = "Take a test";
export const SIGN_IN = "Sign in";
export const TRY_AGAIN = "Try again";
export const ERROR_TITLE = "We couldn't load your insights";
/** Over the previous content when a bucket switch fails. The picker has
 *  gone back, so the line names the kind that failed. */
export function switchErrorTitle(kind: TestKind): string {
  return `We couldn't load your ${kind.group}.`;
}
export const SIGN_IN_LINE = "Sign in to see your insights.";
export const RATE_LIMITED_LINE = "Too many refreshes in a row. Wait a moment, then try again.";
export const OFFLINE_LINE = "Check your connection, then try again.";

export function errorCodeLine(code: string): string {
  return `Error code: ${code}.`;
}

/** What unlocks as you practise (§4), with each step's count to go. */
export function learningSteps(
  progress: InsightsOverviewOutput["progress"],
  kind: TestKind,
): { title: string; detail: string; done: boolean }[] {
  const toGo = (have: number, need: number) => (have >= need ? "" : ` ${need - have} to go.`);
  const p = progress;
  return [
    { title: "Where a test's time goes", detail: "After 1 test.", done: p.analysed >= 1 },
    { title: "Your usual speed", detail: `After 5 ${kind.group}.${toGo(p.tests, 5)}`, done: p.tests >= 5 },
    { title: "What would help most", detail: `After 10 ${kind.group}.${toGo(p.analysed, 10)}`, done: p.analysed >= 10 },
    {
      title: "What's changing",
      detail: `After 15 ${kind.group} over 2 sessions.`,
      done: p.tests >= 15 && p.sessions >= 2,
    },
    {
      title: "Whether you've levelled off",
      detail: "After 30 tests over 2 weeks.",
      done: p.tests >= 30 && p.spanDays >= 14,
    },
    {
      title: "Your warm-up and stamina",
      detail: "After 8 sessions of 2 or more tests.",
      done: p.sessionsWithTwo >= 8,
    },
  ];
}
