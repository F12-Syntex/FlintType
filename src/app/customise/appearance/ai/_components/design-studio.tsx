"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowUp, Check, RotateCcw } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import { type AiChange } from "@/types/appearance-ai";
import { useCurrentSettings } from "../../../_components/use-current-settings";
import { StylePreview } from "../../../_components/rows/style-preview";
import { KeyboardLivePreview } from "../../../_components/rows/keyboard-preview";
import { MultiplayerPreview } from "../../../_components/rows/multiplayer-preview";
import { ThemePreview } from "../../../_components/rows/passage-previews";
import {
  LiveStatsPreview,
  ResultLivePreview,
} from "../../../_components/rows/stats-previews";
import { EMPTY_PATCH, isEmptyPatch, mergePatch, overlayCurrent } from "./patch-merge";
import { PreviewScope } from "./preview-scope";
import { useStudioApply } from "./use-studio-apply";
import type { AppearancePatch } from "@/types/appearance-ai";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  changes?: AiChange[];
  /** `signin`: the session ran out mid-chat — show the sign-in link. */
  tone?: "error" | "signin";
};

const SIGN_IN_HREF = `/sign-in?redirect_url=${encodeURIComponent("/customise/appearance/ai")}`;

/** "Sign in to design with AI." — a missing session is a next step,
 *  not an error, so it's muted ink with one orange link. */
function SignInLine({ className }: { className?: string }) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      <Link
        href={SIGN_IN_HREF}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Sign in
      </Link>{" "}
      to design with AI.
    </p>
  );
}

/** The keyboard tile draws the keyboard even when the user has it
 *  switched off, so a suggested key style is always visible. */
function StudioKeyboard() {
  return <KeyboardLivePreview alwaysShow />;
}

/** The six surfaces the studio previews a look across. */
const PREVIEWS: { label: string; Comp: () => ReactNode; wide?: boolean }[] = [
  { label: "Typing", Comp: ThemePreview },
  { label: "Live stats", Comp: LiveStatsPreview },
  { label: "Result", Comp: ResultLivePreview, wide: true },
  { label: "Keyboard", Comp: StudioKeyboard, wide: true },
  { label: "Race", Comp: MultiplayerPreview },
  { label: "Buttons & cards", Comp: StylePreview },
];

function ProcessingDots() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Working">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-primary motion-safe:animate-bounce"
          style={{ animationDelay: `${i * 0.15 - 0.3}s` }}
        />
      ))}
    </div>
  );
}

/** The Design with AI studio: a grid of six previews themed by the AI's
 *  proposed look (preview-only — the real config is untouched), and a
 *  minimal chat dock that drives it. "Apply" commits the preview to the
 *  real settings; "Reset" drops it. */
