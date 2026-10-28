import Link from "next/link";
import { type ReactNode } from "react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { cn } from "@/lib/utils";

/** Shared shell + typography for reading pages (about, privacy, terms,
 *  faq, changelog, blog). One column (`<PageShell width="text">`, about
 *  70 characters a line), one h1 (`<PageHeader>`), one h2 style and one
 *  body size, so every long-form page reads with the same rhythm. The
 *  horizontal gutter comes from `<AppChrome>`. */
export function EditorialPage({
  eyebrow,
  title,
  subtitle,
  toc,
  children,
  footer,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Optional "on this page" jump list, rendered as pill links under
   *  the header. Ids must match the sections' ids (see `sectionId`). */
  toc?: readonly { id: string; label: string }[];
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <PageShell width="text">
      <article className="flex flex-col gap-10 sm:gap-12">
        <div className="flex flex-col gap-6">
          <PageHeader eyebrow={eyebrow} title={title} description={subtitle} />
          {toc && toc.length > 0 ? <JumpList items={toc} /> : null}
        </div>

        <div className="flex flex-col gap-10 sm:gap-12">{children}</div>

        {footer ? (
          <footer className="border-t border-border pt-6 text-sm leading-6 text-muted-foreground">
            {footer}
          </footer>
        ) : null}
      </article>
    </PageShell>
  );
}

/** Stable anchor id for a section title: lowercase words joined by
 *  hyphens ("Your rights" → "your-rights"). Pages that render a jump
 *  list call this so the pills and the headings always agree. */
export function sectionId(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A titled block of prose: a real h2 (with an anchor id so it can be
 *  linked to) above the body copy. `meta` is a small muted line beside
 *  the heading (a date, a version range). */
export function EditorialSection({
  title,
  id,
  meta,
  children,
  className,
}: {
  title?: ReactNode;
  id?: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const anchor = id ?? (typeof title === "string" ? sectionId(title) : undefined);
  return (
    <section
      id={anchor}
      className={cn("flex scroll-mt-24 flex-col gap-3", className)}
    >
      {title ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {title}
          </h2>
          {meta ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              {meta}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-4 text-[15px] leading-7 text-foreground/85 sm:text-base">
        {children}
      </div>
    </section>
  );
}

/** Inline link inside reading copy. Internal routes go through
 *  `next/link`; anything starting with `http` opens in a new tab, and a
 *  static file (`/changelog.md`) is a plain anchor. */
export function EditorialLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const className =
    "font-medium text-foreground underline decoration-primary/40 decoration-1 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary";
  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }
  if (/\.[a-z0-9]+$/i.test(href)) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** Bulleted list inside reading copy. */
export function EditorialList({ children }: { children: ReactNode }) {
  return (
    <ul className="ml-5 flex list-disc flex-col gap-2 marker:text-muted-foreground/60">
      {children}
    </ul>
  );
}

/** "On this page" pills. Secondary navigation, so the pills are
 *  outline-weight and only turn orange on hover/focus. On phones they
 *  sit in one sideways-scrolling row (bleeding to the screen edge)
 *  instead of stacking five rows deep above the first section. */
function JumpList({ items }: { items: readonly { id: string; label: string }[] }) {
  return (
    <nav aria-label="On this page">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              className="inline-flex h-9 items-center rounded-pill border border-border bg-card px-4 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:text-primary focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
