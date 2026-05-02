import {
  type KeyboardDesign,
  designClasses,
} from "@/lib/keyboard-settings";
import { cn } from "@/lib/utils";
import type { KeyDef } from "./types";

export function Key({
  def,
  pressed,
  lit,
  upper,
  design,
}: {
  def: KeyDef;
  pressed: boolean;
  /** Modifier in its "on" state (CapsLock active, Shift held). */
  lit: boolean;
  upper: boolean;
  /** Visual variant — see `KEYBOARD_DESIGNS` in keyboard-settings.ts. */
  design: KeyboardDesign;
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

  const [resting, hotClass] = designClasses(design);

  return (
    <div
      aria-hidden
      data-pressed={hot ? "true" : "false"}
      style={{ flex: `${units} 1 0`, minWidth: 0 }}
      className={cn(
        "relative flex h-9 items-center justify-center rounded-[6px] border font-mono text-sm sm:h-10",
        hot ? cn(hotClass, "transition-none") : cn(resting, "transition-colors duration-150"),
        def.variant === "modifier" && "text-[10px] uppercase tracking-[0.14em]",
      )}
    >
      {def.shiftLabel && def.variant !== "modifier" && (
        <span
          className={cn(
            "pointer-events-none absolute top-0.5 left-1.5 text-[9px] tabular-nums",
            // current/70 follows the surrounding text color so the shift
            // label fades to the same hue as the main label on either
            // surface.
            hot ? "text-current/80" : "text-current/70",
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