export function DesignStudio() {
  const backend = useBackend();
  const applyToSettings = useStudioApply();
  const readCurrent = useCurrentSettings();
  const { isLoaded, isSignedIn } = useAuth();
  const signedOut = isLoaded && !isSignedIn;

  const [patch, setPatch] = useState<AppearancePatch>(EMPTY_PATCH);
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);
  // Fit the textarea to its text — or to its placeholder, which swaps
  // once Clerk reports the session, so re-measure then too (the long
  // signed-in hint wraps on a phone; the signed-out one doesn't).
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value, signedOut]);

  function push(m: Omit<Message, "id">) {
    setMessages((prev) => [...prev, { ...m, id: crypto.randomUUID() }]);
  }

  async function onSend() {
    const text = value.trim();
    if (!text || loading || signedOut) return;
    push({ role: "user", text });
    setValue("");
    setLoading(true);
    try {
      const res = await backend.appearance.aiSuggest({
        prompt: text,
        current: overlayCurrent(readCurrent(), patch),
      });
      if (isEmptyPatch(res.patch)) {
        push({
          role: "assistant",
          text: "I couldn't map that to a setting. Try naming a colour, a font, a size, or a behaviour.",
        });
        return;
      }
      setPatch((p) => mergePatch(p, res.patch)); // preview only
      push({ role: "assistant", text: res.summary, changes: res.changes });
    } catch (err) {
      if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
        push({ role: "assistant", text: "", tone: "signin" });
        return;
      }
      const text = err instanceof Error ? err.message : "Something went wrong.";
      push({ role: "assistant", text, tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  const pending = !isEmptyPatch(patch);

  return (
    <section className="flex flex-col gap-8 text-foreground">
      <PageHeader
        title="Design with AI"
        description="Describe a look below. It only changes these previews until you apply it."
        className="sm:items-center"
        aside={
          pending ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPatch(EMPTY_PATCH)}
                className="h-11 sm:h-8"
              >
                <RotateCcw aria-hidden />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  applyToSettings(patch);
                  setPatch(EMPTY_PATCH);
                  push({ role: "assistant", text: "Applied to your settings." });
                }}
                className="h-11 sm:h-8"
              >
                <Check aria-hidden />
                Apply to settings
              </Button>
            </>
          ) : null
        }
      />

      {/* Previews — preview-only theming. */}
      <div>
        <PreviewScope patch={patch}>
          <div className="grid gap-4 sm:grid-cols-2">
            {PREVIEWS.map(({ label, Comp, wide }) => (
              <div
                key={label}
                className={cn(
                  "pointer-events-none flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-card",
                  wide && "sm:col-span-2",
                )}
              >
                <div className="border-b border-border px-4 py-2.5 text-xs font-medium text-muted-foreground">
                  {label}
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <Comp />
                </div>
              </div>
            ))}
          </div>
        </PreviewScope>
      </div>

      {/* Minimal chat dock — preview-only. Sticky to the bottom of the
          settings scroller, so it floats over the previews while they
          scroll, stays centred on the page column (not the window, which
          pushed it over the sidebar) and comes to rest under the last
          preview instead of covering it. The pinned footer sits outside
          the scroller, so the dock never overlaps it. */}
      <div
        className="pointer-events-none sticky z-20 flex justify-center"
        style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="pointer-events-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card/95 text-card-foreground shadow-float backdrop-blur-md">
          {messages.length > 0 || loading ? (
            <div
              ref={logRef}
              className="max-h-44 min-h-0 overflow-y-auto px-4 pt-3"
            >
              <div className="flex flex-col gap-3">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="flex justify-end">
                      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-muted px-3 py-1.5 text-sm text-foreground">
                        {m.text}
                      </p>
                    </div>
                  ) : m.tone === "signin" ? (
                    <SignInLine key={m.id} />
                  ) : (
                    <div key={m.id} className="flex flex-col gap-1.5">
                      <p
                        className={cn(
                          "text-sm",
                          m.tone === "error"
                            ? "text-destructive"
                            : "text-foreground",
                        )}
                      >
                        {m.text}
                      </p>
                      {m.changes && m.changes.length > 0 ? (
                        <ul className="flex flex-col gap-1 rounded-lg bg-muted px-3 py-2">
                          {m.changes.map((c, i) => (
                            <li
                              key={`${c.label}-${i}`}
                              className="flex items-baseline justify-between gap-3 text-[13px]"
                            >
                              <span className="text-muted-foreground">
                                {c.label}
                              </span>
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
                {loading ? <ProcessingDots /> : null}
              </div>
            </div>
          ) : null}

          {signedOut && messages.length === 0 ? (
            <SignInLine className="px-4 pt-3" />
          ) : null}

          <div className="p-2">
            <div className="flex items-end gap-2 rounded-xl bg-muted py-1.5 pr-1.5 pl-3">
              <textarea
                ref={taRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSend();
                  }
                }}
                rows={1}
                placeholder={
                  signedOut
                    ? "Sign in to describe a look"
                    : "Try “warm and minimal” or “bigger serif text”"
                }
                aria-label="Describe a change"
                disabled={loading || signedOut}
                // 16px on phones so iOS doesn't zoom the page on focus.
                className="max-h-32 min-h-8 flex-1 resize-none self-center bg-transparent px-1 py-1 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => void onSend()}
                disabled={loading || signedOut || value.trim().length === 0}
                aria-label="Send"
                className="brand-surface flex size-11 shrink-0 items-center justify-center rounded-pill text-primary-foreground shadow-glow transition-opacity hover:brightness-110 disabled:opacity-40 disabled:shadow-none sm:size-8"
              >
                <ArrowUp size={15} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
