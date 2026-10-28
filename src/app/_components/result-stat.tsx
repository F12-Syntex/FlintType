import { cn } from "@/lib/utils";
import { PbConfetti, PbCrown } from "./pb-celebration";

/** Hero size steps down as the value grows ("271.0", "17760.0" with the
 *  decimal pref or the cpm / wph units) so value + PB crown always fit
 *  the headline column instead of running into the chart card. */
function heroSize(value: string): string {
  if (value.length <= 3) return "text-6xl sm:text-7xl";
  if (value.length <= 5) return "text-5xl sm:text-6xl";
  return "text-4xl sm:text-5xl";
}

/** One result number with its label above. Three tiers so the screen
 *  has one obvious answer: `hero` (speed, huge, primary), `lead`
 *  (accuracy, large ink) and `detail` (the secondary row, ink).
 *
 *  `subgrid` lets the mobile headline row share two grid rows across
 *  stats (labels in row 1, values bottom-aligned in row 2) so the
 *  labels line up even though the values differ in size; from sm the
 *  stat is a plain stack again. */
export function ResultStat({
  label,
  value,
  suffix,
  tier = "detail",
  pb = false,
  subgrid = false,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  tier?: "hero" | "lead" | "detail";
  /** Paint the PB crown + confetti burst beside the value. */
  pb?: boolean;
  subgrid?: boolean;
}) {
  const text = String(value);
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col gap-1.5",
        subgrid && "row-span-2 grid grid-rows-subgrid sm:flex",
      )}
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "relative inline-flex items-baseline gap-1 whitespace-nowrap leading-none tabular-nums",
          subgrid && "self-end sm:self-start",
          tier === "hero" &&
            cn("font-bold tracking-[-0.04em] text-primary", heroSize(text)),
          tier === "lead" &&
            "text-4xl font-semibold tracking-[-0.03em] text-foreground sm:text-5xl",
          tier === "detail" &&
            "text-xl font-semibold tracking-tight text-foreground sm:text-2xl",
        )}
      >
        {text}
        {suffix ? (
          <span className="text-sm font-normal tracking-normal text-muted-foreground">
            {suffix}
          </span>
        ) : null}
        {pb ? <PbCrown /> : null}
        {pb ? <PbConfetti /> : null}
      </span>
    </div>
  );
}
