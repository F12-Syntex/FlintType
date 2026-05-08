import { Tag } from "@/components/ft";
import type { HistoryTest } from "@/types/history";
import { projectWpm } from "./all-tests-chart";

/** Numeric tile group that turns the test history into headline
 *  metrics: lifetime mean, last-30 mean, slope (improvement rate),
 *  projected WPM 30 days ahead, and best-ever. Designed to scale
 *  from "5 tests" to "5000 tests" — when the sample is too small
 *  for a meaningful projection, that tile shows "—" with a hint. */
export function TrendTiles({
  tests,
  now,
}: {
  tests: readonly HistoryTest[];
  now: number;
}) {
  if (tests.length === 0) return null;

  const dayMs = 86_400_000;
  const last30 = tests.filter((t) => now - t.completedAtMs <= 30 * dayMs);

  const meanLifetime = average(tests.map((t) => t.wpm));
  const meanLast30 = average(last30.map((t) => t.wpm));
  const best = tests.reduce((m, t) => Math.max(m, t.wpm), 0);
  const projection = projectWpm(tests, 30);
  // Convert per-test slope into a more user-friendly "WPM per
  // 10 tests" — small per-test numbers are hard to read. 10 tests
  // is roughly a sitting's worth of practice for an active user.
  const tilesProjected = projection
    ? Math.max(0, Math.round(projection.projected))
    : null;
  const tilesSlope = projection
    ? roundTo(projection.slopePerTest * 10, 1)
    : null;
  const slopeFormatted =
    tilesSlope == null
      ? "—"
      : tilesSlope > 0
        ? `+${tilesSlope}`
        : String(tilesSlope);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <Tile
        label="Lifetime mean"
        value={formatWpm(meanLifetime)}
        sub={`${tests.length} tests`}
      />
      <Tile
        label="Last 30 days"
        value={formatWpm(meanLast30 || meanLifetime)}
        sub={`${last30.length} tests`}
      />
      <Tile
        label="Improvement"
        value={slopeFormatted}
        sub="wpm / 10 tests"
        accent={tilesSlope != null && tilesSlope > 0}
      />
      <Tile
        label="Projected (30 tests out)"
        value={tilesProjected != null ? String(tilesProjected) : "—"}
        sub={
          tilesProjected != null ? "linear fit" : "need 5+ tests to project"
        }
      />
      <Tile label="Best ever" value={formatWpm(best)} sub="all-time" />
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 border border-foreground/10 bg-card p-4">
      <Tag>{label}</Tag>
      <div
        className={`text-2xl font-bold tabular-nums tracking-[-0.02em] ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function average(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const v of xs) s += v;
  return s / xs.length;
}

function formatWpm(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return String(Math.round(n));
}

function roundTo(n: number, places: number): number {
  const k = 10 ** places;
  return Math.round(n * k) / k;
}
