"use client";

import { ArrowUp, Check, RotateCcw, Wand2, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import { type AiChange, isEmptyPatch } from "@/types/appearance-ai";
import { useApplyPatch } from "./use-apply-patch";
import { useCurrentSettings } from "./use-current-settings";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  changes?: AiChange[];
  tone?: "error";
};

const STORAGE_KEY = "ft:ai-dock:chat";

/** Persisted chat history — survives closing the dock and navigating
 *  between customise pages so opening it never wipes the conversation. */
function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return Array.isArray(v) ? (v as Message[]) : [];
  } catch {
    return [];
  }
}

/** Float the dock just above the page footer (or a corner gap when there
 *  isn't one), mirroring the friends dock. */
function useFooterHeight(routeKey: string): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector<HTMLElement>("[data-ft-footer]");
      if (!el) return setH(0);
      const visible = getComputedStyle(el).display !== "none";
      setH(visible ? el.getBoundingClientRect().height : 0);
    };
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [routeKey]);
  return h;
}

/** Three coral dots — the "message is being processed" cue, gated behind
 *  `motion-safe` (§13). */
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

/** Bottom-centre AI dock, global to the customise pages. A minimal,
 *  borderless chat panel that applies changes to the live settings (the
 *  page repaints), keeps a persisted history, and theme-aware throughout
 *  so it reads correctly in light and dark. */
export function CustomiseAiDock() {
  const pathname = usePathname();
  const backend = useBackend();
  const { apply, revert, commit } = useApplyPatch();
  const readCurrent = useCurrentSettings();
  const footerH = useFooterHeight(pathname);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [dirty, setDirty] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const hidden = pathname === "/customise/appearance/themes";

  // Persist the conversation.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* quota / unavailable — history just won't persist */
    }
  }, [messages]);

  // Pin to the newest message / the processing row.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, open]);

  // Auto-grow the input.
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value, open]);

  function push(m: Omit<Message, "id">) {
    setMessages((prev) => [...prev, { ...m, id: crypto.randomUUID() }]);
  }

  async function onSend() {
    const text = value.trim();
    if (!text || loading) return;
    push({ role: "user", text }); // the prompt becomes a message, not a reset
    setValue("");
    setLoading(true);
    try {
      const res = await backend.appearance.aiSuggest({
        prompt: text,
        current: readCurrent(),
      });
      if (isEmptyPatch(res.patch)) {
        push({
          role: "assistant",
          text: "I couldn't map that to a setting. Try naming a colour, a font, a size, or a behaviour.",
        });
        return;
      }
      apply(res.patch);
      setDirty(true);
      push({ role: "assistant", text: res.summary, changes: res.changes });
    } catch (err) {
      const text =
        err instanceof BackendError && err.code === "UNAUTHORIZED"
          ? "Sign in to use AI suggestions."
          : err instanceof Error
            ? err.message
            : "Something went wrong.";
      push({ role: "assistant", text, tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  if (hidden) return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-40 flex w-[min(92vw,40rem)] -translate-x-1/2 flex-col items-stretch gap-2"
      style={{
        bottom: `calc(${footerH}px + 0.75rem + env(safe-area-inset-bottom))`,
      }}
    >
      {open ? (
        <div className="pointer-events-auto flex max-h-[min(60dvh,30rem)] flex-col overflow-hidden rounded-2xl bg-card/95 text-card-foreground shadow-xl backdrop-blur-md">
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-3 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Design with AI
            </span>
            <div className="flex items-center gap-1">
              {messages.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  className="rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X size={15} aria-hidden />
              </button>
            </div>
          </div>

          {messages.length > 0 || loading ? (
            <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
              <div className="flex flex-col gap-3">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="flex justify-end">
                      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-muted px-3 py-1.5 text-sm text-foreground">
                        {m.text}
                      </p>
                    </div>
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

          {dirty ? (
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-1.5">
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Applied live
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    commit();
                    setDirty(false);
                  }}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Check size={13} aria-hidden />
                  Keep
                </button>
                <button
                  type="button"
                  onClick={() => {
                    revert();
                    setDirty(false);
                  }}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <RotateCcw size={13} aria-hidden />
                  Undo
                </button>
              </span>
            </div>
          ) : null}

          <div className="shrink-0 p-2">
            <div className="flex items-end gap-2 rounded-xl bg-muted px-2 py-1.5">
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
                placeholder="Describe a look or a change…"
                aria-label="Describe a change"
                disabled={loading}
                className="max-h-36 min-h-8 flex-1 resize-none bg-transparent px-1 py-1 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void onSend()}
                disabled={loading || value.trim().length === 0}
                aria-label="Send"
                className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <ArrowUp size={15} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Resting pill — borderless, shadow only. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Design with AI"
        aria-expanded={open}
        className={cn(
          "pointer-events-auto mx-auto flex h-11 items-center gap-2 rounded-full bg-card px-4 text-foreground shadow-lg transition-colors hover:bg-accent",
          open && "hidden",
        )}
      >
        <Wand2 size={16} className="text-primary" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
          Design with AI
        </span>
        {dirty ? (
          <span aria-hidden className="size-1.5 rounded-full bg-primary" />
        ) : null}
      </button>
    </div>
  );
}
