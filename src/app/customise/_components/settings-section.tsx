"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Surface } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Per-section preview open/closed state, persisted per section id in
 *  localStorage. Defaults to **closed** so a settings page reads as a
 *  short list of rows; the toggle opens the live preview when the user
 *  wants to see a choice in context. Device-local (a layout nudge, not
 *  part of the synced settings profile). */
function usePreviewOpen(id: string): [boolean, () => void] {
  const key = `ft:customise:preview:${id}`;
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Read after mount, not in a lazy initializer: this renders on the
    // server too (no localStorage), so reading during render would
    // mismatch hydration.
    try {
      const v = window.localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v !== null) setOpen(v === "1");
    } catch {
      // storage blocked — keep the default.
    }
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

/** The single section primitive on every settings page (ui-law §12.1).
 *
 *  - Header: an h2 + one plain-sentence description on the left; the
 *    `Preview` toggle (when a `preview` is supplied) and any `actions`
 *    on the right.
 *  - Body: one rounded surface holding the optional live preview (built
 *    from the real on-page components, §12.5) above the rows, which are
 *    separated by hairlines.
 *
 *  The wrapper is `<section id={id}>` so sidebar anchors jump to it and
 *  the sidebar's scroll-spy can track it. */
export function SettingsSection({
  id,
  title,
  description,
  preview,
  actions,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  preview?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [previewOpen, togglePreview] = usePreviewOpen(id);
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("flex scroll-mt-20 flex-col gap-4 lg:scroll-mt-8", className)}
    >
      <header className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id={`${id}-title`}
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          {description ? (
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {preview || actions ? (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {preview ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={togglePreview}
                aria-expanded={previewOpen}
                // The preview only mounts while open, so only point at
                // it then.
                aria-controls={previewOpen ? `${id}-preview` : undefined}
                className="h-11 gap-1.5 text-muted-foreground hover:text-foreground sm:h-8"
              >
                Preview
                <ChevronDown
                  size={14}
                  aria-hidden
                  className={cn(
                    "transition-transform duration-200",
                    previewOpen && "rotate-180",
                  )}
                />
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      <Surface className="overflow-hidden">
        {preview && previewOpen ? (
          <div
            id={`${id}-preview`}
            className="overflow-hidden border-b border-border bg-background"
          >
            {preview}
          </div>
        ) : null}
        <div className="flex flex-col divide-y divide-border/70">
          {children}
        </div>
      </Surface>
    </section>
  );
}
