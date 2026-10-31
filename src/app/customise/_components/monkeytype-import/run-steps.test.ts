import { describe, expect, it } from "vitest";
import { runSteps, type StepStatus } from "./run-steps";

const now = () => Promise.resolve();

describe("runSteps", () => {
  it("runs each task in order, one at a time", async () => {
    const log: string[] = [];
    const result = await runSteps(
      [
        { id: "a", run: () => void log.push("run a") },
        { id: "b", run: async () => void log.push("run b") },
      ],
      { minMs: 200, wait: now, onChange: (id, s) => log.push(`${id} ${s}`) },
    );
    expect(result).toEqual({ ok: true });
    expect(log).toEqual(["a active", "run a", "a done", "b active", "run b", "b done"]);
  });

  it("keeps each step active for at least minMs", async () => {
    const waits: number[] = [];
    await runSteps([{ id: "a", run: () => {} }], {
      minMs: 250,
      wait: async (ms) => void waits.push(ms),
      onChange: () => {},
    });
    expect(waits).toEqual([250]);
  });

  it("keeps a failing step active for minMs too", async () => {
    const waits: number[] = [];
    await runSteps(
      [{ id: "a", run: () => { throw new Error("x"); } }],
      { minMs: 300, wait: async (ms) => void waits.push(ms), onChange: () => {} },
    );
    expect(waits).toEqual([300]);
  });

  it("stops at the first failure and hands back its error", async () => {
    const seen: [string, StepStatus][] = [];
    const boom = new Error("boom");
    const result = await runSteps(
      [
        { id: "a", run: () => { throw boom; } },
        { id: "b", run: () => {} },
      ],
      { minMs: 0, wait: now, onChange: (id, s) => seen.push([id, s]) },
    );
    expect(result).toEqual({ ok: false, error: boom });
    expect(seen).toEqual([["a", "active"], ["a", "failed"]]);
  });

  it("stops reporting once a newer run takes over", async () => {
    let current = true;
    const seen: string[] = [];
    const result = await runSteps(
      [
        { id: "a", run: () => { current = false; } },
        { id: "b", run: () => {} },
      ],
      { minMs: 0, wait: now, isCurrent: () => current, onChange: (id, s) => seen.push(`${id} ${s}`) },
    );
    expect(result.ok).toBe(false);
    expect(seen).toEqual(["a active"]);
  });
});
