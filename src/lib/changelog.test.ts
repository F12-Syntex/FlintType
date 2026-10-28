import { describe, expect, it } from "vitest";
import {
  type ChangelogDay,
  changesSince,
  compareVersions,
  groupChangelogByDay,
  groupDaysByMonth,
  isInternalLine,
  parseChangelog,
  parseChangelogDate,
  splitRecentDays,
} from "./changelog";

describe("parseChangelog", () => {
  it("parses version, date, and lines per section", () => {
    const md = [
      "# Changelog",
      "intro text",
      "",
      "---",
      "",
      "## 6.77.6 — 20 May 2026",
      "- First visible change.",
      "- Second visible change.",
      "",
      "## 6.77.5 — 20 May 2026",
      "- Internal changes only.",
    ].join("\n");

    expect(parseChangelog(md)).toEqual([
      {
        version: "6.77.6",
        date: "20 May 2026",
        lines: ["First visible change.", "Second visible change."],
      },
      { version: "6.77.5", date: "20 May 2026", lines: ["Internal changes only."] },
    ]);
  });

  it("ignores everything before the first heading", () => {
    const md = "# Changelog\n- this dash is in the intro, not an entry\n\n## 1.0.0 — May 2026\n- real line";
    const entries = parseChangelog(md);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ version: "1.0.0", date: "May 2026", lines: ["real line"] });
  });

  it("accepts a plain hyphen separator as a fallback", () => {
    const entries = parseChangelog("## 2.1.0 - 1 Jan 2026\n- a line");
    expect(entries[0]).toEqual({ version: "2.1.0", date: "1 Jan 2026", lines: ["a line"] });
  });

  it("handles CRLF line endings", () => {
    const entries = parseChangelog("## 3.0.0 — May 2026\r\n- windows line");
    expect(entries[0].lines).toEqual(["windows line"]);
  });

  it("returns an empty array when there are no entries", () => {
    expect(parseChangelog("# Changelog\n\nNo versions yet.\n")).toEqual([]);
  });
});

describe("compareVersions", () => {
  it("orders by numeric segment, not lexically", () => {
    expect(compareVersions("6.8.0", "6.77.0")).toBeLessThan(0);
    expect(compareVersions("6.77.6", "6.77.5")).toBeGreaterThan(0);
    expect(compareVersions("6.77.6", "6.77.6")).toBe(0);
  });

  it("tolerates a leading v, short forms, and junk", () => {
    expect(compareVersions("v6.77.6", "6.77.6")).toBe(0);
    expect(compareVersions("6.8", "6.8.0")).toBe(0);
    expect(compareVersions("garbage", "0.0.0")).toBe(0);
  });
});

describe("changesSince", () => {
  const entries = [
    { version: "6.77.6", date: "20 May 2026", lines: ["c"] },
    { version: "6.77.5", date: "20 May 2026", lines: ["b"] },
    { version: "6.77.3", date: "20 May 2026", lines: ["a"] },
    { version: "6.8.0", date: "12 May 2026", lines: ["old"] },
  ];

  it("returns versions newer than `since`, up to `current`, newest first", () => {
    const r = changesSince(entries, "6.77.3", "6.77.6");
    expect(r.map((e) => e.version)).toEqual(["6.77.6", "6.77.5"]);
  });

  it("is empty when already on the current version", () => {
    expect(changesSince(entries, "6.77.6", "6.77.6")).toEqual([]);
  });

  it("shows everything newer when the cached version predates the log", () => {
    const r = changesSince(entries, "6.0.0", "6.77.6");
    expect(r).toHaveLength(4);
  });
});

describe("isInternalLine", () => {
  it("matches every internal-only wording the file uses", () => {
    expect(isInternalLine("Internal changes only.")).toBe(true);
    expect(isInternalLine("Internal changes only (added tests).")).toBe(true);
    expect(isInternalLine("Internal: refreshed a baseline.")).toBe(true);
    expect(isInternalLine("internal groundwork for friends")).toBe(true);
  });

  it("keeps user-facing lines, including ones mentioning 'internal' later", () => {
    expect(isInternalLine("Fixed the footer link.")).toBe(false);
    expect(isInternalLine("Removed an unfinished internal page.")).toBe(false);
    expect(isInternalLine("Internally-themed tags look sharper.")).toBe(false);
  });
});

