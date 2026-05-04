import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared shell for inline single-control settings rows.
 *
 *  Mobile-first: label sits *above* the control so the chips/buttons get
 *  the full row width instead of fighting the label and wrapping into
 *  4-5 lines on a 375 px viewport. From `sm:` up the row falls back to
 *  the inline label-left / control-right form. */
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
        "flex flex-col gap-2 rounded-md border border-border bg-card px-3 py-3 sm:min-h-16 sm:max-h-48 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-0",
        className,
      )}
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      {control}
    </div>
  );
}
