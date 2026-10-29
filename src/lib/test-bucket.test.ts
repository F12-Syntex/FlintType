import { describe, expect, it } from "vitest";
import {
  SESSION_GAP_MS,
  parseRunBucketKey,
  runBucketKey,
  splitSessions,
  toBucketSpec,
} from "./test-bucket";

type Row = { mode: string; lengthMode: string | null; durationOrWordCount: number };
const row = (mode: string, lengthMode: string | null, durationOrWordCount: number): Row => ({
  mode,
  lengthMode,
  durationOrWordCount,
});
const key = (r: Row) => runBucketKey(toBucketSpec(r), false);

describe("runBucketKey", () => {
  // Captured from session-form's old `runBucket` before it moved here:
  // `${t.mode}|${t.lengthMode ?? ""}|${t.durationOrWordCount}`.
  it("reproduces the old runBucket strings exactly", () => {
    expect(key(row("casual", "words", 25))).toBe("casual|words|25");
    expect(key(row("training", "time", 60))).toBe("training|time|60");
    expect(key(row("casual", null, 60))).toBe("casual||60");
    expect(key(row("race", "words", 25))).toBe("race|words|25");
    expect(key(row("reverse_adaptive", "quote", 2))).toBe("reverse_adaptive|quote|2");
  });

  it("separates mode, length unit and length", () => {
    const base = key(row("training", "words", 25));
    expect(key(row("training", "words", 25))).toBe(base);
    expect(key(row("casual", "words", 25))).not.toBe(base);
    expect(key(row("training", "time", 25))).not.toBe(base);
    expect(key(row("training", "words", 50))).not.toBe(base);
  });

  it("adds the |t suffix for touch runs", () => {
    const spec = toBucketSpec(row("casual", "words", 25));
    expect(runBucketKey(spec, true)).toBe("casual|words|25|t");
    expect(runBucketKey(spec, true)).not.toBe(runBucketKey(spec, false));
  });
});

describe("toBucketSpec", () => {
  it("takes the length from durationOrWordCount", () => {
    expect(toBucketSpec(row("training", "time", 60))).toEqual({
      mode: "training",
      lengthMode: "time",
      length: 60,
    });
  });

  it("reads an unknown length unit as a legacy null", () => {
    expect(toBucketSpec(row("casual", "minutes", 5)).lengthMode).toBeNull();
    expect(toBucketSpec(row("casual", "", 5)).lengthMode).toBeNull();
  });
});

describe("parseRunBucketKey", () => {
  it("round-trips every shape", () => {
    const specs = [
      { mode: "casual", lengthMode: "words" as const, length: 25 },
      { mode: "training", lengthMode: "time" as const, length: 60 },
      { mode: "race", lengthMode: "quote" as const, length: 3 },
      { mode: "casual", lengthMode: null, length: 60 },
    ];
    for (const s of specs) {
      for (const touch of [false, true]) {
        expect(parseRunBucketKey(runBucketKey(s, touch))).toEqual({ ...s, touch });
      }
    }
  });

  it("parses an empty length unit to null", () => {
    expect(parseRunBucketKey("casual||60")).toEqual({
      mode: "casual",
      lengthMode: null,
      length: 60,
      touch: false,
    });
  });

  it("rejects junk", () => {
    for (const junk of [
      "",
      "casual",
      "casual|words",
      "casual|words|25|t|x",
      "casual|words|25|x",
      "casual|minutes|25",
      "casual|words|-1",
      "casual|words|2.5",
      "casual|words|",
      "|words|25",
      "cas ual|words|25",
      "casual|words|1234567",
    ]) {
      expect(parseRunBucketKey(junk)).toBeNull();
    }
  });
});

describe("splitSessions", () => {
  const at = (ms: number) => ({ startedAtMs: ms });

  it("chains tests within the gap and splits beyond it", () => {
    const t0 = 1_700_000_000_000;
    const rows = [
      at(t0),
      at(t0 - 60_000),
      at(t0 - 60_000 - SESSION_GAP_MS), // exactly the gap: same session
      at(t0 - 60_000 - 2 * SESSION_GAP_MS - 1), // one ms over: new session
      at(t0 - 60_000 - 2 * SESSION_GAP_MS - 1 - 5_000),
    ];
    const sessions = splitSessions(rows);
    expect(sessions).toEqual([rows.slice(0, 3), rows.slice(3)]);
  });

  it("keeps each session newest first and handles empty input", () => {
    expect(splitSessions([])).toEqual([]);
    const one = [at(10)];
    expect(splitSessions(one)).toEqual([one]);
  });

  it("uses a 30-minute gap", () => {
    expect(SESSION_GAP_MS).toBe(30 * 60_000);
  });
});
