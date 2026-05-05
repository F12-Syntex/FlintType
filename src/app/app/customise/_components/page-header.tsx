"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Header used at the top of every settings page. Mobile-first: title
 *  and the Reset all button stack on small viewports, then go inline
 *  from `sm:` up. */
export function SettingsPageHeader({
  title,
  customizedCount = 0,
  onResetAll,
  description,
}: {
  title: string;
  /** Kept on the type for backwards compat with callers that compute
   *  it; the visible "N options" badge was removed because the user
   *  doesn't need it as a header chrome. */
  optionsCount?: number;
  customizedCount?: number;
  onResetAll?: () => void;
  description?: string;
}) {
  return (
    <header className="mb-6 border-b border-border pb-4">
      <div className="mb-2 flex items-center gap-3">
        <span aria-hidden className="inline-block h-px w-5 bg-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs sm:font-medium">
          Section
        </span>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold tracking-tight sm:text-2xl">
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {customizedCount > 0 ? (
            <Badge size="md" variant="secondary">
              {customizedCount} customized
            </Badge>
          ) : null}
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
                    This clears every customization on this page and
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
        </div>
      </div>
      {description ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-sm">
          {description}
        </p>
      ) : null}
    </header>
  );
}

export function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span aria-hidden className="inline-block h-px w-5 bg-primary" />
      <h3 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-sm">
        {label}
      </h3>
    </div>
  );
}
