import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MethodDisclosureProps = {
  /** The summary line. */
  title?: string;
  /** Two to four short paragraphs (`<p>`s), or plain text. */
  children: ReactNode;
  className?: string;
};

/** "How we measure this": a native `<details>`, collapsed by default, so
 *  it works without script and with the keyboard. Left out of exported
 *  images (`data-no-export`). */
export function MethodDisclosure({
  title = "How we measure this",
  children,
  className,
}: MethodDisclosureProps) {
  return (
    <details data-no-export="true" className={cn("group", className)}>
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-pill text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring/60 focus-visible:outline-solid sm:min-h-0 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          aria-hidden
          className="size-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="mt-2 flex max-w-prose flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </details>
  );
}
