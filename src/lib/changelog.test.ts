import { describe, expect, it } from "vitest";
import { parseChangelog } from "./changelog";

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
