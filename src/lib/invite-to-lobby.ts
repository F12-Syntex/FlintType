"use client";

import { writeHostStorage } from "@/app/race/c/[slug]/_components/challenge-shell";
import type { useBackend } from "@/lib/backend";

type Backend = ReturnType<typeof useBackend>;

/** Open a private race lobby for a friend and notify them.
 *
 *  This is how you race a friend: you spin up a real lobby and the
 *  friend gets an in-app "join my race" notification, then you race
 *  live. Creates the lobby (host = caller),
 *  stashes the host handle so navigating into it resumes the seat, fires
 *  the invite (best-effort — the lobby is usable even if the notify
 *  fails), and returns the lobby slug to navigate to (or null on
 *  failure). */
export async function createLobbyAndInvite(
  backend: Backend,
  opponentId: string,
): Promise<string | null> {
  try {
    const res = await backend.race.challenge.create({ modeId: "1v1", wordCount: 25 });
    writeHostStorage(res.slug, {
      roomId: res.roomId,
      sessionToken: res.sessionToken,
      words: res.words,
      totalChars: res.totalChars,
      modeId: res.modeId as Parameters<typeof writeHostStorage>[1]["modeId"],
      roundNumber: 1,
    });
    try {
      await backend.lobby.invite({ opponentId, slug: res.slug });
    } catch {
      // The lobby exists and the host can still share it; a failed
      // notify shouldn't strand the host outside their own room.
    }
    return res.slug;
  } catch {
    return null;
  }
}
