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
        // Pressed state uses ft-ember (the brand-fixed spark token) and
        // not bg-primary. bg-primary chains through `--color-primary:
        // hsl(var(--primary))` in globals.css, which produces invalid CSS
        // for any community palette where --primary is oklch(...) — the
        // resulting `hsl(oklch(...))` is dropped silently. ft-ember is
        // defined as a literal HSL with no var indirection, so it always
        // resolves to the brand coral regardless of active palette.
        hot
          ? "border-ft-ember bg-ft-ember text-white transition-none"
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
