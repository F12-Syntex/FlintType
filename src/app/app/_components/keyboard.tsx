"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  type KeyDef,
  type LayoutId,
  LAYOUTS,
} from "./keyboard-layouts";

export type KeyboardProps = {
  layout?: LayoutId;
  showLayoutPicker?: boolean;
  className?: string;
};

export function Keyboard({
  layout = "qwerty",
  showLayoutPicker = false,
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
        "mx-auto flex w-full max-w-2xl flex-col gap-2 rounded-[10px] border p-3",
        "border-ft-line-soft bg-ft-paper",
        "dark:border-ft-line dark:bg-ft-ink",
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
      {(Object.keys(LAYOUTS) as LayoutId[]).map((id) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            tabIndex={-1}
            onClick={() => onChange(id)}
            className={cn(
              "border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
              isActive
                ? "border-ft-ink bg-ft-ink text-ft-paper dark:border-ft-paper dark:bg-ft-paper dark:text-ft-ink"
                : "border-transparent text-ft-dim hover:text-ft-ink dark:hover:text-ft-paper",
            )}
          >
            {LAYOUTS[id].name}
          </button>
        );
      })}
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
  lit: boolean;
  pressed: boolean;
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
      style={{ flex: `${units} 1 0`, minWidth: 0 }}
      className={cn(
        "relative flex h-9 items-center justify-center rounded-[6px] border font-mono text-sm transition-colors sm:h-10",
        hot
          ? "border-ft-ember bg-ft-ember text-ft-paper"
          : "border-ft-line-soft bg-white text-ft-ink dark:border-ft-line dark:bg-ft-ink-2 dark:text-ft-paper",
        def.variant === "modifier" && "text-[10px] uppercase tracking-[0.14em]",
      )}
    >
      {def.shiftLabel && def.variant !== "modifier" && (
        <span
          className={cn(
            "pointer-events-none absolute top-0.5 left-1.5 text-[9px] tabular-nums",
            hot ? "text-ft-paper/80" : "text-ft-dim",
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
