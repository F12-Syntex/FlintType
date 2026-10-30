import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { breakSeconds, plural, seconds, speed } from "@/lib/format-figure";
import { convertSpeed, SPEED_UNIT_LABEL } from "@/lib/speed-unit";
import type { Finding, FixMode } from "@/types/typing-analysis";

/** Every sentence the result screen's analysis prints (spec-50 §4.2,
 *  §4.3). Pure: no React, so the copy is tested on its own (ui-law §27,
 *  I11). A `{ word }` part is a passage word; the card renders it in a
 *  `<q>`, and `toPlain` quotes it for tests and labels. */

export type CopyPart = string | { word: string };
export type FindingIcon =
  | "crown" | "eraser" | "circle-alert" | "pause" | "hourglass" | "coffee"
  | "trending-down" | "timer" | "circle-check" | "info";
export type FindingCopy = { icon: FindingIcon; lead: CopyPart[]; follow: CopyPart[] | null };
export type CopyUnit = { unit: TypingSpeedUnit; decimals: boolean };

const AFTER_BREAK = "That time still counts in your result.";

function fixingCopy(f: Extract<Finding, { kind: "fixing" }>): FindingCopy {
  const spent = seconds(f.ms);
  if (f.count <= 1) {
    return {
      icon: "eraser",
      lead: [`You spent ${spent} fixing a mistake.`],
      follow: f.noticedLate === 1 ? ["It took a letter or more to notice."] : null,
    };
  }
  let follow: CopyPart[] | null = null;
  if (f.worstWord) follow = ["Much of it was in ", { word: f.worstWord }, "."];
  else if (f.noticedLate != null && f.noticedLate >= 1) follow = [`${f.noticedLate} of them took a letter or more to notice.`];
  else if (f.noticedLate === 0) follow = ["You caught all of them straight away."];
  return { icon: "eraser", lead: [`You spent ${spent} fixing ${plural(f.count, "mistake", "mistakes")}.`], follow };
}

function leftCopy(f: Extract<Finding, { kind: "left" }>, o: CopyUnit): FindingCopy {
  const one = f.count <= 1;
  const lost = speed(f.lostWpm, o.unit, o.decimals);
  const lead = one
    ? "1 word still had a mistake when you moved on."
    : `${plural(f.count, "word", "words")} still had a mistake when you moved on.`;
  const it = one ? "it" : "they";
  const follow = f.canFix
    ? `${one ? "It" : "They"} didn't count, which took about ${lost} off your speed.`
    : `With backspace off, a word with a mistake doesn't count, so ${it} took about ${lost} off your speed.`;
  return { icon: "circle-alert", lead: [lead], follow: [follow] };
}

function beforeCopy(f: Extract<Finding, { kind: "before" }>): FindingCopy {
  if (f.count <= 1) {
    const lead: CopyPart[] = f.longest
      ? ["You paused for ", `${seconds(f.longest.ms)} before `, { word: f.longest.word }, "."]
      : [`You paused once before a word, for ${seconds(f.ms)}.`];
    return { icon: "pause", lead: joinText(lead), follow: null };
  }
  let follow: CopyPart[] | null = null;
  if (f.longWords) follow = ["Longer words made you pause more often."];
  else if (f.longest) follow = [`The longest was ${seconds(f.longest.ms)} before `, { word: f.longest.word }, "."];
  return { icon: "pause", lead: [`You paused before ${plural(f.count, "word", "words")}, ${seconds(f.ms)} in all.`], follow };
}

/** The copy for one engine finding (spec-50 §4.2). */
export function findingCopy(f: Finding, o: CopyUnit): FindingCopy {
  switch (f.kind) {
    case "fixing":
      return fixingCopy(f);
    case "left":
      return leftCopy(f, o);
    case "before":
      return beforeCopy(f);
    case "inside":
      if (f.count === 1) {
        return {
          icon: "hourglass",
          lead: f.topWord
            ? ["You stalled for ", `${seconds(f.ms)} partway through `, { word: f.topWord }, "."]
            : [`You stalled once inside a word, for ${seconds(f.ms)}.`],
          follow: null,
        };
      }
      return {
        icon: "hourglass",
        lead: [`Small hesitations inside words added up to ${seconds(f.ms)}.`],
        follow: f.topWord ? [{ word: f.topWord }, " slowed you most."] : null,
      };
    case "breaks":
      return {
        icon: "coffee",
        lead: [f.count <= 1
          ? `You stopped typing for ${seconds(f.ms)}.`
          : `You stopped typing ${f.count} times, ${seconds(f.ms)} in all.`],
        follow: [AFTER_BREAK],
      };
    case "fade":
      return {
        icon: "trending-down",
        lead: [`You slowed down towards the end, from about ${speed(f.fromWpm, o.unit, o.decimals)} to ${speed(f.toWpm, o.unit, o.decimals)}.`],
        follow: [`That was over the last ${plural(f.lastSeconds, "second", "seconds")}.`],
      };
    case "startUp":
      return {
        icon: "timer",
        lead: ["You took a few words to get going."],
        follow: [`The first ${plural(f.words, "word", "words")} cost about ${seconds(f.ms)}.`],
      };
    case "even":
      return f.mistakes === 0
        ? { icon: "circle-check", lead: ["A clean, even run."], follow: ["Nothing held you up for long."] }
        : { icon: "circle-check", lead: ["An even run."], follow: ["Nothing slowed you down much."] };
    case "short":
      return { icon: "info", lead: ["This test was too short to break down."], follow: null };
    case "clock":
      return { icon: "info", lead: ["This test's timing looks off, so we can't break it down."], follow: null };
  }
}

