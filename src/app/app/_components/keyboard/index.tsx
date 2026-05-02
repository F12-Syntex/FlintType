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

  // Compact mode hides modifier-style keys (Tab, Caps, Shift, Ctrl,
  // Alt, Meta, Backspace, Enter) plus Space, but keeps their slots so
  // every other key stays exactly where it was. Predicate lives here
  // so it stays close to the layout shape it's gating on.
  const isHidden = (def: { code: string; variant?: string }) =>
    effective.compact &&
    (def.variant === "modifier" || def.code === "Space");

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
        {rows.map((row, i) => (
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
                hidden={isHidden(k)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
