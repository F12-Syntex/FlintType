import type { LogCell } from "@/types/typing-analysis";

/** Robust and order statistics for the typing analysis (spec-10 §3).
 *  Pure; every function tolerates empty input (NaN or a neutral value,
 *  as documented) so callers can guard instead of catching. */

/** Ascending copy (a typed-array sort: numeric, and much faster). */
const sorted = (xs: readonly number[]): Float64Array => Float64Array.from(xs).sort();

/** Median; NaN on empty (callers guard). */
export function median(xs: readonly number[]): number {
  return quantile(xs, 0.5);
}

/** Type 7 quantile (R's default): h = (n − 1)q, linear between order stats. */
export function quantile(xs: readonly number[], q: number): number {
  const n = xs.length;
  if (n === 0) return NaN;
  const s = sorted(xs);
  const h = (n - 1) * Math.min(1, Math.max(0, q));
  const lo = Math.floor(h);
  const hi = Math.min(n - 1, lo + 1);
  return s[lo]! + (h - lo) * (s[hi]! - s[lo]!);
}

/** Raw median absolute deviation (callers scale by 1.4826); NaN on empty. */
export function mad(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  const m = median(xs);
  return median(xs.map((x) => Math.abs(x - m)));
}

/** [n, Σ ln x, Σ (ln x)²] over the positive finite values of xs. */
export function cellOf(xs: readonly number[]): LogCell {
  let c: LogCell = [0, 0, 0];
  for (const x of xs) c = addToCell(c, x);
  return c;
}

/** Adds ln(x) to a cell; a non-positive or non-finite x is ignored. */
export function addToCell(c: LogCell, x: number): LogCell {
  if (!(x > 0) || !Number.isFinite(x)) return c;
  const l = Math.log(x);
  return [c[0] + 1, c[1] + l, c[2] + l * l];
}

export function mergeCells(cs: readonly LogCell[]): LogCell {
  const out: LogCell = [0, 0, 0];
  for (const c of cs) {
    out[0] += c[0];
    out[1] += c[1];
    out[2] += c[2];
  }
  return out;
}

/** Σ ln / n; NaN for an empty cell. */
export function cellMean(c: LogCell): number {
  return c[0] > 0 ? c[1] / c[0] : NaN;
}

/** Sample variance of ln; 0 below two values, never negative. */
export function cellVar(c: LogCell): number {
  const n = c[0];
  if (n < 2) return 0;
  return Math.max(0, (c[2] - (c[1] * c[1]) / n) / (n - 1));
}

/** (mean_b − mean_a) / √(var_a/n_a + var_b/n_b). 0 when either cell has
 *  fewer than 2 values or both variances are 0 (no evidence claimed). */
export function welchZ(a: LogCell, b: LogCell): number {
  if (a[0] < 2 || b[0] < 2) return 0;
  const se = Math.sqrt(cellVar(a) / a[0] + cellVar(b) / b[0]);
  if (!(se > 0)) return 0;
  return (cellMean(b) - cellMean(a)) / se;
}

/** Pooled two-proportion z for p2 − p1 (second minus first, like welchZ):
 *  positive when x2/n2 is the higher rate. 0 when undefined. */
export function twoPropZ(x1: number, n1: number, x2: number, n2: number): number {
  if (!(n1 > 0) || !(n2 > 0)) return 0;
  const p = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  if (!(se > 0)) return 0;
  return (x2 / n2 - x1 / n1) / se;
}

const LOG_FACT: number[] = [0];
function logFactorial(n: number): number {
  for (let i = LOG_FACT.length; i <= n; i++) LOG_FACT.push(LOG_FACT[i - 1]! + Math.log(i));
  return LOG_FACT[n]!;
}

/** Exact P(X ≤ k) for X ~ Binomial(n, p), n ≤ 1000 (log space). */
export function binomCdf(k: number, n: number, p: number): number {
  const kk = Math.floor(k);
  if (kk < 0) return 0;
  if (kk >= n) return 1;
  if (p <= 0) return 1;
  if (p >= 1) return 0;
  const lp = Math.log(p);
  const lq = Math.log(1 - p);
  const lfn = logFactorial(n);
  let sum = 0;
  for (let i = 0; i <= kk; i++) {
    sum += Math.exp(lfn - logFactorial(i) - logFactorial(n - i) + i * lp + (n - i) * lq);
  }
  return Math.min(1, sum);
}

