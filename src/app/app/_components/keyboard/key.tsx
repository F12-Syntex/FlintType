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
        hot
          ? // Instant flash on press — no transition so the lit colour
            // appears the same frame the key goes down.
            "border-primary bg-primary text-primary-foreground transition-none"
          : // Smooth fade back to the resting state.
            "border-foreground/10 bg-card text-card-foreground transition-colors duration-150",
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
