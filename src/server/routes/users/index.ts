import { clerkClient } from '@clerk/nextjs/server';
import { BackendError, defineNamespace, defineRoute } from '@/server';
import { toUser } from '@/server/clerk-user';
import { requireAuth } from '@/server/middleware/auth';
import {
  getUserInputSchema,
  type GetUserInput,
  type GetUserOutput,
  type ListUsersOutput,
} from '@/types/user';
import { admins } from './admins';

const list = defineRoute<void, ListUsersOutput>({
  handler: async ({ log }) => {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({ limit: 100 });
    log.debug('clerk users fetched', { count: data.length });
    return data.map(toUser);
  },
});

const get = defineRoute<GetUserInput, GetUserOutput>({
  input: getUserInputSchema,
  handler: async ({ input, log }) => {
    const client = await clerkClient();
    try {
      const clerkUser = await client.users.getUser(input.id);
      return toUser(clerkUser);
    } catch (err) {
      log.warn('clerk user lookup failed', {
        id: input.id,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new BackendError(404, 'NOT_FOUND', `user ${input.id} not found`);
    }
  },
});

export const users = defineNamespace({
  middleware: [requireAuth],
  routes: { list, get, admins },
});
