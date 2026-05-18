import { defineNamespace, defineRoute } from "@/server";
import { rateLimit } from "@/server/middleware/rate-limit";
import {
  getSharedTestInputSchema,
  type GetSharedTestInput,
  type SharedTest,
} from "@/types/share";
import { loadSharedTest } from "./load";

/** Public read of a completed test row, joined with the runner's
 *  Clerk identity. Powers the `/r/[testId]` share page + its dynamic
 *  OG card. No auth — anyone holding the testId can fetch it. */
const get = defineRoute<GetSharedTestInput, SharedTest>({
  input: getSharedTestInputSchema,
  handler: ({ input, db, log }) => loadSharedTest(db, input.slug, log),
});

/** Tight per-IP cap because every miss hits Clerk's API. 60/min is
 *  enough for a human visiting their own share link, plus the social
 *  scrapers that fan out when a link is posted (Twitter, Discord,
 *  Slack typically warm in under a dozen requests). */
export const share = defineNamespace({
  middleware: [rateLimit({ limit: 60, windowMs: 60_000 })],
  routes: { get },
});
