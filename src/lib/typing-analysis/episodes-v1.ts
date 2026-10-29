import { DOUBLED_GUARD } from "./constants";
import type { Episode } from "./episodes";
import type { Timeline } from "./timeline";

/** v1 mistake episodes, inferred from the key stream alone (spec-10 §6.3).
 *  Used for old payloads, the live clone and the settings preview, and
 *  as the fallback when a v2 replay fails its integrity check. Without
 *  backspaces the engine can't see a fix directly: a wrong key followed
 *  by the right letter at the same place is taken as one. */
export function episodesV1(tl: Timeline, P: number | null): Episode[] {
  const { ev, K } = tl;
  const out: Episode[] = [];
  const guardMs = DOUBLED_GUARD * (P ?? 0);
  let j = 0;
  while (j < K) {
    const wrong = ev[j]!;
    if (wrong.correct) {
      j++;
      continue;
    }
    const a = j - 1;
    let b = j + 1;
    while (b < K && !ev[b]!.correct) b++;
    const kind: Episode["kind"] = wrong.expected === "" ? "extra" : "slip";
    let ep: Episode;
    if (b >= K) {
      // The run ended inside the mistake.
      ep = { a, b: K - 1, word: wrong.wordIndex, kind, fixed: false, needed: K - 1 - a };
    } else {
      const fix = ev[b]!;
      if (kind === "extra") {
        const same = fix.wordIndex === wrong.wordIndex;
        ep = { a, b, word: wrong.wordIndex, kind, fixed: same, needed: same ? 0 : 2 };
      } else if (fix.wordIndex === wrong.wordIndex) {
        const fixed =
          fix.expected === wrong.expected && (tl.fixMode === "block" || fix.t - wrong.t >= guardMs);
        // A fix needs only its own key; carrying on keeps every stroke.
        ep = { a, b, word: wrong.wordIndex, kind, fixed, needed: fixed ? 1 : b - a };
      } else if (fix.wordIndex > wrong.wordIndex) {
        // Left the word: every stroke plus its Space.
        ep = { a, b, word: wrong.wordIndex, kind, fixed: false, needed: b - a + 1 };
      } else {
        // Went back to an earlier word: the episode runs until the cursor
        // is back at the slip's word, needing one key plus each word it
        // moved forward overall (net, so the detour's moves cancel).
        let end = b;
        while (end < K && !(ev[end]!.correct && ev[end]!.wordIndex >= wrong.wordIndex)) end++;
        b = Math.min(end, K - 1);
        const from = a >= 0 ? ev[a]!.wordIndex : ev[0]!.wordIndex;
        ep = { a, b, word: wrong.wordIndex, kind, fixed: true, needed: 1 + Math.max(0, ev[b]!.wordIndex - from) };
      }
    }
    out.push(ep);
    j = ep.b + 1;
  }
  return out;
}
