import { defineNamespace } from "@/server";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import { clear } from "./clear";
import { overview } from "./overview";
import { usual } from "./usual";

/** The signed-in user's own typing analysis (spec-30 §6). Inputs never
 *  name a user: the id always comes from ctx.meta. No Clerk call. A
 *  missing analysis table is a status ("not-ready"), never an error. */
export const insights = defineNamespace({
  middleware: [requireAuth, rateLimit({ limit: 60, windowMs: 60_000 })],
  routes: { overview, usual, clear },
});
