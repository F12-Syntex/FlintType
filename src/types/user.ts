export type UserRole = 'user' | 'admin';

export type User = {
  id: string;
  name: string;
  role: UserRole;
};
