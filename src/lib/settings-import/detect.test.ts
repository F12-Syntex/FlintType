import { describe, expect, it } from "vitest";
import sample from "./fixtures/monkeytype-settings.json";
import { identify } from "./detect";

const ft = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    app: "flinttype",
    version: 1,
    exportedAt: "2026-10-12T10:00:00.000Z",
    slices: { caret: { style: "block", width: 2 }, palette: { activeId: null } },
    ...extra,
  });

describe("identify", () => {
  it("recognises a MonkeyType settings file", () => {
    expect(identify(JSON.stringify(sample), "monkeytype")).toMatchObject({ ok: true, source: "monkeytype", settingsInFile: 94 });
  });

  it("recognises a flinttype export, with its date and settings count", () => {
    expect(identify(ft(), "flinttype")).toMatchObject({
      ok: true,
      source: "flinttype",
      settingsInFile: 3,
      exportedAt: "2026-10-12T10:00:00.000Z",
    });
  });

  it("names the other app when the file is from it", () => {
    expect(identify(ft(), "monkeytype")).toEqual({ ok: false, failure: { kind: "other-app", otherApp: "flinttype", step: 2 } });
    expect(identify(JSON.stringify(sample), "flinttype")).toMatchObject({ ok: false, failure: { kind: "other-app", otherApp: "monkeytype" } });
  });

  it("tells invalid JSON from JSON that isn't settings", () => {
    expect(identify("{ nope", "monkeytype")).toMatchObject({ ok: false, failure: { kind: "not-json" } });
    for (const text of ["[]", "42", "null", '{"hello":"world"}', '{"app":"flinttype"}']) {
      expect(identify(text, "monkeytype")).toMatchObject({ ok: false, failure: { kind: "not-settings" } });
    }
  });

  it("refuses an export from a newer flinttype", () => {
    expect(identify(ft({ version: 2 }), "flinttype")).toMatchObject({ ok: false, failure: { kind: "newer-version" } });
  });

  it("stays bounded on hostile input", () => {
    const deep = `${"[".repeat(200_000)}${"]".repeat(200_000)}`;
    const wide = JSON.stringify(Object.fromEntries(Array.from({ length: 50_000 }, (_, i) => [`k${i}`, i])));
    const started = Date.now();
    expect(identify(deep, "monkeytype").ok).toBe(false);
    expect(identify(wide, "monkeytype")).toMatchObject({ ok: false, failure: { kind: "not-settings" } });
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
