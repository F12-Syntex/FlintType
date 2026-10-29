import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { FINGER_NAME } from "@/lib/hand-layout";
import { keysWorth, list, oneIn, perKey, plural, seconds, speed } from "@/lib/format-figure";
import { FADE_MIN_MS } from "@/lib/typing-analysis/constants";
import { LONG_MIN_LONG } from "@/lib/typing-analysis/pooled/habits";
import type { Gate, Habit, HabitKind, InsightsBucket } from "@/types/insights";
import { remaining, type TestKind } from "./copy-phrases";

/** "Your habits" (spec-40 §3.6): each habit's question, answer, evidence
 *  and "How we know" line, plus the copy for habits still waiting on
 *  data. Pure, no JSX. Answers describe behaviour, never the person. */

export const HABIT_QUESTION: Record<HabitKind, string> = {
  mistakeCost: "How long does a mistake cost you?",
  longWords: "Do longer words make you pause?",
  paceToEnd: "Do you keep your pace to the end?",
  warmUp: "Is your first test of a session slower?",
  fatigue: "Does your accuracy slip later in a session?",
  hands: "Do both hands keep up?",
};

export const HABIT_METHOD: Record<HabitKind, string> = {
  mistakeCost:
    "The extra time from the key before each mistake until you were back on track, across your last 30 tests.",
  longWords: "How often you pause before words of 4 letters or fewer and words of 8 or more.",
  paceToEnd: "Your speed in the first and last thirds of each test of 30 seconds or more.",
  warmUp: "Your first test in each session of two or more tests, against your usual for that kind of test.",
  fatigue:
    "Your accuracy before and after 20 minutes into each session, against your usual for each kind of test, leaving out the last test, because people often stop after a bad one.",
  hands:
    "Your times for keys under each finger, from your smoothest typing, assuming standard touch typing on QWERTY. If you use other fingers, read these as key groups.",
};

export function habitAnswer(h: Habit): string {
  switch (h.kind) {
    case "mistakeCost":
      return `About ${seconds(h.costMs)} each`;
    case "longWords":
      return { "yes-quite": "Yes, quite a bit", "a-little": "A little", "not-really": "Not really" }[h.answer];
    case "paceToEnd":
      return { yes: "Yes", "fade-a-little": "You fade a little", "speed-up": "You speed up" }[h.answer];
    case "warmUp":
      return h.answer === "usually" ? "Usually" : "Not really";
    case "fatigue":
      return h.answer === "after-20" ? "After about 20 minutes" : "Not that we can see";
    case "hands":
      return {
        even: "Yes, evenly",
        "left-slower": "Your left hand is a little slower",
        "right-slower": "Your right hand is a little slower",
        unsupported: "We can't tell yet",
      }[h.answer];
  }
}

/** "about 1 in 3 long words", "about half your long words". */
function share(rate: number, noun: string): string {
  const s = oneIn(rate);
  if (s === "about half" || s === "almost all") return `${s} your ${noun}`;
  return `${s} ${noun}`;
}

const ONE_DP = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

/** The finger's name in running text: "left index finger". */
function fingerName(f: keyof typeof FINGER_NAME): string {
  return `${FINGER_NAME[f].toLowerCase()} finger`;
}

