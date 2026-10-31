import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import type { ImportPlan } from "@/types/settings-import";
import type { Stage } from "./import-stage";
import { resultCopy } from "./result-copy";

const plan: ImportPlan = { source: "monkeytype", fileLabel: null, settingsInFile: 3, groups: [], skipped: [] };
const steps = [{ label: "Colours", status: "done" as const, detail: ["2 settings"] }];
const apply = (patch: Partial<Extract<Stage, { kind: "apply" }>> = {}): Stage & { kind: "apply" } => ({
  kind: "apply", plan, groups: ["colours"], steps, failed: false, ...patch,
});
const done = (patch: Partial<Extract<Stage, { kind: "done" }>> = {}): Stage & { kind: "done" } => ({
  kind: "done", plan, groups: ["colours"], steps, count: 2, undone: false, ...patch,
});

describe("resultCopy", () => {
  it("has no line while importing, and one line once done", () => {
    expect(resultCopy(apply())).toEqual({ heading: "Importing your settings", lines: [] });
    expect(resultCopy(done())).toEqual({
      heading: "Imported 2 settings from MonkeyType",
      lines: ["Everything else stayed as it was."],
    });
  });

  it("changes only the heading and its line after Undo", () => {
    expect(resultCopy(done({ undone: true }))).toEqual({
      heading: "Import undone",
      lines: ["Your settings are back as they were."],
    });
  });

  it("says why Undo has gone after a sign-in or sign-out", () => {
    expect(resultCopy(done({ undoLost: true })).lines).toEqual([
      "Everything else stayed as it was.",
      "You signed in or out, so this import can't be undone.",
    ]);
  });

  it("tells a failed group from a sign-in or sign-out when an import stops", () => {
    expect(resultCopy(apply({ failed: true }))).toEqual({
      heading: "Import stopped",
      lines: ["We put back everything this import changed, so your settings are as they were."],
    });
    expect(resultCopy(apply({ failed: true, ownerChanged: "kept" })).lines).toEqual([
      "You signed in or out during the import, so it stopped.",
    ]);
  });

  it("says nothing was saved when a sign-out or account switch dropped what was written", () => {
    expect(resultCopy(apply({ failed: true, ownerChanged: "lost" })).lines).toEqual([
      "You signed in or out during the import, so it stopped.",
      "Nothing from it was saved.",
    ]);
  });

  it("never claims an unanswered save was lost", () => {
    expect(resultCopy(apply({ failed: true, ownerChanged: "unsure" })).lines).toEqual([
      "You signed in or out during the import, so it stopped.",
      "We couldn't confirm it was saved.",
    ]);
  });

  it("passes the copy rules", () => {
    const all = [apply(), apply({ failed: true }), apply({ failed: true, ownerChanged: "kept" }), apply({ failed: true, ownerChanged: "lost" }), apply({ failed: true, ownerChanged: "unsure" }), done(), done({ undone: true }), done({ undoLost: true })];
    for (const c of all.map(resultCopy)) {
      expect([c.heading, bannedPatterns(c.heading, { heading: true })]).toEqual([c.heading, []]);
      for (const l of c.lines) expect([l, bannedPatterns(l)]).toEqual([l, []]);
    }
  });
});
