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
        "mx-0.5 inline-flex min-w-5 items-center justify-center rounded-md border border-border border-b-2 bg-card px-1.5 py-px font-mono text-[10px] font-semibold text-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
