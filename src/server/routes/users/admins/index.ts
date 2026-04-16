import { defineNamespace, defineRoute } from '@/server';
import { usersDb } from '@/server/db';
import { requireAdmin } from '@/server/middleware/auth';
import type { User } from '@/types/user';

export type ListAdminsOutput = User[];

export const admins = defineNamespace({
  middleware: [requireAdmin],
  routes: {
    list: defineRoute<void, ListAdminsOutput>({
      handler: () => usersDb.filter((u) => u.role === 'admin'),
    }),
  },
});
