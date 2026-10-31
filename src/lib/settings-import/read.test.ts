import { describe, expect, it } from "vitest";
import sample from "./fixtures/monkeytype-settings.json";
import { checkText, formatBytes, MAX_IMPORT_BYTES, readInput, textBytes } from "./read";

describe("readInput", () => {
  it("reads a file and checks pasted text", async () => {
    const file = new Blob([JSON.stringify(sample)]);
    const read = await readInput({ file });
    expect(read).toMatchObject({ ok: true, bytes: file.size });
    expect(await readInput({ text: "{}" })).toMatchObject({ ok: true, bytes: 2 });
  });

  it("refuses empty and whitespace-only input", async () => {
    expect(await readInput({ text: "  \n" })).toEqual({ ok: false, failure: { kind: "empty", step: 1 } });
    expect(await readInput({ file: new Blob([""]) })).toMatchObject({ ok: false, failure: { kind: "empty" } });
  });

  it("refuses anything over 1 MB without reading it", async () => {
    let read = false;
    const big = { size: MAX_IMPORT_BYTES + 1, text: async () => { read = true; return ""; } } as unknown as Blob;
    expect(await readInput({ file: big })).toMatchObject({ ok: false, failure: { kind: "too-large", size: MAX_IMPORT_BYTES + 1 } });
    expect(read).toBe(false);
    expect(checkText("x".repeat(10), MAX_IMPORT_BYTES + 5).ok).toBe(false);
  });

  it("reports a file the browser can't read", async () => {
    const broken = { size: 10, text: async () => { throw new Error("gone"); } } as unknown as Blob;
    expect(await readInput({ file: broken })).toEqual({ ok: false, failure: { kind: "unreadable", step: 1 } });
  });

  it("formats sizes in KB and MB", () => {
    expect([formatBytes(300), formatBytes(4200), formatBytes(3.2 * 1024 * 1024)]).toEqual(["Under 1 KB", "4 KB", "3.2 MB"]);
  });
});

describe("textBytes", () => {
  it("counts UTF-8 bytes, not characters", () => {
    expect(textBytes("abc")).toBe(3);
    expect(textBytes("é")).toBe(2);
    expect(textBytes("€")).toBe(3);
  });

  it("skips encoding text that is plainly over the limit", () => {
    const big = "x".repeat(MAX_IMPORT_BYTES + 1);
    expect(textBytes(big)).toBe(MAX_IMPORT_BYTES + 1);
    expect(checkText(big, textBytes(big)).ok).toBe(false);
  });

  it("encodes text near the limit to measure it exactly", () => {
    const near = "é".repeat(Math.floor(MAX_IMPORT_BYTES / 2) - 1);
    expect(textBytes(near)).toBe(near.length * 2);
    expect(checkText(near, textBytes(near)).ok).toBe(true);
    const over = "é".repeat(Math.floor(MAX_IMPORT_BYTES / 2) + 1);
    expect(checkText(over, textBytes(over)).ok).toBe(false);
  });
});

describe("the size limit", () => {
  it("takes a file of exactly 1 MB and refuses one byte more", async () => {
    const exact = { size: MAX_IMPORT_BYTES, text: async () => "{}" } as unknown as Blob;
    expect(await readInput({ file: exact })).toMatchObject({ ok: true });
    const over = { size: MAX_IMPORT_BYTES + 1, text: async () => "{}" } as unknown as Blob;
    expect(await readInput({ file: over })).toMatchObject({ ok: false, failure: { kind: "too-large" } });
  });
});
