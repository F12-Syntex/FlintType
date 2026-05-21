import { describe, expect, it } from "vitest";
import { relativeTime } from "./relative-time";

const NOW = new Date("2026-05-21T12:00:00Z").getTime();
const ago = (ms: number) => NOW - ms;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

describe("relativeTime", () => {
  it("renders sub-minute ages as 'just now'", () => {
    expect(relativeTime(ago(0), NOW)).toBe("just now");
    expect(relativeTime(ago(59_000), NOW)).toBe("just now");
  });

  it("clamps future timestamps (clock skew) to 'just now'", () => {
    expect(relativeTime(NOW + 10 * MINUTE, NOW)).toBe("just now");
  });

  it("renders minutes", () => {
    expect(relativeTime(ago(MINUTE), NOW)).toBe("1m ago");
    expect(relativeTime(ago(5 * MINUTE), NOW)).toBe("5m ago");
    expect(relativeTime(ago(59 * MINUTE), NOW)).toBe("59m ago");
  });

  it("renders hours", () => {
    expect(relativeTime(ago(HOUR), NOW)).toBe("1h ago");
    expect(relativeTime(ago(23 * HOUR), NOW)).toBe("23h ago");
  });

  it("renders days", () => {
    expect(relativeTime(ago(DAY), NOW)).toBe("1d ago");
    expect(relativeTime(ago(6 * DAY), NOW)).toBe("6d ago");
  });

  it("renders weeks", () => {
    expect(relativeTime(ago(WEEK), NOW)).toBe("1w ago");
    expect(relativeTime(ago(3 * WEEK), NOW)).toBe("3w ago");
  });

  it("falls back to an absolute date past ~a month", () => {
    const out = relativeTime(ago(40 * DAY), NOW);
    expect(out).not.toMatch(/ago/);
    // Whatever the host locale, it's the short month+day of ~Apr 11.
    expect(out.length).toBeGreaterThan(0);
  });
});
