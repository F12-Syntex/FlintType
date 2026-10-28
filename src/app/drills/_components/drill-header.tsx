import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Top of every drill runner. Sits in the same centred column as the
 *  practice surface (the runner page provides it), on the shared page
 *  gutter: no extra inset and no edge-to-edge rule. A ghost back button
 *  (icon-only 44px on phones, labelled from sm), a hairline divider,
 *  then the drill's kind and title. One row, so the typing area keeps
 *  its height on short screens. */
export function DrillHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <header className="flex items-center gap-2 pt-3 sm:gap-3 sm:pt-5">
      <Link
        href="/drills"
        aria-label="Back to drills"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "-ml-3 size-11 shrink-0 px-0 text-muted-foreground sm:h-9 sm:w-auto sm:px-3",
        )}
      >
        <ArrowLeft aria-hidden />
        <span className="hidden sm:inline">Drills</span>
      </Link>
      <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-medium text-muted-foreground">
          {subtitle}
        </span>
        <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {title}
        </h1>
      </div>
    </header>
  );
}
