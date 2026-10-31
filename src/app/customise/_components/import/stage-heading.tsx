import type { ReactNode } from "react";

/** A screen's heading. It takes focus when the screen appears, so a
 *  screen reader starts there (ui-law §12.10); `describedBy` points at
 *  the line it should read with it, such as what went wrong. */
export function StageHeading({ children, describedBy }: { children: ReactNode; describedBy?: string }) {
  return (
    <h3
      data-stage-heading
      tabIndex={-1}
      aria-describedby={describedBy}
      className="text-base font-semibold tracking-tight text-foreground outline-none"
    >
      {children}
    </h3>
  );
}
