import { countChars } from "@/lib/wpm";
import { median } from "./stats";
import type { EditTiming, KeystrokeTimingV2, RunContext, SpaceTiming } from "@/types/capture";
import type { RunInput, RunLengthMode } from "@/types/typing-analysis";

/** Test fixture core for the run DSL (run-script.ts): a run is a list of
 *  timed acts (a key, a Space, a Backspace) rendered into a RunInput by
 *  the practice reducer's rules (practice-reducer.ts TYPE_CHAR, SPACE,
 *  BACKSPACE, BACKSPACE_WORD), so `pos`, `at`, `seq`, `cross` and `early`
 *  are exactly what capture v2 records. Not used by the engine. */

export type Act =
  | { k: "char"; t: number; ch: string; ht?: number; src?: "input" }
  | { k: "space"; t: number; ht?: number; src?: "input" }
  | { k: "back"; t: number; word?: boolean; ht?: number; src?: "input" };

/** Injected extra time per slice, for truth(). */
export type Truth = { before: number; inside: number; fixing: number; breaks: number };

export type Script = {
  /** The whole passage (RunInput.words is cut to the reached words). */
  words: readonly string[];
  acts: Act[];
  ctx: RunContext;
  lengthMode: RunLengthMode;
  /** TIME runs: the fixed test length; acts after it never happen. */
  T?: number;
  truth: Truth;
  v1?: boolean;
};

const registry = new WeakMap<RunInput, Script>();
export const noTruth = (): Truth => ({ before: 0, inside: 0, fixing: 0, breaks: 0 });

/** Renders a script, recording for each act the index of the char event it
 *  produced (−1 when the act produced none or isn't a key). */
export function renderWithMap(sc: Script): { input: RunInput; evIdx: number[] } {
  const { words, ctx } = sc;
  const blocked = ctx.stopOnError === true || ctx.suddenDeath === true;
  const allowExtras = ctx.allowExtras !== false;
  const strict = ctx.strictSpace === true && ctx.confidence !== "all";
  const timed = sc.lengthMode === "time";
  const timings: KeystrokeTimingV2[] = [];
  const edits: EditTiming[] = [];
  const spaces: SpaceTiming[] = [];
  const buf: string[] = [];
  const err = new Set<number>();
  const evIdx: number[] = [];
  let w = 0;
  let slots = 0;
  let seq = 0;
  let end: number | null = null;
  let lastT = 0;
  const errored = (typed: string, target: string) =>
    typed.length > target.length || [...typed].some((c, i) => c !== target[i]);
  for (const a of sc.acts) {
    evIdx.push(-1);
    if (end !== null || (timed && sc.T !== undefined && Math.round(a.t) > Math.round(sc.T))) continue;
    const target = words[w] ?? "";
    const here = buf[w] ?? "";
    // Recorded like the reducer: integer Date.now ms, ht to 0.1 ms.
    const t = Math.round(a.t);
    const base = { t, ...(a.ht !== undefined ? { ht: Math.round(a.ht * 10) / 10 } : {}), ...(a.src ? { src: a.src } : {}) };
    if (a.k === "char") {
      const pos = here.length;
      if (!words[w] || pos >= target.length + 10 || (pos >= target.length && !allowExtras)) continue;
      const expected = pos >= target.length ? "" : target[pos]!;
      const correct = expected !== "" && a.ch === expected;
      evIdx[evIdx.length - 1] = timings.length;
      timings.push({ ...base, expected, typed: a.ch, correct, wordIndex: w, pos });
      lastT = t;
      if (!correct && blocked) continue;
      buf[w] = here + a.ch;
      slots = Math.max(slots, w + 1);
      if (!correct) err.add(w);
      if (correct && !timed && w === words.length - 1 && pos + 1 === target.length) end = t;
    } else if (a.k === "space") {
      if (strict && here !== target) continue;
      spaces.push({ ...base, at: timings.length, seq: seq++, wordIndex: w, pos: here.length, ...(here !== target ? { early: true as const } : {}) });
      lastT = t;
      if (here !== target) err.add(w);
      slots = Math.max(slots, w + 1);
      if (w + 1 >= words.length && !timed) end = t;
      else w++;
    } else {
      const kind = a.word ? "backWord" : "back";
      if (here.length === 0) {
        if (w === 0 || !err.has(w - 1)) continue;
        edits.push({ ...base, at: timings.length, seq: seq++, wordIndex: w, pos: 0, kind, cross: true });
        w--;
        if (a.word) {
          buf[w] = "";
          err.delete(w);
        }
      } else {
        edits.push({ ...base, at: timings.length, seq: seq++, wordIndex: w, pos: here.length, kind });
        buf[w] = a.word ? "" : here.slice(0, -1);
        if (errored(buf[w]!, target)) err.add(w);
        else err.delete(w);
      }
      lastT = t;
    }
  }
  const reached = Math.min(w + 1, words.length);
  const input: RunInput = {
    timings: sc.v1 ? timings.map(({ t, expected, typed, correct, wordIndex }) => ({ t, expected, typed, correct, wordIndex })) : timings,
    ...(sc.v1 ? {} : { edits, spaces, ctx: { ...sc.ctx } }),
    words: words.slice(0, reached),
    typedFinal: Array.from({ length: Math.min(slots, reached) }, (_, i) => buf[i] ?? ""),
    durationMs: timed && sc.T !== undefined ? Math.round(sc.T) : (end ?? lastT),
    wpm: 0,
    lengthMode: sc.lengthMode,
  };
  input.wpm = wpmOf(input);
  registry.set(input, sc);
  return { input, evIdx };
}

