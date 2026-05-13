import { defineNamespace } from "@/server";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import { scoreWordRoute } from "./score-word";
import { snapshot } from "./snapshot";
import { submit } from "./submit";
import { words } from "./words";

/** Namespace-wide budget — 120 requests/minute is comfortably above
 *  a focused practice session (one /words + one /submit + a /snapshot
 *  read every ~5s) and well below what a scripted abuser would push.
 *  Individual expensive routes layer tighter caps on top so a hot
 *  scoreWord loop can't drain the namespace bucket.
 *
 *  Each route lives in its own file (`submit.ts`, `words.ts`,
 *  `snapshot.ts`, `score-word.ts`) per backend-rules R11. Shared
 *  user-prefs adapters sit in `./prefs`. */
export const adapt = defineNamespace({
  middleware: [requireAuth, rateLimit({ limit: 120, windowMs: 60_000 })],
  routes: { submit, words, snapshot, scoreWord: scoreWordRoute },
});
