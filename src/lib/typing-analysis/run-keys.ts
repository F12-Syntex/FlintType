import type { RunInput } from "@/types/typing-analysis";
import { noTruth, render, seeded, type Act } from "./run-script-core";

/** Test fixture: a key-level random run. Where run-script's randomScript
 *  edits a clean run, this presses random keys (the next letter, a wrong
 *  one, an early Space, Backspace, Ctrl+Backspace) and renders them by
 *  the practice reducer's rules, so it reaches the odd corners: slips
 *  deleted and skipped, rewrites cut short, going back into a skipped
 *  word. Not used by the engine. */

const POOL = ["the", "quick", "brown", "fox", "jumps", "over", "lazy", "dog", "a", "typing", "flint"];

export function randomKeys(seed: number, o: { acts?: number } = {}): RunInput {
  const rng = seeded(seed * 104729 + 7);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)]!;
  const words = Array.from({ length: 8 + Math.floor(rng() * 10) }, () => pick(POOL));
  // The cursor as the reducer moves it (render's rules), so the next
  // letter is likely and the last word never gets a Space (a TIME
  // passage never runs out).
  const buf: string[] = [""];
  const err = new Set<number>();
  let w = 0;
  const acts: Act[] = [];
  let t = 0;
  const n = o.acts ?? 30 + Math.floor(rng() * 90);
  const key = (ch: string) => {
    const here = buf[w]!;
    const target = words[w]!;
    if (here.length >= target.length + 10) return;
    acts.push({ k: "char", t, ch });
    buf[w] = here + ch;
    if (ch !== target[here.length]) err.add(w);
  };
  for (let i = 0; i < n; i++) {
    t += 60 + rng() * 240 + (rng() < 0.03 ? 1500 : 0);
    const target = words[w]!;
    const here = buf[w]!;
    const x = rng();
    if (x < 0.62) key(target.startsWith(here) && here.length < target.length ? target[here.length]! : pick([...("abcdefgh")]));
    else if (w < words.length - 1 && (x < 0.74 || (here === target && x < 0.86))) {
      acts.push({ k: "space", t });
      if (here !== target) err.add(w);
      buf[++w] ??= "";
    } else if (x < 0.8) key(pick(["1", "2", "7"]));
    else {
      const word = x >= 0.96;
      acts.push({ k: "back", t, word });
      if (here.length > 0) {
        buf[w] = word ? "" : here.slice(0, -1);
        if (target.startsWith(buf[w]!)) err.delete(w);
      } else if (w > 0 && err.has(w - 1)) {
        w--;
        if (word) {
          buf[w] = "";
          err.delete(w);
        }
      }
    }
  }
  const lengthMode = rng() < 0.5 ? "time" : "words";
  return render({ words, acts, ctx: {}, lengthMode, ...(lengthMode === "time" ? { T: Math.round(t + rng() * 400) } : {}), truth: noTruth() });
}
