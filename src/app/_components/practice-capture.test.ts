import { describe, expect, it } from "vitest";
import {
  captureChar,
  countLayoutHit,
  EDIT_CAP,
  eventStamp,
  freshCapture,
  keydownSrc,
  letterCodeOk,
  nextSeq,
  recordEdit,
  recordSpace,
  shiftCapture,
  SPACE_CAP,
  stampHt,
} from "./practice-capture";
import { initialState, type EditEvent, type SpaceEvent, type State } from "./practice-reducer";

/** The capture v2 helpers on their own (spec-20 §4, §8). The reducer
 *  wiring is covered in practice-reducer-capture.test.ts. */

function seed(over: Partial<State> = {}): State {
  return {
    ...initialState,
    words: ["ab", "cd", "ef"],
    phase: "running",
    startTime: 1_000,
    ...freshCapture(),
    ...over,
  };
}

const edit = (seq: number, t = 0): EditEvent => ({ t, at: 0, seq, wordIndex: 0, pos: 1, kind: "back" });
const space = (seq: number, t = 0): SpaceEvent => ({ t, at: 0, seq, wordIndex: 0, pos: 0 });

describe("stampHt", () => {
  it("sets the origin on the first stamp and records 0 there", () => {
    expect(stampHt(seed(), 5_000.25)).toEqual({ ht: 0, htOrigin: 5_000.25 });
  });

  it("is relative to the origin, to one decimal place", () => {
    expect(stampHt(seed({ htOrigin: 5_000 }), 5_123.46)).toEqual({ ht: 123.5, htOrigin: 5_000 });
  });

  it("records no ht for a missing, zero, negative or non-finite stamp, and keeps the origin", () => {
    for (const bad of [undefined, 0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(stampHt(seed({ htOrigin: 7 }), bad)).toEqual({ htOrigin: 7 });
      expect(stampHt(seed(), bad)).toEqual({ htOrigin: null });
    }
  });

  it("drops a stamp before the origin instead of sending a negative ht", () => {
    expect(stampHt(seed({ htOrigin: 5_000 }), 4_000)).toEqual({ htOrigin: 5_000 });
  });

  it("never records -0", () => {
    const r = stampHt(seed({ htOrigin: 5_000 }), 4_999.99);
    expect(Object.is(r.ht, -0)).toBe(false);
    expect(r.ht).toBe(0);
  });
});

describe("eventStamp and letterCodeOk", () => {
  it("passes a positive timeStamp through and drops 0", () => {
    expect(eventStamp({ timeStamp: 812.5 })).toBe(812.5);
    expect(eventStamp({ timeStamp: 0 })).toBeUndefined();
  });

  it("matches a letter to its QWERTY key code, either case", () => {
    expect(letterCodeOk({ key: "a", code: "KeyA" })).toBe(true);
    expect(letterCodeOk({ key: "A", code: "KeyA" })).toBe(true);
    // Dvorak: the "a" position types a, but "s" on the KeyO position.
    expect(letterCodeOk({ key: "s", code: "KeyO" })).toBe(false);
  });

  it("is undefined for anything but one letter", () => {
    for (const key of ["1", ";", " ", "é", "Backspace", "Unidentified"]) {
      expect(letterCodeOk({ key, code: "Digit1" })).toBeUndefined();
    }
  });

  it("is undefined for an on-screen letter, which says nothing about the layout", () => {
    expect(letterCodeOk({ key: "a", code: "Unidentified" })).toBeUndefined();
    expect(letterCodeOk({ key: "a", code: "" })).toBeUndefined();
  });
});

describe("keydownSrc", () => {
  it("marks a keydown with no key code as soft-keyboard input", () => {
    // iOS on-screen keys: a real key, but WebKit has no hardware code.
    expect(keydownSrc({ code: "Unidentified" })).toBe("input");
    expect(keydownSrc({ code: "" })).toBe("input");
  });

  it("leaves a physical key unmarked, whatever the layout", () => {
    for (const code of ["KeyA", "KeyO", "Space", "Backspace", "Digit1", "Semicolon"]) {
      expect(keydownSrc({ code })).toBeUndefined();
    }
  });
});

describe("nextSeq and countLayoutHit", () => {
  it("counts marks across both arrays", () => {
    expect(nextSeq(seed())).toBe(0);
    expect(nextSeq(seed({ edits: [edit(0), edit(2)], spaces: [space(1)] }))).toBe(3);
    expect(nextSeq({ ...seed(), edits: undefined, spaces: undefined })).toBe(0);
  });

  it("counts a letter keydown and leaves anything else alone", () => {
    const s = seed({ layoutHits: [4, 3] });
    expect(countLayoutHit(s, true)).toEqual([5, 4]);
    expect(countLayoutHit(s, false)).toEqual([5, 3]);
    expect(countLayoutHit(s, undefined)).toBe(s.layoutHits);
    expect(countLayoutHit({ ...s, layoutHits: undefined }, true)).toEqual([1, 1]);
  });
});

describe("captureChar", () => {
  const base = { t: 40, expected: "a", typed: "a", correct: true, wordIndex: 0 };

  it("adds pos, ht and src, and moves the origin and layout count", () => {
    const s = seed({ cursorChar: 0, htOrigin: null });
    const { event, capture } = captureChar(
      s,
      { type: "TYPE_CHAR", char: "a", now: 0, stopOnError: false, allowExtras: true, ht: 900, src: "input", codeOk: true },
      base,
    );
    expect(event).toEqual({ ...base, pos: 0, src: "input", ht: 0 });
    expect(capture).toEqual({ htOrigin: 900, layoutHits: [1, 1] });
  });

  it("omits src and ht when the action has none", () => {
    const { event } = captureChar(
      seed({ cursorChar: 2 }),
      { type: "TYPE_CHAR", char: "a", now: 0, stopOnError: false, allowExtras: true },
      base,
    );
    expect(Object.keys(event).sort()).toEqual(["correct", "expected", "pos", "t", "typed", "wordIndex"]);
    expect(event.pos).toBe(2);
  });
});

describe("recordSpace and recordEdit", () => {
  it("record nothing for a no-op (the same reference)", () => {
    const s = seed();
    expect(recordSpace(s, s, { type: "SPACE", now: 2_000, strictSpace: true })).toBe(s);
    expect(recordEdit(s, s, { type: "BACKSPACE", now: 2_000 }, "back")).toBe(s);
  });

  it("record nothing in the done phase", () => {
    const s = seed({ phase: "done" });
    expect(recordSpace(s, { ...s }, { type: "SPACE", now: 2_000, strictSpace: false }).spaces).toEqual([]);
  });

  it("an edit needs a started clock", () => {
    const s = seed({ startTime: null });
    expect(recordEdit(s, { ...s }, { type: "BACKSPACE", now: 2_000 }, "back").edits).toEqual([]);
  });

  it("an edit without `now` falls back to Date.now", () => {
    const s = seed({ startTime: Date.now() - 500 });
    const t = recordEdit(s, { ...s, cursorChar: 0 }, { type: "BACKSPACE" }, "back").edits![0]!.t;
    expect(t).toBeGreaterThanOrEqual(500);
    expect(t).toBeLessThan(60_000);
  });

  it("a space before the clock starts is at t = 0, and never negative", () => {
    const s = seed({ startTime: null, phase: "rest" });
    const next = recordSpace(s, { ...s, startTime: 3_000 }, { type: "SPACE", now: 3_000, strictSpace: false });
    expect(next.spaces![0]!.t).toBe(0);
    const late = recordSpace(s, { ...s, startTime: 9_000 }, { type: "SPACE", now: 3_000, strictSpace: false });
    expect(late.spaces![0]!.t).toBe(0);
  });

  it("stop at the caps and set capped", () => {
    const full = seed({
      edits: Array.from({ length: EDIT_CAP }, (_, i) => edit(i)),
      spaces: Array.from({ length: SPACE_CAP }, (_, i) => space(EDIT_CAP + i)),
    });
    const e = recordEdit(full, { ...full, cursorChar: 0 }, { type: "BACKSPACE", now: 2_000 }, "back");
    expect(e.edits).toHaveLength(EDIT_CAP);
    expect(e.capped).toBe(true);
    const sp = recordSpace(full, { ...full, cursorWord: 1 }, { type: "SPACE", now: 2_000, strictSpace: false });
    expect(sp.spaces).toHaveLength(SPACE_CAP);
    expect(sp.capped).toBe(true);
  });
});

describe("shiftCapture and freshCapture", () => {
  it("shift t on both arrays and leave ht alone", () => {
    const s = seed({ edits: [{ ...edit(0, 100), ht: 5 }], spaces: [{ ...space(1, 200), ht: 9 }] });
    expect(shiftCapture(s, 50)).toEqual({ edits: [{ ...edit(0, 150), ht: 5 }], spaces: [{ ...space(1, 250), ht: 9 }] });
  });

  it("adds no keys for a State without marks", () => {
    expect(shiftCapture({ ...seed(), edits: undefined, spaces: undefined }, 50)).toEqual({});
  });

  it("starts empty", () => {
    expect(freshCapture()).toEqual({ edits: [], spaces: [], htOrigin: null, layoutHits: [0, 0], capped: false });
  });
});
