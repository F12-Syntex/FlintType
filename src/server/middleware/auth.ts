import type { User } from '@/types/user';
import { usersDb } from '../db';
import { BackendError } from '@/lib/errors';
import type { Middleware } from '../types';

/**
 * Demo auth — reads `x-user-id` header and looks up the user in the in-memory
 * db. Replace with real session/token logic in a production app.
 */
export const requireAuth: Middleware = async (ctx, next) => {
  const userId = ctx.req.headers.get('x-user-id');
  if (!userId) {
    throw new BackendError(401, 'UNAUTHORIZED', 'missing x-user-id header');
  }
  const user = usersDb.find((u) => u.id === userId);
  if (!user) {
    throw new BackendError(401, 'UNAUTHORIZED', `unknown user: ${userId}`);
  }
  ctx.meta.userId = user.id;
  ctx.meta.user = user;
  return next();
};

export const requireAdmin: Middleware = async (ctx, next) => {
  const user = ctx.meta.user as User | undefined;
  if (!user) {
    throw new BackendError(
      500,
      'INTERNAL',
      'requireAdmin must run after requireAuth',
    );
  }
  if (user.role !== 'admin') {
    throw new BackendError(403, 'FORBIDDEN', 'admin access required');
  }
  return next();
};
