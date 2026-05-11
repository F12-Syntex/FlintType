import type { KeymapLegend } from "@/lib/appearance-prefs";
import {
  type KeyboardDesign,
  type KeyboardShape,
  designClasses,
  shapeClass,
} from "@/lib/keyboard-settings";
import { cn } from "@/lib/utils";
import type { KeyDef } from "./types";

export function Key({
  def,
  pressed,
  lit,
  upper,
  design,
  shape,
  showShiftLabel,
  legend = "dynamic",
}: {
  def: KeyDef;
  pressed: boolean;
  /** Modifier in its "on" state (CapsLock active, Shift held). */
  lit: boolean;
  upper: boolean;
  /** Visual variant — see `KEYBOARD_DESIGNS` in keyboard-settings.ts. */
  design: KeyboardDesign;
  /** Corner radius preset — see `KEYBOARD_SHAPES`. */
  shape: KeyboardShape;
  /** Render the small shift-label glyph above the main label. */
  showShiftLabel: boolean;
  /** Letter-case rendering. */
  legend?: KeymapLegend;
}) {
  const units = def.units ?? 1;
  const isLetter =
    !def.variant && !!def.label && /^[a-z]$/.test(def.label);
  // Legend resolves which case (or absence) of the main label to render.
  const labelByLegend = (() => {
    if (!def.label) return "";
    if (legend === "blank" && !def.variant) return "";
    if (!isLetter) return def.label;
    if (legend === "uppercase") return def.label.toUpperCase();
    if (legend === "lowercase") return def.label;
    // dynamic: follow shift+caps state
    return upper ? def.label.toUpperCase() : def.label;
  })();
  const main = labelByLegend;
  const Icon = def.icon;
  const hot = pressed || lit;

  const [resting, hotCls] = designClasses(design);

  return (
    <div
      aria-hidden
      data-pressed={hot ? "true" : "false"}
      data-key-code={def.code}
      style={{ flex: `${units} 1 0`, minWidth: 0 }}
      className={cn(
        "relative flex h-7 items-center justify-center border font-mono text-xs sm:h-10 sm:text-sm",
        shapeClass(shape),
        hot ? cn(hotCls, "transition-none") : cn(resting, "transition-colors duration-150"),
        def.variant === "modifier" && "text-[8px] uppercase tracking-[0.12em] sm:text-[10px] sm:tracking-[0.14em]",
      )}
    >
      {showShiftLabel && def.shiftLabel && def.variant !== "modifier" && (
        <span
          className={cn(
            "pointer-events-none absolute top-0.5 left-1 text-[7px] tabular-nums sm:left-1.5 sm:text-[9px]",
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
