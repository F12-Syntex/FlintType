"use client";

import {
  ArrowBigUp,
  ChevronUp,
  Command,
  CornerDownLeft,
  Delete,
  Menu,
  Option,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A single physical key. `code` matches KeyboardEvent.code so we don't
 *  conflate left/right modifiers and stay layout-independent (Caps swaps
 *  to Ctrl, Dvorak, etc. don't break the highlight). */
type KeyDef = {
  code: string;
  /** Glyph (text). Used unless `icon` is set. */
  label?: string;
  /** Shifted glyph for symbol keys (1 → !). */
  shiftLabel?: string;
  /** Lucide icon for modifier glyphs that read better as symbols. */
  icon?: LucideIcon;
  /** Width in keyboard units. 1u = standard letter key. */
  units?: number;
  /** Modifier keys render with smaller, uppercase text. */
  variant?: "letter" | "modifier";
};

/** Standard ANSI 60% layout. Pure data — no per-key positioning. */
const ROWS: readonly (readonly KeyDef[])[] = [
  [
    { code: "Backquote", label: "`", shiftLabel: "~" },
    { code: "Digit1", label: "1", shiftLabel: "!" },
    { code: "Digit2", label: "2", shiftLabel: "@" },
    { code: "Digit3", label: "3", shiftLabel: "#" },
    { code: "Digit4", label: "4", shiftLabel: "$" },
    { code: "Digit5", label: "5", shiftLabel: "%" },
    { code: "Digit6", label: "6", shiftLabel: "^" },
    { code: "Digit7", label: "7", shiftLabel: "&" },
    { code: "Digit8", label: "8", shiftLabel: "*" },
    { code: "Digit9", label: "9", shiftLabel: "(" },
    { code: "Digit0", label: "0", shiftLabel: ")" },
    { code: "Minus", label: "-", shiftLabel: "_" },
    { code: "Equal", label: "=", shiftLabel: "+" },
    { code: "Backspace", icon: Delete, units: 2, variant: "modifier" },
  ],
  [
    { code: "Tab", label: "Tab", units: 1.5, variant: "modifier" },
    { code: "KeyQ", label: "q" },
    { code: "KeyW", label: "w" },
    { code: "KeyE", label: "e" },
    { code: "KeyR", label: "r" },
    { code: "KeyT", label: "t" },
    { code: "KeyY", label: "y" },
    { code: "KeyU", label: "u" },
    { code: "KeyI", label: "i" },
    { code: "KeyO", label: "o" },
    { code: "KeyP", label: "p" },
    { code: "BracketLeft", label: "[", shiftLabel: "{" },
    { code: "BracketRight", label: "]", shiftLabel: "}" },
    { code: "Backslash", label: "\\", shiftLabel: "|", units: 1.5 },
  ],
  [
    { code: "CapsLock", label: "Caps", units: 1.75, variant: "modifier" },
    { code: "KeyA", label: "a" },
    { code: "KeyS", label: "s" },
    { code: "KeyD", label: "d" },
    { code: "KeyF", label: "f" },
    { code: "KeyG", label: "g" },
    { code: "KeyH", label: "h" },
    { code: "KeyJ", label: "j" },
    { code: "KeyK", label: "k" },
    { code: "KeyL", label: "l" },
    { code: "Semicolon", label: ";", shiftLabel: ":" },
    { code: "Quote", label: "'", shiftLabel: '"' },
    { code: "Enter", icon: CornerDownLeft, units: 2.25, variant: "modifier" },
  ],
  [
    {
      code: "ShiftLeft",
      icon: ArrowBigUp,
      units: 2.25,
      variant: "modifier",
    },
    { code: "KeyZ", label: "z" },
    { code: "KeyX", label: "x" },
    { code: "KeyC", label: "c" },
    { code: "KeyV", label: "v" },
    { code: "KeyB", label: "b" },
    { code: "KeyN", label: "n" },
    { code: "KeyM", label: "m" },
    { code: "Comma", label: ",", shiftLabel: "<" },
    { code: "Period", label: ".", shiftLabel: ">" },
    { code: "Slash", label: "/", shiftLabel: "?" },
    {
      code: "ShiftRight",
      icon: ArrowBigUp,
      units: 2.75,
      variant: "modifier",
    },
  ],
  [
    {
      code: "ControlLeft",
      icon: ChevronUp,
      units: 1.25,
      variant: "modifier",
    },
    { code: "MetaLeft", icon: Command, units: 1.25, variant: "modifier" },
    { code: "AltLeft", icon: Option, units: 1.25, variant: "modifier" },
    { code: "Space", label: "", units: 6.25 },
    { code: "AltRight", icon: Option, units: 1.25, variant: "modifier" },
    { code: "MetaRight", icon: Command, units: 1.25, variant: "modifier" },
    { code: "ContextMenu", icon: Menu, units: 1.25, variant: "modifier" },
    {
      code: "ControlRight",
      icon: ChevronUp,
      units: 1.25,
      variant: "modifier",
    },
  ],
];

export function Keyboard({ className }: { className?: string }) {
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

  return (
    <div
      className={cn(
        // Card surface — distinct from the warm page background.
        "mx-auto flex w-full max-w-2xl flex-col gap-1.5 rounded-lg border border-border bg-card p-2.5 shadow-sm",
        className,
      )}
      role="img"
      aria-label="virtual keyboard"
    >
      {ROWS.map((row, i) => (
        <div key={i} className="flex w-full gap-1.5">
          {row.map((k) => (
            <Key
              key={k.code}
              def={k}
              pressed={pressed.has(k.code)}
              active={
                (k.code === "CapsLock" && caps) ||
                (k.code.startsWith("Shift") && shift)
              }
              upper={upper}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Key({
  def,
  pressed,
  active,
  upper,
}: {
  def: KeyDef;
  pressed: boolean;
  active: boolean;
  upper: boolean;
}) {
  const units = def.units ?? 1;
  const isLetter = !def.variant && def.label && /^[a-z]$/.test(def.label);
  const main =
    isLetter && upper && def.label ? def.label.toUpperCase() : def.label ?? "";
  const showShiftGlyph = !!def.shiftLabel && def.variant !== "modifier";
  const Icon = def.icon;
  const lit = pressed || active;

  return (
    <Button
      type="button"
      tabIndex={-1}
      variant="outline"
      size="sm"
      style={{ flex: `${units} 1 0`, minWidth: 0 }}
      className={cn(
        // Keys sit on the white card panel — use muted so they're visibly
        // distinct from the panel surface. Border + bottom shadow give the
        // physical-keycap look in both themes.
        "relative h-9 overflow-hidden border-border bg-muted px-0 font-mono text-sm text-foreground shadow-[inset_0_-2px_0_0_hsl(var(--border))] transition-all hover:bg-muted sm:h-10",
        def.variant === "modifier" &&
          "text-[10px] uppercase tracking-[0.14em]",
        lit &&
          "border-primary bg-primary text-primary-foreground shadow-[inset_0_-2px_0_0_hsl(var(--primary))] hover:bg-primary",
        pressed && "translate-y-[1px] shadow-none",
      )}
      aria-pressed={active || pressed}
    >
      {showShiftGlyph && (
        <span className="pointer-events-none absolute top-0.5 left-1.5 text-[9px] tabular-nums opacity-50">
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
