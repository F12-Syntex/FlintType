"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BackendError, useBackend } from "@/lib/backend";
import { type AiSuggestOutput, isEmptyPatch } from "@/types/appearance-ai";
import { useApplyPatch } from "./use-apply-patch";

const PLACEHOLDER = "Describe a look — “warm sepia, big serif, soft corners”";

export function AiBar() {
  const backend = useBackend();
  const { apply, revert, commit } = useApplyPatch();
  const reduce = useReducedMotion();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsAuth, setNeedsAuth] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [suggestion, setSuggestion] = useState<AiSuggestOutput | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = prompt.trim();
    if (!p || loading) return;
    // Refining: drop the currently-previewed suggestion before the next.
    if (suggestion) {
      revert();
      setSuggestion(null);
    }
    setEmpty(false);
    setError("");
    setNeedsAuth(false);
    setLoading(true);
    try {
      const res = await backend.appearance.aiSuggest({ prompt: p });
      if (isEmptyPatch(res.patch)) {
        setEmpty(true);
        return;
      }
      apply(res.patch);
      setSuggestion(res);
    } catch (err) {
      if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
        setNeedsAuth(true);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  function onAccept() {
    commit();
    setSuggestion(null);
    setPrompt("");
  }
  function onDiscard() {
    revert();
    setSuggestion(null);
  }

  const pending = suggestion !== null;

  return (
    <div className="mb-10 rounded-md border border-border bg-card p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={14} className="text-primary" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Describe it, don’t hunt for it
        </span>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={PLACEHOLDER}
          aria-label="Describe the look you want"
          disabled={loading}
          className="flex-1"
        />
        <Button
          type="submit"
          variant={pending ? "outline" : "default"}
          disabled={loading || prompt.trim().length === 0}
          className="shrink-0"
        >
          {loading ? "Thinking…" : pending ? "Try again" : "Suggest"}
        </Button>
      </form>

      {needsAuth ? (
        <p className="mt-2 text-sm text-muted-foreground">
          <Link href="/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to use AI suggestions.
        </p>
      ) : null}
      {empty ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Couldn’t map that to a setting. Try naming colours, a font, text
          size, or the layout.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      <AnimatePresence>
        {suggestion ? (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.99 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 rounded-md border border-border bg-background p-3"
          >
            <p className="text-sm font-semibold text-foreground">
              {suggestion.summary}
            </p>
            {suggestion.changes.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1">
                {suggestion.changes.map((c, i) => (
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
            <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Previewing live — accept to keep it
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" onClick={onAccept} className="gap-1.5">
                <Check size={14} aria-hidden />
                Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDiscard}
                className="gap-1.5"
              >
                <X size={14} aria-hidden />
                Discard
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