/** The personal-best line that opens the list (spec-50 §4.2). `wpm` is
 *  the run's final speed; `previousBest` is null on a first test of this
 *  kind and undefined when it isn't known (anonymous, or not back yet). */
export function pbCopy(o: CopyUnit & { noun: string; wpm: number; previousBest: number | null | undefined }): FindingCopy {
  if (o.previousBest === null) {
    return { icon: "crown", lead: [`Your first ${o.noun}. Now there's a best to beat.`], follow: null };
  }
  if (typeof o.previousBest === "number" && Number.isFinite(o.previousBest)) {
    const d = Math.round(convertSpeed(o.wpm, o.unit)) - Math.round(convertSpeed(o.previousBest, o.unit));
    if (d >= 1) {
      return {
        icon: "crown",
        lead: [`Your best ${o.noun} so far, ${d} ${SPEED_UNIT_LABEL[o.unit]} above your previous best.`],
        follow: null,
      };
    }
  }
  return { icon: "crown", lead: [`Your best ${o.noun} so far.`], follow: null };
}

/** The time card's closing line: the speed of the stretches with nothing in the way. */
export function flowLine(flowWpm: number, unit: TypingSpeedUnit, decimals: boolean): string {
  return `When nothing held you up, you typed at about ${speed(flowWpm, unit, decimals)}.`;
}

/** 1 dp with a whole number's ".0" dropped: "1.8", "2". */
function oneDp(x: number): string {
  const r = Math.round(x * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** "How we measure this": four short paragraphs (spec-50 §4.3). */
export function methodParagraphs(a: {
  flowWpm: number | null;
  catchFactor: number | null;
  breakMs: number;
  fixMode: FixMode;
}): string[] {
  const base = "We look at the gap before every key you press and compare it with your own pace in this test";
  let pace = `${base}.`;
  if (a.flowWpm != null && Number.isFinite(a.flowWpm) && a.flowWpm > 0) {
    const kps = oneDp((a.flowWpm * 5) / 60);
    pace = `${base}: how quickly you type when nothing gets in the way. This time that was about ${kps} ${kps === "1" ? "key" : "keys"} a second.`;
  }
  const factor = a.catchFactor != null && Number.isFinite(a.catchFactor)
    ? ` (this time, about ${oneDp(a.catchFactor)} times as long)`
    : "";
  const hesitation = `A key inside a word that takes noticeably longer than your pace${factor} counts as a hesitation. A gap before a word counts as a pause in the same way, against your usual gap between words. Only the extra time goes into those rows.`;
  const fixing = a.fixMode === "none"
    ? "With backspace off, Fixing mistakes is the extra time after a mistake until you move on. Errors, above, counts every wrong key."
    : "Fixing mistakes is the extra time from the key before a mistake until you're back on track, or until you move on. A mistake is one slip and its fix, however many keys it took. Errors, above, counts every wrong key.";
  const breaks = `Breaks are stops of ${breakSeconds(a.breakMs)} or more, plus the wait before your first key in a race. Typing is everything else, and the five parts always add up to the whole test.`;
  return [pace, hesitation, fixing, breaks];
}

/** Plain text: a `{ word }` part in curly quotes. */
export function toPlain(parts: readonly CopyPart[]): string {
  return parts.map((p) => (typeof p === "string" ? p : `“${p.word}”`)).join("");
}

/** Merge adjacent strings so a lead is at most string, word, string. */
function joinText(parts: CopyPart[]): CopyPart[] {
  const out: CopyPart[] = [];
  for (const p of parts) {
    const last = out[out.length - 1];
    if (typeof p === "string" && typeof last === "string") out[out.length - 1] = last + p;
    else out.push(p);
  }
  return out;
}
