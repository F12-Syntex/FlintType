"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type KeyDef,
  type LayoutId,
  LAYOUTS,
} from "./keyboard-layouts";

export type KeyboardProps = {
  /** Initial layout. Defaults to qwerty. The user can switch via the
   *  selector on the panel; nothing else in the app needs to change. */
  layout?: LayoutId;
  /** Hide the layout selector strip if the host page already exposes one. */
  showLayoutPicker?: boolean;
  className?: string;
};

export function Keyboard({
  layout = "qwerty",
  showLayoutPicker = true,
  className,
}: KeyboardProps) {
  const [active, setActive] = useState<LayoutId>(layout);
  const [pressed, setPressed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);

  useEffect(() => {
    const press = (code: string, on: boolean) =>
      setPressed((prev) => {
        const next = new Set(prev);
        if (on) next.add(code);
        else next.delete(code);
        return next;
      });
    const onDown = (e: KeyboardEvent) => {
      press(e.code, true);
      if (e.key === "Shift") setShift(true);
      if (typeof e.getModifierState === "function") {
        setCaps(e.getModifierState("CapsLock"));
      }
    };
    const onUp = (e: KeyboardEvent) => {
      press(e.code, false);
      if (e.key === "Shift") setShift(false);
    };
    const onBlur = () => setPressed(new Set());
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const upper = shift !== caps;
  const rows = LAYOUTS[active].rows;

  return (
    <div
      className={cn(
        // Panel: light, modern surface — soft tint off the page, hairline
        // border, no heavy shadow. Hex so Tailwind doesn't trip on
        // arbitrary HSL parsing.
        "mx-auto flex w-full max-w-2xl flex-col gap-2 rounded-xl border p-3",
        "border-black/8 bg-[#EFE9DB]",
        "dark:border-white/8 dark:bg-[#1B1A17]",
        className,
      )}
      role="img"
      aria-label={`virtual keyboard, ${LAYOUTS[active].name} layout`}
    >
      {showLayoutPicker && (
        <LayoutPicker active={active} onChange={setActive} />
      )}
      <div className="flex flex-col gap-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex w-full gap-1.5">
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
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function LayoutPicker({
  active,
  onChange,
}: {
  active: LayoutId;
  onChange: (id: LayoutId) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      {(Object.keys(LAYOUTS) as LayoutId[]).map((id) => (
        <Button
          key={id}
          type="button"
          tabIndex={-1}
          size="xs"
          variant={id === active ? "default" : "ghost"}
          onClick={() => onChange(id)}
          className="font-mono text-[10px] uppercase tracking-[0.16em]"
        >
          {LAYOUTS[id].name}
        </Button>
      ))}
    </div>
  );
}

function Key({
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
    <Button
      type="button"
      tabIndex={-1}
      size="sm"
      variant={hot ? "default" : "outline"}
      style={{ flex: `${units} 1 0`, minWidth: 0 }}
      aria-pressed={hot}
      className={cn(
        // Flat, modern keycap — no 3D shadow. Hairline border + flat fill,
        // both surfaces explicit so the panel tint never bleeds through.
        "relative h-9 px-0 font-mono text-sm transition-colors sm:h-10",
        "border-black/8 bg-white text-zinc-800 shadow-none hover:bg-white",
        "dark:border-white/8 dark:bg-[#2A2825] dark:text-zinc-100 dark:hover:bg-[#2A2825]",
        def.variant === "modifier" &&
          "text-[10px] uppercase tracking-[0.14em]",
        hot &&
          "border-primary bg-primary text-primary-foreground hover:bg-primary dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary",
      )}
    >
      {def.shiftLabel && def.variant !== "modifier" && (
        <span
          className={cn(
            "pointer-events-none absolute top-0.5 left-1.5 text-[9px] tabular-nums opacity-50",
            hot && "opacity-80",
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
    </Button>
  );
}
