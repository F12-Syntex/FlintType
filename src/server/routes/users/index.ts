import { z } from 'zod';
import { defineNamespace, defineRoute, BackendError } from '@/server';
import { usersDb } from '@/server/db';
import { requireAuth } from '@/server/middleware/auth';
import type { User } from '@/types/user';
import { admins } from './admins';

const getInputSchema = z.object({ id: z.string() });
export type GetUserInput = z.infer<typeof getInputSchema>;
export type ListUsersOutput = User[];

export const users = defineNamespace({
  middleware: [requireAuth],
  routes: {
    list: defineRoute<void, ListUsersOutput>({
      handler: () => usersDb,
    }),
    get: defineRoute<GetUserInput, User>({
      input: getInputSchema,
      handler: ({ input }) => {
        const found = usersDb.find((u) => u.id === input.id);
        if (!found) {
          throw new BackendError(404, 'NOT_FOUND', `user ${input.id} not found`);
        }
        return found;
      },
    }),
    admins,
  },
});
