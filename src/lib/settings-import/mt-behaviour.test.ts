import { describe, expect, it } from "vitest";
import { validLength } from "./ft-values";
import { bannedPatterns } from "@/lib/copy-rules";
import { mapBackground, mapInput, mapSound, mapTestSetup, UPLOADED_IMAGE_NOTE } from "./mt-behaviour";
import type { PracticeNow } from "./mt-length";
import { MtCollector } from "./mt-values";

type Mapper = (col: MtCollector) => void;

const run = (map: Mapper, mt: Record<string, unknown>) => {
  const col = new MtCollector(mt);
  map(col);
  return col;
};
const valueOf = (col: MtCollector, id: string) => col.out.find((c) => c.id === id)?.value;
const WORDS_25: PracticeNow = { mode: "WORDS", length: 25 };
const setup = (mt: Record<string, unknown>, current: PracticeNow = WORDS_25) =>
  run((col) => mapTestSetup(col, current), mt);
/** The mode and length the test lands on: the import's, else the stored. */
const landing = (col: MtCollector, current: PracticeNow) => {
  const mode = valueOf(col, "practice.mode") ?? current.mode;
  const length = valueOf(col, "practice.length") ?? current.length;
  return { mode, length, runs: validLength(mode, length) !== undefined };
};
const all: Mapper = (col) => {
  mapInput(col);
  mapSound(col);
  mapTestSetup(col, WORDS_25);
  mapBackground(col);
};

describe("MonkeyType input settings", () => {
  it("maps stop on error word to strict space, letter to stop on error", () => {
    const word = run(mapInput, { stopOnError: "word" });
    expect(valueOf(word, "behaviour.strictSpace")).toBe(true);
    expect(valueOf(word, "behaviour.stopOnError")).toBe(false);
    const letter = run(mapInput, { stopOnError: "letter" });
    expect(valueOf(letter, "behaviour.stopOnError")).toBe(true);
    expect(valueOf(letter, "behaviour.strictSpace")).toBe(false);
  });
});

describe("MonkeyType sound settings", () => {
  it("imports key clicks and their volume", () => {
    const col = run(mapSound, { playSoundOnClick: "3", soundVolume: 0.35 });
    expect(valueOf(col, "audio.keypressClickEnabled")).toBe(true);
    expect(valueOf(col, "audio.keypressClickVolume")).toBe(35);
  });

  it("uses the volume only while clicks are on", () => {
    expect([...run(mapSound, { playSoundOnClick: "off", soundVolume: 0.8 }).used]).toEqual(["playSoundOnClick"]);
    expect([...run(mapSound, { playSoundOnClick: "2", soundVolume: 0.8 }).used]).toEqual(["playSoundOnClick", "soundVolume"]);
  });

  it("turns clicks on only for MonkeyType's numbered sounds", () => {
    expect(valueOf(run(mapSound, { playSoundOnClick: "off" }), "audio.keypressClickEnabled")).toBe(false);
    const junk = run(mapSound, { playSoundOnClick: "zzz_junk" });
    expect(junk.out).toEqual([]);
    expect(junk.skipped[0]).toMatchObject({ key: "playSoundOnClick", reason: "bad-value" });
    expect(run(mapSound, { playSoundOnClick: "0" }).out).toEqual([]);
  });
});

