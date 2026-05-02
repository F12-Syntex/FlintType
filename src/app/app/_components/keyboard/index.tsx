"use client";

import { useState } from "react";
import { useKeyboardSettings } from "@/lib/keyboard-settings";
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
  className?: string;
};

export function Keyboard({
  layout = "qwerty",
  showLayoutPicker = false,
  className,
}: KeyboardProps) {
  const [active, setActive] = useState<LayoutId>(layout);
  const { pressed, shift, caps } = usePressedKeys();
  const { settings } = useKeyboardSettings();
  const upper = shift !== caps;
  const rows = LAYOUTS[active].rows;

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
                pressed={pressed.has(k.code)}
                lit={
                  (k.code === "CapsLock" && caps) ||
                  (k.code.startsWith("Shift") && shift)
                }
                upper={upper}
                design={settings.design}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
