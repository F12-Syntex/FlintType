import { describe, expect, it } from "vitest";
import { submitTestInputSchema, type SubmitTestInput } from "@/types/adapt";
import { submitToRunInput } from "./from-submit";
import { steady, withMistake } from "./run-script";

const r = withMistake(steady("the quick brown fox".split(" ")), { word: 1, pos: 2 });
const payload = (o: Partial<SubmitTestInput> = {}): SubmitTestInput =>
  submitTestInputSchema.parse({
    startedAt: 5_000, completedAt: 5_000 + r.durationMs, mode: "training", durationOrWordCount: 4, lengthMode: "words",
    wpm: r.wpm, accuracy: 97, errorCount: 0, resetCount: 0, wasCompleted: true, words: r.words, timings: r.timings,
    edits: r.edits, spaces: r.spaces, ctx: { confidence: "word", codeMatch: 0.98 }, ...o,
  });

describe("submitToRunInput", () => {
  it("maps the payload to the engine's input", () => {
    const run = submitToRunInput(payload())!;
    expect(run).toEqual({
      timings: payload().timings, edits: payload().edits, spaces: payload().spaces, words: r.words,
      durationMs: r.durationMs, wpm: r.wpm, lengthMode: "words", ctx: { confidence: "word", codeMatch: 0.98 },
    });
    expect(run.typedFinal).toBeUndefined();
    expect(run.partial).toBeUndefined();
  });

  it("is null without a length unit, and passes v1 payloads through without marks", () => {
    expect(submitToRunInput(payload({ lengthMode: undefined }))).toBeNull();
    const v1 = submitToRunInput(payload({ edits: undefined, spaces: undefined, ctx: undefined }))!;
    expect(v1.edits).toBeUndefined();
    expect(v1.ctx).toBeUndefined();
  });
});
