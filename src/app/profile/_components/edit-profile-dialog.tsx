"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BackendError, useBackend } from "@/lib/backend";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import { USERNAME_REGEX } from "@/types/profile";
import type { ProfileRankPref, RankId } from "@/types/rank";
import { USER_TAG_IDS, type UserTagId } from "@/types/user-tag";
import { ProfileField } from "./profile-field";
import { RankPicker } from "./rank-picker";
import { TagPicker } from "./tag-picker";

const RANK_DEFAULT: ProfileRankPref = { id: null };

/** Edit profile.
 *
 *  Rank and tags save the moment they're picked. The two text fields
 *  (First name, Username) save on "Save", each with the *current* value
 *  shown as a caption. First name writes straight to Clerk; username
 *  routes through `backend.profile.updateUsername` so the server rules
 *  apply (letters + underscores, 2–32, unique, one change an hour).
 *
 *  The dialog stays open while saving (`keepOpen`) so a server error
 *  (taken name, rate limit) is visible; it closes itself on success. */
export function EditProfileDialog({
  open,
  onOpenChange,
  tags = [],
  eligibleTags = [],
  onTagsChanged,
  rank = null,
  bestWpm = 0,
  onRankChanged,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Identity tags currently displayed (eligibility ∩ selection). An
   *  empty array means the user opted out of every tag. */
  tags?: UserTagId[];
  /** Every tag the user may display. Empty hides the tag picker. */
  eligibleTags?: UserTagId[];
  /** Fires after a tag toggle saves, with the server's list. */
  onTagsChanged?: (next: UserTagId[]) => void;
  /** Current rank flair (from the snapshot). */
  rank?: RankId | null;
  /** Best WPM, only to *suggest* a rank in the picker. */
  bestWpm?: number;
  /** Fires after the rank changes so the hero badge updates. */
  onRankChanged?: (next: RankId | null) => void;
}) {
  const { user, isLoaded } = useUser();
  const backend = useBackend();
  const router = useRouter();
  const { update: updateRank } = useRemotePrefs<ProfileRankPref>(
    "profileRank",
    RANK_DEFAULT,
  );
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Optimistic picks layered over the props, so a chip flips instantly;
  // null means "show what the parent says".
  const [rankPick, setRankPick] = useState<{ id: RankId | null } | null>(null);
  const [tagPick, setTagPick] = useState<UserTagId[] | null>(null);
  const [tagsSaving, setTagsSaving] = useState(false);

  // Seed the form once per open (and once Clerk's user has loaded), by
  // comparing during render rather than resetting in an effect. Rank
  // and tag props are deliberately not part of the key: they change as
  // picks auto-save, and must never clobber half-typed text.
  const seedKey = open && user ? user.id : null;
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (seedKey !== seededFor) {
    setSeededFor(seedKey);
    if (seedKey) {
      setFirstName(user?.firstName ?? "");
      setUsername(user?.username ?? "");
      setError(null);
      setRankPick(null);
      setTagPick(null);
    }
  }

  const selectedRank = rankPick ? rankPick.id : rank;
  const selectedTags = tagPick ?? tags;

  function pickRank(next: RankId | null) {
    setRankPick({ id: next });
    updateRank({ id: next });
    onRankChanged?.(next);
  }

  async function toggleTag(tag: UserTagId) {
    if (tagsSaving) return;
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    // Canonical order, so the optimistic list matches the server's.
    setTagPick(USER_TAG_IDS.filter((id) => next.includes(id)));
    setTagsSaving(true);
    try {
      const res = await backend.profile.setTags({
        tags: USER_TAG_IDS.filter((id) => next.includes(id)),
      });
      setTagPick(res.tags);
      onTagsChanged?.(res.tags);
    } catch (err) {
      // Revert to the parent's list so the chip isn't stuck.
      setTagPick(null);
      setError(err instanceof Error ? err.message : "Couldn't save your tags.");
    } finally {
      setTagsSaving(false);
    }
  }

  // Client-side preflight so the hint shows without a round-trip; the
  // server still enforces.
  const currentFirstName = user?.firstName ?? "";
  const currentUsername = user?.username ?? "";
  const trimmedUsername = username.trim();
  const trimmedFirstName = firstName.trim();
  const usernameChanged =
    trimmedUsername.toLowerCase() !== currentUsername.toLowerCase();
  const firstNameChanged = trimmedFirstName !== currentFirstName;
  const usernameInvalid =
    trimmedUsername.length > 0 && !USERNAME_REGEX.test(trimmedUsername);
  const usernameTooShort =
    trimmedUsername.length > 0 && trimmedUsername.length < 2;
  // Rank + tags already saved on click, so Save stays enabled as a
  // plain confirm even when the text fields are untouched.
  const canSave = !saving && !usernameInvalid && !usernameTooShort;

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      if (usernameChanged) {
        if (trimmedUsername.length === 0) {
          setError("Username can't be empty.");
          return;
        }
        await backend.profile.updateUsername({ username: trimmedUsername });
      }
      if (firstNameChanged) {
        await user.update({ firstName: trimmedFirstName || null });
      }
      // Fresh Clerk data so the hero shows the committed values.
      await user.reload();
      onOpenChange(false);
      // The profile URL is the username: follow the rename, or the old
      // URL would read as someone else's (missing) profile.
      if (usernameChanged) {
        router.replace(`/profile/${encodeURIComponent(trimmedUsername)}`);
      }
    } catch (err) {
      // BackendError messages are user-facing (CONFLICT, VALIDATION,
      // RATE_LIMITED); Clerk writes its own readable messages too.
      setError(
        err instanceof BackendError || err instanceof Error
          ? err.message
          : "Couldn't update your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit profile"
      confirmLabel={saving ? "Saving…" : "Save"}
      cancelLabel="Cancel"
      onConfirm={() => void handleSave()}
      confirmDisabled={!canSave}
      keepOpen
    >
      <div className="flex flex-col gap-5">
        <RankPicker
          selected={selectedRank}
          bestWpm={bestWpm}
          onPick={pickRank}
        />
        {eligibleTags.length > 0 ? (
          <TagPicker
            eligible={eligibleTags}
            selected={selectedTags}
            saving={tagsSaving}
            onToggle={(t) => void toggleTag(t)}
          />
        ) : null}
        <ProfileField
          label="First name"
          current={currentFirstName || "—"}
          value={firstName}
          onChange={setFirstName}
          placeholder="Your name"
          autoComplete="given-name"
          disabled={!isLoaded || saving}
        />
        <ProfileField
          label="Username"
          current={currentUsername ? `@${currentUsername}` : "—"}
          value={username}
          onChange={setUsername}
          placeholder="your_handle"
          autoComplete="username"
          disabled={!isLoaded || saving}
          mono
          hint="Letters and underscores only · changeable once per hour"
          error={
            usernameInvalid
              ? "Letters (a–z, A–Z) and underscores only."
              : usernameTooShort
                ? "At least 2 characters."
                : undefined
          }
        />

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </ConfirmDialog>
  );
}
