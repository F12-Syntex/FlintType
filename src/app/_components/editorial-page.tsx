import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared shell + typography for editorial / SEO pages (about, privacy,
 *  terms, faq, changelog, blog index, blog post). One layout means
 *  every long-form surface lines up at the same column width and
 *  reads with the same typographic rhythm — about doesn't drift away
 *  from privacy, blog posts share the same column geometry as the
 *  changelog, etc. The home + race + drills surfaces are app
 *  surfaces and don't go through this. */
export function EditorialPage({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10 sm:px-8 sm:py-16">
      <header className="flex flex-col gap-3 sm:gap-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="max-w-prose text-[14px] leading-relaxed text-foreground/85 sm:text-[15px]">
            {subtitle}
          </p>
        ) : null}
      </header>

      <div className="flex flex-col gap-8 sm:gap-10">{children}</div>

      {footer ? (
        <footer className="border-t border-border pt-6 text-[12px] text-muted-foreground">
          {footer}
        </footer>
      ) : null}
    </article>
  );
}

/** Section block — h2 + body. Use with `<EditorialSection title="...">`. */
export function EditorialSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      {title ? (
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </h2>
      ) : null}
      <div className="flex flex-col gap-3 text-[14px] leading-relaxed text-foreground/85">
        {children}
      </div>
    </section>
  );
}
