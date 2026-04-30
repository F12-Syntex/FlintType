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
    dim: "text-ft-dim",
    ink: "text-ft-ink",
    ember: "text-ft-ember",
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
