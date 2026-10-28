import type { ReactNode } from "react";
import { Surface } from "@/components/page-shell";
import { cn } from "@/lib/utils";

/** Two cards side by side from lg, stacked below. One template for
 *  every two-up row on the page so column edges line up down the
 *  page; the gap is tighter than a two-up of bare columns because the
 *  cards' own borders already separate them (ui-law §5 "Two-up cards"). */
export function TwoUp({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 lg:grid-cols-2 lg:gap-6", className)}>
      {children}
    </div>
  );
}

/** A titled card: a small h3 + an optional right-hand slot (a meta
 *  figure or a quiet link), then the body. */
export function Panel({
  title,
  aside,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Surface className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex min-h-12 items-center justify-between gap-3 px-4 pt-3 sm:px-5 sm:pt-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {aside ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {aside}
          </div>
        ) : null}
      </div>
      <div className={cn("flex-1 px-4 pt-3 pb-4 sm:px-5 sm:pb-5", bodyClassName)}>
        {children}
      </div>
    </Surface>
  );
}