export const render = (sc: Script): RunInput => renderWithMap(sc).input;

/** The run's counted net wpm, as calcWpmAndRaw gives it. */
function wpmOf(r: RunInput): number {
  const c = countChars(r.typedFinal ?? [], r.words, true);
  return r.durationMs > 0 ? ((c.correctWordChars + c.correctSpaces) * 12000) / r.durationMs : 0;
}

/** The script behind a RunInput: the registered one, or one rebuilt from
 *  the records (v2 marks become Space and Backspace acts). */
export function scriptOf(r: RunInput): Script {
  const known = registry.get(r);
  if (known) return { ...known, acts: known.acts.map((a) => ({ ...a })), truth: { ...known.truth } };
  const acts: Act[] = [];
  const marks = [...(r.spaces ?? []).map((s) => ({ s, at: s.at, seq: s.seq })), ...(r.edits ?? []).map((e) => ({ e, at: e.at, seq: e.seq }))]
    .sort((x, y) => x.at - y.at || x.seq - y.seq);
  let m = 0;
  const pick = (x: { t: number; ht?: number; src?: "input" }) => ({ t: x.t, ...(x.ht !== undefined ? { ht: x.ht } : {}), ...(x.src ? { src: x.src } : {}) });
  for (let k = 0; k <= r.timings.length; k++) {
    for (; m < marks.length && marks[m]!.at === k; m++) {
      const x = marks[m]!;
      if ("s" in x) acts.push({ k: "space", ...pick(x.s) });
      else acts.push({ k: "back", ...pick(x.e), ...(x.e.kind === "backWord" ? { word: true } : {}) });
    }
    const e = r.timings[k];
    if (e) acts.push({ k: "char", ch: e.typed, ...pick(e) });
  }
  return { words: r.words, acts, ctx: { ...(r.ctx ?? {}) }, lengthMode: r.lengthMode,
    ...(r.lengthMode === "time" ? { T: r.durationMs } : {}), truth: noTruth(), v1: r.edits === undefined };
}

/** Shifts the time of every act from index i on (ht moves with t unless
 *  `keepHt`, as a clock step does). */
export function shiftFrom(acts: Act[], i: number, delta: number, keepHt = false): void {
  for (let j = i; j < acts.length; j++) {
    const a = acts[j]!;
    a.t += delta;
    if (!keepHt && a.ht !== undefined) a.ht += delta;
  }
}

/** A plain new act at time t, copying ht/src habits from a neighbour. */
export function actLike(near: Act | undefined, t: number, a: { k: "char"; ch: string } | { k: "space" } | { k: "back" }): Act {
  const extra = {
    ...(near?.ht !== undefined ? { ht: near.ht + (t - near.t) } : {}),
    ...(near?.src ? { src: near.src } : {}),
  };
  return { ...a, t, ...extra } as Act;
}

/** Edits a run's script: `f` gets the script, the act → event map and
 *  the current input. */
export function mod(r: RunInput, f: (sc: Script, ix: number[], inp: RunInput) => void): RunInput {
  const sc = scriptOf(r);
  const { input, evIdx } = renderWithMap(scriptOf(r));
  f(sc, evIdx, input);
  return render(sc);
}

export type Ev = RunInput["timings"][number];
export function find(ix: number[], inp: RunInput, pred: (e: Ev) => boolean, last = false): number {
  let out = -1;
  for (let i = 0; i < ix.length; i++) {
    if (ix[i]! >= 0 && pred(inp.timings[ix[i]!]!)) {
      out = i;
      if (!last) break;
    }
  }
  return out;
}

/** The run's typical key gap: the median clean in-word gap. */
export function keyGap(r: RunInput): number {
  const g: number[] = [];
  for (let k = 1; k < r.timings.length; k++) {
    const a = r.timings[k - 1]!;
    const b = r.timings[k]!;
    if (a.wordIndex === b.wordIndex && a.correct && b.correct && b.t > a.t) g.push(b.t - a.t);
  }
  return g.length > 0 ? median(g) : 100;
}

/** A letter other than ch, for a wrong key. */
export const otherThan = (ch: string) => (ch.toLowerCase() === "x" ? "z" : "x");

/** Stretches one gap to `ms` in all: before a word's first letter (after
 *  the Space) or inside a word, after the letter at `afterPos`. */
export function stretch(r: RunInput, pick: (e: Ev) => boolean, ms: number, slot: keyof Truth): RunInput {
  return mod(r, (sc, ix, inp) => {
    const i = find(ix, inp, pick);
    let prev = i - 1;
    while (prev >= 0 && ix[prev]! < 0) prev--;
    if (i < 0 || prev < 0) return;
    const delta = ms - (sc.acts[i]!.t - sc.acts[prev]!.t);
    shiftFrom(sc.acts, i, delta);
    sc.truth[slot] += delta;
  });
}

/** Common words for random runs, with a few capitals and punctuation. */
export const POOL = [
  "the", "of", "and", "to", "in", "is", "you", "that", "it", "was", "for", "on", "are", "with", "they", "at",
  "be", "this", "have", "from", "one", "had", "word", "but", "not", "what", "all", "were", "when", "your",
  "can", "said", "there", "each", "which", "she", "how", "their", "will", "other", "about", "many", "then",
  "them", "these", "some", "would", "make", "like", "into", "time", "look", "more", "write", "number",
  "people", "water", "first", "Quick", "Hello", "don't", "it's", "well,", "end.", "keyboard", "practice",
];

/** mulberry32: a small seeded PRNG (no Math.random in the engine folder). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
