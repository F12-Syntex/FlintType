import { eq } from 'drizzle-orm';
import { users } from '@/db/schema/server/users';
import { toUser, type ClerkUserLike } from '@/server/clerk-user';
import type { UserRow } from '@/types/user';
import type { ServerDrizzle } from '../driver';

export type UsersRepo = ReturnType<typeof usersRepo>;

export function usersRepo(db: ServerDrizzle) {
  return {
    findById: async (id: string): Promise<UserRow | null> => {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    upsertFromClerk: async (clerk: ClerkUserLike): Promise<UserRow> => {
      const mapped = toUser(clerk);
      const rows = await db
        .insert(users)
        .values({
          id: mapped.id,
          email: mapped.email,
          name: mapped.name,
          role: mapped.role,
          imageUrl: mapped.imageUrl,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: mapped.email,
            name: mapped.name,
            role: mapped.role,
            imageUrl: mapped.imageUrl,
            updatedAt: new Date(),
          },
        })
        .returning();
      if (!rows[0]) throw new Error('users.upsertFromClerk returned no rows');
      return rows[0];
    },

    removeById: async (id: string): Promise<boolean> => {
      const rows = await db.delete(users).where(eq(users.id, id)).returning();
      return rows.length > 0;
    },
  };
}
