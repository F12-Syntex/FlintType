import { cn } from "@/lib/utils";

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mx-0.5 inline-block rounded-sm border border-ft-line-soft border-b-2 bg-white px-1.5 py-px text-[10px] font-semibold text-ft-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}
