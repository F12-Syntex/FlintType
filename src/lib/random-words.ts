import english from "@/data/english.json";

const POOL = english.words as string[];

/** Pick `count` random English words with no immediate repeats — used
 *  for self-contained typing surfaces (duels, live broadcast) that
 *  generate their own passage client-side. */
export function generateRandomWords(count: number): string[] {
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
