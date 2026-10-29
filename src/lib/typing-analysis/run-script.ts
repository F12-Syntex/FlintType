import type { RunInput } from "@/types/typing-analysis";
import {
  actLike, find, keyGap, mod, noTruth, otherThan, POOL, render, scriptOf, seeded, shiftFrom, stretch, type Act, type Truth,
} from "./run-script-core";

/** Test fixture DSL for the typing analysis (spec-10 §16.1). Every
 *  function returns a capture v2 RunInput rendered by the practice
 *  reducer's rules, so the scripts replay with zero mismatches. Inserted
 *  time is recorded per slice and read back with `truth`. Apply
 *  `stopOnError` before adding mistakes, and `asV1` last. */

const JITTER = [0, 3, -2, 1, -3, 2, -1];

/** Key gap 100 ms, word gap 200 ms (two strokes; the Space halfway), first
 *  key at t = 0. A ±3 ms cycle (`jitter`, 0 for exact gaps) keeps the
 *  stream off the 16.667/100 ms grids the quantisation check looks for. */
export function steady(words: string[], o: { key?: number; gap?: number; ht?: boolean; src?: "input"; jitter?: number } = {}): RunInput {
  const key = o.key ?? 100;
  const gap = o.gap ?? 200;
  const jit = (o.jitter ?? 3) / 3;
  const acts: Act[] = [];
  let t = 0;
  let n = 0;
  const extra = (x: number) => ({ ...(o.ht ? { ht: x } : {}), ...(o.src ? { src: o.src } : {}) });
  words.forEach((w, wi) => {
    [...w].forEach((ch, ci) => {
      if (wi > 0 || ci > 0) {
        const g = (ci === 0 ? gap : key) + JITTER[n++ % JITTER.length]! * jit;
        if (ci === 0) acts.push({ k: "space", t: t + g / 2, ...extra(t + g / 2) });
        t += g;
      }
      acts.push({ k: "char", t, ch, ...extra(t) });
    });
  });
  return render({ words, acts, ctx: {}, lengthMode: "words", truth: noTruth() });
}

/** A wrong key at (word, pos), `noticeAfter` more letters, then
 *  `backspaces` (default all of them; 0 leaves it in) after `fixGapMs`
 *  (default one key gap), and the letters retyped. With stop on error the
 *  wrong key is blocked: 1 + noticeAfter blocked repeats, then the right
 *  key `fixGapMs` after the last. */
export function withMistake(r: RunInput, o: { word: number; pos: number; wrong?: string; noticeAfter?: number; backspaces?: number; fixGapMs?: number }): RunInput {
  return mod(r, (sc, ix, inp) => {
    const i = find(ix, inp, (e) => e.wordIndex === o.word && e.pos === o.pos && e.correct);
    if (i < 0) return;
    const key = keyGap(inp);
    const fixGap = o.fixGapMs ?? key;
    const at = sc.acts[i]! as Extract<Act, { k: "char" }>;
    const wrong = o.wrong ?? otherThan(inp.timings[ix[i]!]!.expected);
    const notice = o.noticeAfter ?? 0;
    if (sc.ctx.stopOnError === true || sc.ctx.suddenDeath === true) {
      const reps = Array.from({ length: 1 + notice }, (_, m) => actLike(at, at.t + m * key, { k: "char", ch: wrong }));
      const delta = notice * key + fixGap;
      shiftFrom(sc.acts, i, delta);
      sc.acts.splice(i, 0, ...reps);
      sc.truth.fixing += delta;
      return;
    }
    at.ch = wrong;
    let last = i;
    let seen = 0;
    for (let j = i + 1; j < sc.acts.length && seen < notice; j++) {
      if (ix[j]! < 0) continue;
      if (inp.timings[ix[j]!]!.wordIndex !== o.word) break;
      last = j;
      seen++;
    }
    const n = o.backspaces ?? seen + 1;
    if (n <= 0) return;
    const target = sc.words[o.word] ?? "";
    const retype = target.slice(Math.max(0, o.pos + seen + 1 - n), o.pos + seen + 1);
    const t0 = sc.acts[last]!.t;
    const near = sc.acts[last];
    const block: Act[] = [
      ...Array.from({ length: n }, (_, m) => actLike(near, t0 + fixGap + m * key, { k: "back" })),
      ...[...retype].map((ch, m) => actLike(near, t0 + fixGap + (n - 1 + m + 1) * key, { k: "char", ch })),
    ];
    const delta = fixGap + (n - 1) * key + retype.length * key;
    shiftFrom(sc.acts, last + 1, delta);
    sc.acts.splice(last + 1, 0, ...block);
    sc.truth.fixing += delta;
  });
}

