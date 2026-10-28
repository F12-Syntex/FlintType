"use client";

import { cn } from "@/lib/utils";

/** One result number. `hero` is the screen's single most important
 *  number (your WPM, orange); `lg` the runner-up (accuracy, ink); the
 *  default size is the quiet secondary row. */
export function Stat({
  label,
  value,
  size = "md",
}: {
  label: string;
  value: string;
  size?: "md" | "lg" | "hero";
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-bold tabular-nums leading-none",
          size === "hero" &&
            "text-6xl tracking-[-0.04em] text-primary sm:text-7xl",
          size === "lg" &&
            "text-4xl font-semibold tracking-[-0.03em] text-foreground sm:text-5xl",
          size === "md" && "text-xl font-semibold text-foreground sm:text-2xl",
        )}
      >
        {value}
      </span>
    </div>
  );
}
