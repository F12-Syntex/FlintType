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
        // Default key colour matches the brand "grayed text" token
        // (ft-dim = hsl(0 0% 55%) — same value as --muted-foreground in
        // the default theme). Using ft-dim instead of bg-muted-foreground
        // because every semantic shadcn token chains through
        // `hsl(var(--token))` in globals.css and produces invalid CSS
        // under community palettes (oklch values). ft-dim is registered
        // without that indirection so it renders under any palette.
        // Same reason ft-ember is used for the pressed state.
        hot
          ? "border-ft-ember bg-ft-ember text-white transition-none"
          : "border-ft-dim bg-ft-dim text-white transition-colors duration-150",
        def.variant === "modifier" && "text-[10px] uppercase tracking-[0.14em]",
      )}
    >
      {def.shiftLabel && def.variant !== "modifier" && (
        <span
          className={cn(
            "pointer-events-none absolute top-0.5 left-1.5 text-[9px] tabular-nums",
            // Both palette-agnostic: white@70 for legibility on the gray
            // ft-dim and the coral ft-ember surfaces alike.
            hot ? "text-white/80" : "text-white/70",
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
