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
/**
 * Defense-in-depth against a misconfigured hosted deploy: even if
 * `env.APP_ENV` says `'development'` (e.g. because the env module was
 * mocked or misconfigured), refuse to open up the dev bypass when the
 * process is clearly running on a hosted platform. `env.ts` already
 * refuses to boot in this state; this guard is the belt to that braces.
 */
function isHostedDeploy(): boolean {
  return process.env.VERCEL === '1' || process.env.CI === 'true';
}

export const requireAdminOrDev: Middleware = async (ctx, next) => {
  if (env.APP_ENV === 'development' && !isHostedDeploy()) {
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
