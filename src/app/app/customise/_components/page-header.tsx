"use client";

import { Button } from "@/components/ui/button";
import { ImportExportMenu } from "./import-export";

/** Editorial page header for the customise pages. Replaces the prior
 *  "Section: Title" eyebrow stack with a real two-axis layout: the
 *  eyebrow + headline + sub-deck on the left, the customised count and
 *  reset action on the right.
 *
 *  Mobile-first: stacks; the count/reset row sits below the title.
 *  At sm+, the right rail aligns to the title baseline. */
export function SettingsPageHeader({
  eyebrow = "Customise",
  title,
  description,
  customizedCount = 0,
  onResetAll,
}: {
  eyebrow?: string;
  title: string;
  /** Kept on the type for backwards compat with existing callers; the
   *  visible "N options" badge was retired — the customised counter
   *  is the only chrome the user reads. */
  optionsCount?: number;
  customizedCount?: number;
  onResetAll?: () => void;
  description?: string;
}) {
  return (
    <header className="mb-10 border-b border-border pb-8 sm:mb-12 sm:pb-10">
      <div className="mb-4 flex items-center gap-3">
        <span aria-hidden className="inline-block h-px w-7 bg-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </span>
      </div>

      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-10">
        <div className="flex flex-col gap-3">
          <h2 className="font-bold tracking-[-0.02em] text-foreground text-[26px] leading-[1.05] sm:text-[36px] lg:text-[44px]">
            {title}
          </h2>
          {description ? (
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:items-end sm:gap-4">
          <CustomisedStat count={customizedCount} />
          <div className="flex items-center gap-2">
            {onResetAll ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetAll}
                disabled={customizedCount === 0}
                confirm={{
                  title: `Reset ${title.toLowerCase()}?`,
                  description: (
                    <p className="text-sm text-muted-foreground">
                      This clears every customisation on this page and
                      restores the default values. This cannot be undone.
                    </p>
                  ),
                  confirmLabel: "Reset all",
                  confirmVariant: "destructive",
                }}
              >
                Reset all
              </Button>
            ) : null}
            <ImportExportMenu />
          </div>
        </div>
      </div>
    </header>
  );
}

function CustomisedStat({ count }: { count: number }) {
  const customised = count > 0;
  return (
    <div className="flex items-baseline gap-2">
      <span
        className={
          "font-mono text-2xl font-bold tabular-nums leading-none " +
          (customised ? "text-primary" : "text-foreground/40")
        }
      >
        {count}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {customised ? "customised" : "untouched"}
      </span>
    </div>
  );
}
