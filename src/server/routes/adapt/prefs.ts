import type { Database } from "@/db/server";
import { ensureHandLayout, type HandLayoutPrefs } from "@/lib/hand-layout";

/** Shape every adapt route needs from the user_prefs blob. The blob
 *  itself is server-opaque JSON (`Record<string, unknown>`), so this
 *  file owns the casts at the boundary and the route handlers stay
 *  free of unsafe `as` access patterns.
 *
 *  Fields:
 *   - `handLayout`        — coerced via ensureHandLayout, so legacy /
 *     partial rows can't blow up bigramCategory / disabledFingers
 *     downstream.
 *   - `adaptRecency`      — map of recently-shown word → "tests ago"
 *     counter (drives the algorithm's penalty for repeats).
 *   - `adaptFingerMapHash`— hash of the current finger map; bumping
 *     wipes the motor-feature model since its keys describe a layout
 *     that no longer exists.
 *   - `raw`               — the original blob, kept for write-through
 *     so persistAdaptPrefs doesn't trample unrelated slices. */
export type AdaptPrefs = {
  handLayout: HandLayoutPrefs;
  adaptRecency: Map<string, number>;
  adaptFingerMapHash: string | null;
  raw: Record<string, unknown>;
};

export async function loadAdaptPrefs(
  db: Database,
  userId: string,
): Promise<AdaptPrefs> {
  const raw = await db.userPrefs.get(userId);
  const layout = ensureHandLayout(raw.handLayout);
  const recency = new Map<string, number>(
    Object.entries(
      (raw.adaptRecency as Record<string, number> | undefined) ?? {},
    ),
  );
  const hash =
    (raw.adaptFingerMapHash as string | undefined | null) ?? null;
  return {
    handLayout: layout,
    adaptRecency: recency,
    adaptFingerMapHash: hash,
    raw,
  };
}

export async function persistAdaptPrefs(
  db: Database,
  userId: string,
  prefs: AdaptPrefs,
  patch: { adaptRecency?: Map<string, number>; adaptFingerMapHash?: string },
): Promise<void> {
  // Merge ONLY the two server-owned keys via jsonb `||` rather than
  // reading the whole blob and writing it back. The previous read-raw +
  // wholesale `set` raced the client's debounced `prefs.set`: a setting
  // the user changed while a run was in flight could be reverted to the
  // value `prefs.raw` was loaded with (FT-007 lost-update). A merge
  // touches adaptRecency / adaptFingerMapHash and nothing else.
  const next: Record<string, unknown> = {};
  if (patch.adaptRecency)
    next.adaptRecency = Object.fromEntries(patch.adaptRecency);
  if (patch.adaptFingerMapHash !== undefined)
    next.adaptFingerMapHash = patch.adaptFingerMapHash;
  if (Object.keys(next).length === 0) return;
  await db.userPrefs.merge(userId, next);
}
