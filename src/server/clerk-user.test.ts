import { describe, expect, it } from 'vitest';
import { type ClerkUserLike, toUser } from './clerk-user';

function mockClerkUser(overrides: Partial<ClerkUserLike> = {}): ClerkUserLike {
  return {
    id: 'user_test',
    firstName: null,
    lastName: null,
    imageUrl: 'https://img.clerk.com/default',
    primaryEmailAddressId: 'email_1',
    emailAddresses: [{ id: 'email_1', emailAddress: 'test@example.com' }],
    publicMetadata: null,
    ...overrides,
  };
}

describe('toUser', () => {
  it('combines first and last name when both are present', () => {
    const user = toUser(
      mockClerkUser({ firstName: 'Ada', lastName: 'Lovelace' }),
    );
    expect(user.name).toBe('Ada Lovelace');
  });

  it('uses first name only when last is null', () => {
    const user = toUser(mockClerkUser({ firstName: 'Ada', lastName: null }));
    expect(user.name).toBe('Ada');
  });

  it('falls back to the primary email when no name is set', () => {
    const user = toUser(mockClerkUser());
    expect(user.name).toBe('test@example.com');
  });

  it('falls back to the id when no name and no email exist', () => {
    const user = toUser(
      mockClerkUser({
        primaryEmailAddressId: null,
        emailAddresses: [],
      }),
    );
    expect(user.name).toBe('user_test');
  });

  it('picks the email whose id matches primaryEmailAddressId', () => {
    const user = toUser(
      mockClerkUser({
        primaryEmailAddressId: 'email_2',
        emailAddresses: [
          { id: 'email_1', emailAddress: 'old@example.com' },
          { id: 'email_2', emailAddress: 'new@example.com' },
        ],
      }),
    );
    expect(user.email).toBe('new@example.com');
  });

  it('falls back to the first email when primary id is missing', () => {
    const user = toUser(
      mockClerkUser({
        primaryEmailAddressId: null,
        emailAddresses: [{ id: 'e1', emailAddress: 'first@example.com' }],
      }),
    );
    expect(user.email).toBe('first@example.com');
  });

  it('role defaults to "user" when publicMetadata.role is missing', () => {
    const user = toUser(mockClerkUser({ publicMetadata: {} }));
    expect(user.role).toBe('user');
  });

  it('role defaults to "user" when publicMetadata is null', () => {
    const user = toUser(mockClerkUser({ publicMetadata: null }));
    expect(user.role).toBe('user');
  });

  it('role is "admin" when publicMetadata.role === "admin"', () => {
    const user = toUser(
      mockClerkUser({ publicMetadata: { role: 'admin' } }),
    );
    expect(user.role).toBe('admin');
  });

  it('passes through id and imageUrl unchanged', () => {
    const user = toUser(
      mockClerkUser({
        id: 'user_abc',
        imageUrl: 'https://img.clerk.com/abc',
      }),
    );
    expect(user.id).toBe('user_abc');
    expect(user.imageUrl).toBe('https://img.clerk.com/abc');
  });
});
