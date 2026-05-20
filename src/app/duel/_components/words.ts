import english from "@/data/english.json";

const POOL = english.words as string[];

/** Pick `count` random English words (no immediate repeats) for a fresh
 *  duel passage. Generated on the challenger's client; the chosen words
 *  are snapshotted onto the duel so the opponent types the exact same
 *  passage. */
export function generateDuelWords(count: number): string[] {
  const out: string[] = [];
  let prev = "";
  while (out.length < count) {
    const w = POOL[Math.floor(Math.random() * POOL.length)]!;
    if (w === prev) continue;
    out.push(w);
    prev = w;
  }
  return out;
}
