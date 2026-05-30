"use client";

import { Check, ChevronDown, RotateCcw, Wand2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PromptInput } from "@/components/ui/prompt-input";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import { type AiChange, isEmptyPatch } from "@/types/appearance-ai";
import { useApplyPatch } from "./use-apply-patch";
import { useCurrentSettings } from "./use-current-settings";

type Entry = { id: number; summary: string; changes: AiChange[] };

/** Float the dock just above the page footer (or fall back to a corner
 *  gap when there isn't one), mirroring the friends dock. */
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

/** Bottom-centre AI dock, global to the customise pages (appearance +
 *  behaviour). A rounded pill at rest; expands into a chat panel where
 *  you describe changes. Each message applies to the live settings (the
 *  page + its previews repaint), and the panel logs what changed. "Apply
 *  changes" keeps them; "Undo" reverts the whole session. */
export function CustomiseAiDock() {
  const pathname = usePathname();
  const backend = useBackend();
  const { apply, revert, commit } = useApplyPatch();
  const readCurrent = useCurrentSettings();
  const footerH = useFooterHeight(pathname);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [dirty, setDirty] = useState(false);
  const idRef = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);

  // The themes explorer is its own full-page browser — no dock there.
  const hidden = pathname === "/customise/appearance/themes";

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, loading]);

  async function onSend(text: string) {
    setNeedsAuth(false);
    setEmpty(false);
    setError("");
    setLoading(true);
    try {
      const res = await backend.appearance.aiSuggest({
        prompt: text,
        current: readCurrent(),
      });
      if (isEmptyPatch(res.patch)) {
        setEmpty(true);
        return;
      }
      apply(res.patch); // live — the page + previews repaint now
      setEntries((e) => [
        ...e,
        { id: idRef.current++, summary: res.summary, changes: res.changes },
      ]);
      setDirty(true);
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

  function submit() {
    const t = value.trim();
    if (!t || loading) return;
    onSend(t);
    setValue("");
  }

  function onApply() {
    commit();
    setDirty(false);
  }
  function onUndo() {
    revert();
    setDirty(false);
    setEntries([]);
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
        <div className="pointer-events-auto flex max-h-[min(60dvh,30rem)] flex-col overflow-hidden rounded-2xl border border-border bg-popover/95 shadow-md backdrop-blur-md">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Design with AI
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Collapse"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronDown size={16} aria-hidden />
            </button>
          </header>

          {entries.length > 0 ? (
            <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <div className="flex flex-col gap-3">
                {entries.map((e) => (
                  <div key={e.id} className="flex flex-col gap-1.5">
                    <p className="text-sm text-foreground">{e.summary}</p>
                    {e.changes.length > 0 ? (
                      <ul className="flex flex-col gap-1 rounded-md border border-border bg-background px-3 py-2">
                        {e.changes.map((c, i) => (
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
                ))}
              </div>
            </div>
          ) : (
            <p className="px-4 py-3 text-[13px] text-muted-foreground">
              Describe a change — colours, fonts, the caret, or how the test
              behaves. It applies live; review it on the page, then keep going.
            </p>
          )}

          <div className="shrink-0 border-t border-border p-3">
            {dirty ? (
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Applied live — keep or undo
                </span>
                <span className="flex items-center gap-1.5">
                  <Button size="sm" onClick={onApply} className="gap-1.5">
                    <Check size={14} aria-hidden />
                    Apply changes
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onUndo}
                    className="gap-1.5"
                  >
                    <RotateCcw size={14} aria-hidden />
                    Undo
                  </Button>
                </span>
              </div>
            ) : null}

            <PromptInput
              value={value}
              onValueChange={setValue}
              onSubmit={submit}
              loading={loading}
              autoFocus
              placeholder="Describe a change — “warmer”, “bigger caret”, “stop on error”…"
            />

            {needsAuth ? (
              <p className="mt-2 px-1 text-[13px] text-muted-foreground">
                Sign in to use AI suggestions.
              </p>
            ) : null}
            {empty ? (
              <p className="mt-2 px-1 text-[13px] text-muted-foreground">
                Couldn’t map that to a setting. Try naming a colour, a font, a
                size, or a behaviour.
              </p>
            ) : null}
            {error ? (
              <p className="mt-2 px-1 text-[13px] text-destructive">{error}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Resting pill — bottom centre, fully rounded. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Design with AI"
        aria-expanded={open}
        className={cn(
          "pointer-events-auto mx-auto flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          open && "hidden",
        )}
      >
        <Wand2 size={16} className="text-primary" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
          Design with AI
        </span>
        {dirty ? (
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-primary"
            title="Unsaved AI changes"
          />
        ) : null}
      </button>
    </div>
  );
}