/** One-sided sign test: P(X ≥ k | n, ½). */
export function signTestP(k: number, n: number): number {
  if (n <= 0) return 1;
  return Math.max(0, Math.min(1, 1 - binomCdf(k - 1, n, 0.5)));
}

/** Distribution-free confidence ranks for the median (1-based): l is the
 *  largest k with binomCdf(k − 1; n, ½) ≤ α/2 (at least 1), u = n + 1 − l.
 *  n = 10, α = 0.2 gives [3, 8]. */
export function medianRankCI(n: number, alpha: number): [l: number, u: number] {
  if (n < 1) return [1, 1];
  let l = 1;
  for (let k = 1; k <= Math.ceil(n / 2); k++) {
    if (binomCdf(k - 1, n, 0.5) <= alpha / 2) l = k;
    else break;
  }
  return [l, n + 1 - l];
}

/** Theil–Sen: the median of every pairwise slope (pairs with equal x
 *  skipped). Returns the slopes sorted ascending for senCI. */
export function theilSen(x: readonly number[], y: readonly number[]): { slope: number; slopes: number[] } {
  const slopes: number[] = [];
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = x[j]! - x[i]!;
      if (dx !== 0) slopes.push((y[j]! - y[i]!) / dx);
    }
  }
  slopes.sort((a, b) => a - b);
  return { slope: median(slopes), slopes };
}

/** Sen's confidence interval: C = z·√(n(n−1)(2n+5)/18), N slopes; lower
 *  = slope at rank ⌊(N − C)/2⌋, upper = slope at rank ⌈(N + C)/2⌉ + 1
 *  (1-based, clamped to [1, N]). `slopes` must be sorted ascending. */
export function senCI(slopes: readonly number[], n: number, z: number): [lo: number, hi: number] {
  const N = slopes.length;
  if (N === 0) return [NaN, NaN];
  const C = z * Math.sqrt((n * (n - 1) * (2 * n + 5)) / 18);
  const rank = (r: number) => Math.min(N, Math.max(1, r));
  const lo = rank(Math.floor((N - C) / 2));
  const hi = rank(Math.ceil((N + C) / 2) + 1);
  return [slopes[lo - 1]!, slopes[hi - 1]!];
}

/** Rounds `values` (in units of 10^−decimals) so they sum to `total`
 *  exactly: floor everything, then hand the leftover units to the largest
 *  fractional parts (ties to the lower index); a negative leftover (from
 *  float noise) is taken from the smallest fractional parts. Each output
 *  stays within one unit of its input when the inputs sum to `total`. */
export function largestRemainder(values: readonly number[], total: number, decimals = 0): number[] {
  const scale = 10 ** decimals;
  const scaled = values.map((v) => (Number.isFinite(v) ? Math.max(0, v) * scale : 0));
  const units = scaled.map((v) => Math.floor(v + 1e-9));
  const frac = scaled.map((v, i) => v - units[i]!);
  let left = Math.round(total * scale) - units.reduce((s, u) => s + u, 0);
  const order = frac.map((f, i) => i);
  if (left > 0) {
    order.sort((a, b) => frac[b]! - frac[a]! || a - b);
    for (let i = 0; left > 0 && order.length > 0; i = (i + 1) % order.length, left--) {
      const idx = order[i]!;
      units[idx] = units[idx]! + 1;
    }
  } else if (left < 0) {
    order.sort((a, b) => frac[a]! - frac[b]! || b - a);
    let guard = 0;
    for (let i = 0; left < 0 && guard < order.length * 4; i = (i + 1) % order.length, guard++) {
      const idx = order[i]!;
      if (units[idx]! > 0) {
        units[idx] = units[idx]! - 1;
        left++;
      }
    }
  }
  return units.map((u) => (decimals === 0 ? u : round(u / scale, decimals)));
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** Rounds half away from zero at `dp` decimals. */
export function round(x: number, dp: number): number {
  const f = 10 ** dp;
  const r = Math.round(Math.abs(x) * f) / f;
  return x < 0 ? -r : r;
}
