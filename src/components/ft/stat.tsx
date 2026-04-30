import { cn } from "@/lib/utils";
import { Tag } from "./tag";

export function Stat({
  label,
  value,
  suffix,
  delta,
  size = "md",
  accent = false,
  inverse = false,
  align = "left",
  bordered = false,
  className,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  delta?: string;
  size?: "sm" | "md" | "lg" | "xl";
  accent?: boolean;
  inverse?: boolean;
  align?: "left" | "right";
  bordered?: boolean;
  className?: string;
}) {
  const sizeClass = {
    sm: "text-base",
    md: "text-2xl sm:text-[22px]",
    lg: "text-3xl sm:text-4xl",
    xl: "text-4xl sm:text-[44px]",
  }[size];

  const positive = delta?.startsWith("+");
  const isGood = inverse ? !positive : positive;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        align === "right" && "items-end text-right",
        bordered && "border-r border-ft-line-soft pr-6",
        className,
      )}
    >
      <Tag>{label}</Tag>
      <span
        className={cn(
          "font-bold tracking-tight tabular-nums",
          accent ? "text-ft-ember" : "text-ft-ink",
          sizeClass,
        )}
      >
        {value}
        {suffix ? (
          <span className="text-sm font-normal text-ft-dim">{suffix}</span>
        ) : null}
      </span>
      {delta ? (
        <span
          className={cn(
            "text-[11px] tabular-nums tracking-wide",
            isGood ? "text-ft-ok" : "text-ft-ember",
          )}
        >
          {delta}
        </span>
      ) : null}
    </div>
  );
}
