"use client";

import { useState } from "react";
import {
  HOME_ROW_PEGS,
  type KeyboardSettings,
  useKeyboardSettings,
} from "@/lib/keyboard-settings";
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
  className?: string;
};

export function Keyboard({
  layout = "qwerty",
  showLayoutPicker = false,
  forcedPressed,
  settingsOverride,
  className,
}: KeyboardProps) {
  const [active, setActive] = useState<LayoutId>(layout);
  const { pressed, shift, caps } = usePressedKeys();
  const { settings } = useKeyboardSettings();
  const effective = { ...settings, ...settingsOverride };
  const upper = shift !== caps;
  const rows = LAYOUTS[active].rows;

  // Compact mode drops modifier-style keys (Tab, Caps, Shift, Ctrl,
  // Alt, Meta, Backspace, Enter) plus Space, then centres each row
  // proportionally to its remaining unit count. Result is an
  // upside-down pyramid: 13 → 12 → 11 → 10 keys per row, each row
  // narrower than the one above and centred under the parent.
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

  const isHot = (code: string) =>
    pressed.has(code) ||
    (forcedPressed?.has(code) ?? false) ||
    (effective.highlightHomeRow && HOME_ROW_PEGS.has(code));

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-col gap-2",
        className,
      )}
      role="img"
      aria-label={`virtual keyboard, ${LAYOUTS[active].name} layout`}
    >
      {showLayoutPicker && (
        <LayoutPicker active={active} onChange={setActive} />
      )}
      <div className="flex flex-col gap-1">
        {rows.map((row, i) => {
          const visible = effective.compact
            ? row.filter((k) => !isCompactHidden(k))
            : row;
          if (visible.length === 0) return null;
          const rowUnits = visible.reduce((s, k) => s + (k.units ?? 1), 0);
          const rowStyle: React.CSSProperties | undefined = effective.compact
            ? {
                // Width proportional to the widest row so each row
                // contracts toward the centre as it loses keys —
                // the upside-down pyramid shape.
                width: `${(rowUnits / widestRowUnits) * 100}%`,
                marginInline: "auto",
              }
            : undefined;
          return (
            <div
              key={i}
              className={cn(
                "flex gap-1",
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
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
