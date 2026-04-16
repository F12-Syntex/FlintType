import { clerkClient } from '@clerk/nextjs/server';
import { defineNamespace, defineRoute } from '@/server';
import { toUser } from '@/server/clerk-user';
import { requireAdmin } from '@/server/middleware/auth';
import type { ListAdminsOutput } from '@/types/user';

const list = defineRoute<void, ListAdminsOutput>({
  handler: async ({ log }) => {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({ limit: 100 });
    const admins = data.map(toUser).filter((u) => u.role === 'admin');
    log.debug('clerk admins filtered', {
      total: data.length,
      admins: admins.length,
    });
    return admins;
  },
});

export const admins = defineNamespace({
  middleware: [requireAdmin],
  routes: { list },
});
