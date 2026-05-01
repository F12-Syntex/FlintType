import { cn } from "@/lib/utils";
import type { KeyDef } from "./types";

export function Key({
  def,
  pressed,
  lit,
  upper,
}: {
  def: KeyDef;
  pressed: boolean;
  /** Modifier in its "on" state (CapsLock active, Shift held). */
  lit: boolean;
  upper: boolean;
}) {
  const units = def.units ?? 1;
  const isLetter =
    !def.variant && !!def.label && /^[a-z]$/.test(def.label);
  const main =
    isLetter && upper && def.label
      ? def.label.toUpperCase()
      : (def.label ?? "");
  const Icon = def.icon;
  const hot = pressed || lit;

  return (
    <div
      aria-hidden
      data-pressed={hot ? "true" : "false"}
      style={{ flex: `${units} 1 0`, minWidth: 0 }}
      className={cn(
        "relative flex h-9 items-center justify-center rounded-[6px] border font-mono text-sm sm:h-10",
        // DEBUG (1.30.8): hard-coded Tailwind built-in colours instead
        // of theme tokens, to isolate whether the colour swap itself is
        // the problem. If red flashes appear → bg-primary was failing
        // and we hunt the theme. If still nothing → the className isn't
        // landing on the element and we hunt the class application.
        hot
          ? "border-red-500 bg-red-500 text-white transition-none"
          : "border-zinc-300 bg-white text-zinc-900 transition-colors duration-150 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
        def.variant === "modifier" && "text-[10px] uppercase tracking-[0.14em]",
      )}
    >
      {def.shiftLabel && def.variant !== "modifier" && (
        <span
          className={cn(
            "pointer-events-none absolute top-0.5 left-1.5 text-[9px] tabular-nums",
            hot ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {def.shiftLabel}
        </span>
      )}
      {Icon ? (
        <Icon className="size-4" strokeWidth={2} />
      ) : (
        <span className="tabular-nums">{main}</span>
      )}
    </div>
  );
}
