import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";

/** Header the Vercel proxy sets to carry the authenticated racer's user
 *  id to the race authority (Railway). The Clerk session cookie does NOT
 *  cross the proxy hop, so `auth()` on the authority sees no user —
 *  without this the authority would label every signed-in racer "Guest"
 *  (#9). The request already passed the proxy-secret gate, so it's
 *  trusted; the authority resolves the handle from the id by API. */
export const RACE_USER_ID_HEADER = "x-flinttype-user-id";

/** Build an `@handle` from a Clerk user shape (firstName → username →
 *  email-localpart), `@`-prefixed. Shared by both resolution paths. */
function handleFor(u: {
  firstName?: string | null;
  username?: string | null;
  emailAddresses?: { emailAddress: string }[] | null;
}): string {
  const raw =
    u.firstName ??
    u.username ??
    u.emailAddresses?.[0]?.emailAddress?.split("@")[0] ??
    "racer";
  return raw.startsWith("@") ? raw : `@${raw}`;
}

/** Per-racer display identity. For signed-in users we pull the same
 *  short handle the topbar shows (`firstName` → `username` →
 *  email-localpart, `@`-prefixed). Anonymous callers get a stable
 *  per-session "Guest · XYZ" label keyed off a random 3-char id so
 *  multiple guests in the same room don't collide.
 *
 *  Server-only — Clerk calls run in the request scope. The output
 *  is purely descriptive; the racer's seat in the room is identified
 *  by `sessionToken`, never by name. Renaming is therefore safe and
 *  the lifecycle is independent of any user record. */

export type RaceIdentity = {
  /** Display name rendered in the player strip / feed / results.
   *  Always reasonable to show. */
  name: string;
  /** Tier label rendered alongside the name. "RACER" for signed-in
   *  users; "GUEST" for anonymous. */
  badge: string;
  /** Clerk user id when signed in, else null. Lets a room dedupe a
   *  user joining their own race (see RaceRoom.addRealRacer). */
  userId: string | null;
};

const GUEST_BADGE = "GUEST";
const SIGNED_IN_BADGE = "RACER";

export async function getRaceIdentity(fallbackSeed: string): Promise<RaceIdentity> {
  // Split deploy: the proxy (where the Clerk session is readable)
  // forwarded the authenticated user id as a trusted header. On the
  // authority `auth()` has no session and would fall to the guest path
  // for every signed-in racer (#9), so resolve the handle from the
  // forwarded id by API instead.
  try {
    const h = await headers();
    const fwdId = h.get(RACE_USER_ID_HEADER);
    if (fwdId) {
      try {
        const client = await clerkClient();
        const u = await client.users.getUser(fwdId);
        return { name: handleFor(u), badge: SIGNED_IN_BADGE, userId: fwdId };
      } catch {
        // Clerk fetch failed — still dedupe by the trusted id.
        return { name: guestNameFor(fwdId), badge: SIGNED_IN_BADGE, userId: fwdId };
      }
    }
  } catch {
    // headers() unavailable outside a request scope (tests) — fall
    // through to the direct auth() path below.
  }
  try {
    const session = await auth();
    if (session.userId) {
      const user = await currentUser();
      if (user) {
        return { name: handleFor(user), badge: SIGNED_IN_BADGE, userId: session.userId };
      }
      // Signed in but no full user record — still dedupe by id.
      return {
        name: guestNameFor(fallbackSeed),
        badge: SIGNED_IN_BADGE,
        userId: session.userId,
      };
    }
  } catch {
    // Clerk unavailable in dev keyless mode or test envs — fall
    // through to the guest path silently.
  }
  return { name: guestNameFor(fallbackSeed), badge: GUEST_BADGE, userId: null };
}

/** Deterministic guest name from a session token (or any per-call
 *  seed). Same token always yields the same label so a guest's
 *  display doesn't change mid-room. Three uppercase letters keeps
 *  the label compact and obviously-anonymous. */
export function guestNameFor(seed: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no O, I — visual collision
  let h = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  }
  const a = alphabet[h % alphabet.length]!;
  const b = alphabet[(h >>> 5) % alphabet.length]!;
  const c = alphabet[(h >>> 10) % alphabet.length]!;
  return `Guest · ${a}${b}${c}`;
}
