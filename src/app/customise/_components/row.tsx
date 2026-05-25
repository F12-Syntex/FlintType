import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared shell for inline single-control settings rows.
 *
 *  Mobile-first: label sits *above* the control so the chips/buttons get
 *  the full row width instead of fighting the label and wrapping into
 *  4-5 lines on a 375 px viewport. From `sm:` up the row falls back to
 *  the inline label-left / control-right form.
 *
 *  The row sits on `bg-muted` — a recessed inset layer distinct from
 *  the `bg-card` sidebar / content panel it lives in (and from the
 *  `bg-background` page on mobile, where there's no panel), so the
 *  control reads as its own surface rather than blending into the card.
 *  See ui-law.md §12.1.
 *
 *  Optional `preview`: when present, renders a hairline-separated strip
 *  below the row showing the current value's live effect (a sample
 *  passage with the chosen caret, a wrong-letter glyph in the chosen
 *  mistake style, etc.). Subtle by design — same `bg-muted` surface,
 *  smaller scale, no extra border around the preview itself. */
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
        "flex flex-col rounded-md border border-border bg-muted",
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
