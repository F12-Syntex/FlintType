import { auth } from '@clerk/nextjs/server';
import { BackendError } from '@/lib/errors';
import { env } from '@/server/env';
import type { Middleware } from '../types';

type SessionClaimsWithRole = { metadata?: { role?: string } };

/**
 * Admin gate that opens up in development. Behavior:
 *
 * - `APP_ENV=development` — let everything through. If a Clerk session
 *   happens to be present its `userId` is still copied to `ctx.meta` for
 *   convenience, but no rejection is issued when it isn't.
 * - otherwise — require a Clerk session whose public metadata role is
 *   `'admin'`. Throws `UNAUTHORIZED` (no session) or `FORBIDDEN` (non-admin).
 *
 * Use this for dev-inspection surfaces (`admin.database.*`) that must stay
 * accessible locally without Clerk configured, yet must be locked down in
 * production. For routes that must always be admin-only (even in dev), use
 * {@link ../middleware/auth#requireAdmin} with {@link requireAuth}.
 */
export const requireAdminOrDev: Middleware = async (ctx, next) => {
  if (env.APP_ENV === 'development') {
    try {
      const session = await auth();
      if (session.userId) {
        ctx.meta.userId = session.userId;
        ctx.meta.sessionClaims = session.sessionClaims;
      }
    } catch {
      // Clerk may not be configured in dev; that's fine — still pass through.
    }
    return next();
  }

  const session = await auth();
  if (!session.userId) {
    throw new BackendError(401, 'UNAUTHORIZED', 'not signed in');
  }
  ctx.meta.userId = session.userId;
  ctx.meta.sessionClaims = session.sessionClaims;
  const claims = session.sessionClaims as SessionClaimsWithRole | undefined;
  if (claims?.metadata?.role !== 'admin') {
    throw new BackendError(403, 'FORBIDDEN', 'admin access required');
  }
  return next();
};
