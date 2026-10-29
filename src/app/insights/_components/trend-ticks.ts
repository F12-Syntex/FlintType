/** Date ticks for "Your speed over time" (spec-40 §3.5). Pure, tested
 *  in trend-ticks.test.ts. */

/** Local calendar day, for "label each day once". */
export function localDay(t: number): number {
  const d = new Date(t);
  return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
}

/** About one date label per 96px of chart, from 2 to 5: "Sep 27" is
 *  about 40px of `text-xs`, so labels keep a clear gap. Before the
 *  chart is measured, the phone count. */
export function maxDateTicks(widthPx: number | null): number {
  if (widthPx === null || !Number.isFinite(widthPx)) return 3;
  return Math.min(5, Math.max(2, Math.floor(widthPx / 96)));
}

/** Up to `max` ticks, spread evenly in time over the points on show and
 *  snapped to the first point of a calendar day, one label per day.
 *  Practice days are often bunched, so a tick closer to the one before
 *  than 1/(max+1) of the time on show (1/6 at 5 ticks) is dropped; the
 *  first and last days are kept when they are far enough apart. */
export function dateTicks(ts: readonly number[], max = 5): number[] {
  const days: number[] = [];
  let prev = Number.NaN;
  for (const t of ts) {
    const d = localDay(t);
    if (d !== prev) days.push(t);
    prev = d;
  }
  if (days.length <= 1) return days;
  const n = Math.max(2, Math.floor(max));
  const t0 = ts[0]!;
  const span = ts[ts.length - 1]! - t0;
  const picked = new Set<number>();
  for (let i = 0; i < n; i++) {
    const target = t0 + (i * span) / (n - 1);
    let best = days[0]!;
    for (const d of days) if (Math.abs(d - target) < Math.abs(best - target)) best = d;
    picked.add(best);
  }
  const sorted = [...picked].sort((a, b) => a - b);
  const gap = span / (n + 1);
  const out = [sorted[0]!];
  for (const t of sorted.slice(1, -1)) if (t - out[out.length - 1]! >= gap) out.push(t);
  // The last day wins over a middle tick that crowds it.
  const last = sorted[sorted.length - 1]!;
  while (out.length > 1 && last - out[out.length - 1]! < gap) out.pop();
  if (last - out[out.length - 1]! >= gap) out.push(last);
  return out;
}
