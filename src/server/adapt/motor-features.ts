import type { FingerId, HandLayoutPrefs } from "@/lib/hand-layout";
import { disabledFingers, fingerForChar, handOf, rowForChar } from "./key-map";

/** Names every motor-feature key the algorithm produces. The strings
 *  are stored in the motor_feature_models table — keep them stable
 *  across versions, or write a one-shot rename migration. */
export type MotorFeatureKey = string;

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
