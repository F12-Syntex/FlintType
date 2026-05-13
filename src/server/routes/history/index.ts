import { clerkClient } from "@clerk/nextjs/server";
import { defineNamespace, defineRoute } from "@/server";
import { BackendError } from "@/lib/errors";
import type { Database } from "@/db/server";
import { ensureUser } from "@/server/ensure-user";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import {
  applyTagSelection,
  readTagSelection,
  resolveEligibleTags,
} from "@/server/resolve-tags";
import type { UserTagId } from "@/types/user-tag";
import {
  bigramRowsToStates,
  trigramRowsToStates,
  wordRowsToStates,
} from "@/server/adapt/apply";
import { bigramCategory } from "@/server/adapt/motor-features";
import {
  baselineForCategory,
  baselineMean,
  bigramBaselines,
  MIN_SAMPLES_FOR_WEAKNESS,
  weakness,
} from "@/server/adapt/scoring";
import { COLD_BIGRAM_THRESHOLD } from "@/server/adapt/select";
import { ensureHandLayout } from "@/lib/hand-layout";
import {
  publicProfileInputSchema,
  type HistorySummaryOutput,
  type HistoryTest,
  type HistoryWeakness,
  type PublicMonkeytypeStats,
  type PublicProfileInput,
} from "@/types/history";
import type { MonkeytypeStatsSlice } from "@/types/monkeytype";

/** How many recent tests we serve to the client. 500 is comfortably
 *  more than 90 days of regular use (a daily user racks up ~10/day on
 *  the high end). The page bins client-side. */
const RECENT_LIMIT = 500;

/** Top N weakest bigrams returned for the page. Twelve fits in a
 *  list-of-bars panel without scrolling and gives the user enough
 *  signal to spot patterns. */
const WEAKEST_LIMIT = 12;

/** Top N worst words. Larger than the bigram cap because the
 *  worst-words drill (`/drills/worst-words`) leans on this list
 *  directly and asks the user to burst 20 of them. */
const WORST_WORDS_LIMIT = 20;

/** Shared loader — reads everything one user's history surface needs.
 *  Driven by `userId` so both the auth-gated `summary` route (caller
 *  is the subject) and the public `publicProfile` route (subject is
 *  looked up by username) use the same query path + shape. */
async function loadHistorySummary(
  db: Database,
  userId: string,
  tags: UserTagId[],
  eligibleTags: UserTagId[],
  subjectAvatarUrl: string | null,
): Promise<HistorySummaryOutput> {
  // Categorisation reads the user's finger map (Dvorak / Colemak
  // users have different same-finger pairs than QWERTY). Load it
  // alongside the model so weakness rankings respect the layout
  // the user actually types on.
  const prefsBlob = await db.userPrefs.get(userId);
  const layout = ensureHandLayout(prefsBlob.handLayout);
  const [bigramRows, trigramRows, wordRows, recentRows] = await Promise.all([
    db.bigramModels.listForUser(userId),
    db.trigramModels.listForUser(userId),
    db.wordModels.listForUser(userId),
    db.tests.recentForUser(userId, RECENT_LIMIT),
  ]);

  const bigramStates = bigramRowsToStates(bigramRows);
  const baselines = bigramBaselines(bigramStates, layout);

  const weakestPairs: HistoryWeakness[] = [];
  for (const [key, st] of bigramStates) {
    if (st.n < MIN_SAMPLES_FOR_WEAKNESS) continue;
    if (key.length !== 2) continue;
    const cat = bigramCategory(key[0]!, key[1]!, layout);
    const weak = weakness(st, baselineForCategory(cat, baselines));
    if (weak <= 0) continue;
    weakestPairs.push({
      key,
      meanMs: st.mean,
      weakness: weak,
      sampleCount: st.n,
    });
  }
  weakestPairs.sort((a, b) => b.weakness - a.weakness);
  weakestPairs.length = Math.min(weakestPairs.length, WEAKEST_LIMIT);

  const trigramStates = trigramRowsToStates(trigramRows);
  const trigramBaseline = baselineMean(trigramStates);
  const weakestTrigrams: HistoryWeakness[] = [];
  for (const [key, st] of trigramStates) {
    if (st.n < MIN_SAMPLES_FOR_WEAKNESS) continue;
    const weak = weakness(st, trigramBaseline);
    if (weak <= 0) continue;
    weakestTrigrams.push({
      key,
      meanMs: st.mean,
      weakness: weak,
      sampleCount: st.n,
    });
  }
  weakestTrigrams.sort((a, b) => b.weakness - a.weakness);
  weakestTrigrams.length = Math.min(weakestTrigrams.length, WEAKEST_LIMIT);

  const wordStates = wordRowsToStates(wordRows);
  const wordBaseline = baselineMean(wordStates);
  const weakestWords: HistoryWeakness[] = [];
  for (const [key, st] of wordStates) {
    if (st.n < MIN_SAMPLES_FOR_WEAKNESS) continue;
    const weak = weakness(st, wordBaseline);
    if (weak <= 0) continue;
    weakestWords.push({
      key,
      meanMs: st.mean,
      weakness: weak,
      sampleCount: st.n,
    });
  }
  weakestWords.sort((a, b) => b.weakness - a.weakness);
  weakestWords.length = Math.min(weakestWords.length, WORST_WORDS_LIMIT);

  let totalSamples = 0;
  for (const st of bigramStates.values()) totalSamples += st.n;

  const recentTests: HistoryTest[] = recentRows.map((r) => ({
    id: r.id,
    startedAtMs: r.startedAt.getTime(),
    completedAtMs: r.completedAt?.getTime() ?? r.startedAt.getTime(),
    mode: r.mode,
    durationOrWordCount: r.durationOrWordCount,
    wpm: r.wpm,
    accuracy: r.accuracy,
    errorCount: r.errorCount,
    wasCompleted: r.wasCompleted,
  }));

  // MonkeyType lifetime overlay — read the subject's stored slice so
  // visitors merge against the *subject's* MT data, not their own.
  // The encrypted Ape Key is stripped before serialisation so a public
  // profile fetch can never leak credential material, even in
  // encrypted form. Owners get the same shape since the key never
  // travels back to the client either way (the import route already
  // returns the slice on write).
  const mtRaw = prefsBlob.monkeytypeStats as
    | MonkeytypeStatsSlice
    | undefined;
  let monkeytype: PublicMonkeytypeStats | null = null;
  if (mtRaw && Number(mtRaw.importedAt ?? 0) > 0) {
    // Object rest strips encryptedApiKey at the type and runtime
    // level. Any future credential-shaped fields added to the slice
    // must be opted *in* here, not out.
    const { encryptedApiKey: _omit, ...publicSlice } = mtRaw;
    void _omit;
    monkeytype = publicSlice;
  }

  return {
    recentTests,
    weakestPairs,
    weakestTrigrams,
    weakestWords,
    cold: totalSamples < COLD_BIGRAM_THRESHOLD,
    bigramBaselineMs: baselines.overall,
    trigramBaselineMs: trigramBaseline,
    wordBaselineMs: wordBaseline,
    monkeytype,
    tags,
    eligibleTags,
    subjectAvatarUrl,
  };
}

