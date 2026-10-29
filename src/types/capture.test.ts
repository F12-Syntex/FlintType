import { describe, expect, expectTypeOf, it } from "vitest";
import {
  submitTestInputSchema,
  type KeystrokeTiming,
  type SubmitTestInput,
} from "./adapt";
import {
  EDITS_MAX,
  SPACES_MAX,
  type EditTiming,
  type KeystrokeTimingV2,
  type RunContext,
  type SpaceTiming,
} from "./capture";

/** "the cat" with one slip: t, h, w (wrong), Backspace, e, Space, c, a, t. */
function v1Payload(): SubmitTestInput {
  const keys: [string, string, number, number][] = [
    // [expected, typed, wordIndex, t]
    ["t", "t", 0, 0],
    ["h", "h", 0, 110],
    ["e", "w", 0, 220],
    ["e", "e", 0, 520],
    ["c", "c", 1, 760],
    ["a", "a", 1, 870],
    ["t", "t", 1, 980],
  ];
  return {
    startedAt: 1_700_000_000_000,
    completedAt: 1_700_000_001_000,
    mode: "casual",
    durationOrWordCount: 2,
    lengthMode: "words",
    wpm: 24,
    accuracy: 85.7,
    errorCount: 1,
    resetCount: 0,
    wasCompleted: true,
    words: ["the", "cat"],
    timings: keys.map(([expected, typed, wordIndex, t]) => ({
      t,
      expected,
      typed,
      correct: expected === typed,
      wordIndex,
    })),
  };
}

const POS = [0, 1, 2, 2, 0, 1, 2];
const HT = [0, 110.2, 220.5, 519.9, 760.3, 870, 980.1];

function v2Payload(): SubmitTestInput {
  const base = v1Payload();
  const ctx: RunContext = {
    stopOnError: false,
    allowExtras: true,
    strictSpace: false,
    confidence: "off",
    suddenDeath: false,
    drill: false,
    race: false,
    wordlist: "english",
    punctuation: false,
    input: "keyboard",
    codeMatch: 1,
  };
  return {
    ...base,
    timings: base.timings.map((k, i) => ({ ...k, pos: POS[i], ht: HT[i] })),
    edits: [{ t: 400, ht: 400.1, at: 3, seq: 0, wordIndex: 0, pos: 3, kind: "back" }],
    spaces: [{ t: 640, ht: 640, at: 4, seq: 1, wordIndex: 0, pos: 3 }],
    ctx,
  };
}

/** A JSON round-trip, so a test can write values the TS types forbid. */
function raw(p: SubmitTestInput): Record<string, unknown> & {
  timings: Record<string, unknown>[];
  edits: Record<string, unknown>[];
  spaces: Record<string, unknown>[];
  ctx: Record<string, unknown>;
} {
  return JSON.parse(JSON.stringify(p));
}

const parse = (p: unknown) => submitTestInputSchema.parse(p);

