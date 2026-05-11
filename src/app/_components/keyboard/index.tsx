"use client";

import { useEffect, useState } from "react";
import {
  HOME_ROW_PEGS,
  type KeyboardSettings,
  useKeyboardSettings,
} from "@/lib/keyboard-settings";
import type {
  Keymap,
  KeymapLegend,
  KeymapTopRow,
} from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { Key } from "./key";
import { LayoutPicker } from "./layout-picker";
import { LAYOUTS, type LayoutId } from "./layouts";
import { usePressedKeys } from "./use-pressed-keys";

export type KeyboardProps = {
  /** Initial layout. The user can switch via the picker (when shown);
   *  nothing else in the app needs to change. */
  layout?: LayoutId;
  /** Render the QWERTY/Dvorak/Colemak picker above the keys. Off by
   *  default — the picker is implemented and ready to expose, currently
   *  hidden until layout switching ships as a real setting. */
  showLayoutPicker?: boolean;
  /** Demo / preview surfaces force a few keys into the lit state so
   *  the design's hot palette is visible without anyone typing. The
   *  union of these and any actually-pressed keys is highlighted. */
  forcedPressed?: ReadonlySet<string>;
  /** Override one or more saved settings — used by the appearance
   *  preview to render variants without touching localStorage. */
  settingsOverride?: Partial<KeyboardSettings>;
  /** Appearance: how the keymap reacts during a test.
   *   - "static": render the layout but never highlight a press
   *   - "react":  highlight whatever was just pressed (default)
   *   - "next":   highlight the next-expected key (uses `nextKey`)
   *   - "off":    caller should not render <Keyboard/> at all */
  mode?: Keymap;
  /** Legend rendering for letter keys. */
  legend?: KeymapLegend;
  /** Whether to render the top numeric row. */
  topRow?: KeymapTopRow;
  /** CSS scale applied to the entire widget (1.0 = no change). */
  scale?: number;
  /** When `mode === "next"`, the key code to highlight next. */
  nextKey?: string;
  className?: string;
};

export function Keyboard({
  layout = "qwerty",
  showLayoutPicker = false,
  forcedPressed,
  settingsOverride,
  mode = "react",
  legend = "dynamic",
  topRow = "layout",
  scale = 1,
  nextKey,
  className,
}: KeyboardProps) {
  const [active, setActive] = useState<LayoutId>(layout);
  // Keep the internal layout in step with the prop. Without this the
  // Keyboard would lock onto whatever layout it mounted with and ignore
  // later changes from the appearance settings.
  useEffect(() => {
    setActive(layout);
  }, [layout]);
  const { pressed, shift, caps } = usePressedKeys();
  const { settings } = useKeyboardSettings();
  const effective = { ...settings, ...settingsOverride };
  const upper = shift !== caps;
  const allRows = LAYOUTS[active].rows;
  // First row in `LAYOUTS` is the number row. "never" drops it; the
  // others keep it.
  const rows = topRow === "never" ? allRows.slice(1) : allRows;

  const isCompactHidden = (def: { code: string; variant?: string }) =>
    def.variant === "modifier" || def.code === "Space";

  const widestRowUnits = rows.reduce(
    (max, row) =>
      Math.max(
        max,
        row.reduce((sum, k) => sum + (k.units ?? 1), 0),
      ),
    1,
  );

  const isHot = (code: string) => {
    if (mode === "static") return effective.highlightHomeRow && HOME_ROW_PEGS.has(code);
    if (mode === "next")
      return code === nextKey || (effective.highlightHomeRow && HOME_ROW_PEGS.has(code));
    return (
      pressed.has(code) ||
      (forcedPressed?.has(code) ?? false) ||
      (effective.highlightHomeRow && HOME_ROW_PEGS.has(code))
    );
  };

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-col gap-2",
        className,
      )}
      role="img"
      aria-label={`virtual keyboard, ${LAYOUTS[active].name} layout`}
      style={
        scale !== 1
          ? { transform: `scale(${scale})`, transformOrigin: "top center" }
          : undefined
      }
    >
      {showLayoutPicker && (
        <LayoutPicker active={active} onChange={setActive} />
      )}
      <div className="flex flex-col gap-0.5 sm:gap-1">
        {rows.map((row, i) => {
          const visible = effective.compact
            ? row.filter((k) => !isCompactHidden(k))
            : row;
          if (visible.length === 0) return null;
          const rowUnits = visible.reduce((s, k) => s + (k.units ?? 1), 0);
          const rowStyle: React.CSSProperties | undefined = effective.compact
            ? {
                width: `${(rowUnits / widestRowUnits) * 100}%`,
                marginInline: "auto",
              }
            : undefined;
          return (
            <div
              key={i}
              className={cn(
                "flex gap-0.5 sm:gap-1",
                !effective.compact && "w-full",
              )}
              style={rowStyle}
            >
              {visible.map((k) => (
                <Key
                  key={k.code}
                  def={k}
                  pressed={isHot(k.code)}
                  lit={
                    (k.code === "CapsLock" && caps) ||
                    (k.code.startsWith("Shift") && shift)
                  }
                  upper={upper}
                  design={effective.design}
                  shape={effective.shape}
                  showShiftLabel={effective.showShiftLabels}
                  legend={legend}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
