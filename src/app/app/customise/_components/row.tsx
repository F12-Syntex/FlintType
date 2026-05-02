import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared shell for inline single-control settings rows (Theme, Mode,
 *  …). Enforces the standard rhythm so every row lines up:
 *
 *    min-h-16  (64px)  ← baseline; Theme = Mode = …
 *    max-h-48  (192px) ← 3× baseline cap; if you need more, switch to
 *                       a Card-style row instead.
 */
export function SettingsRow({
  label,
  control,
  className,
}: {
  label: ReactNode;
  control: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-16 max-h-48 items-center justify-between gap-3 rounded-md border border-border bg-card px-4",
        className,
      )}
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      {control}
    </div>
  );
}

