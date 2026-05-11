"use client";

// /legacy path — the stable resource-based hook (see sign-in-form
// for context on why we're not using the default signals export).
import { useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleButton } from "./oauth-buttons";

type Step = "credentials" | "verify";

/** Custom sign-up form — two steps:
 *    1. credentials: email + password → signUp.create + send code
 *    2. verify: 6-digit code → signUp.attemptEmailAddressVerification
 *  On complete, setActive promotes the new session and we route home.
 *
 *  OAuth (Google) is a one-step shortcut — Clerk's hosted callback
 *  handles verification + session creation. */
export function SignUpForm() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "verify" | "google" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || busy) return;
    setBusy("create");
    setError(null);
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err) {
      setError(extractError(err) ?? "Sign up failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || busy) return;
    setBusy("verify");
    setError(null);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });
      if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId });
        router.push("/");
        router.refresh();
      } else {
        setError("Verification didn't complete — try the code again.");
      }
    } catch (err) {
      setError(extractError(err) ?? "Verification failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleGoogle() {
    if (!isLoaded || busy) return;
    setBusy("google");
    setError(null);
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sign-in/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err) {
      setError(extractError(err) ?? "Google sign-up failed.");
      setBusy(null);
    }
  }

  if (step === "verify") {
    return (
      <form className="flex flex-col gap-5" onSubmit={handleVerify}>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We sent a 6-digit verification code to{" "}
          <span className="text-foreground">{email}</span>. Enter it below
          to finish creating your account.
        </p>
        <Field
          label="Verification code"
          type="text"
          autoComplete="one-time-code"
          inputMode="numeric"
          value={code}
          onChange={setCode}
          required
          mono
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
          {busy === "verify" ? "Verifying…" : "Create account"}
        </Button>
        <button
          type="button"
          className="text-[12px] font-medium uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => {
            setStep("credentials");
            setCode("");
            setError(null);
          }}
        >
          ← Use a different email
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <GoogleButton onStart={handleGoogle} disabled={busy != null} />

      <Divider label="or sign up with email" />

      <form className="flex flex-col gap-4" onSubmit={handleCreate}>
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
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          required
          hint="At least 8 characters."
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
          {busy === "create" ? "Sending code…" : "Continue with email"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  type,
  autoComplete,
  inputMode,
  value,
  onChange,
  required,
  hint,
  mono,
}: {
  label: string;
  type: string;
  autoComplete?: string;
  inputMode?: "numeric" | "text" | "email";
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <Input
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={mono ? "font-mono tracking-[0.2em]" : undefined}
      />
      {hint ? (
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      ) : null}
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
