import type { HandLayoutPrefs } from "@/lib/hand-layout";

/** Hash of the user's finger map. Used to detect changes — when this
 *  hash differs from the one stamped on the motor-feature model,
 *  callers should clearForUser before applying new measurements.
 *  Defensive on shape: a stored prefs blob may be missing the
 *  `fingers` map entirely (older clients, hand-edited rows).
 *
 *  The finger, hand and row maps themselves are pure and shared with
 *  the browser: they live in `src/lib/keystrokes/key-map.ts`. */
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
