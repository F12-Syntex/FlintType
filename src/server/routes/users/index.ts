import { defineNamespace, defineRoute, BackendError } from '@/server';
import { usersDb } from '@/server/db';
import { requireAuth } from '@/server/middleware/auth';
import {
  getUserInputSchema,
  type GetUserInput,
  type GetUserOutput,
  type ListUsersOutput,
} from '@/types/user';
import { admins } from './admins';

const list = defineRoute<void, ListUsersOutput>({
  handler: () => usersDb,
});

const get = defineRoute<GetUserInput, GetUserOutput>({
  input: getUserInputSchema,
  handler: ({ input }) => {
    const found = usersDb.find((u) => u.id === input.id);
    if (!found) {
      throw new BackendError(404, 'NOT_FOUND', `user ${input.id} not found`);
    }
    return found;
  },
});

export const users = defineNamespace({
  middleware: [requireAuth],
  routes: { list, get, admins },
});
