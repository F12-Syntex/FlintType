import { describe, expect, it } from "vitest";
import { DEFAULT_BEHAVIOUR, type BehaviourPrefs } from "@/lib/behaviour-prefs";
import { analyseRun } from "@/lib/typing-analysis/analyse";
import { submitToRunInput } from "@/lib/typing-analysis/from-submit";
import { prepareRun } from "@/lib/typing-analysis/prepare";
import { replayRun } from "@/lib/typing-analysis/replay";
import { buildTimeline } from "@/lib/typing-analysis/timeline";
import { submitTestInputSchema } from "@/types/adapt";
import { SLICE_ORDER } from "@/types/typing-analysis";
import { letterCodeOk } from "./practice-capture";
import { initialState, reducer, type Action, type Mode, type State } from "./practice-reducer";
import { analysisSourceFor, buildSubmitInput, reachedWords, runContextFor } from "./practice-submit";

/** Capture v2 against the engine, on 1,000 seeded runs driven through the
 *  real reducer the way the dispatch sites drive it (spec-20 §8): the
 *  replay contract (0 mismatches), I1 (exact budget) and I2 (the result
 *  screen and the stored digest analyse the same run). */

type Behaviour = Pick<BehaviourPrefs, "stopOnError" | "allowExtras" | "strictSpace" | "confidence">;
type Run = { state: State; behaviour: Behaviour; suddenDeath: boolean; race: boolean; seen: Set<string> };

/** Every fix mode, and the combinations that interact. */
const SETTINGS: (Partial<Behaviour> & { suddenDeath?: true })[] = [
  {}, {}, { stopOnError: true }, { stopOnError: true, confidence: "all" }, { stopOnError: true, strictSpace: true },
  { allowExtras: false }, { strictSpace: true }, { strictSpace: true, confidence: "all" }, { confidence: "word" },
  { confidence: "all" }, { allowExtras: false, strictSpace: true, confidence: "word" }, { suddenDeath: true },
];
const ALPHABET = "etaoinshrdlucmfwypvbgk";
const T0 = 1_700_000_000_000;