describe("MonkeyType test setup", () => {
  it("skips endless tests and clamps lengths", () => {
    const endless = setup({ mode: "time", time: 0 }, { mode: "TIME", length: 60 });
    expect(valueOf(endless, "practice.mode")).toBe("TIME");
    // Same mode: the stored 60 seconds stay.
    expect(valueOf(endless, "practice.length")).toBeUndefined();
    expect(endless.skipped[0]).toMatchObject({ key: "time", reason: "bad-value" });
    expect(valueOf(setup({ mode: "words", words: 5000 }), "practice.length")).toBe(1000);
  });

  it("takes a quote length from quoteLength, never words", () => {
    expect(valueOf(setup({ mode: "quote", words: 50, quoteLength: [2, 3] }), "practice.length")).toBe(2);
    expect(valueOf(setup({ mode: "quote", words: 50, quoteLength: [-1] }), "practice.length")).toBe(1);
  });

  it("reads a long quoteLength list once per bracket", () => {
    // 400,000 entries: about 800 KB of JSON, under the size limit.
    const many = new Array(400_000).fill(2);
    const lengthOf = (quoteLength: number[]) =>
      setup({ mode: "quote", quoteLength }).out.find((c) => c.id === "practice.length");
    expect(lengthOf(many)).toMatchObject({ value: 2, origin: "From Long" });
    expect(lengthOf([3, ...many, 3])).toMatchObject({ value: 2, origin: "From Long, Extra long" });
  });

  it("reads a length the file leaves out as MonkeyType's default", () => {
    const quote = setup({ mode: "quote" });
    expect(quote.out.find((c) => c.id === "practice.length")).toMatchObject({ value: 1, to: "Medium" });
    expect(valueOf(setup({ mode: "time" }, { mode: "QUOTE", length: 3 }), "practice.length")).toBe(30);
    expect(valueOf(setup({ mode: "words" }), "practice.length")).toBe(50);
  });

  it("lists favourite quotes and quote search, and never calls them All", () => {
    for (const quoteLength of [[-3], [-2], [-3, 1]]) {
      const col = setup({ mode: "quote", quoteLength }, { mode: "TIME", length: 120 });
      expect(col.skipped[0]).toMatchObject({ key: "quoteLength", reason: "bad-value" });
      expect(col.out.find((c) => c.id === "practice.length")).toMatchObject({ value: 1, origin: "Default for this mode" });
    }
  });

  it("always lands on a mode and length that can run", () => {
    const cases: Array<[PracticeNow, Record<string, unknown>]> = [
      [{ mode: "QUOTE", length: 0 }, { mode: "words", words: 0 }],
      [{ mode: "QUOTE", length: 2 }, { mode: "time", time: 0 }],
      [{ mode: "QUOTE", length: 3 }, { mode: "time", time: "long" }],
      [{ mode: "WORDS", length: 25 }, { mode: "quote", quoteLength: "x" }],
      [{ mode: "WORDS", length: 25 }, { mode: "quote", quoteLength: [9] }],
      [{ mode: "TIME", length: 120 }, { mode: "quote", quoteLength: [-3] }],
      [{ mode: "TIME", length: 120 }, { mode: "quote" }],
      [{ mode: "BURST", length: 40 }, { mode: "words", words: -5 }],
    ];
    for (const [current, mt] of cases) {
      const col = setup(mt, current);
      expect([mt, landing(col, current)]).toEqual([mt, expect.objectContaining({ runs: true })]);
    }
    // A quote bracket never becomes a 2-second test.
    expect(landing(setup({ mode: "time", time: 0 }, { mode: "QUOTE", length: 2 }), {})).toMatchObject({
      mode: "TIME",
      length: 30,
    });
  });

  it("uses only the length key the imported mode reads", () => {
    const file = { mode: "time", time: 15, words: 25, quoteLength: [0, 1, 2, 3] };
    expect([...setup(file).used].sort()).toEqual(["mode", "time"]);
    expect([...setup({ ...file, mode: "words" }).used].sort()).toEqual(["mode", "words"]);
    expect([...setup({ ...file, mode: "quote" }).used].sort()).toEqual(["mode", "quoteLength"]);
    // No mode imported: no length is read either.
    expect(setup({ ...file, mode: "zen" }).used.has("time")).toBe(false);
  });

  it("skips custom and zen tests and unknown word lists", () => {
    const zen = setup({ mode: "zen", language: "not_a_language" });
    expect(valueOf(zen, "practice.mode")).toBeUndefined();
    expect(zen.skipped.map((s) => s.key)).toEqual(["mode", "language"]);
  });
});

