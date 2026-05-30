"use client";

import { Check, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Minimal AI dock that floats over the top of the preview: one input +
 *  Suggest, and — once a look is proposed — a one-line summary with
 *  Accept / Discard. No chat log, no chrome beyond a hairline panel. */
export function AiDock({
  loading,
  pending,
  needsAuth,
  empty,
  error,
  summary,
  onSend,
  onAccept,
  onReject,
}: {
  loading: boolean;
  pending: boolean;
  needsAuth: boolean;
  empty: boolean;
  error: string;
  summary: string;
  onSend: (text: string) => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const t = value.trim();
    if (!t || loading) return;
    onSend(t);
    setValue("");
  }

  return (
    <div className="w-full max-w-xl rounded-md border border-border bg-popover/95 p-2 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="ml-1 shrink-0 text-primary" aria-hidden />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Describe a look — “warm sepia, big serif”…"
          aria-label="Describe the look you want"
          disabled={loading}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <Button
          size="sm"
          onClick={submit}
          disabled={loading || value.trim().length === 0}
          className="shrink-0"
        >
          {loading ? "Thinking…" : pending ? "Refine" : "Suggest"}
        </Button>
      </div>

      {pending ? (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
            {summary}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <Button size="sm" onClick={onAccept} className="gap-1">
              <Check size={14} aria-hidden />
              Accept
            </Button>
            <Button size="sm" variant="ghost" onClick={onReject} className="gap-1">
              <X size={14} aria-hidden />
              Discard
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
