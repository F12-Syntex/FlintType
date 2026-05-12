import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";

/** Single-row banner at the top of /drills. Replaces the old marketing
 *  hero with a compact eyebrow + tabular counts strip and one
 *  Start-recommended CTA. Reads as a tool top-bar, not a landing page.
 *  Loading flips the count strip to a single muted message so the
 *  chrome stays quiet while the snapshot resolves. */
export function DrillsTopline({
  tailoredReady,
  tailoredLocked,
  genericReady,
  recommendedHref,
  recommendedTitle,
  loading,
}: {
  tailoredReady: number;
  tailoredLocked: number;
  genericReady: number;
  recommendedHref: string | null;
  recommendedTitle: string | null;
  loading: boolean;
}) {
  const totalReady = tailoredReady + genericReady;
  return (
    <header className="border-b border-border px-5 py-6 sm:px-12 sm:py-8 lg:px-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex items-center gap-3">
            <span aria-hidden className="inline-block h-px w-5 bg-primary" />
            <Tag>Drills</Tag>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            {loading ? (
              "Reading your model…"
            ) : (
              <>
                <span className="font-semibold text-foreground">
                  {totalReady}
                </span>{" "}
                ready
                <Dot />
                <span className="text-foreground">{tailoredReady}</span>{" "}
                tailored
                {tailoredLocked > 0 ? (
                  <>
                    <Dot />
                    <span>{tailoredLocked} locked</span>
                  </>
                ) : null}
              </>
            )}
          </p>
        </div>

        {recommendedHref ? (
          <Link
            href={recommendedHref}
            aria-label={
              recommendedTitle
                ? `Start recommended drill: ${recommendedTitle}`
                : "Start recommended drill"
            }
            className={cn(
              "inline-flex items-center justify-center gap-2 self-start rounded-md bg-primary px-4 py-2.5 sm:self-auto sm:py-2",
              "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground",
              "transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            Start recommended
            <ChevronRight size={14} aria-hidden />
          </Link>
        ) : !loading ? (
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Tailored picks unlock with more typing
          </span>
        ) : null}
      </div>
    </header>
  );
}

function Dot() {
  return <span className="mx-2 text-foreground/30">·</span>;
}
