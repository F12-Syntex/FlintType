"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ft";
import { SpectatePill } from "@/components/spectate-indicator";
import { Switch } from "@/components/ui/switch";
import { BackendError, useBackend } from "@/lib/backend";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import type { FriendUser } from "@/types/friends";
import { SwitchRow } from "../row";
import { SettingsSection } from "../settings-section";

export type SpectatePrefs = { enabled?: boolean; blocked?: string[] };
/** Module-level stable default — sharing is on unless turned off. */
export const SPECTATE_DEFAULT: SpectatePrefs = { enabled: true };

/** The spectate slice, shared by the section and the page header's
 *  reset count. */
export function useSpectatePrefs() {
  return useRemotePrefs<SpectatePrefs>("spectate", SPECTATE_DEFAULT);
}

/** Live preview (ui-law §12.5): the consent chip the practice screen
 *  shows, flipped by the switch below. */
function SpectatePreview({ enabled }: { enabled: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8">
      <SpectatePill enabled={enabled} />
      <p className="max-w-xs text-center text-[13px] leading-relaxed text-muted-foreground">
        {enabled
          ? "Friends can watch while you type. You'll see who's watching."
          : "Your runs stay private. No one can watch you practise."}
      </p>
    </div>
  );
}

/** One row per mutual friend with a switch: on = they can watch. Writes
 *  the `blocked` denylist on the spectate pref. */
function FriendAllowList({
  blocked,
  onToggle,
}: {
  blocked: string[];
  onToggle: (userId: string, allow: boolean) => void;
}) {
  const backend = useBackend();
  const [friends, setFriends] = useState<FriendUser[] | null>(null);
  const [error, setError] = useState<"signed-out" | "failed" | null>(null);

  useEffect(() => {
    let cancelled = false;
    backend.friends
      .listFriends()
      .then((r) => {
        if (!cancelled) setFriends(r.users);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof BackendError && err.code === "UNAUTHORIZED"
            ? "signed-out"
            : "failed",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  if (error === "signed-out") {
    return (
      <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
        <Link
          href="/sign-in"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>{" "}
        to choose which friends can watch.
      </p>
    );
  }
  if (error) {
    return (
      <p role="alert" className="px-4 py-4 text-sm text-destructive sm:px-5">
        Couldn&apos;t load your friends. Try again in a moment.
      </p>
    );
  }
  if (friends === null) {
    return (
      <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
        Loading friends…
      </p>
    );
  }
  if (friends.length === 0) {
    return (
      <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
        No friends yet. When you and someone follow each other, they show
        up here so you can choose who watches.
      </p>
    );
  }
  const denied = new Set(blocked);
  return (
    <>
      <p className="px-4 pt-4 pb-1 text-xs font-medium text-muted-foreground sm:px-5">
        Who can watch
      </p>
      {friends.map((f) => {
        const allowed = !denied.has(f.userId);
        return (
          <label
            key={f.userId}
            className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2.5 sm:px-5"
          >
            <Avatar src={f.imageUrl} alt="" size="sm" liven={false} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {f.name}
            </span>
            <Switch
              checked={allowed}
              aria-label={`Let ${f.name} watch`}
              onCheckedChange={(next) => onToggle(f.userId, next)}
            />
          </label>
        );
      })}
    </>
  );
}

/** "Live spectating" consent section. Sharing is on by default; the
 *  switch turns it off entirely, and the per-friend list (shown while
 *  on) keeps specific friends out. */
export function SpectateSection() {
  const { value, update } = useSpectatePrefs();
  const enabled = value.enabled !== false;

  const toggleFriend = (userId: string, allow: boolean) => {
    update((prev) => {
      const set = new Set(prev.blocked ?? []);
      if (allow) set.delete(userId);
      else set.add(userId);
      return { ...prev, blocked: [...set] };
    });
  };

  return (
    <SettingsSection
      id="spectate"
      title="Live spectating"
      description="Mutual friends can watch you practise, only while you're typing."
      preview={<SpectatePreview enabled={enabled} />}
    >
      <SwitchRow
        title="Let friends watch"
        desc="When off, no one can watch any of your runs."
        checked={enabled}
        onChange={(on) => update({ enabled: on })}
      />
      {enabled ? (
        <div>
          <FriendAllowList
            blocked={value.blocked ?? []}
            onToggle={toggleFriend}
          />
        </div>
      ) : null}
    </SettingsSection>
  );
}
