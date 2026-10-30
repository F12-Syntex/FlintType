import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** I10: UI copy never joins facts with a dot glyph, and never says
 *  "N% to X", "N% over Y" or "N% vs Z". Walks every non-test source file
 *  under src/ (migrations skipped) and checks each line's code part:
 *  a line that starts as a comment is skipped, and a trailing `//`
 *  comment is cut off (one preceded by ":" is kept, so URLs survive). */

const SRC = path.resolve(__dirname, "..");
const MIGRATIONS = path.join(SRC, "db", "migrations");
const TEST_FILE = /\.(test|spec)\.tsx?$/;

function sources(dir: string): string[] {
  if (dir === MIGRATIONS) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.tsx?$/.test(name) && !TEST_FILE.test(name) ? [full] : [];
  });
}

const COMMENT_START = ["//", "*", "/*", "{/*"];
const TRAILING_COMMENT = /(^|[^:])\/\//;

/** The part of a line the guard checks, or null for a comment line. */
function codePart(line: string): string | null {
  const trimmed = line.trim();
  if (COMMENT_START.some((p) => trimmed.startsWith(p))) return null;
  const m = TRAILING_COMMENT.exec(line);
  return m ? line.slice(0, m.index + m[1]!.length) : line;
}

const DOT_GLYPH = /[·•]/;
const PERCENT_PHRASE = /(\d|\})%\s+(to|over|vs)\s/;

/** 1-based numbers of the lines that break the rule. */
function badLines(src: string): number[] {
  return src.split("\n").flatMap((line, i) => {
    const code = codePart(line);
    if (code === null) return [];
    return DOT_GLYPH.test(code) || PERCENT_PHRASE.test(code) ? [i + 1] : [];
  });
}

const MESSAGE =
  "UI copy must not join facts with a dot glyph or say 'N% to' or 'N% over'. " +
  "See the 'No glyph separators' rule in docs/ui-law.md.";

describe("I10: no glyph separators or percentage phrasing in UI copy", () => {
  const all = sources(SRC);

  it("walks the source tree and skips tests and migrations", () => {
    expect(all.some((f) => f.endsWith(path.join("lib", "test-name.ts")))).toBe(true);
    expect(all.some((f) => f.endsWith(path.join("app", "layout.tsx")))).toBe(true);
    expect(all.some((f) => TEST_FILE.test(f))).toBe(false);
    expect(all.some((f) => f.startsWith(MIGRATIONS))).toBe(false);
  });

  it("finds no offending line", () => {
    const failures = all.flatMap((f) =>
      badLines(readFileSync(f, "utf8")).map((n) => `${path.relative(SRC, f)}:${n}`),
    );
    expect(failures, `${MESSAGE}\n${failures.join("\n")}`).toEqual([]);
  });

  it("catches each banned form in code", () => {
    const dot = "·";
    const bullet = "•";
    expect(badLines(`const a = "Words ${dot} 25";`)).toEqual([1]);
    expect(badLines(`<span>${bullet}</span>`)).toEqual([1]);
    expect(badLines(`const s = "67% to level 4";`)).toEqual([1]);
    expect(badLines("const s = `${pct}% to level`;")).toEqual([1]);
    expect(badLines("const s = `${pct}% over your usual`;")).toEqual([1]);
    expect(badLines(`const s = "12% vs usual";`)).toEqual([1]);
    expect(badLines(`ok\nconst a = "x ${dot} y";`)).toEqual([2]);
  });

  it("skips comments and keeps URLs", () => {
    const dot = "·";
    expect(badLines(`// Words ${dot} 25`)).toEqual([]);
    expect(badLines(` * 67% to level`)).toEqual([]);
    expect(badLines(`/* a ${dot} b */`)).toEqual([]);
    expect(badLines(`{/* a ${dot} b */}`)).toEqual([]);
    expect(badLines(`const n = 1; // 67% to level`)).toEqual([]);
    expect(badLines(`const u = "https://x.dev"; // a ${dot} b`)).toEqual([]);
    expect(badLines(`const u = "https://x.dev/${dot}";`)).toEqual([1]);
  });

  it("allows percentages that are not comparisons", () => {
    expect(badLines(`const s = "98% accuracy";`)).toEqual([]);
    expect(badLines("const s = `${acc}%`;")).toEqual([]);
    expect(badLines(`const s = "up to 50% of the time";`)).toEqual([]);
    expect(badLines(`const w = "width: 100%";`)).toEqual([]);
  });
});
