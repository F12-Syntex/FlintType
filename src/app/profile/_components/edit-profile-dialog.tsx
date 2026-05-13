"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { UserTag } from "@/components/ft";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import { USERNAME_REGEX } from "@/types/profile";
import { USER_TAG_IDS, type UserTagId } from "@/types/user-tag";

/** Edit profile.
 *
 *  Two fields, each with the *current* value shown as a small
 *  caption under the label so the user can see what they're
 *  changing from. First name writes straight to Clerk (free-form,
 *  cosmetic); username routes through `backend.profile.updateUsername`
 *  so server-side rules apply uniformly:
 *    - regex: only `a-zA-Z_`, length 2–32
 *    - uniqueness: rejects names another user already holds
 *    - rate limit: 1 successful change per hour per user
 *
 *  Errors are pulled out of `BackendError.code` so the user gets a
 *  specific message: validation / conflict / rate-limited. A bare
 *  Clerk failure (first-name save) is rendered with its raw message
 *  since Clerk surfaces its own user-friendly text. */
export function EditProfileDialog({
  open,
  onOpenChange,
  tags = [],
  eligibleTags = [],
  onTagsChanged,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Identity tags currently displayed for this user — the selection
   *  side of "eligibility ∩ selection". Empty array means the user
   *  has opted out of every tag (even though they may be eligible). */
  tags?: UserTagId[];
  /** Full set of tags the user is eligible to display. The dialog
   *  paints one toggleable chip per entry; selected = in `tags`,
   *  deselected = greyscaled chip. Empty array hides the section
   *  entirely (no eligibility = nothing to pick). */
  eligibleTags?: UserTagId[];
  /** Fires after a successful tag-toggle save with the server's
   *  authoritative post-validation list. Parents use this to refresh
   *  the visible tag set on the hero without a snapshot refetch. */
  onTagsChanged?: (next: UserTagId[]) => void;
}) {
  const { user, isLoaded } = useUser();
  const backend = useBackend();
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Optimistic local selection so a chip click flips instantly; the
  // server's response then becomes authoritative on the parent via
  // onTagsChanged. Reset on every open from props.tags.
  const [selectedTags, setSelectedTags] = useState<UserTagId[]>(tags);
  const [tagsSaving, setTagsSaving] = useState(false);

  const currentFirstName = user?.firstName ?? "";
  const currentUsername = user?.username ?? "";

  // Re-seed inputs whenever the dialog opens so a previous edit
  // attempt doesn't ghost into the next session.
  useEffect(() => {
    if (open && user) {
      setFirstName(user.firstName ?? "");
      setUsername(user.username ?? "");
      setError(null);
      setSelectedTags(tags);
    }
    // `tags` is intentionally watched too so the chips reflect the
    // latest selection if the parent re-fetches while open.
  }, [open, user, tags]);

  const toggleTag = async (tag: UserTagId) => {
    if (tagsSaving) return;
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    // Sort into canonical order so the optimistic state matches what
    // the server will return.
    const canonical = USER_TAG_IDS.filter((id) => next.includes(id));
    setSelectedTags(canonical);
    setTagsSaving(true);
    try {
      const res = await backend.profile.setTags({ tags: canonical });
      setSelectedTags(res.tags);
      onTagsChanged?.(res.tags);
    } catch (err) {
      // Revert on failure so the chip isn't stuck in a phantom state.
      setSelectedTags(selectedTags);
      if (err instanceof BackendError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
    } finally {
      setTagsSaving(false);
    }
  };

  // Client-side preflight on the username so the user sees the
  // regex hint immediately, without a server round-trip. The server
  // still enforces — this is just UX.
  const trimmedUsername = username.trim();
  const trimmedFirstName = firstName.trim();
  const usernameChanged =
    trimmedUsername.toLowerCase() !== currentUsername.toLowerCase();
  const firstNameChanged = trimmedFirstName !== currentFirstName;
  const usernameInvalid =
    trimmedUsername.length > 0 && !USERNAME_REGEX.test(trimmedUsername);
  const usernameTooShort =
    trimmedUsername.length > 0 && trimmedUsername.length < 2;
  const canSave =
    !saving &&
    (firstNameChanged || usernameChanged) &&
    !usernameInvalid &&
    !usernameTooShort;

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      // 1. Username — through the backend so the regex + uniqueness
      //    + rate-limit checks all run server-side. Only fires when
      //    the value actually changed.
      if (usernameChanged) {
        if (trimmedUsername.length === 0) {
          setError("Username can't be empty.");
          setSaving(false);
          return;
        }
        await backend.profile.updateUsername({ username: trimmedUsername });
      }

      // 2. First name — straight through Clerk. It's a free-form
      //    display string, not a public identifier, so no
      //    server-side gate is needed beyond Clerk's own validation.
      if (firstNameChanged) {
        await user.update({ firstName: trimmedFirstName || null });
      }

      // Pull fresh data from Clerk so the hero re-renders with the
      // committed values even if Clerk's cache is briefly cold.
      await user.reload();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof BackendError) {
        // BackendError messages are already user-facing (CONFLICT,
        // VALIDATION, RATE_LIMITED all carry written messages).
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to update profile.");
      }
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
    >
      <div className="flex flex-col gap-5">
        {eligibleTags.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Your tags
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                {selectedTags.length === 0
                  ? "none shown"
                  : `${selectedTags.length} shown`}
              </span>
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground/80">
              Tap a chip to toggle whether it appears beside your name.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {eligibleTags.map((t) => {
                const on = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => void toggleTag(t)}
                    aria-pressed={on}
                    disabled={tagsSaving}
                    className={cn(
                      "inline-flex items-center rounded-md transition-opacity",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      "disabled:cursor-not-allowed",
                      on
                        ? "opacity-100"
                        : "opacity-40 grayscale hover:opacity-70",
                    )}
                  >
                    <UserTag tag={t} size="sm" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <Field
          label="First name"
          current={currentFirstName || "—"}
          value={firstName}
          onChange={setFirstName}
          placeholder="Your name"
          autoComplete="given-name"
          disabled={!isLoaded || saving}
        />
        <Field
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
          <p className="text-sm text-primary" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </ConfirmDialog>
  );
}

function Field({
  label,
  current,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  mono,
  hint,
  error,
}: {
  label: string;
  current: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  mono?: boolean;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "text-[11px] tabular-nums text-muted-foreground/80",
            mono && "font-mono",
          )}
        >
          current · {current}
        </span>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        className={cn(mono && "font-mono")}
      />
      {error ? (
        <span className="text-[11px] text-primary" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-[11px] text-muted-foreground/80">{hint}</span>
      ) : null}
    </label>
  );
}
