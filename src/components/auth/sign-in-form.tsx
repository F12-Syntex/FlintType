"use client";

// /legacy path — the stable resource-based hook with create() /
// setActive() / authenticateWithRedirect(). The default
// @clerk/nextjs export now points at the experimental "signals"
// API which doesn't expose the methods we drive the custom flow
// from.
import { useSignIn } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DiscordButton } from "./oauth-buttons";

/** Custom sign-in form — Clerk hooks under the hood, our design
 *  surface on top. Email + password with a 'Continue with Discord'
 *  shortcut. Errors render inline (Clerk's API returns
 *  err.errors[].longMessage which is human-readable). */
export function SignInForm() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "discord" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || busy) return;
    setBusy("email");
    setError(null);
    try {
      const attempt = await signIn.create({
        identifier: email.trim(),
        password,
      });
      if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId });
        router.push("/");
        router.refresh();
      } else {
        // Multi-factor / unverified — Clerk's hosted flow handles
        // the rest; bounce to its catch-all so it can resume.
        setError(
          "Additional verification required. Check your email or try again.",
        );
      }
    } catch (err) {
      setError(extractError(err) ?? "Sign in failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDiscord() {
    if (!isLoaded || busy) return;
    setBusy("discord");
    setError(null);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_discord",
        redirectUrl: "/sign-in/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err) {
      setError(extractError(err) ?? "Discord sign-in failed.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <DiscordButton onStart={handleDiscord} disabled={busy != null} />

      <Divider label="or sign in with email" />

      <form className="flex flex-col gap-4" onSubmit={handleEmailSubmit}>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          required
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          required
        />
        {error ? (
          <p className="text-sm text-primary" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="default"
          size="default"
          disabled={!isLoaded || busy != null}
          className="w-full"
        >
          {busy === "email" ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  type,
  autoComplete,
  value,
  onChange,
  required,
}: {
  label: string;
  type: string;
  autoComplete?: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <Input
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}

function extractError(err: unknown): string | null {
  if (
    err &&
    typeof err === "object" &&
    "errors" in err &&
    Array.isArray((err as { errors: unknown }).errors)
  ) {
    const first = (err as { errors: { longMessage?: string; message?: string }[] })
      .errors[0];
    return first?.longMessage ?? first?.message ?? null;
  }
  if (err instanceof Error) return err.message;
  return null;
}
