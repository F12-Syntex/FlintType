import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DeltaTextProps = {
  direction: "up" | "down";
  children: ReactNode;
  className?: string;
};

/** A change stated in words, led by an ink arrow. The arrow is data, not
 *  an affordance (ui-law §17.5), and the words beside it always carry the
 *  same meaning, so colour and the glyph are never the only cue. */
export function DeltaText({ direction, children, className }: DeltaTextProps) {
  const Icon = direction === "up" ? ArrowUp : ArrowDown;
  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <Icon aria-hidden className="size-3.5 shrink-0 translate-y-0.5 self-start text-foreground" />
      <span>{children}</span>
    </span>
  );
}
