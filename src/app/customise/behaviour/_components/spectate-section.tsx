"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ft";
import { SpectatePill } from "@/components/spectate-indicator";
import { useBackend } from "@/lib/backend";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import type { FriendUser } from "@/types/friends";
import { Chip, ChipGroup } from "../../_components/chip";
import { SettingsRow } from "../../_components/row";
import { SettingsSection } from "../../_components/settings-section";

type SpectatePrefs = { enabled?: boolean; blocked?: string[] };
/** Module-level stable default — sharing is on unless turned off. */
const SPECTATE_DEFAULT: SpectatePrefs = { enabled: true };

/** Bespoke live preview (ui-law §12.5): the on/off chip the practice
 *  screen falls back to, flipped by the toggle below. */
function SpectatePreview({ enabled }: { enabled: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8">
      <SpectatePill enabled={enabled} />
      <p className="max-w-xs text-center text-[11px] leading-relaxed text-muted-foreground">
        {enabled
          ? "Mutual friends can watch your live runs from the Friends page. While you type, the people watching show up on your screen."
          : "Your runs stay private. No one can watch you practise."}
      </p>
    </div>
  );
}

/** The per-friend allow/deny list — every mutual friend can watch by
 *  default; switch a friend to Off to keep them out. Writes the
 *  `blocked` denylist on the spectate pref. */
function FriendAllowList({
  blocked,
  onToggle,
}: {
  blocked: string[];
  onToggle: (userId: string, allow: boolean) => void;
}) {
  const backend = useBackend();
  const [friends, setFriends] = useState<FriendUser[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    backend.friends
      .listFriends()
      .then((r) => {
        if (!cancelled) setFriends(r.users);
      })
      .catch(() => {
        if (!cancelled) setFriends([]);
      });
  }, [backend]);

  if (friends === null) return null;
  if (friends.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-card/40 px-4 py-6 text-center text-[13px] text-muted-foreground">
        No friends yet. When you and someone follow each other, they show up
        here so you can choose who watches.
      </p>
    );
  }
  const denied = new Set(blocked);
  return (
    <ul className="flex flex-col gap-2">
      {friends.map((f) => {
        const allowed = !denied.has(f.userId);
        return (
          <li
            key={f.userId}
            className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
          >
            <Avatar src={f.imageUrl} alt={f.name} size="sm" liven={false} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {f.name}
            </span>
            <ChipGroup>
              <Chip
                label="Off"
                active={!allowed}
                onClick={() => onToggle(f.userId, false)}
              />
              <Chip
                label="Watch"
                active={allowed}
                onClick={() => onToggle(f.userId, true)}
              />
            </ChipGroup>
          </li>
        );
      })}
    </ul>
  );
}

/** "Live spectating" consent section. Sharing is on by default; the
 *  toggle turns it off entirely, and the per-friend list (shown while on)
 *  excludes specific friends. */
export function SpectateSection() {
  const { value, update } = useRemotePrefs<SpectatePrefs>(
    "spectate",
    SPECTATE_DEFAULT,
  );
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
      eyebrow="Social"
      title="Live spectating"
      description="Mutual friends can watch you practise live, on by default. They see your screen, your speed, and who else is watching, only while you're typing. Turn it off entirely, or keep specific friends out below."
      preview={<SpectatePreview enabled={enabled} />}
    >
      <SettingsRow
        label={
          <span className="flex flex-col gap-0.5">
            <span>Let friends watch you practise</span>
            <span className="text-xs font-normal text-muted-foreground">
              When off, no one can watch any of your runs.
            </span>
          </span>
        }
        control={
          <ChipGroup>
            <Chip
              label="Off"
              active={!enabled}
              onClick={() => update({ enabled: false })}
            />
            <Chip
              label="On"
              active={enabled}
              onClick={() => update({ enabled: true })}
            />
          </ChipGroup>
        }
      />
      {enabled ? (
        <SettingsRow
          label={
            <span className="flex flex-col gap-0.5">
              <span>Who can watch</span>
              <span className="text-xs font-normal text-muted-foreground">
                Every friend can watch unless you switch them off.
              </span>
            </span>
          }
          control={null}
          preview={
            <FriendAllowList
              blocked={value.blocked ?? []}
              onToggle={toggleFriend}
            />
          }
        />
      ) : null}
    </SettingsSection>
  );
}