export function habitEvidence(h: Habit, unit: TypingSpeedUnit): string {
  switch (h.kind) {
    case "mistakeCost": {
      const base = `That's about as long as ${keysWorth(h.costKeys)} at your pace.`;
      if (h.noticeKeys === null) return base;
      const nk = Math.round(h.noticeKeys);
      return nk === 0
        ? `${base} You usually notice one straight away.`
        : `${base} You usually notice one within ${plural(nk, "letter", "letters")}.`;
    }
    case "longWords":
      return `You pause before ${share(h.longRate, "long words")}, and ${share(h.shortRate, "short ones")}.`;
    case "paceToEnd":
      if (h.answer === "fade-a-little") {
        return `In ${h.slower} of your last ${h.of} longer tests, the last stretch was slower than the start.`;
      }
      if (h.answer === "speed-up") return "You usually finish faster than you start.";
      return "Your speed at the end of a test is usually about the same as at the start.";
    case "warmUp":
      if (h.answer !== "usually") return "Your first test is usually about as fast as the rest.";
      return h.wpm !== null && h.wpm >= 1
        ? `Your first test averages about ${speed(h.wpm, unit)} below your usual. One easy test first helps.`
        : "Your first test is usually a little slower than the rest. One easy test first helps.";
    case "fatigue":
      if (h.answer !== "after-20") return "Long sessions don't seem to cost you accuracy.";
      return h.accuracyDrop !== null
        ? `Past 20 minutes, your accuracy drops by about ${ONE_DP.format(h.accuracyDrop)} ${ONE_DP.format(h.accuracyDrop) === "1" ? "point" : "points"}. A short break helps.`
        : "Past 20 minutes, your accuracy drops a little. A short break helps.";
    case "hands": {
      if (h.answer === "unsupported") return "We can only tell fingers apart on a QWERTY layout with a physical keyboard.";
      const slowest = h.slowest
        ? ` Keys under your ${fingerName(h.slowest.finger)} (${list(h.slowest.keys)}) are your slowest.`
        : "";
      if (h.answer === "even") return `Your two hands keep pace with each other.${slowest}`;
      const side = h.answer === "left-slower" ? "left" : "right";
      // A gap that rounds to 0.00 s is never printed as a figure.
      const ms = perKey(h.ms ?? 0);
      return ms === perKey(0)
        ? `Keys on your ${side} hand land a little later, under 0.01 s a key.${slowest}`
        : `Keys on your ${side} hand land about ${ms} later.${slowest}`;
    }
  }
}

/** Pace to the end only reads tests of 30 seconds or more. */
const PACE_MIN_S = FADE_MIN_MS / 1000;

/** True when this kind of test never runs 30 seconds: a timed test under
 *  30 seconds, or a words test that takes under 30 seconds at the usual
 *  speed. Quotes vary, so they never count as too short. */
export function testsTooShortForPace(bucket: InsightsBucket | null, usualWpm: number | null): boolean {
  if (!bucket) return false;
  if (bucket.lengthMode === "time") return bucket.length < PACE_MIN_S;
  if (bucket.lengthMode === "words" && usualWpm !== null && usualWpm > 0) {
    return (bucket.length * 60) / usualWpm < PACE_MIN_S;
  }
  return false;
}

/** What a waiting habit needs, as a sentence: "After 4 more tests."
 *  The count names what it counts, so it always moves: pace to the end
 *  counts tests of 30 seconds or more, and when this kind of test
 *  (`tooShort`) never runs that long it says so once instead of
 *  promising a count. */
export function habitGate(kind: HabitKind, gate: Gate, o: { tooShort?: TestKind | null } = {}): string {
  const k = remaining(gate);
  if (kind === "paceToEnd" && gate.unit === "tests") {
    if (o.tooShort && gate.have === 0) {
      return `Only tests of ${PACE_MIN_S} seconds or more can show this. Your ${o.tooShort.group} are shorter.`;
    }
    return `After ${plural(k, "more test", "more tests")} of ${PACE_MIN_S} seconds or more.`;
  }
  if (kind === "mistakeCost" && gate.unit === "tests") {
    return `After ${plural(k, "more test", "more tests")} where you fix a mistake.`;
  }
  switch (gate.unit) {
    case "sessions":
      return kind === "fatigue"
        ? `After ${plural(k, "more session that runs", "more sessions that run")} past 20 minutes.`
        : `After ${plural(k, "more session", "more sessions")} with 2 or more tests.`;
    case "fixes":
      return `After ${plural(k, "more fixed mistake", "more fixed mistakes")}.`;
    case "gaps":
      return kind === "longWords" && gate.need === LONG_MIN_LONG
        ? `After ${plural(k, "more gap", "more gaps")} before long words.`
        : `After ${plural(k, "more gap", "more gaps")} between words.`;
    case "keys":
      return `After ${plural(k, "more key", "more keys")} timed on a keyboard.`;
    case "days":
      return `After ${plural(k, "more day", "more days")}.`;
    case "tests":
      return `After ${plural(k, "more test", "more tests")}.`;
  }
}

export const PENDING_TITLE = "More answers as you practise";
