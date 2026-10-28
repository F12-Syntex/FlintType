import { cn } from "@/lib/utils";

/** Horizontal severity meter. `value` is a 0..max scalar (weakness,
 *  percent, etc). Data, not a selection, so the fill stays ink rather
 *  than the brand orange (which would turn every row orange). */
export function SeverityBar({
  value,
  max,
  className,
  width = "w-16",
}: {
  value: number;
  max: number;
  width?: string;
  className?: string;
}) {
  const safeMax = Math.max(max, 0.0001);
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block h-1.5 overflow-hidden rounded-full bg-foreground/10 align-middle",
        width,
        className,
      )}
    >
      <span
        className="absolute inset-y-0 left-0 origin-left rounded-full bg-foreground/55 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ transform: `scaleX(${ratio})`, width: "100%" }}
      />
    </span>
  );
}
