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
  /** Demo / preview surfaces force a few keys into the lit state so
   *  the design's hot palette is visible without anyone typing. The
   *  union of these and any actually-pressed keys is highlighted. */
  forcedPressed?: ReadonlySet<string>;
  /** Override the active design (preview chips). Defaults to the
   *  user-saved keyboard design. */
  design?: KeyboardDesignOverride;
  className?: string;
};

type KeyboardDesignOverride = ReturnType<
  typeof useKeyboardSettings
>["settings"]["design"];

export function Keyboard({
  layout = "qwerty",
  showLayoutPicker = false,
  forcedPressed,
  design: designOverride,
  className,
}: KeyboardProps) {
  const [active, setActive] = useState<LayoutId>(layout);
  const { pressed, shift, caps } = usePressedKeys();
  const { settings } = useKeyboardSettings();
  const design = designOverride ?? settings.design;
  const upper = shift !== caps;
  const rows = LAYOUTS[active].rows;
  const isHot = (code: string) =>
    pressed.has(code) || (forcedPressed?.has(code) ?? false);

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
                design={design}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