describe("capture v2 wire schema (I3)", () => {
  it("parses an old payload unchanged", () => {
    const old = v1Payload();
    expect(parse(old)).toStrictEqual(old);
  });

  it("parses a full v2 payload", () => {
    const full = v2Payload();
    expect(parse(full)).toStrictEqual(full);
  });

  it("drops a bad pos to undefined and keeps the timing and the array", () => {
    const p = raw(v2Payload());
    p.timings[2].pos = -1;
    p.timings[3].pos = 1.5;
    const out = parse(p);
    expect(out.timings).toHaveLength(7);
    expect(out.timings[2].pos).toBeUndefined();
    expect(out.timings[3].pos).toBeUndefined();
    expect(out.timings[2]).toMatchObject({ t: 220, expected: "e", typed: "w", correct: false, ht: 220.5 });
    expect(out.timings[4].pos).toBe(0);
    expect(out.edits).toHaveLength(1);
    expect(out.ctx?.codeMatch).toBe(1);
  });

  it("drops a bad ht or src on a timing to undefined", () => {
    const p = raw(v2Payload());
    p.timings[1].ht = -5;
    p.timings[2].ht = "fast";
    p.timings[3].src = "keyboard";
    p.timings[4].src = "input";
    const out = parse(p);
    expect(out.timings[1].ht).toBeUndefined();
    expect(out.timings[2].ht).toBeUndefined();
    expect(out.timings[3].src).toBeUndefined();
    expect(out.timings[4].src).toBe("input");
    expect(out.timings).toHaveLength(7);
  });

  it("drops edits for an unknown kind and still parses the submit", () => {
    const p = raw(v2Payload());
    p.edits[0].kind = "delete";
    const out = parse(p);
    expect(out.edits).toBeUndefined();
    expect(out.spaces).toHaveLength(1);
    expect(out.timings).toHaveLength(7);
    expect(out.ctx).toBeDefined();
  });

  it("drops the whole array when a mark's placement field is bad", () => {
    const missingPos = raw(v2Payload());
    delete missingPos.edits[0].pos;
    expect(parse(missingPos).edits).toBeUndefined();

    const badAt = raw(v2Payload());
    badAt.spaces[0].at = -1;
    const out = parse(badAt);
    expect(out.spaces).toBeUndefined();
    expect(out.edits).toHaveLength(1);

    const badSeq = raw(v2Payload());
    badSeq.edits[0].seq = EDITS_MAX + SPACES_MAX + 1;
    expect(parse(badSeq).edits).toBeUndefined();
  });

  it("keeps a mark whose lenient flag is bad", () => {
    const p = raw(v2Payload());
    p.edits[0].cross = false;
    p.edits[0].src = "mouse";
    p.spaces[0].early = "yes";
    p.spaces[0].ht = -1;
    const out = parse(p);
    expect(out.edits?.[0]).toMatchObject({ at: 3, seq: 0, kind: "back" });
    expect(out.edits?.[0].cross).toBeUndefined();
    expect(out.edits?.[0].src).toBeUndefined();
    expect(out.spaces?.[0]).toMatchObject({ at: 4, seq: 1 });
    expect(out.spaces?.[0].early).toBeUndefined();
    expect(out.spaces?.[0].ht).toBeUndefined();
  });

  it("treats null arrays from a buggy client as absent", () => {
    const p: Record<string, unknown> = raw(v2Payload());
    p.edits = null;
    p.spaces = "nope";
    p.ctx = 42;
    const out = parse(p);
    expect(out.edits).toBeUndefined();
    expect(out.spaces).toBeUndefined();
    expect(out.ctx).toBeUndefined();
    expect(out.timings).toHaveLength(7);
  });

  it("drops an unknown ctx.confidence and keeps the rest of ctx", () => {
    const p = raw(v2Payload());
    p.ctx.confidence = "strict";
    const out = parse(p);
    expect(out.ctx?.confidence).toBeUndefined();
    expect(out.ctx?.allowExtras).toBe(true);
    expect(out.ctx?.input).toBe("keyboard");
  });

  it("drops an out-of-range codeMatch and strips an old client's layout", () => {
    const p = raw(v2Payload());
    p.ctx.codeMatch = 1.2;
    p.ctx.layout = "dvorak";
    const out = parse(p);
    expect(out.ctx?.codeMatch).toBeUndefined();
    expect(out.ctx && "layout" in out.ctx).toBe(false);
    expect(out.ctx?.wordlist).toBe("english");
  });

  it("drops ctx.capped unless it is literally true", () => {
    const capped = raw(v2Payload());
    capped.ctx.capped = true;
    expect(parse(capped).ctx?.capped).toBe(true);

    const junk = raw(v2Payload());
    junk.ctx.capped = "yes";
    expect(parse(junk).ctx?.capped).toBeUndefined();
  });

  it("drops edits or spaces over their cap", () => {
    const edit = (seq: number): EditTiming => ({ t: 400, at: 3, seq, wordIndex: 0, pos: 3, kind: "back" });
    const space = (seq: number): SpaceTiming => ({ t: 640, at: 4, seq, wordIndex: 0, pos: 3 });

    const atCap = v2Payload();
    atCap.edits = Array.from({ length: EDITS_MAX }, (_, i) => edit(i));
    atCap.spaces = Array.from({ length: SPACES_MAX }, (_, i) => space(EDITS_MAX + i));
    const kept = parse(atCap);
    expect(kept.edits).toHaveLength(EDITS_MAX);
    expect(kept.spaces).toHaveLength(SPACES_MAX);

    const overEdits = v2Payload();
    overEdits.edits = Array.from({ length: EDITS_MAX + 1 }, (_, i) => edit(i % 10_000));
    const a = parse(overEdits);
    expect(a.edits).toBeUndefined();
    expect(a.spaces).toHaveLength(1);

    const overSpaces = v2Payload();
    overSpaces.spaces = Array.from({ length: SPACES_MAX + 1 }, (_, i) => space(i % 10_000));
    const b = parse(overSpaces);
    expect(b.spaces).toBeUndefined();
    expect(b.edits).toHaveLength(1);
  });

  it("strips unknown keys at every level", () => {
    const p = raw(v2Payload());
    p.timings[0].code = "KeyT";
    p.edits[0].key = "Backspace";
    p.spaces[0].typed = "the";
    p.ctx.keymapLayout = "qwerty";
    p.layoutHits = [10, 10];
    const out = parse(p);
    expect(out).toStrictEqual(v2Payload());
  });

  it("leaves the plausibility input (timings) the same length", () => {
    const p = raw(v2Payload());
    p.edits[0].kind = "delete";
    p.timings[0].pos = -1;
    expect(parse(p).timings).toHaveLength(v1Payload().timings.length);
  });
});

describe("capture v2 types", () => {
  it("keeps KeystrokeTiming assignable to KeystrokeTimingV2", () => {
    const timing = {
      t: 0,
      expected: "a",
      typed: "a",
      correct: true,
      wordIndex: 0,
      pos: 0,
      src: "input",
      ht: 1.5,
    } satisfies KeystrokeTiming;
    const v2: KeystrokeTimingV2 = timing;
    const legacy = { t: 0, expected: "a", typed: "a", correct: true, wordIndex: 0 } satisfies KeystrokeTiming;
    const legacyV2: KeystrokeTimingV2 = legacy;
    expect([v2, legacyV2]).toHaveLength(2);
    expectTypeOf<KeystrokeTiming>().toExtend<KeystrokeTimingV2>();
    expectTypeOf<KeystrokeTimingV2>().toExtend<KeystrokeTiming>();
  });

  it("makes every v2 field optional on the submit input", () => {
    const old: SubmitTestInput = v1Payload();
    const emptyCtx: RunContext = {};
    expect(old.edits).toBeUndefined();
    expect(emptyCtx).toStrictEqual({});
    expectTypeOf<SubmitTestInput["edits"]>().toEqualTypeOf<EditTiming[] | undefined>();
    expectTypeOf<SubmitTestInput["spaces"]>().toEqualTypeOf<SpaceTiming[] | undefined>();
    expectTypeOf<SubmitTestInput["ctx"]>().toEqualTypeOf<RunContext | undefined>();
    expectTypeOf<EditTiming["kind"]>().toEqualTypeOf<"back" | "backWord">();
    expectTypeOf<RunContext["input"]>().toEqualTypeOf<"keyboard" | "touch" | "mixed" | undefined>();
  });
});
