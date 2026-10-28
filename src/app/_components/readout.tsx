import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One live number with its unit caption beside it ("84 wpm"). Shared
 *  by the practice readouts and the BURST readouts so both rows read
 *  identically. `hero` is the headline (speed), `compact` the mobile
 *  footer size. */
export function Readout({
  value,
  label,
  accent = false,
  hero = false,
  mini = false,
  compact = false,
  color,
  title,
}: {
  value: string;
  label: string;
  accent?: boolean;
  hero?: boolean;
  mini?: boolean;
  compact?: boolean;
  color?: string;
  /** Optional hover note (e.g. how a value was chosen). */
  title?: string;
}) {
  const size = compact
    ? "text-base"
    : hero
      ? mini
        ? "text-2xl"
        : "text-3xl"
      : mini
        ? "text-lg"
        : "text-xl";
  return (
    <div
      title={title}
      className={cn("flex shrink-0 items-baseline gap-1.5", mini && "opacity-80")}
    >
      <span
        className={cn(
          "font-semibold tracking-tight tabular-nums",
          hero && !compact && "font-bold",
          size,
          !color && (accent ? "text-primary" : "text-foreground"),
        )}
        style={color ? { color } : undefined}
      >
        {value}
      </span>
      <span
        className={cn(
          "text-muted-foreground",
          compact ? "text-[11px]" : "text-xs",
        )}
      >
        {label}
      </span>
    </div>
  );
}

/** Row frame shared by the live rows. min-h holds the slot at the
 *  running row's height so the passage's line-fit (which reserves this
 *  slot) doesn't jump between the rest hint and the first keystroke. */
export function ReadoutRow({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-11 select-none flex-wrap items-baseline gap-x-8 gap-y-1 pt-1",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
