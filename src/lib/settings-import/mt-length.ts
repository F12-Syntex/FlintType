import { lengthLabel } from "../test-name";
import { fallbackLength } from "./ft-values";
import { clamp, JUNK_NOTE, num, own, type MtCollector } from "./mt-values";

/** The test length a MonkeyType file sets, for the mode it imports.
 *  flinttype keeps one length, so only the mode's own key is read
 *  (`time`, `words` or `quoteLength`) and counted as used; the other two
 *  change nothing here. Pure. */

const QUOTE_NAMES = ["Short", "Medium", "Long", "Extra long"];
const quoteIds = (v: readonly unknown[]): number[] =>
  v.filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id >= 0 && id <= 3);

/** MonkeyType's defaults, used for a length the file leaves out:
 *  MonkeyType reads a partial file over them. */
const MT_TIME = 30;
const MT_WORDS = 50;
const MT_QUOTE_LENGTH = [1];
/** What All becomes: Medium, MonkeyType's default and flinttype's. */
const QUOTE_ALL = 1;

/** flinttype's quote length for MonkeyType's quoteLength list.
 *  MonkeyType plays a random quote from every bracket listed (all four is
 *  its All); flinttype plays one length, so a list of several becomes one
 *  of them, said in the Test setup note. Favourites (-3) win, as in
 *  MonkeyType, and a lone -2 is a search: neither is available. All
 *  (every bracket, or the old -1 and an empty list) is Medium, both
 *  apps' default; any other list is its shortest bracket. */
function quoteLength(raw: unknown): { length: number; from: string; several: boolean } | { note: string } {
  const list = raw === undefined ? MT_QUOTE_LENGTH : raw;
  if (!Array.isArray(list)) return { note: JUNK_NOTE };
  if (list.includes(-3) || (list.length === 1 && list[0] === -2)) {
    return { note: "Favourite quotes and quote search aren't available." };
  }
  // Each bracket once, shortest first, however long the list.
  const ids = [...new Set(quoteIds(list))].sort((a, b) => a - b);
  if (ids.length === QUOTE_NAMES.length || (ids.length === 0 && list.every((id) => id === -1))) {
    return { length: QUOTE_ALL, from: "All", several: true };
  }
  if (ids.length) return { length: ids[0], from: ids.map((id) => QUOTE_NAMES[id]).join(", "), several: ids.length > 1 };
  return { note: JUNK_NOTE };
}

/** The practice slice's mode and length before the import. */
export type PracticeNow = { mode?: unknown; length?: unknown };

/** The test length for `mode` (a flinttype mode): from quoteLength for
 *  quotes, else from time or words. A length that can't be used is
 *  listed, and the test still lands on one the mode can run
 *  (`fallbackLength`). */
export function mapLength(col: MtCollector, mode: string, current: PracticeNow): void {
  const { mt } = col;
  const key = mode === "QUOTE" ? "quoteLength" : mode === "TIME" ? "time" : "words";
  const opts = { practiceMode: mode };
  const write = (from: string, value: number) => {
    col.use(key);
    col.slice("test", "practice", "length", "Length", from, value, opts);
  };
  const unusable = (label: string, note: string) => {
    col.bad(key, label, note);
    const length = fallbackLength(mode, current);
    if (length === undefined) return;
    col.slice("test", "practice", "length", "Length", "", length, { ...opts, origin: "Default for this mode" });
  };
  if (mode === "QUOTE") {
    const q = quoteLength(own(mt, key));
    if ("note" in q) return unusable("Quote length", q.note);
    if (q.several) col.note("test", `One quote length plays at a time, so ${QUOTE_NAMES[q.length]} is used.`);
    return write(q.from, q.length);
  }
  const n = Object.hasOwn(mt, key) ? num(mt, key) : mode === "TIME" ? MT_TIME : MT_WORDS;
  if (n === undefined) return unusable("Test length", JUNK_NOTE);
  if (n <= 0) return unusable("Test length", "Endless tests aren't available.");
  write(lengthLabel(mode === "TIME" ? "time" : "words", Math.round(n)), clamp(Math.round(n), 1, 1000));
}
