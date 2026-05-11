import { describe, expect, it, vi } from "vitest";
import {
  fetchMonkeytypeResults,
  MtAuthError,
  MtRateLimitError,
  MtUpstreamError,
  mtResultToRow,
  type MtResult,
} from "./monkeytype-import";

function mockFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn(async () => ({
    ok: status < 400,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

const sample: MtResult = {
  _id: "abc",
  wpm: 95,
  acc: 96.4,
  mode: "time",
  mode2: "60",
  timestamp: 1_700_000_000_000,
  testDuration: 60,
  incorrectChars: 4,
};

describe("fetchMonkeytypeResults", () => {
  it("returns the data array on 200", async () => {
    const f = mockFetch({ data: [sample] });
    const out = await fetchMonkeytypeResults("k", f);
    expect(out).toHaveLength(1);
    expect(out[0]?._id).toBe("abc");
  });

  it("returns [] when the response has no data field", async () => {
    const f = mockFetch({});
    const out = await fetchMonkeytypeResults("k", f);
    expect(out).toEqual([]);
  });

  it("throws MtAuthError on 401", async () => {
    const f = mockFetch({}, 401);
    await expect(fetchMonkeytypeResults("k", f)).rejects.toBeInstanceOf(
      MtAuthError,
    );
  });

  it("throws MtAuthError on 403", async () => {
    const f = mockFetch({}, 403);
    await expect(fetchMonkeytypeResults("k", f)).rejects.toBeInstanceOf(
      MtAuthError,
    );
  });

  it("throws MtRateLimitError on 429", async () => {
    const f = mockFetch({}, 429);
    await expect(fetchMonkeytypeResults("k", f)).rejects.toBeInstanceOf(
      MtRateLimitError,
    );
  });

  it("throws MtUpstreamError on other 5xx", async () => {
    const f = mockFetch({}, 503);
    await expect(fetchMonkeytypeResults("k", f)).rejects.toBeInstanceOf(
      MtUpstreamError,
    );
  });
});

describe("mtResultToRow", () => {
  it("maps the basic fields", async () => {
    const row = mtResultToRow(sample, "user_1", "id_1");
    expect(row).not.toBeNull();
    expect(row?.userId).toBe("user_1");
    expect(row?.id).toBe("id_1");
    expect(row?.wpm).toBe(95);
    expect(row?.accuracy).toBe(96.4);
    expect(row?.errorCount).toBe(4);
    expect(row?.durationOrWordCount).toBe(60);
    expect(row?.mode).toBe("casual");
    expect(row?.wasCompleted).toBe(true);
    expect(row?.resetCount).toBe(0);
  });

  it("returns null for invalid timestamp", async () => {
    const row = mtResultToRow(
      { ...sample, timestamp: NaN as unknown as number },
      "u",
      "i",
    );
    expect(row).toBeNull();
  });

  it("returns null for negative duration", async () => {
    const row = mtResultToRow(
      { ...sample, testDuration: -1 },
      "u",
      "i",
    );
    expect(row).toBeNull();
  });

  it("computes completedAt as start + duration", async () => {
    const row = mtResultToRow(sample, "u", "i");
    expect(row).not.toBeNull();
    expect((row?.completedAt as Date).getTime()).toBe(
      sample.timestamp + sample.testDuration * 1000,
    );
  });
});
