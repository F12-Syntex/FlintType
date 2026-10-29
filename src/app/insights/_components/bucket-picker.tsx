"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { plural } from "@/lib/format-figure";
import { formatTestName } from "@/lib/test-name";
import { useIsMobile } from "@/lib/use-is-mobile";
import { cn } from "@/lib/utils";
import type { InsightsBucket } from "@/types/insights";
import { PICKER_LABEL, PICKER_TITLE, TOUCH_LABEL } from "./labels-copy";

/** Which tests the page is about (spec-40 §3.0): an outline button with
 *  the mode (muted) and the length (medium), no glyph between them. A
 *  dropdown of checkbox items from md, a bottom sheet on phones. The
 *  selected kind gets the orange check (ui-law §5 filter toolbar). */

function nameOf(b: InsightsBucket) {
  return formatTestName({ mode: b.mode, lengthMode: b.lengthMode, length: b.length, touch: b.touch });
}

function Parts({ b }: { b: InsightsBucket }) {
  const n = nameOf(b);
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      <span className="text-muted-foreground">{n.mode}</span>
      <span className="truncate font-medium text-foreground">{n.length}</span>
      {b.touch ? <span className="text-muted-foreground">{TOUCH_LABEL}</span> : null}
    </span>
  );
}

/** One option's lines: the length over the muted mode, with the count. */
function OptionBody({ b }: { b: InsightsBucket }) {
  const n = nameOf(b);
  return (
    <span className="flex w-full min-w-0 items-center gap-4">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{n.length}</span>
        <span className="flex gap-2 text-xs text-muted-foreground">
          <span>{n.mode}</span>
          {b.touch ? <span>{TOUCH_LABEL}</span> : null}
        </span>
      </span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{plural(b.tests, "test", "tests")}</span>
    </span>
  );
}

export function BucketPicker({
  buckets,
  current,
  onSelect,
}: {
  buckets: InsightsBucket[];
  current: InsightsBucket;
  onSelect: (key: string) => void;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const label = `${PICKER_LABEL}: ${nameOf(current).group}`;
  const trigger = (
    <Button
      type="button"
      variant="outline"
      aria-label={label}
      aria-haspopup={isMobile ? "dialog" : "menu"}
      onClick={isMobile ? () => setOpen(true) : undefined}
      className="h-11 w-full justify-between gap-2 px-4 md:h-10 md:w-auto [&>svg]:text-muted-foreground"
    >
      <Parts b={current} />
      <ChevronDown aria-hidden className="-mr-1" />
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <MobileSheet open={open} onOpenChange={setOpen} title={PICKER_TITLE}>
          <ul className="flex flex-col gap-1 px-3 py-3">
            {buckets.map((b) => {
              const selected = b.key === current.key;
              return (
                <li key={b.key}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      onSelect(b.key);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring/60",
                      selected && "font-medium text-primary",
                    )}
                  >
                    <Check aria-hidden className={cn("size-4 shrink-0 text-primary", !selected && "invisible")} />
                    <OptionBody b={b} />
                  </button>
                </li>
              );
            })}
          </ul>
        </MobileSheet>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        {buckets.map((b) => {
          const selected = b.key === current.key;
          return (
            <DropdownMenuCheckboxItem
              key={b.key}
              checked={selected}
              onCheckedChange={() => onSelect(b.key)}
              className={cn("[&_svg]:text-primary", selected && "font-medium text-primary focus:text-primary")}
            >
              <OptionBody b={b} />
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
