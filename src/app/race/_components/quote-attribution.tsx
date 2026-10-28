import { cn } from "@/lib/utils";

/** "— Author" footnote for QUOTE races. Sits directly under the passage
 *  text it credits (never after a flex-fill slot, where it would drift
 *  far below the words), muted and italic so it never competes with
 *  the passage itself. */
export function QuoteAttribution({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  return (
    <p className={cn("text-sm italic text-muted-foreground", className)}>
      — {source}
    </p>
  );
}
