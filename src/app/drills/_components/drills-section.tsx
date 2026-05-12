import type { ReactNode } from "react";
import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";

/** Section primitive identical in shape to <InsightsSection>:
 *  eyebrow tick + Tag, optional muted subtitle, full-width body.
 *  Lives here (not in @/components) because /insights and /drills
 *  are the only consumers today — promote to a shared primitive when
 *  a third surface needs the exact same layout (org rules §extract). */
export function DrillsSection({
  label,
  subtitle,
  children,
  className,
  noBorder = false,
}: {
  label: string;
  subtitle?: string;
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
      <header className="mb-6 flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <Tag>{label}</Tag>
        </div>
        {subtitle ? (
          <p className="max-w-xl text-[12.5px] leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
