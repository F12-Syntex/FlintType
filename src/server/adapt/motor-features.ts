import type { FingerId, HandLayoutPrefs } from "@/lib/hand-layout";
import { disabledFingers, fingerForChar, handOf, rowForChar } from "./key-map";

/** Names every motor-feature key the algorithm produces. The strings
 *  are stored in the motor_feature_models table — keep them stable
 *  across versions, or write a one-shot rename migration. */
export type MotorFeatureKey = string;

/** A bigram's mechanical category. Three real cases plus "unknown"
 *  for digits, exotic punctuation, or characters touching disabled
 *  fingers. The categories are ranked from slowest to fastest:
 *
 *    same-finger > same-hand > cross-hand
 *
 *  The ranking is mechanical, not learned: typing "lo" with the
 *  right ring on QWERTY (same finger, two key presses) is an
 *  inherently slower motion than "fl" (same hand, two fingers) which
 *  is in turn slower than "po" (different hands — the fingers can
 *  pre-position in parallel). The weakness algorithm uses this to
 *  compare each bigram against the right peer group instead of one
 *  global mean — a 200ms "lo" is unremarkable for a same-finger
 *  pair but would be flagged as weak under a global baseline. */
export type BigramCategory =
  | "same-finger"
  | "same-hand"
  | "cross-hand"
  | "unknown";

/** Classify a 2-character bigram. Used by `bigramBaselines` to
 *  partition the model and by `scoreWord` to look up the right
 *  baseline per pair. Doubled letters ("oo", "tt") are a sub-case
 *  of same-finger and naturally get the highest baseline. */
export function bigramCategory(
  a: string,
  b: string,
  layout: HandLayoutPrefs,
): BigramCategory {
  const fa = fingerForChar(a);
  const fb = fingerForChar(b);
  if (fa == null || fb == null) return "unknown";
  const disabled = disabledFingers(layout);
  if (disabled.has(fa) || disabled.has(fb)) return "unknown";
  if (fa === fb) return "same-finger";
  if (handOf(fa) === handOf(fb)) return "same-hand";
  return "cross-hand";
}

/** Decompose a bigram into the motor features it embodies. A single
 *  pair like "ed" with a Welford state of 130ms contributes that
 *  130ms sample to *every* feature returned here — same-finger,
 *  same-hand-rolls, row-jump variants, and so on.
 *
 *  Returns [] when either character is unmapped (digit, exotic
 *  punctuation) or touches a disabled finger. */
export function deriveFeatureKeys(
  a: string,
  b: string,
  layout: HandLayoutPrefs,
): MotorFeatureKey[] {
  const fa = fingerForChar(a);
  const fb = fingerForChar(b);
  if (fa == null || fb == null) return [];
  const disabled = disabledFingers(layout);
  if (disabled.has(fa) || disabled.has(fb)) return [];

  const out: MotorFeatureKey[] = [];
  const ha = handOf(fa);
  const hb = handOf(fb);
  const sameFinger = fa === fb;
  const sameHand = ha === hb;
  const ra = rowForChar(a);
  const rb = rowForChar(b);

  if (sameFinger) {
    out.push(`same_finger_${fa}`);
    if (ra && rb && ra !== rb) {
      out.push(`row_jump_same_finger_${fa}`);
    }
  } else if (sameHand) {
    // Order the pair so "f → e" and "e → f" don't generate two
    // separate features for the same physical roll. The earlier
    // anatomical finger (lower number = more central) goes first.
    const pair = orderedFingerPair(fa, fb);
    out.push(`same_hand_roll_${pair}`);
  } else {
    const pair = `${ha}${fa.slice(1)}_to_${hb}${fb.slice(1)}`;
    out.push(`cross_hand_${pair}`);
  }

  if (ra && rb && ra !== rb) {
    out.push(`row_${ra}_to_${rb}`);
  }

  return out;
}

function orderedFingerPair(a: FingerId, b: FingerId): string {
  // Compare by anatomical column number (the second char of the id).
  const na = Number.parseInt(a[1] ?? "0", 10);
  const nb = Number.parseInt(b[1] ?? "0", 10);
  return na <= nb ? `${a}_to_${b}` : `${b}_to_${a}`;
}
