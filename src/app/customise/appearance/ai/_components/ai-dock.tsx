"use client";

import { Check, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PromptInput } from "@/components/ui/prompt-input";

/** Minimal AI dock: a prompt input you can keep talking to (each send
 *  refines the live preview), plus an explicit Apply / Reset when there
 *  are pending changes. No chat log, no sparkle, no "suggest". */
export function AiDock({
  loading,
  pending,
  needsAuth,
  empty,
  error,
  summary,
  onSend,
  onApply,
  onReset,
}: {
  loading: boolean;
  pending: boolean;
  needsAuth: boolean;
  empty: boolean;
  error: string;
  summary: string;
  onSend: (text: string) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const t = value.trim();
    if (!t || loading) return;
    onSend(t);
    setValue("");
  }

  return (
    <div className="w-full rounded-md border border-border bg-popover/95 p-2 shadow-sm backdrop-blur-md">
      <PromptInput
        value={value}
        onValueChange={setValue}
        onSubmit={submit}
        loading={loading}
        placeholder={
          pending
            ? "Keep going — “warmer”, “bigger caret”, “match the accent”…"
            : "Describe a look — “warm sepia, big serif, soft corners”…"
        }
      />

      {pending ? (
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-2">
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
            {summary || "Previewing your changes"}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <Button size="sm" onClick={onApply} className="gap-1.5">
              <Check size={14} aria-hidden />
              Apply changes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onReset}
              className="gap-1.5"
            >
              <RotateCcw size={14} aria-hidden />
              Reset
            </Button>
          </span>
        </div>
      ) : null}

      {needsAuth ? (
        <p className="mt-2 px-1 text-[13px] text-muted-foreground">
          <Link href="/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to use AI suggestions.
        </p>
      ) : null}
      {empty ? (
        <p className="mt-2 px-1 text-[13px] text-muted-foreground">
          Couldn’t map that to a setting. Try naming colours, a font, text
          size, or the layout.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 px-1 text-[13px] text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
