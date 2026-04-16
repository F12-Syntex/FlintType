import { defineNamespace } from '@/server';
import { requireAdminOrDev } from '@/server/middleware/admin-gate';
import { database } from './database';

/**
 * Admin surface. Locked to `role === 'admin'` in production; open to all
 * callers in `APP_ENV=development` so local inspection needs no sign-in.
 * See `docs/auth.md` for the gate semantics.
 */
export const admin = defineNamespace({
  middleware: [requireAdminOrDev],
  routes: { database },
});