function rng(seed: number): () => number {
  let x = (seed * 2654435761 + 0x9e3779b9) >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

function simulate(seed: number): Run {
  const r = rng(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
  const set = SETTINGS[seed % SETTINGS.length]!;
  const suddenDeath = set.suddenDeath === true;
  const behaviour: Behaviour = { ...DEFAULT_BEHAVIOUR, ...set };
  const mode: Mode = suddenDeath ? "WORDS" : pick(["WORDS", "WORDS", "QUOTE", "TIME"] as const);
  const race = mode === "WORDS" && !suddenDeath && r() < 0.2;
  const input = pick(["keyboard", "keyboard", "keyboard", "touch", "mixed"] as const);
  const clock = pick(["ht", "ht", "ht", "none", "quantised"] as const);
  const dvorak = r() < 0.2;
  const word = () => {
    let w = Array.from({ length: 1 + Math.floor(r() * 7) }, () => pick([...ALPHABET])).join("");
    if (r() < 0.06) w = w[0]!.toUpperCase() + w.slice(1);
    return r() < 0.06 ? `${w},` : w;
  };
  const count = mode === "TIME" ? 300 : suddenDeath ? 4 + Math.floor(r() * 5) : 5 + Math.floor(r() * 30);
  const words = Array.from({ length: count }, word);
  const T = mode === "TIME" ? pick([5, 10, 15]) * 1000 : undefined;
  const pErr = suddenDeath ? 0.004 : 0.01 + r() * 0.08;
  const pace = 45 + r() * 180;
  const stop = behaviour.stopOnError || suddenDeath;
  const seen = new Set<string>();

  let s: State = reducer({ ...initialState, mode, length: T ? T / 1000 : count, adapt: false }, { type: "RESTART", words, quoteSource: null });
  let real = 0;
  let step = 0;
  const now = () => T0 + (clock === "quantised" ? Math.round(real / 100) * 100 : Math.round(real)) + step;
  const ht = () => (clock === "none" ? undefined : clock === "quantised" ? 3_000 + Math.round(real / 100) * 100 : 3_000.37 + real);
  const src = () => (input === "touch" || (input === "mixed" && r() < 0.5) ? ("input" as const) : undefined);
  const late = race && r() < 0.4;
  if (race && !late) s = reducer(s, { type: "ANCHOR_START", at: T0 });
  if (race) real = 300 + r() * 2_500;
  const dispatch = (a: Action) => {
    const prev = s;
    s = reducer(s, a);
    if (s !== prev) seen.add(a.type);
    // The provider's sudden-death watcher: a wrong key bounces the run.
    if (suddenDeath && s.events.length > 0 && !s.events[s.events.length - 1]!.correct) {
      s = reducer(s, { type: "RESTART", words, quoteSource: null });
      seen.add("bounce");
    }
  };
  const canBack = () => behaviour.confidence === "off" || (behaviour.confidence === "word" && s.cursorChar > 0);
  const back = (wordWise = false) => {
    if (canBack()) dispatch({ type: wordWise ? "BACKSPACE_WORD" : "BACKSPACE", now: now(), ht: ht(), src: src() });
  };
  const space = () => dispatch({ type: "SPACE", now: now(), strictSpace: behaviour.strictSpace, backspaceLocked: behaviour.confidence === "all", ht: ht(), src: src() });
  const type = (ch: string, at = ht(), from = src()) => {
    const codeOk = from ? undefined : letterCodeOk({ key: ch, code: dvorak && r() < 0.6 ? "KeyQ" : `Key${ch.toUpperCase()}` });
    dispatch({ type: "TYPE_CHAR", char: ch, now: now(), stopOnError: stop, allowExtras: behaviour.allowExtras, ht: at, src: from, codeOk });
  };
  const wait = (f = 1) => {
    let g = pace * f * (0.6 + r() * 1.2);
    if (r() < 0.04) g += 400 + r() * 2_100;
    if (r() < 0.005) g += 2_000 + r() * 4_000;
    real += g;
    // A Date.now clock step backwards (ht, the monotonic clock, doesn't move).
    if (r() < 0.01 && s.startTime !== null) step = Math.max(step - (20 + Math.round(r() * 150)), s.startTime - T0 - Math.round(real));
  };
  const over = () => T !== undefined && s.startTime !== null && now() - s.startTime >= T;

  if (r() < 0.1) { space(); seen.add("firstSpace"); }
  let lastBlocked = false;
  for (let i = 0; i < 4_000 && s.phase !== "done" && !over(); i++) {
    const target = s.words[s.cursorWord] ?? "";
    const buf = s.typed[s.cursorWord] ?? "";
    const clean = buf === target.slice(0, buf.length);
    const x = r();
    if (late && i === 2 && s.startTime !== null) dispatch({ type: "ANCHOR_START", at: T0 });
    if (lastBlocked && x < 0.5) { seen.add(x < 0.3 ? "backAfterBlock" : "spaceAfterBlock"); if (x < 0.3) back(); else space(); }
    else if (!clean && x < 0.6 && canBack()) { back(r() < 0.15); seen.add("fix"); }
    else if (!clean && x < 0.75) space();
    else if (buf.length >= target.length && clean) { if (x < 0.03) type(pick([...ALPHABET])); else space(); }
    else if (buf.length === 0 && s.cursorWord > 0 && s.errorWords.has(s.cursorWord - 1) && x < 0.3) { back(r() < 0.3); seen.add("cross"); }
    else if (x < pErr) type(pick([...ALPHABET].filter((c) => c !== target[buf.length])));
    else if (x < pErr + 0.01) space();
    else if (input !== "keyboard" && x > 0.9 && buf.length + 2 <= target.length) {
      // A soft-keyboard chunk: several code points in one event (one now, one ht).
      const at = ht();
      for (const ch of target.slice(buf.length, buf.length + 2)) type(ch, at, "input");
      seen.add("chunk");
    } else type(target[buf.length] ?? pick([...ALPHABET]));
    const e = s.events[s.events.length - 1];
    lastBlocked = stop && e !== undefined && !e.correct;
    wait(buf.length === 0 ? 1.6 : 1);
  }
  if (T !== undefined) {
    if (s.startTime !== null) dispatch({ type: "FINISH_TIME", now: s.startTime + T + Math.round(r() * 30) });
  } else {
    // Finish the passage cleanly (bounded) if the typist ran out of steps.
    for (let i = 0; i < 2_000 && s.phase !== "done"; i++) {
      const target = s.words[s.cursorWord] ?? "";
      const buf = s.typed[s.cursorWord] ?? "";
      if (buf !== target.slice(0, buf.length)) { if (canBack()) back(); else space(); }
      else if (buf.length >= target.length) space();
      else type(target[buf.length]!);
      wait();
    }
  }
  return { state: s, behaviour, suddenDeath, race, seen };
}

function analyse(run: Run) {
  const { state, behaviour, suddenDeath, race } = run;
  const ctx = runContextFor({
    behaviour: { ...DEFAULT_BEHAVIOUR, ...behaviour }, wordlist: "english", mode: state.mode,
    suddenDeath, lockedWords: suddenDeath || race, raceMode: race, state,
  });
  const source = analysisSourceFor({ state, ctx, raceMode: race });
  const wire = JSON.parse(JSON.stringify(buildSubmitInput({ state, history: [], raceMode: race, resetCount: 0, ctx })));
  const server = submitToRunInput(submitTestInputSchema.parse(wire));
  return { ctx, source, server };
}

const SEEDS = 1_000;

describe("capture v2 through the real reducer", () => {
  it("replays to the reducer's buffers, keeps I1 exact and gives I2 on 1,000 runs", () => {
    const tally: Record<string, number> = {};
    const count = (k: string, on = true) => { if (on) tally[k] = (tally[k] ?? 0) + 1; };
    let budgets = 0;
    for (let seed = 0; seed < SEEDS; seed++) {
      const run = simulate(seed);
      const { state } = run;
      expect(state.phase, `seed ${seed}`).toBe("done");
      const { ctx, source, server } = analyse(run);
      expect(source, `seed ${seed}`).not.toBeNull();
      const input = source!.input;

      // The reducer contract: the v2 marks replay to state.typed exactly.
      const tl = buildTimeline(input);
      expect(tl.capture, `seed ${seed}`).toBe(2);
      const rep = replayRun(tl, input.words);
      const reached = reachedWords(state).length;
      expect(rep.mismatches, `seed ${seed}`).toBe(0);
      expect(rep.typed.slice(0, reached), `seed ${seed}`).toEqual(state.typed.slice(0, reached));

      // I1: every slice ≥ 0 and Σ = round(T); Breaks is exactly its clause.
      const a = analyseRun(input);
      expect(a, `seed ${seed}`).not.toBeNull();
      expect(a!.quality.capture, `seed ${seed}`).toBe(2);
      if (a!.slices) {
        budgets++;
        for (const k of SLICE_ORDER) expect(a!.slices[k], `seed ${seed} ${k}`).toBeGreaterThanOrEqual(0);
        expect(SLICE_ORDER.reduce((x, k) => x + a!.slices![k], 0), `seed ${seed}`).toBe(Math.round(input.durationMs));
        const b = prepareRun(input).budget!;
        if (b.clockOk && !b.tookFromBreaks) {
          expect(Math.abs(a!.slices.breaks - (b.breaksMs + b.raceHead)), `seed ${seed}`).toBeLessThanOrEqual(1);
        }
      }

      // I2: the server's view of the parsed wire payload analyses the same.
      expect(server!.edits, `seed ${seed}`).toBeDefined();
      expect(server!.spaces, `seed ${seed}`).toBeDefined();
      expect(analyseRun(server!), `seed ${seed}`).toEqual(a);

      count("race", run.race); count("time", state.mode === "TIME"); count("quote", state.mode === "QUOTE");
      count("stop", ctx.stopOnError === true); count("backOff", ctx.confidence === "all"); count("stopBackOff", ctx.stopOnError === true && ctx.confidence === "all");
      count("touch", ctx.input === "touch"); count("mixed", ctx.input === "mixed"); count("qwerty", a!.quality.qwerty);
      count("quantised", tl.quantised); count("noHt", !tl.useHt); count("cross", input.edits!.some((e) => e.cross === true));
      count("extras", input.timings.some((e) => e.expected === "")); count("endOnSpace", state.mode !== "TIME" && tl.marks[tl.K]!.some((m) => m.kind === "space"));
      count("firstKeySpace", tl.firstKeySpace); count("step", Array.from(tl.dt).some((d) => d < 0)); count("raceShift", run.race && tl.head > 0);
      for (const k of run.seen) count(k);
    }
    expect(budgets).toBeGreaterThan(SEEDS * 0.8);
    for (const k of ["race", "time", "quote", "stop", "backOff", "stopBackOff", "touch", "mixed", "qwerty", "quantised", "noHt", "cross",
      "extras", "endOnSpace", "firstKeySpace", "step", "raceShift", "backAfterBlock", "spaceAfterBlock", "chunk", "bounce", "BACKSPACE_WORD"]) {
      expect(tally[k] ?? 0, k).toBeGreaterThan(10);
    }
  }, 180_000);
});
