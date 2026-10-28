import { describe, expect, it } from "vitest";
import {
  type ChangelogDay,
  type ChangelogRelease,
  groupChangelogByDay,
  groupDaysByMonth,
  parseChangelogDate,
  previewReleases,
  splitRecentDays,
  versionRangeLabel,
} from "./changelog-days";

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

  it("splits a day into its releases, newest first, without repeating a line", () => {
    const days = groupChangelogByDay(entries);
    expect(days[0]).toEqual({
      date: "27 October 2026",
      iso: "2026-10-27",
      from: "6.137.0",
      to: "6.137.1",
      versions: ["6.137.1", "6.137.0"],
      releases: [
        { version: "6.137.1", lines: ["Orange is back."] },
        { version: "6.137.0", lines: ["Rounder look."] },
      ],
      lineCount: 2,
    });
  });

  it("drops internal lines, internal-only releases, and empty days", () => {
    const days = groupChangelogByDay(entries);
    expect(days.map((d) => d.date)).toEqual([
      "27 October 2026",
      "17 June 2026",
      "May 2026",
    ]);
    // The internal-only 6.136.47 still counts towards the range and the
    // version list (update-card lookups), but renders no release.
    expect(days[1]).toMatchObject({
      from: "6.136.47",
      to: "6.136.48",
      versions: ["6.136.48", "6.136.47"],
      releases: [{ version: "6.136.48", lines: ["Terms link."] }],
      lineCount: 1,
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

const day = (date: string, iso: string | null): ChangelogDay => ({
  date,
  iso,
  from: "1.0.0",
  to: "1.0.0",
  versions: ["1.0.0"],
  releases: [{ version: "1.0.0", lines: ["x"] }],
  lineCount: 1,
});

describe("splitRecentDays", () => {
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
    const months = groupDaysByMonth([
      day("17 June 2026", null),
      day("16 June 2026", null),
      day("30 May 2026", null),
      day("May 2026", null),
    ]);
    expect(months.map((m) => [m.month, m.days.length])).toEqual([
      ["June 2026", 2],
      ["May 2026", 2],
    ]);
  });
});

describe("previewReleases", () => {
  const rel = (version: string, n: number): ChangelogRelease => ({
    version,
    lines: Array.from({ length: n }, (_, i) => `${version} line ${i}`),
  });

  it("shows whole releases until about `limit` lines and folds the rest", () => {
    const releases = [rel("3", 3), rel("2", 3), rel("1", 4), rel("0", 5)];
    const { shown, rest, restCount } = previewReleases(releases, 8);
    expect(shown.map((r) => r.version)).toEqual(["3", "2", "1"]);
    expect(rest.map((r) => r.version)).toEqual(["0"]);
    expect(restCount).toBe(5);
  });

  it("always shows the first release, even when it alone passes the limit", () => {
    const { shown, rest } = previewReleases([rel("2", 12), rel("1", 1)], 8);
    expect(shown.map((r) => r.version)).toEqual(["2"]);
    expect(rest.map((r) => r.version)).toEqual(["1"]);
  });

  it("folds nothing when everything fits", () => {
    expect(previewReleases([rel("1", 2), rel("0", 2)], 8)).toMatchObject({
      rest: [],
      restCount: 0,
    });
    expect(previewReleases([], 8)).toEqual({ shown: [], rest: [], restCount: 0 });
  });
});

describe("versionRangeLabel", () => {
  it("prefixes every version with v", () => {
    expect(versionRangeLabel("6.148.6", "6.148.6")).toBe("v6.148.6");
    expect(versionRangeLabel("6.137.0", "6.148.6")).toBe("v6.137.0 – v6.148.6");
  });
});