export function withPause(r: RunInput, o: { beforeWord?: number; insideWord?: [w: number, afterPos: number]; ms: number }): RunInput {
  if (o.beforeWord !== undefined) return stretch(r, (e) => e.wordIndex === o.beforeWord, o.ms, "before");
  const [w, p] = o.insideWord ?? [0, 0];
  return stretch(r, (e) => e.wordIndex === w && e.pos === p + 1, o.ms, "inside");
}

export function withBreak(r: RunInput, o: { beforeWord: number; ms: number }): RunInput {
  return stretch(r, (e) => e.wordIndex === o.beforeWord, o.ms, "breaks");
}

/** Ends a WORDS or QUOTE run on Space: the reducer finishes on Space only
 *  when the last word isn't exact, so its last letter is dropped and Space
 *  comes `tailMs` (default 150) after the letter before. */
export function endOnSpace(r: RunInput, o: { tailMs?: number } = {}): RunInput {
  return mod(r, (sc, ix) => {
    if (sc.lengthMode === "time") return;
    const i = ix.reduce((m, e, j) => (e >= 0 ? j : m), -1);
    if (i < 1) return;
    sc.acts.splice(i);
    const prev = sc.acts[sc.acts.length - 1]!;
    sc.acts.push(actLike(prev, prev.t + (o.tailMs ?? 150), { k: "space" }));
  });
}

/** A race: the clock starts `headMs` before the first key (ht unchanged). */
export function raceAnchor(r: RunInput, headMs: number): RunInput {
  return mod(r, (sc) => {
    shiftFrom(sc.acts, 0, headMs, true);
    sc.ctx.race = true;
    if (sc.T !== undefined) sc.T += headMs;
  });
}

/** A TIME run of length T: no finish on the last letter; keys after T never happen. */
export function timeRun(r: RunInput, T: number): RunInput {
  return mod(r, (sc) => {
    sc.lengthMode = "time";
    sc.T = T;
  });
}

/** Space as the very first key: word 0 is skipped and word 1 starts `gapMs` later. */
export function firstKeySpace(r: RunInput, gapMs: number): RunInput {
  return mod(r, (sc, ix, inp) => {
    const i1 = find(ix, inp, (e) => e.wordIndex === 1);
    if (i1 < 0) return;
    sc.acts.splice(0, i1);
    shiftFrom(sc.acts, 0, gapMs - sc.acts[0]!.t);
    sc.acts.unshift(actLike(sc.acts[0], 0, { k: "space" }));
  });
}

export const stopOnError = (r: RunInput): RunInput => mod(r, (sc) => void (sc.ctx.stopOnError = true));

/** n extra letters after word's last letter, deleted again or left in. */
export function extras(r: RunInput, o: { word: number; n: number; deleted: boolean }): RunInput {
  return mod(r, (sc, ix, inp) => {
    const i = find(ix, inp, (e) => e.wordIndex === o.word, true);
    if (i < 0) return;
    const key = keyGap(inp);
    const near = sc.acts[i]!;
    const block: Act[] = Array.from({ length: o.n }, (_, m) => actLike(near, near.t + (m + 1) * key, { k: "char", ch: "x" }));
    if (o.deleted) for (let m = 0; m < o.n; m++) block.push(actLike(near, near.t + (o.n + m + 1) * key, { k: "back" }));
    const delta = block.length * key;
    shiftFrom(sc.acts, i + 1, delta);
    sc.acts.splice(i + 1, 0, ...block);
    if (o.deleted) sc.truth.fixing += delta;
  });
}

/** Word's last letter wrong, Space, the next word's first letter, then
 *  back across into the word to fix it, Space, and on. */
export function backIntoPrevious(r: RunInput, o: { word: number }): RunInput {
  return mod(r, (sc, ix, inp) => {
    const i = find(ix, inp, (e) => e.wordIndex === o.word, true);
    const j = find(ix, inp, (e) => e.wordIndex === o.word + 1);
    if (i < 0 || j < 0) return;
    const key = keyGap(inp);
    const last = sc.acts[i]! as Extract<Act, { k: "char" }>;
    const first = sc.acts[j]! as Extract<Act, { k: "char" }>;
    const right = last.ch;
    last.ch = otherThan(right);
    const steps: Parameters<typeof actLike>[2][] = [{ k: "back" }, { k: "back" }, { k: "back" }, { k: "char", ch: right }, { k: "space" }, { k: "char", ch: first.ch }];
    const block = steps.map((s, m) => actLike(first, first.t + (m + 1) * key, s));
    shiftFrom(sc.acts, j + 1, block.length * key);
    sc.acts.splice(j + 1, 0, ...block);
    sc.truth.fixing += block.length * key;
  });
}

/** Strips pos/src/ht, edits, spaces and ctx. */
export const asV1 = (r: RunInput): RunInput => mod(r, (sc) => void (sc.v1 = true));

