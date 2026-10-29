import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** I9: the analysis engine and the shared keystroke helpers are pure and
 *  isomorphic. Nothing under src/lib/typing-analysis/ (pooled models
 *  included) or src/lib/keystrokes/ imports @/server/*, react or next,
 *  and no source module reads the clock or a random source. */

const ROOTS = [path.resolve(__dirname), path.resolve(__dirname, "../keystrokes")];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const SPECIFIER = /(?:\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;
const banned = (spec: string) =>
  spec === "@/server" || spec.startsWith("@/server/") || /^react(-dom)?(\/|$)/.test(spec) || /^next(\/|$)/.test(spec);

describe("I9: pure, isomorphic engine", () => {
  // This file is skipped: its own sample below holds banned specifiers.
  const all = ROOTS.flatMap(files).filter((f) => path.basename(f) !== "imports.test.ts");

  it("finds the engine and keystroke files", () => {
    expect(all.some((f) => f.endsWith("analyse.ts"))).toBe(true);
    expect(all.some((f) => f.endsWith("taint.ts"))).toBe(true);
  });

  it("imports nothing from @/server, react or next", () => {
    for (const f of all) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(SPECIFIER)) expect(banned(m[1]!), `${path.basename(f)} imports ${m[1]}`).toBe(false);
    }
  });

  it("never reads Date.now or Math.random in a source module", () => {
    for (const f of all.filter((x) => !/\.test\.tsx?$/.test(x))) {
      const code = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(/Date\.now\s*\(|Math\.random\s*\(/.test(code), path.basename(f)).toBe(false);
    }
  });

  it("the check itself catches a banned import", () => {
    const sample = `import { x } from "@/server/db";\nimport React from "react";\nconst n = await import("next/headers");`;
    const found = [...sample.matchAll(SPECIFIER)].map((m) => m[1]!).filter(banned);
    expect(found).toEqual(["@/server/db", "react", "next/headers"]);
    expect(banned("@/lib/wpm")).toBe(false);
    expect(banned("reactive")).toBe(false);
  });
});
