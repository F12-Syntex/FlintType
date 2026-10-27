import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The one page frame every scrolling app page shares (ui-law §5,
 *  §21): a centred column, one width, one vertical rhythm. The
 *  horizontal gutter comes from <AppChrome>, so content edges line up
 *  with the logo and the footer on every route.
 *
 *  - `width="wide"` (default, max-w-6xl) for app pages — leaderboard,
 *    insights, drills, profile.
 *  - `width="text"` (max-w-2xl) for reading pages.
 *
 *  The bottom padding leaves room for the floating friends dock so it
 *  never covers the last row of a page. */
export function PageShell({
  children,
  width = "wide",
  className,
}: {
  children: ReactNode;
  width?: "wide" | "text";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-10 pt-8 pb-24 sm:gap-12 sm:pt-12",
        width === "wide" ? "max-w-6xl" : "max-w-2xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Page header — no card, no hero. Optional eyebrow, the page's single
 *  h1, one muted line, and an `aside` slot for status or actions that
 *  sits right from `sm` and stacks under the title on phones. */
export function PageHeader({
  eyebrow,
  title,
  description,
  aside,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow ? (
          <span className="text-xs font-medium text-muted-foreground">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            {description}
          </p>
        ) : null}
      </div>
      {aside ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {aside}
        </div>
      ) : null}
    </header>
  );
}

/** A titled block of a page. Sections are separated by space, not by
 *  boxes: an h2, an optional one-line description and a right-hand
 *  `actions` slot. Put a card *inside* a section only when its contents
 *  are something the user acts on (a list of rows, a tile, a form). */
export function PageSection({
  id,
  title,
  description,
  actions,
  children,
  className,
}: {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("flex scroll-mt-24 flex-col gap-5", className)}
    >
      {title || actions ? (
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            {title ? (
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** The standard surface for actionable content inside a section — a
 *  rounded card with a hairline and a soft lift. */
export function Surface({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "ul" | "ol";
}) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground shadow-card",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
