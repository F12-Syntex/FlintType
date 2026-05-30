import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared shell for inline single-control settings rows.
 *
 *  Mobile-first: label sits *above* the control so the chips/buttons get
 *  the full row width instead of fighting the label and wrapping into
 *  4-5 lines on a 375 px viewport. From `sm:` up the row falls back to
 *  the inline label-left / control-right form.
 *
 *  The row has **no fill** — it's a hairline-outlined container on the
 *  page background. The surface lives on the *control* instead (the
 *  chips are `bg-muted`), so the thing you interact with reads as the
 *  surface rather than the whole row sitting in a band. See ui-law.md §12.1.
 *
 *  Optional `preview`: when present, renders a hairline-separated strip
 *  below the row showing the current value's live effect (a sample
 *  passage with the chosen caret, a wrong-letter glyph in the chosen
 *  mistake style, etc.). Subtle by design, smaller scale, no extra
 *  border around the preview itself. */
export function SettingsRow({
  label,
  control,
  preview,
  className,
}: {
  label: ReactNode;
  control: ReactNode;
  preview?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-md border border-border",
        className,
      )}
    >
      <div className="flex flex-col gap-3 px-4 py-4 sm:min-h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-0">
        <span className="text-base font-semibold text-foreground sm:text-sm sm:font-medium">
          {label}
        </span>
        {control}
      </div>
      {preview ? (
        <div className="border-t border-border/50 px-4 py-3 text-muted-foreground">
          {preview}
        </div>
      ) : null}
    </div>
  );
}
