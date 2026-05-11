import type { ReactNode } from "react";
import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";

/** Single section primitive every profile panel uses, so the page
 *  reads as one rhythm instead of nine slightly-different boxes.
 *  Owns the eyebrow accent + tag, the optional right-aligned actions
 *  slot, and the standard padding (px-5 py-12 sm:px-12 sm:py-14).
 *  Mirror of the biogram SectionFrame minus the fade-up animation
 *  (the profile is static; animation here would be noise). */
export function ProfileSection({
  label,
  actions,
  children,
  className,
  noBorder = false,
}: {
  label: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noBorder?: boolean;
}) {
  return (
    <section
      className={cn(
        "px-4 py-10 sm:px-12 sm:py-14 lg:px-16",
        noBorder ? "" : "border-b border-border",
        className,
      )}
    >
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <Tag>{label}</Tag>
        </div>
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </header>
      {children}
    </section>
  );
}
