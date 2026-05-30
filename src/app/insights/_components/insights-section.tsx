import type { ReactNode } from "react";
import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";

/** Single section primitive every insights panel uses. Mirrors the
 *  profile-section pattern, eyebrow tick + Tag, optional right-
 *  aligned actions, consistent padding. Stays compact (py-10 sm:py-12)
 *  so the page doesn't read as a wall of slabs. */
export function InsightsSection({
  label,
  subtitle,
  actions,
  children,
  className,
  noBorder = false,
}: {
  label: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noBorder?: boolean;
}) {
  return (
    <section
      className={cn(
        "px-5 py-10 sm:px-12 sm:py-12 lg:px-16",
        noBorder ? "" : "border-b border-border",
        className,
      )}
    >
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <span aria-hidden className="inline-block h-px w-5 bg-primary" />
            <Tag>{label}</Tag>
          </div>
          {subtitle ? (
            <p className="max-w-xl text-[12.5px] leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </header>
      {children}
    </section>
  );
}
