import { z } from 'zod';

export type UserRole = 'user' | 'admin';

export type User = {
  id: string;
  name: string;
  role: UserRole;
};

export const getUserInputSchema = z.object({
  id: z.string(),
});

export type GetUserInput = z.infer<typeof getUserInputSchema>;
export type GetUserOutput = User;

export type ListUsersOutput = User[];
export type ListAdminsOutput = User[];
