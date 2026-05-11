"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Edit profile — Clerk-backed dialog that updates first name +
 *  username on save. The page header shows whichever Clerk field
 *  is set first (firstName → username → email local-part), so
 *  changing either of these updates the public lockup immediately
 *  on next render.
 *
 *  Username is the canonical handle used in /profile/<username>;
 *  changing it doesn't redirect the user — they keep their session
 *  on the old URL until they navigate away. */
export function EditProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const { user, isLoaded } = useUser();
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed inputs whenever the dialog opens so a previous edit
  // attempt doesn't ghost into the next session.
  useEffect(() => {
    if (open && user) {
      setFirstName(user.firstName ?? "");
      setUsername(user.username ?? "");
      setError(null);
    }
  }, [open, user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await user.update({
        firstName: firstName.trim() || null,
        username: username.trim() || null,
      });
      onOpenChange(false);
    } catch (err) {
      // Clerk surfaces validation errors via err.errors[].message.
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to update profile.";
      setError(msg);
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
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your name shows above the avatar; the username is the URL
          slug at <span className="text-foreground">/profile/&lt;username&gt;</span>.
        </p>

        <Field
          label="First name"
          value={firstName}
          onChange={setFirstName}
          placeholder="Your name"
          autoComplete="given-name"
          disabled={!isLoaded}
        />
        <Field
          label="Username"
          value={username}
          onChange={setUsername}
          placeholder="your-handle"
          autoComplete="username"
          disabled={!isLoaded}
          mono
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
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  mono,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  mono?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className={cn(mono && "font-mono")}
      />
    </label>
  );
}
