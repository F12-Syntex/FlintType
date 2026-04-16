import { clerkClient } from '@clerk/nextjs/server';
import { BackendError } from '@/lib/errors';
import type { UserRow } from '@/types/user';
import type { RouteContext } from './types';

/**
 * Guarantees a local `users` row for the caller and returns it. Reads
 * `ctx.meta.userId` (populated by `requireAuth`); on a miss fetches the user
 * from Clerk via `clerkClient()` and upserts. Existing rows skip the Clerk
 * round-trip — one indexed `SELECT` per authenticated request in steady state.
 *
 * Use this in handlers that need to foreign-key to the user, join on user
 * fields, or otherwise rely on a durable local row. Without a webhook, this
 * is how creates enter the local `users` table.
 */
export async function ensureUser(ctx: RouteContext): Promise<UserRow> {
  const userId = ctx.meta.userId;
  if (typeof userId !== 'string' || userId.length === 0) {
    throw new BackendError(
      500,
      'INTERNAL',
      'ensureUser must run after requireAuth',
    );
  }

  const existing = await ctx.db.users.findById(userId);
  if (existing) return existing;

  const client = await clerkClient();
  try {
    const clerkUser = await client.users.getUser(userId);
    return await ctx.db.users.upsertFromClerk(clerkUser);
  } catch (err) {
    ctx.log.warn('ensureUser: clerk lookup failed', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw new BackendError(404, 'NOT_FOUND', `user ${userId} not found`);
  }
}
