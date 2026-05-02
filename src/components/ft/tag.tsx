import { cn } from "@/lib/utils";

export function Tag({
  children,
  className,
  tone = "dim",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "dim" | "ink" | "ember" | "ok";
}) {
  const toneClass = {
    dim: "text-muted-foreground",
    ink: "text-foreground",
    ember: "text-primary",
    // No theme equivalent for "ok" yet — leaving the fixed token until
    // a --success var lands (ui-law §2.3).
    ok: "text-ft-ok",
  }[tone];
  return (
    <span
      className={cn(
        "text-[10px] font-medium uppercase tracking-[0.18em]",
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}
