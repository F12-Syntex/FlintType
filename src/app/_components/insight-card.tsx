import type { ReactNode } from "react";

/** The rounded surface every optional result insight sits in (§21):
 *  a sentence-case title, an optional muted meta line, the content. */
export function InsightCard({
  label,
  meta,
  children,
}: {
  label: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
        {meta ? (
          <span className="text-xs text-muted-foreground">{meta}</span>
        ) : null}
      </header>
      {children}
    </section>
  );
}
