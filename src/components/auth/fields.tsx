"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

/** Form fields shared by the sign-in and sign-up flows. Labels are
 *  small sentence-case text above a 44px input (40px from `sm`), so
 *  every field clears the touch-target floor on phones (ui-law §7). */

const INPUT_SIZE = "h-11 sm:h-10";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
      {children}
    </label>
  );
}

function FieldHint({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className="text-xs text-muted-foreground">
      {children}
    </p>
  );
}

export function Field({
  label,
  type,
  autoComplete,
  inputMode,
  value,
  onChange,
  required,
  hint,
  placeholder,
  autoFocus,
}: {
  label: string;
  type: string;
  autoComplete?: string;
  inputMode?: "numeric" | "text" | "email";
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-describedby={hint ? hintId : undefined}
        className={INPUT_SIZE}
      />
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
    </div>
  );
}

/** Password input with a show/hide toggle inside the pill. */
export function PasswordField({
  label,
  autoComplete,
  value,
  onChange,
  required,
  hint,
  autoFocus,
}: {
  label: string;
  autoComplete: "current-password" | "new-password";
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  hint?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoFocus={autoFocus}
          aria-describedby={hint ? hintId : undefined}
          className={`${INPUT_SIZE} pr-12`}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-1 size-9 -translate-y-1/2 text-muted-foreground sm:size-8"
        >
          {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </Button>
      </div>
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
    </div>
  );
}

/** Six-digit code input. Submits itself once the last digit lands. */
export function OtpField({
  id,
  label,
  value,
  onChange,
  onComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  /** Receives the full code, so callers never read a stale state. */
  onComplete: (value: string) => void;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <InputOTP
        id={id}
        maxLength={6}
        value={value}
        onChange={onChange}
        onComplete={(next: string) => onComplete(next)}
        autoFocus
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label={label}
        containerClassName="w-full justify-center"
      >
        {/* Slots flex between 44px and 48px wide so six of them always
            fit the card's column on a 375px phone. */}
        <InputOTPGroup className="w-full justify-center gap-1.5 sm:gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className="size-11 max-w-12 min-w-0 flex-1 rounded-xl border bg-card font-mono text-lg first:rounded-xl last:rounded-xl sm:size-12"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}
