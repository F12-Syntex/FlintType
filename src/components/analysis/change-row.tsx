import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlopeGlyph } from "./slope-glyph";

type ChangeRowProps = {
  direction: "better" | "worse";
  /** "Fewer pauses before words." */
  title: string;
  /** "About 2.1 seconds a minute, down from 3.4." */
  detail: string;
  before: number;
  after: number;
  betterIsLower: boolean;
  className?: string;
};

/** One change that passed the noise gate: an ink direction icon, the
 *  title over its detail, and a slope sketch. Better and worse differ by
 *  icon, sketch and words, never by colour. The icon and the sketch both
 *  show the verdict (better rises, worse falls) and the sketch takes the
 *  row's `direction`, so they always agree; the detail keeps the literal
 *  figures ("down from 9.3"). */
export function ChangeRow({
  direction,
  title,
  detail,
  before,
  after,
  betterIsLower,
  className,
}: ChangeRowProps) {
  const Icon = direction === "better" ? ArrowUpRight : ArrowDownRight;
  return (
    <div className={cn("grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 px-4 py-3.5 sm:px-5", className)}>
      <Icon aria-hidden className="mt-0.5 size-4 text-foreground" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      <SlopeGlyph
        before={before}
        after={after}
        betterIsLower={betterIsLower}
        direction={direction}
        className="mt-0.5"
      />
    </div>
  );
}
