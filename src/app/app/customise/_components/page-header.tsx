"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Header used at the top of every settings page. Mobile-first:
 *
 *  - title gets its own row, full-width
 *  - the "N options" / "N customized" badges + Reset all button sit
 *    underneath in a separate row that wraps freely
 *
 *  From `sm:` up the title and the meta row go side-by-side. */
export function SettingsPageHeader({
  title,
  optionsCount,
  customizedCount = 0,
  onResetAll,
  description,
}: {
  title: string;
  optionsCount: number;
  customizedCount?: number;
  onResetAll?: () => void;
  description?: string;
}) {
  return (
    <header className="mb-6 border-b border-border pb-4">
      <div className="mb-2 flex items-center gap-3">
        <span aria-hidden className="inline-block h-px w-5 bg-primary" />
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Section
        </span>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Badge variant="secondary" className="px-2 text-[0.65rem]">
            {optionsCount} options
          </Badge>
          {customizedCount > 0 ? (
            <Badge className="px-2 text-[0.65rem]">
              {customizedCount} customized
            </Badge>
          ) : null}
          {onResetAll ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetAll}
              disabled={customizedCount === 0}
            >
              Reset all
            </Button>
          ) : null}
        </div>
      </div>
      {description ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
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
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground sm:text-sm">
        {label}
      </h3>
    </div>
  );
}