const summary = defineRoute<void, HistorySummaryOutput>({
  middleware: [requireAuth, rateLimit({ limit: 30, windowMs: 60_000 })],
  handler: async (ctx) => {
    // Materialise the local mirror row on the user's first encounter.
    // This is the OG-grant trigger — see src/server/ensure-user.ts.
    // Failures inside the grant itself are swallowed; the summary
    // load always proceeds.
    await ensureUser(ctx);
    const userId = ctx.meta.userId as string;
    // Pull the Clerk user once to resolve identity tags + the subject's
    // avatar URL. A failure here downgrades to no tags / no avatar but
    // doesn't break the summary — a profile without a tag chip or
    // photo is a usable profile.
    let eligibleTags: UserTagId[] = [];
    let subjectAvatarUrl: string | null = null;
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      eligibleTags = resolveEligibleTags({
        email: user.emailAddresses[0]?.emailAddress,
        publicMetadataTags: (user.publicMetadata as { tags?: unknown } | null)
          ?.tags,
      });
      // Suppress Clerk's auto-generated gradient default — only return
      // a URL when the user has actually uploaded a photo.
      if (user.hasImage && user.imageUrl) {
        subjectAvatarUrl = user.imageUrl;
      }
    } catch (err) {
      ctx.log.warn("history.summary: tag/avatar resolution failed", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    // Apply the caller's tag-display selection — stored in user-prefs
    // under `selectedTags`. A missing selection means "show all
    // eligible" so existing users don't lose tags overnight.
    const prefs = await ctx.db.userPrefs.get(userId);
    const selection = readTagSelection(prefs);
    const tags = applyTagSelection(eligibleTags, selection);
    return loadHistorySummary(
      ctx.db,
      userId,
      tags,
      eligibleTags,
      subjectAvatarUrl,
    );
  },
});

/** Public profile lookup — anyone (including signed-out viewers)
 *  can pull another user's history by Clerk username. Throws
 *  NOT_FOUND when the username doesn't exist on Clerk. The data
 *  shape is identical to `summary` so the profile UI can render
 *  either source uniformly; only the owner-only chrome (Edit,
 *  MonkeyType, Sign out) is gated client-side.
 *
 *  Tight per-IP cap because this route is unauthenticated and hits
 *  Clerk's API on every call — without a budget, a scripted scanner
 *  could enumerate usernames AND chew through our Clerk API quota
 *  in a few seconds. 10/min per IP is enough for a human browsing
 *  several profiles and zero for an enumeration attempt. */
const publicProfile = defineRoute<PublicProfileInput, HistorySummaryOutput>({
  input: publicProfileInputSchema,
  middleware: [rateLimit({ limit: 10, windowMs: 60_000 })],
  handler: async ({ input, db }) => {
    const client = await clerkClient();
    const list = await client.users.getUserList({
      username: [input.username],
    });
    const user = list.data[0];
    if (!user) {
      throw new BackendError(
        404,
        "NOT_FOUND",
        `No flinttype profile for @${input.username}`,
      );
    }
    // We already have the Clerk user from the username lookup — read
    // tags + avatar off it directly rather than pay for a second
    // getUser call.
    const eligibleTags = resolveEligibleTags({
      email: user.emailAddresses[0]?.emailAddress,
      publicMetadataTags: (user.publicMetadata as { tags?: unknown } | null)
        ?.tags,
    });
    const subjectAvatarUrl =
      user.hasImage && user.imageUrl ? user.imageUrl : null;
    const subjectPrefs = await db.userPrefs.get(user.id);
    const selection = readTagSelection(subjectPrefs);
    const tags = applyTagSelection(eligibleTags, selection);
    return loadHistorySummary(
      db,
      user.id,
      tags,
      eligibleTags,
      subjectAvatarUrl,
    );
  },
});

export const history = defineNamespace({
  routes: { summary, publicProfile },
});
