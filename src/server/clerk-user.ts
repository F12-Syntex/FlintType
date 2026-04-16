import type { User, UserRole } from '@/types/user';

/**
 * Subset of Clerk's User shape that our mapper actually reads. Typed
 * structurally so the mapper is decoupled from any specific version of the
 * Clerk SDK and trivially testable with hand-rolled fixtures.
 */
export type ClerkUserLike = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  primaryEmailAddressId: string | null;
  emailAddresses: ReadonlyArray<{ id: string; emailAddress: string }>;
  publicMetadata: unknown;
};

export function toUser(clerk: ClerkUserLike): User {
  const email = resolveEmail(clerk);
  return {
    id: clerk.id,
    name: resolveName(clerk, email),
    email,
    role: resolveRole(clerk),
    imageUrl: clerk.imageUrl,
  };
}

function resolveEmail(clerk: ClerkUserLike): string {
  if (clerk.primaryEmailAddressId) {
    const primary = clerk.emailAddresses.find(
      (e) => e.id === clerk.primaryEmailAddressId,
    );
    if (primary) return primary.emailAddress;
  }
  return clerk.emailAddresses[0]?.emailAddress ?? '';
}

function resolveName(clerk: ClerkUserLike, fallbackEmail: string): string {
  const full = [clerk.firstName, clerk.lastName]
    .filter((part): part is string => !!part && part.trim().length > 0)
    .join(' ')
    .trim();
  if (full) return full;
  if (fallbackEmail) return fallbackEmail;
  return clerk.id;
}

function resolveRole(clerk: ClerkUserLike): UserRole {
  const metadata = clerk.publicMetadata as { role?: unknown } | null;
  return metadata?.role === 'admin' ? 'admin' : 'user';
}