/** Rounds every clock reading to a multiple of stepMs. */
export function quantise(r: RunInput, stepMs: number): RunInput {
  const q = (x: number) => Math.round(x / stepMs) * stepMs;
  return mod(r, (sc) => sc.acts.forEach((a) => Object.assign(a, { t: q(a.t) }, a.ht === undefined ? {} : { ht: q(a.ht) })));
}

/** The Date.now clock jumps by byMs at char event `at` (ht unaffected). */
export function clockStep(r: RunInput, at: number, byMs: number): RunInput {
  return mod(r, (sc, ix) => {
    const i = ix.indexOf(at);
    if (i < 0) return;
    shiftFrom(sc.acts, i, byMs, true);
    if (sc.T !== undefined) sc.T += byMs;
  });
}

export const truth = (r: RunInput): Truth => ({ ...scriptOf(r).truth });

/** Seeded random runs: random pace and spread, pauses, hesitations, breaks,
 *  mistakes, extras, going back, and every run shape I1 names (race head,
 *  first-key Space, ending on Space, TIME, stop on error, soft-keyboard
 *  chunks, quantised clocks, clock steps). Deterministic per seed. */
export function randomScript(seed: number, o: { words?: number; errRate?: number; pauseRate?: number } = {}): RunInput {
  const rng = seeded(seed * 7919 + 13);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)]!;
  const int = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
  const n = o.words ?? int(6, 36);
  const words = Array.from({ length: n }, () => pick(POOL));
  const key = 45 + rng() * 300;
  const spread = 0.08 + rng() * 0.3;
  const errRate = o.errRate ?? rng() * 0.15;
  const pauseRate = o.pauseRate ?? rng() * 0.3;
  const [ht, soft] = [rng() < 0.3, rng() < 0.08];
  const logn = () => Math.exp(spread * (rng() + rng() + rng() - 1.5) * 2);
  const acts: Act[] = [];
  let t = 0;
  const extra = (x: number) => ({ ...(ht ? { ht: Math.round(x * 10) / 10 } : {}), ...(soft ? { src: "input" as const } : {}) });
  words.forEach((w, wi) => {
    [...w].forEach((ch, ci) => {
      if (wi > 0 && ci === 0) {
        const g = key * (2 + rng() * 0.6) * logn();
        acts.push({ k: "space", t: Math.round(t + g / 2), ...extra(t + g / 2) });
        t += g;
      } else if (ci > 0) t += soft && rng() < 0.3 ? 0 : key * logn();
      acts.push({ k: "char", t: Math.round(t), ch, ...extra(t) });
    });
  });
  let r = render({ words, acts, ctx: {}, lengthMode: rng() < 0.15 ? "quote" : "words", truth: noTruth() });
  const flip = (p: number) => rng() < p;
  if (flip(0.12)) r = stopOnError(r);
  for (let wi = 1; wi < n; wi++) {
    if (flip(pauseRate)) r = withPause(r, { beforeWord: wi, ms: key * (3 + rng() * 9) });
    if (flip(pauseRate / 3) && words[wi]!.length > 2) r = withPause(r, { insideWord: [wi, int(0, words[wi]!.length - 2)], ms: key * (2 + rng() * 6) });
    if (flip(0.03)) r = withBreak(r, { beforeWord: wi, ms: 2000 + rng() * 6000 });
  }
  for (let wi = 0; wi < n; wi++) {
    if (!flip(errRate)) continue;
    const pos = int(0, Math.max(0, words[wi]!.length - 1));
    r = withMistake(r, { word: wi, pos, noticeAfter: int(0, 2), backspaces: flip(0.25) ? 0 : undefined, fixGapMs: key * (1 + rng() * 4) });
  }
  if (flip(errRate * 2)) r = extras(r, { word: int(0, Math.max(0, n - 2)), n: int(1, 3), deleted: flip(0.7) });
  if (flip(errRate * 2) && n > 2) r = backIntoPrevious(r, { word: int(0, n - 2) });
  if (flip(0.08) && n > 2) r = firstKeySpace(r, 40 + rng() * 500);
  const shape = rng();
  if (shape < 0.2) r = timeRun(r, Math.round(r.durationMs * (0.5 + rng() * 0.7)));
  else if (shape < 0.32) r = endOnSpace(r, { tailMs: key * (0.5 + rng() * 3) });
  if (flip(0.12)) r = raceAnchor(r, Math.round(100 + rng() * 3000));
  if (flip(0.05)) r = quantise(r, flip(0.5) ? 1000 / 60 : 100);
  if (flip(0.05) && r.timings.length > 2) r = clockStep(r, int(1, r.timings.length - 1), flip(0.7) ? -(5 + rng() * 1500) : 5 + rng() * 300);
  return r;
}
