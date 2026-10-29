import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The §17.3 empty-state card: a dashed border and one plain sentence. */
export function DashedNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border bg-card/40 px-4 py-5 text-sm leading-relaxed text-muted-foreground sm:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
