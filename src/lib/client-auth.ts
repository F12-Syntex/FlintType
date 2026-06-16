"use client";

/** Module-level mirror of Clerk's resolved signed-in state, for
 *  non-React singletons that can't call `useUser()` — chiefly the prefs
 *  store, which fires `/api/prefs/{get,set}` and must not do so for
 *  anonymous visitors (those calls are guaranteed 401s, just console +
 *  server-log noise).
 *
 *  `null` means "Clerk hasn't resolved yet". A caller that branches on
 *  auth should `await awaitClientAuth()` rather than read the raw value,
 *  so it waits for the real answer instead of guessing during the brief
 *  pre-hydration window. Published once Clerk loads (and on every
 *  sign-in / sign-out) by `<ClientAuthSync>`, mounted in providers. */
let signedIn: boolean | null = null;
let resolvers: Array<(v: boolean) => void> = [];

/** Safety net: if Clerk never publishes a value (e.g. `<ClientAuthSync>`
 *  not mounted, or a wedged hydration), `awaitClientAuth()` resolves
 *  `false` after this long so callers (the prefs load/save, settings
 *  export) proceed on the localStorage-only path instead of hanging
 *  forever. It does NOT mutate `signedIn`, so a late real sign-in still
 *  flips writes back to syncing. */
const AUTH_FALLBACK_MS = 4000;

/** Publish the resolved Clerk auth state, flushing any awaiters. */
export function setClientSignedIn(value: boolean): void {
  signedIn = value;
  if (resolvers.length > 0) {
    const pending = resolvers;
    resolvers = [];
    for (const r of pending) r(value);
  }
}

/** The known auth state, or `null` if Clerk hasn't resolved yet. */
export function getClientSignedIn(): boolean | null {
  return signedIn;
}

/** Resolves to the signed-in boolean as soon as it's known. Returns an
 *  already-settled promise if Clerk has resolved; otherwise waits for
 *  the first `setClientSignedIn` call. */
export function awaitClientAuth(): Promise<boolean> {
  if (signedIn !== null) return Promise.resolve(signedIn);
  return new Promise<boolean>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = (v: boolean) => {
      if (timer) clearTimeout(timer);
      resolve(v);
    };
    resolvers.push(settle);
    if (typeof setTimeout !== "undefined") {
      timer = setTimeout(() => {
        // Drop ourselves from the queue so a later publish doesn't call
        // an already-settled resolver, then fall back to signed-out.
        resolvers = resolvers.filter((r) => r !== settle);
        settle(false);
      }, AUTH_FALLBACK_MS);
    }
  });
}

/** Test-only reset of the module state. */
export function __resetClientAuthForTests(): void {
  signedIn = null;
  resolvers = [];
}
