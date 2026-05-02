"use client";

import { useState } from "react";
import {
  HOME_ROW_PEGS,
  type KeyboardSettings,
  isLetterCode,
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

  // Compact mode strips every row down to its letter keys; rows with no
  // letters (number row, function row) drop out entirely.
  const renderRows = effective.compact
    ? rows
        .map((row) => row.filter((k) => isLetterCode(k.code)))
        .filter((row) => row.length > 0)
    : rows;

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
        {renderRows.map((row, i) => (
          <div key={i} className="flex w-full gap-1">
            {row.map((k) => (
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
        ))}
      </div>
    </div>
  );
}
