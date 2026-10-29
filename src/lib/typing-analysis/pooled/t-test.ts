/** Student t and normal tail probabilities for the pooled noise tests.
 *
 *  - The pair metric of "What changed" (spec-10 §13.7) runs once per
 *    tracked letter pair (up to 16), so it is judged on a Welch p-value
 *    with a Bonferroni share of the error rate (changes.ts): a bare
 *    |t| ≥ 3 at 10 to 15 degrees of freedom fires about once in a hundred
 *    pairs, which over 12 pairs is 1 user in 9.
 *  - medianDiff estimates its variance from a handful of sessions, so its
 *    z is judged as a t with df = sessions − 2 (usual.ts). */

const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const variance = (xs: readonly number[], m: number) => xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);

/** t = (mean_b − mean_a) / √(v_a/n_a + v_b/n_b), with Welch–Satterthwaite
 *  degrees of freedom. t = 0 (and df = 0) when either side has fewer than
 *  2 values or there is no spread. */
export function welch(a: readonly number[], b: readonly number[]): { t: number; df: number; diff: number } {
  if (a.length < 2 || b.length < 2) return { t: 0, df: 0, diff: 0 };
  const ma = mean(a);
  const mb = mean(b);
  const qa = variance(a, ma) / a.length;
  const qb = variance(b, mb) / b.length;
  const se2 = qa + qb;
  if (!(se2 > 0)) return { t: 0, df: 0, diff: mb - ma };
  const df = (se2 * se2) / ((qa * qa) / (a.length - 1) + (qb * qb) / (b.length - 1));
  return { t: (mb - ma) / Math.sqrt(se2), df, diff: mb - ma };
}

/** ln Γ(x), Lanczos (g = 7, 9 terms). */
function lnGamma(x: number): number {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61503916999185, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  const z = x - 1;
  let s = c[0]!;
  for (let i = 1; i < 9; i++) s += c[i]! / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(s);
}

/** Continued fraction for the incomplete beta (modified Lentz). */
function betaCf(a: number, b: number, x: number): number {
  const tiny = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  d = Math.abs(d) < tiny ? tiny : d;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    d = Math.abs(d) < tiny ? tiny : d;
    c = 1 + aa / c;
    c = Math.abs(c) < tiny ? tiny : c;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    d = Math.abs(d) < tiny ? tiny : d;
    c = 1 + aa / c;
    c = Math.abs(c) < tiny ? tiny : c;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return h;
}

/** Regularised incomplete beta I_x(a, b). */
export function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (front * betaCf(a, b, x)) / a : 1 - (front * betaCf(b, a, 1 - x)) / b;
}

/** Two-sided P(|T| ≥ |t|) for Student's t with df degrees of freedom
 *  (1 when df isn't positive). */
export function tTwoSidedP(t: number, df: number): number {
  if (!(df > 0) || !Number.isFinite(t)) return Number.isFinite(t) ? 1 : 0;
  return Math.min(1, Math.max(0, incompleteBeta(df / (df + t * t), df / 2, 0.5)));
}

/** Two-sided normal tail P(|Z| ≥ |z|) (erfc, Numerical Recipes, |ε| < 1.2e−7). */
export function normalTwoSidedP(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.5 * x);
  const y = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418
    + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return Math.min(1, y);
}

/** z with P(|Z| ≥ z) = p (Acklam's inverse normal, relative error < 1.2e−9). */
export function zForTwoSidedP(p: number): number {
  const q = Math.min(1 - 1e-16, Math.max(1e-300, p / 2));
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  if (q < 0.02425) {
    const r = Math.sqrt(-2 * Math.log(q));
    return -(((((c[0]! * r + c[1]!) * r + c[2]!) * r + c[3]!) * r + c[4]!) * r + c[5]!)
      / ((((d[0]! * r + d[1]!) * r + d[2]!) * r + d[3]!) * r + 1);
  }
  const u = q - 0.5;
  const r = u * u;
  return -((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * u)
    / (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
}
