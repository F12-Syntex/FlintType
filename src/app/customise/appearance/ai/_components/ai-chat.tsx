"use client";

import { ArrowLeft, Check, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AiChange } from "@/types/appearance-ai";
import { Thinking } from "./thinking";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  changes?: AiChange[];
};

export function AiChat({
  messages,
  loading,
  pending,
  needsAuth,
  onSend,
  onAccept,
  onReject,
}: {
  messages: ChatMessage[];
  loading: boolean;
  pending: boolean;
  needsAuth: boolean;
  onSend: (text: string) => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [value, setValue] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Pin to the newest message / the thinking line.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, pending]);

  function submit() {
    const t = value.trim();
    if (!t || loading) return;
    onSend(t);
    setValue("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-md border border-border bg-card">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <span className="flex items-center gap-2">
          <Sparkles size={14} className="text-primary" aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Design with AI
          </span>
        </span>
        <Link
          href="/customise/appearance"
          className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={12} aria-hidden />
          Settings
        </Link>
      </header>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-md rounded-br-sm bg-muted px-3 py-2 text-sm text-foreground">
                  {m.text}
                </p>
              </div>
            ) : (
              <div key={m.id} className="flex flex-col gap-2">
                <p className="text-sm text-foreground">{m.text}</p>
                {m.changes && m.changes.length > 0 ? (
                  <ul className="flex flex-col gap-1 rounded-md border border-border bg-background px-3 py-2">
                    {m.changes.map((c, i) => (
                      <li
                        key={`${c.label}-${i}`}
                        className="flex items-baseline justify-between gap-3 text-[13px]"
                      >
                        <span className="text-muted-foreground">{c.label}</span>
                        <span className="text-right font-medium text-foreground">
                          {c.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ),
          )}
          {loading ? <Thinking className="pt-1" /> : null}
        </div>
      </div>

      {pending ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-4 py-2.5">
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Previewing — accept to keep
          </span>
          <span className="flex items-center gap-2">
            <Button size="sm" onClick={onAccept} className="gap-1.5">
              <Check size={14} aria-hidden />
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onReject}
              className="gap-1.5"
            >
              <X size={14} aria-hidden />
              Discard
            </Button>
          </span>
        </div>
      ) : null}

      <div className="shrink-0 border-t border-border p-3">
        {needsAuth ? (
          <p className="mb-2 text-sm text-muted-foreground">
            <Link href="/sign-in" className="text-primary hover:underline">
              Sign in
            </Link>{" "}
            to use AI suggestions.
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder={
              pending
                ? "Refine it — “warmer, bigger caret”…"
                : "Describe a look — “warm sepia, big serif”…"
            }
            aria-label="Describe the look you want"
            disabled={loading}
            className={cn(
              "max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
            )}
          />
          <Button
            onClick={submit}
            disabled={loading || value.trim().length === 0}
            className="shrink-0"
          >
            {loading ? "Thinking…" : pending ? "Refine" : "Suggest"}
          </Button>
        </div>
      </div>
    </div>
  );
}