describe("parseChangelogDate", () => {
  it("parses '<day> <Month> <year>' to a UTC date", () => {
    expect(parseChangelogDate("27 October 2026")?.toISOString()).toBe(
      "2026-10-27T00:00:00.000Z",
    );
    expect(parseChangelogDate("1 june 2026")?.toISOString().slice(0, 10)).toBe(
      "2026-06-01",
    );
  });

  it("returns null for month-only, unknown months and overflowing days", () => {
    expect(parseChangelogDate("May 2026")).toBeNull();
    expect(parseChangelogDate("3 Smarch 2026")).toBeNull();
    expect(parseChangelogDate("31 June 2026")).toBeNull();
  });
});

describe("groupChangelogByDay", () => {
  const entries = [
    { version: "6.137.1", date: "27 October 2026", lines: ["Orange is back."] },
    {
      version: "6.137.0",
      date: "27 October 2026",
      lines: ["Rounder look.", "Orange is back.", "Internal changes only."],
    },
    { version: "6.136.48", date: "17 June 2026", lines: ["Terms link."] },
    { version: "6.136.47", date: "17 June 2026", lines: ["Internal changes only."] },
    { version: "6.136.10", date: "16 June 2026", lines: ["Internal: tooling."] },
    { version: "6.0.0", date: "May 2026", lines: ["First release."] },
  ];

  it("merges a day's versions into one de-duplicated list, newest first", () => {
    const days = groupChangelogByDay(entries);
    expect(days[0]).toEqual({
      date: "27 October 2026",
      iso: "2026-10-27",
      from: "6.137.0",
      to: "6.137.1",
      versions: ["6.137.1", "6.137.0"],
      lines: ["Orange is back.", "Rounder look."],
    });
  });

  it("drops internal lines, and days with nothing user-facing left", () => {
    const days = groupChangelogByDay(entries);
    expect(days.map((d) => d.date)).toEqual([
      "27 October 2026",
      "17 June 2026",
      "May 2026",
    ]);
    expect(days[1]).toMatchObject({
      from: "6.136.47",
      to: "6.136.48",
      lines: ["Terms link."],
    });
  });

  it("orders the version range numerically and keeps undated days", () => {
    const days = groupChangelogByDay([
      { version: "6.9.0", date: "1 May 2026", lines: ["a"] },
      { version: "6.10.0", date: "1 May 2026", lines: ["b"] },
    ]);
    expect(days[0]).toMatchObject({ from: "6.9.0", to: "6.10.0" });
    expect(groupChangelogByDay(entries).at(-1)?.iso).toBeNull();
  });
});

describe("splitRecentDays", () => {
  const day = (date: string, iso: string | null): ChangelogDay => ({
    date,
    iso,
    from: "1.0.0",
    to: "1.0.0",
    versions: ["1.0.0"],
    lines: ["x"],
  });

  it("keeps days within the window of the newest release open", () => {
    const days = [
      day("27 October 2026", "2026-10-27"),
      day("30 September 2026", "2026-09-30"),
      day("26 September 2026", "2026-09-26"),
      day("May 2026", null),
    ];
    const { recent, older } = splitRecentDays(days, 30);
    expect(recent.map((d) => d.date)).toEqual(["27 October 2026", "30 September 2026"]);
    expect(older.map((d) => d.date)).toEqual(["26 September 2026", "May 2026"]);
  });

  it("treats everything as older when no day has a date", () => {
    const days = [day("May 2026", null)];
    expect(splitRecentDays(days)).toEqual({ recent: [], older: days });
  });
});

describe("groupDaysByMonth", () => {
  it("buckets days under '<Month> <Year>' in first-seen order", () => {
    const mk = (date: string): ChangelogDay => ({
      date,
      iso: null,
      from: "1.0.0",
      to: "1.0.0",
      versions: ["1.0.0"],
      lines: ["x"],
    });
    const months = groupDaysByMonth([
      mk("17 June 2026"),
      mk("16 June 2026"),
      mk("30 May 2026"),
      mk("May 2026"),
    ]);
    expect(months.map((m) => [m.month, m.days.length])).toEqual([
      ["June 2026", 2],
      ["May 2026", 2],
    ]);
  });
});
