import { describe, expect, it } from "vitest";
import {
  MAX_LIFETIME_DELTA_PER_WRITE as DELTA,
  sanitizePrefsWrite,
} from "./prefs-sanitize";

describe("sanitizePrefsWrite", () => {
  describe("monkeytypeStats (server-owned)", () => {
    it("preserves the stored slice, ignoring a forged client value", () => {
      const stored = {
        monkeytypeStats: { completedTests: 42, importedAt: 1 },
      };
      const out = sanitizePrefsWrite(stored, {
        monkeytypeStats: { completedTests: 1_000_000, importedAt: 2 },
      });
      expect(out.monkeytypeStats).toEqual({
        completedTests: 42,
        importedAt: 1,
      });
    });

    it("drops a client-fabricated slice when none is stored", () => {
      const out = sanitizePrefsWrite(
        {},
        { monkeytypeStats: { completedTests: 999 } },
      );
      expect(out.monkeytypeStats).toBeUndefined();
    });

    it("keeps the stored slice even when the client omits it", () => {
      const stored = { monkeytypeStats: { completedTests: 7 } };
      const out = sanitizePrefsWrite(stored, { caret: { style: "block" } });
      expect(out.monkeytypeStats).toEqual({ completedTests: 7 });
    });
  });

  describe("lifetimeStats (clamped)", () => {
    it("allows a legitimate single-drill increment", () => {
      const stored = { lifetimeStats: { drillsCompleted: 10 } };
      const out = sanitizePrefsWrite(stored, {
        lifetimeStats: { drillsCompleted: 11, racesFinished: 0, racesWon: 0 },
      });
      expect((out.lifetimeStats as { drillsCompleted: number }).drillsCompleted).toBe(11);
    });

    it("caps a forged jump to stored + the per-write delta", () => {
      const stored = { lifetimeStats: { drillsCompleted: 10 } };
      const out = sanitizePrefsWrite(stored, {
        lifetimeStats: { drillsCompleted: 1_000_000 },
      });
      expect(
        (out.lifetimeStats as { drillsCompleted: number }).drillsCompleted,
      ).toBe(10 + DELTA);
    });

    it("is monotonic — a lower client value can't decrease the counter", () => {
      const stored = { lifetimeStats: { drillsCompleted: 100 } };
      const out = sanitizePrefsWrite(stored, {
        lifetimeStats: { drillsCompleted: 0 },
      });
      expect(
        (out.lifetimeStats as { drillsCompleted: number }).drillsCompleted,
      ).toBe(100);
    });

    it("clamps a brand-new user's forged counter from zero", () => {
      const out = sanitizePrefsWrite(
        {},
        { lifetimeStats: { drillsCompleted: 5000 } },
      );
      expect(
        (out.lifetimeStats as { drillsCompleted: number }).drillsCompleted,
      ).toBe(DELTA);
    });

    it("preserves stored counters when the client omits lifetimeStats", () => {
      const stored = {
        lifetimeStats: { drillsCompleted: 30, racesFinished: 2, racesWon: 1 },
      };
      const out = sanitizePrefsWrite(stored, { caret: { style: "block" } });
      expect(out.lifetimeStats).toEqual({
        drillsCompleted: 30,
        racesFinished: 2,
        racesWon: 1,
      });
    });

    it("omits lifetimeStats entirely when neither side has it", () => {
      const out = sanitizePrefsWrite({}, { caret: { style: "block" } });
      expect(out.lifetimeStats).toBeUndefined();
    });
  });

  it("leaves unrelated slices untouched", () => {
    const out = sanitizePrefsWrite(
      { caret: { style: "line" } },
      { caret: { style: "block" }, appearance: { dividers: "dashed" } },
    );
    expect(out.caret).toEqual({ style: "block" });
    expect(out.appearance).toEqual({ dividers: "dashed" });
  });
});
