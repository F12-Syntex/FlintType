import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FieldItem = { label: string; value: ReactNode; hint?: string };

type FieldListProps = {
  items: FieldItem[];
  /** `inline`: value before label in one wrapping row ("7 ready").
   *  `stacked`: label above value, side by side. */
  variant?: "inline" | "stacked";
  size?: "sm" | "md";
  className?: string;
};

/** Facts as a `<dl>` of label and value: the structure that replaces every
 *  dot-joined metadata line (ui-law §0). The `dt` comes first in the DOM,
 *  so a screen reader hears "ready, 7"; inline items are reordered with
 *  flex `order` (nothing in them is focusable) to read "7 ready". */
export function FieldList({ items, variant = "inline", size = "md", className }: FieldListProps) {
  const small = size === "sm";
  if (variant === "stacked") {
    return (
      <dl className={cn("flex flex-wrap gap-x-8 gap-y-3", className)}>
        {items.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
            <dd
              className={cn(
                "font-semibold tabular-nums text-foreground",
                small ? "text-sm" : "text-base",
              )}
            >
              {item.value}
            </dd>
            {item.hint ? <dd className="text-xs text-muted-foreground">{item.hint}</dd> : null}
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl
      className={cn(
        "flex flex-wrap gap-y-1 text-muted-foreground",
        small ? "gap-x-3 text-xs" : "gap-x-4 text-sm",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-1">
          <dt className="order-2">{item.label}</dt>
          <dd className="order-1 font-semibold tabular-nums text-foreground">{item.value}</dd>
          {item.hint ? <dd className="order-3">{item.hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
