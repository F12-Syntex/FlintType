import { auth } from '@clerk/nextjs/server';
import { BackendError } from '@/lib/errors';
import type { Middleware } from '../types';

/**
 * Rejects any request without a valid Clerk session. On success, exposes
 * `ctx.meta.userId` (Clerk's `user_...` id) and `ctx.meta.sessionClaims` to
 * downstream middleware and handlers.
 */
export const requireAuth: Middleware = async (ctx, next) => {
  const session = await auth();
  if (!session.userId) {
    throw new BackendError(401, 'UNAUTHORIZED', 'not signed in');
  }
  ctx.meta.userId = session.userId;
  ctx.meta.sessionClaims = session.sessionClaims;
  return next();
};

type SessionClaimsWithRole = {
  metadata?: { role?: string };
};

/**
 * Requires the signed-in user's session claims to carry
 * `metadata.role === 'admin'`. Must run after {@link requireAuth}.
 *
 * Set the role in your Clerk dashboard under User -> Metadata (public) and
 * expose `metadata` as a session claim in the Clerk JWT template.
 */
export const requireAdmin: Middleware = async (ctx, next) => {
  if (!ctx.meta.userId) {
    throw new BackendError(
      500,
      'INTERNAL',
      'requireAdmin must run after requireAuth',
    );
  }
  const claims = ctx.meta.sessionClaims as SessionClaimsWithRole | undefined;
  if (claims?.metadata?.role !== 'admin') {
    throw new BackendError(403, 'FORBIDDEN', 'admin access required');
  }
  return next();
};
