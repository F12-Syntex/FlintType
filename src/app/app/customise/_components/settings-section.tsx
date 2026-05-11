import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The single section primitive on every customise page.
 *
 *  Anatomy (top-down):
 *    - Eyebrow line: 1px primary tick + uppercase eyebrow tag
 *    - Two-line lockup: bigger title + optional one-line description on
 *      the left; right-aligned `actions` slot (per-section reset)
 *    - Optional preview card: bespoke per section (no shared previews
 *      across sections — see ui-law.md §12.5)
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
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-6 border-t border-border/60 pt-10 pb-12 first:border-t-0 first:pt-0 sm:pt-14 sm:pb-16",
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
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </div>

      {preview ? (
        <div className="mb-6 overflow-hidden rounded-md border border-border bg-background">
          {preview}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
