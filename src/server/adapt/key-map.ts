import type { FingerId, HandLayoutPrefs } from "@/lib/hand-layout";

/** Standard touch-typing assignment of QWERTY characters to fingers.
 *  Lowercase letters and the most common punctuation only; characters
 *  outside this map (digits, brackets, exotic glyphs) don't contribute
 *  motor-feature samples — they're rare enough that the cost of
 *  guessing wrong (mislabelled feature → wrong target) outweighs the
 *  signal. The space bar is shared between thumbs; we tag it L1
 *  arbitrarily because its hand-side never matters for our features. */
const STD_KEY_FINGER: Readonly<Record<string, FingerId>> = {
  q: "L5", a: "L5", z: "L5",
  w: "L4", s: "L4", x: "L4",
  e: "L3", d: "L3", c: "L3",
  r: "L2", f: "L2", v: "L2", t: "L2", g: "L2", b: "L2",
  " ": "L1",
  y: "R2", h: "R2", n: "R2", u: "R2", j: "R2", m: "R2",
  i: "R3", k: "R3", ",": "R3",
  o: "R4", l: "R4", ".": "R4",
  p: "R5", ";": "R5", "/": "R5", "'": "R5",
};

export type KeyRow = "top" | "home" | "bottom";

const STD_KEY_ROW: Readonly<Record<string, KeyRow>> = {
  q: "top", w: "top", e: "top", r: "top", t: "top",
  y: "top", u: "top", i: "top", o: "top", p: "top",
  a: "home", s: "home", d: "home", f: "home", g: "home",
  h: "home", j: "home", k: "home", l: "home", ";": "home", "'": "home",
  z: "bottom", x: "bottom", c: "bottom", v: "bottom", b: "bottom",
  n: "bottom", m: "bottom", ",": "bottom", ".": "bottom", "/": "bottom",
};

/** Hand side derived from a finger id — the prefix is load-bearing
 *  ('L5' / 'R5' etc.) so the lookup is just a substring. */
export function handOf(finger: FingerId): "L" | "R" {
  return finger[0] as "L" | "R";
}

/** Look up the touch-typing finger for a single character. Returns
 *  null when the character is outside our mapped set — callers should
 *  treat that as "skip this measurement". */
export function fingerForChar(char: string): FingerId | null {
  return STD_KEY_FINGER[char.toLowerCase()] ?? null;
}

export function rowForChar(char: string): KeyRow | null {
  return STD_KEY_ROW[char.toLowerCase()] ?? null;
}

/** Returns the set of disabled finger ids from the user's layout.
 *  The motor-feature pipeline skips any bigram that touches a
 *  disabled finger — drilling a finger the user has marked missing
 *  or immobile would be insulting and pointless.
 *
 *  Defensive on shape: a stored prefs blob may be missing the
 *  `fingers` map entirely (older clients, hand-edited rows). Treat
 *  those as "no fingers disabled" rather than throwing — the rest
 *  of the algorithm still produces useful output against the
 *  default layout. */
export function disabledFingers(
  layout: HandLayoutPrefs,
): ReadonlySet<FingerId> {
  const out = new Set<FingerId>();
  const fingers = layout?.fingers;
  if (!fingers || typeof fingers !== "object") return out;
  for (const [id, st] of Object.entries(fingers)) {
    if (st && typeof st === "object" && (st as { enabled?: boolean }).enabled === false) {
      out.add(id as FingerId);
    }
  }
  return out;
}

/** Hash of the user's finger map. Used to detect changes — when this
 *  hash differs from the one stamped on the motor-feature model,
 *  callers should clearForUser before applying new measurements.
 *  Defensive on shape for the same reason as `disabledFingers`. */
export function fingerMapHash(layout: HandLayoutPrefs): string {
  const fingers = layout?.fingers;
  if (!fingers || typeof fingers !== "object") return "default";
  const parts: string[] = [];
  for (const id of Object.keys(fingers).sort()) {
    const f = (fingers as Record<string, unknown>)[id];
    if (!f || typeof f !== "object") continue;
    const enabled =
      (f as { enabled?: boolean }).enabled === false ? 0 : 1;
    const homeKey = (f as { homeKey?: string }).homeKey ?? "";
    parts.push(`${id}:${enabled}:${homeKey}`);
  }
  return parts.length > 0 ? parts.join("|") : "default";
}
