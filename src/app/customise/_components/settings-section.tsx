"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Per-section preview open/closed state, persisted per section id in
 *  localStorage so a user who collapses the ones they don't care about
 *  keeps that layout across visits. Defaults to **open** — the whole
 *  point is to show, decisively, how the setting renders; the toggle is
 *  the escape valve when the user wants a denser list. Device-local
 *  (a layout nudge, not part of the synced settings profile). */
function usePreviewOpen(id: string): [boolean, () => void] {
  const key = `ft:customise:preview-open:${id}`;
  const [open, setOpen] = useState(true);
  useEffect(() => {
    // Read persisted state after mount, not in a lazy initializer:
    // this is a client component that also renders on the server (where
    // localStorage is absent), so reading during render would mismatch
    // hydration. Same pattern as themes-row.tsx's skip-dialog read.
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem(key);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (v !== null) setOpen(v === "1");
  }, [key]);
  const toggle = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // private mode / quota — the toggle still works for the session.
      }
      return next;
    });
  }, [key]);
  return [open, toggle];
}

/** The single section primitive on every customise page.
 *
 *  Anatomy (top-down):
 *    - Eyebrow line: 1px primary tick + uppercase eyebrow tag
 *    - Two-line lockup: bigger title + optional one-line description on
 *      the left; right-aligned slot holding the `Preview` toggle (when a
 *      `preview` is supplied) + the `actions` slot (per-section reset)
 *    - Togglable preview card: a bespoke, live preview of *that*
 *      section's setting, built from the real on-page components so it
 *      shows exactly how the choice renders (see ui-law.md §12.5).
 *      Collapsible per section, persisted, open by default.
 *    - Body: the control rows themselves
 *
 *  The wrapper is `<section id={id}>` so anchor links from the sidebar
 *  jump correctly and IntersectionObserver-based active-rail tracking
 *  picks the section up.
 */
export function SettingsSection({
  id,
  eyebrow,
  title,
  description,
  preview,
  actions,
  children,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  preview?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [previewOpen, togglePreview] = usePreviewOpen(id);
  return (
    <section
      id={id}
      className={cn(
        // [&:first-of-type]:* not first:* — the page-header <header> is
        // the actual first child, so :first-child would never fire on
        // the first <section>. :first-of-type does, suppressing the
        // duplicate separator under the page-header border-b.
        "scroll-mt-6 border-t border-border/60 pt-10 pb-12 [&:first-of-type]:border-t-0 [&:first-of-type]:pt-0 sm:pt-14 sm:pb-16",
        className,
      )}
    >
      <div className="mb-6 flex flex-col gap-4 sm:mb-7">
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h3>
            {description ? (
              <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {preview || actions ? (
            <div className="flex shrink-0 items-center gap-2">
              {preview ? (
                <button
                  type="button"
                  onClick={togglePreview}
                  aria-expanded={previewOpen}
                  aria-controls={`${id}-preview`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Preview
                  <ChevronDown
                    size={13}
                    aria-hidden
                    className={cn(
                      "transition-transform duration-150",
                      previewOpen && "rotate-180",
                    )}
                  />
                </button>
              ) : null}
              {actions}
            </div>
          ) : null}
        </div>
      </div>

      {preview && previewOpen ? (
        <div
          id={`${id}-preview`}
          className="mb-6 overflow-hidden rounded-md border border-border bg-background"
        >
          {preview}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
