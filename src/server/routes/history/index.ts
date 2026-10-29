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
import { weakestPatterns } from "@/server/weakest-patterns";
import type { UserTagId } from "@/types/user-tag";
import {
  bigramRowsToStates,
  trigramRowsToStates,
  wordRowsToStates,
} from "@/server/adapt/apply";
import { ensureHandLayout, type HandLayoutPrefs } from "@/lib/hand-layout";
import { readLifetimeStats } from "@/lib/lifetime-stats";
import {
  publicProfileInputSchema,
  type HistoryModelFields,
  type HistorySummaryOutput,
  type HistoryTest,
  type ProfileSnapshot,
  type PublicMonkeytypeStats,
  type PublicProfileInput,
} from "@/types/history";
import { readProfileRank } from "@/types/rank";
import type { MonkeytypeStatsSlice } from "@/types/monkeytype";
import type { UserPrefsBlob } from "@/types/user-prefs";

/** How many recent tests we serve to the client. 500 is comfortably
 *  more than 90 days of regular use (a daily user racks up ~10/day on
 *  the high end). The page bins client-side. */
const RECENT_LIMIT = 500;

/** The parts of a profile that are safe for anyone to see: test rows,
 *  the MonkeyType overlay, tags, rank, avatar and lifetime counters.
 *  Never reads the timing models (I6), so a public profile can't leak a
 *  typist's weak letter pairs, words or baselines. `prefs` is the
 *  subject's prefs blob, which both callers have already read. */
async function loadProfileSnapshot(
  db: Database,
  userId: string,
  prefs: UserPrefsBlob,
  tags: UserTagId[],
  eligibleTags: UserTagId[],
  subjectAvatarUrl: string | null,
): Promise<ProfileSnapshot> {
  const recentRows = await db.tests.recentForUser(userId, RECENT_LIMIT);
  const recentTests: HistoryTest[] = recentRows.map((r) => ({
    id: r.id,
    startedAtMs: r.startedAt.getTime(),
    completedAtMs: r.completedAt?.getTime() ?? r.startedAt.getTime(),
    mode: r.mode,
    durationOrWordCount: r.durationOrWordCount,
    lengthMode: (r.lengthMode as "words" | "time" | "quote" | null) ?? null,
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
  const mtRaw = prefs.monkeytypeStats as MonkeytypeStatsSlice | undefined;
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
    monkeytype,
    tags,
    eligibleTags,
    rank: readProfileRank(prefs),
    subjectAvatarUrl,
    subjectUserId: userId,
    lifetimeStats: readLifetimeStats(prefs),
  };
}

/** Owner-only fields derived from the user's timing models: weakest
 *  pairs, triples and words, and the baselines. Categorisation reads
 *  the user's finger map (Dvorak / Colemak users have different
 *  same-finger pairs than QWERTY), so rankings respect the layout the
 *  user actually types on. */
async function loadModelFields(
  db: Database,
  userId: string,
  layout: HandLayoutPrefs,
): Promise<HistoryModelFields> {
  const [bigramRows, trigramRows, wordRows] = await Promise.all([
    db.bigramModels.listForUser(userId),
    db.trigramModels.listForUser(userId),
    db.wordModels.listForUser(userId),
  ]);
  const w = weakestPatterns(
    {
      bigrams: bigramRowsToStates(bigramRows),
      trigrams: trigramRowsToStates(trigramRows),
      words: wordRowsToStates(wordRows),
    },
    layout,
  );
  return {
    weakestPairs: w.pairs,
    weakestTrigrams: w.trigrams,
    weakestWords: w.words,
    cold: w.cold,
    bigramBaselineMs: w.bigramBaselineMs,
    trigramBaselineMs: w.trigramBaselineMs,
    wordBaselineMs: w.wordBaselineMs,
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
    const [snapshot, modelFields] = await Promise.all([
      loadProfileSnapshot(ctx.db, userId, prefs, tags, eligibleTags, subjectAvatarUrl),
      loadModelFields(ctx.db, userId, ensureHandLayout(prefs.handLayout)),
    ]);
    return { ...snapshot, ...modelFields };
  },
});

/** Public profile lookup — anyone (including signed-out viewers)
 *  can pull another user's history by Clerk username. Throws
 *  NOT_FOUND when the username doesn't exist on Clerk. Returns the
 *  `ProfileSnapshot` part of `summary` only: never the timing-derived
 *  model fields, and the model tables are never read (I6). The profile
 *  UI renders either source uniformly; only the owner-only chrome
 *  (Edit, MonkeyType, Sign out) is gated client-side.
 *
 *  Tight per-IP cap because this route is unauthenticated and hits
 *  Clerk's API on every call — without a budget, a scripted scanner
 *  could enumerate usernames AND chew through our Clerk API quota
 *  in a few seconds. 10/min per IP is enough for a human browsing
 *  several profiles and zero for an enumeration attempt. */
const publicProfile = defineRoute<PublicProfileInput, ProfileSnapshot>({
  input: publicProfileInputSchema,
  middleware: [rateLimit({ limit: 10, windowMs: 60_000 })],
  handler: async ({ input, db }) => {
    const client = await clerkClient();
    const slug = input.username;
    // Dual-mode lookup: Clerk username, or — if the slug looks like a
    // user_id — direct getUser. The leaderboard surfaces rows for
    // users who never set a Clerk username by linking via their
    // user_id, so every entry is clickable. The slug pattern is
    // unambiguous (Clerk usernames are `^[a-zA-Z_]+$` per our regex,
    // user ids start with `user_`).
    let user: Awaited<ReturnType<typeof client.users.getUser>> | null = null;
    if (slug.startsWith("user_")) {
      try {
        user = await client.users.getUser(slug);
      } catch {
        user = null;
      }
    } else {
      const list = await client.users.getUserList({ username: [slug] });
      user = list.data[0] ?? null;
    }
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
    return loadProfileSnapshot(
      db,
      user.id,
      subjectPrefs,
      tags,
      eligibleTags,
      subjectAvatarUrl,
    );
  },
});

export const history = defineNamespace({
  routes: { summary, publicProfile },
});
