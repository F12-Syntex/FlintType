import type { ReactNode } from "react";

/** The race page's one centred column (max-w-5xl), shared with the
 *  practice surface so the lineup, passage and results line up with
 *  practice's mode bar and passage. No horizontal padding: <AppChrome>
 *  owns the page gutter. */
export function RaceColumn({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
      {children}
    </div>
  );
}
