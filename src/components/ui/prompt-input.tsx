"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** A clean, reusable prompt input: an auto-growing textarea + a send
 *  button. Theme-token only, hairline border, small radius — on-brand
 *  (no glass, no glow, no ripples). Enter sends, Shift+Enter newlines. */
export function PromptInput({
  value,
  onValueChange,
  onSubmit,
  placeholder,
  disabled = false,
  loading = false,
  autoFocus = false,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow with content up to a cap.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !loading && !disabled;

  return (
    <div
      className={cn(
        "flex items-end gap-2 rounded-md border border-input bg-background p-1.5 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
        className,
      )}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (canSend) onSubmit();
          }
        }}
        rows={1}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder ?? "Prompt"}
        disabled={disabled}
        className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => {
          if (canSend) onSubmit();
        }}
        disabled={!canSend}
        aria-label="Send"
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {loading ? (
          <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden />
        ) : (
          <ArrowUp size={16} aria-hidden />
        )}
      </button>
    </div>
  );
}
