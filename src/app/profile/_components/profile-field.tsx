"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** One labelled text field in Edit profile: the label, the current
 *  value as a small caption, the input, then an error or a hint. */
export function ProfileField({
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
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span
          className={cn(
            "text-xs tabular-nums text-muted-foreground",
            mono && "font-mono",
          )}
        >
          Current: {current}
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
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}