describe("MonkeyType background image", () => {
  it("converts the background filter: rem blur, brightness to darken", () => {
    const col = run(mapBackground, {
      customBackground: "https://example.com/bg.jpg",
      customBackgroundSize: "max",
      customBackgroundFilter: [2, 0.7, 0.5, 0.8],
    });
    expect(valueOf(col, "background.imageUrl")).toBe("https://example.com/bg.jpg");
    // Max fills the screen in MonkeyType, as Cover does here.
    expect(valueOf(col, "background.fit")).toBe("cover");
    expect(col.out.find((c) => c.id === "background.fit")?.origin).toBe("From Max");
    expect(valueOf(col, "background.blur")).toBe(30);
    expect(valueOf(col, "background.darken")).toBe(0.3);
    expect(valueOf(col, "background.opacity")).toBe(0.8);
    // Saturation is part of an imported filter: said with it, never listed.
    expect(col.notes).toEqual([{ group: "background", text: "Saturation can't be adjusted, so 0.5 isn't used." }]);
    expect(col.skipped).toEqual([]);
    expect([...col.used].sort()).toEqual(["customBackground", "customBackgroundFilter", "customBackgroundSize"]);
  });

  it("refuses background links that aren't web links", () => {
    const col = run(mapBackground, { customBackground: "javascript:alert(1)", customBackgroundFilter: [0, 1, 1, 1] });
    expect(valueOf(col, "background.imageUrl")).toBeUndefined();
    expect(col.skipped[0]).toMatchObject({ key: "customBackground", reason: "bad-value" });
  });

  it("leaves your background alone when the file has no image", () => {
    const col = run(mapBackground, { customBackground: "", customBackgroundSize: "zzz", customBackgroundFilter: "x" });
    expect(col.out).toEqual([]);
    expect(col.skipped).toEqual([]);
    // With no image its size and filter change nothing, so none is used.
    expect(col.used.size).toBe(0);
    const filtered = run(mapBackground, { customBackground: "", customBackgroundSize: "cover", customBackgroundFilter: [0, 1, 1, 0.8] });
    expect(filtered.used.size).toBe(0);
  });

  it("uses a filter only when it sets something", () => {
    const col = run(mapBackground, { customBackground: "https://x.com/a.png", customBackgroundFilter: [null, "x", {}, null, 2] });
    expect(col.out.map((c) => c.id)).toEqual(["background.imageUrl"]);
    expect([...col.used]).toEqual(["customBackground"]);
    expect(col.notes).toEqual([]);
  });

  it("says when this device's uploaded image will still show instead of the link", () => {
    const file = { customBackground: "https://x.com/a.png", customBackgroundFilter: [0, 1, 1, 0.5] };
    const col = run((c) => mapBackground(c, true), file);
    expect(col.notes).toEqual([{ group: "background", text: UPLOADED_IMAGE_NOTE }]);
    for (const sentence of UPLOADED_IMAGE_NOTE.split(/(?<=\.) /)) expect(bannedPatterns(sentence)).toEqual([]);
    expect(run(mapBackground, file).notes).toEqual([]);
    // No image in the file: the upload isn't affected, so nothing is said.
    expect(run((c) => mapBackground(c, true), { customBackground: "" }).notes).toEqual([]);
  });
});

describe("MonkeyType behaviour values that can't be used", () => {
  const KEYS = [
    "stopOnError", "confidenceMode", "blindMode", "playSoundOnClick", "mode", "language",
    "punctuation", "numbers", "customBackground",
  ];

  it("lists every mapped key whose value is junk", () => {
    const col = run(all, Object.fromEntries(KEYS.map((k) => [k, 42])));
    expect(col.out).toEqual([]);
    expect(col.skipped.map((s) => s.key).sort()).toEqual([...KEYS].sort());
  });

  it("lists a junk length, size, filter or volume next to a good setting", () => {
    const col = run(all, {
      mode: "words", words: "many", playSoundOnClick: "2", soundVolume: "loud",
      customBackground: "https://example.com/a.png", customBackgroundSize: "huge", customBackgroundFilter: "blur",
    });
    expect(col.skipped.map((s) => s.key).sort()).toEqual([
      "customBackgroundFilter", "customBackgroundSize", "soundVolume", "words",
    ]);
  });

  it("never matches a value named like an Object.prototype member", () => {
    for (const bad of ["constructor", "toString", "__proto__"]) {
      const col = run(all, { confidenceMode: bad, mode: bad, customBackground: "https://x.com/a.png", customBackgroundSize: bad });
      expect(col.out.map((c) => c.id)).toEqual(["background.imageUrl"]);
      expect(col.skipped.map((s) => s.key).sort()).toEqual(["confidenceMode", "customBackgroundSize", "mode"]);
    }
  });
});
