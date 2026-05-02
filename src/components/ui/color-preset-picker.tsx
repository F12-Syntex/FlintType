"use client";

import { Pipette } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  ColorPicker,
  type ColorPickerValue,
} from "@/components/ui/color-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ColorPicker's prop type doesn't include open/onOpenChange even though
// the underlying Popover supports them — quietly extend the call site.
const ControlledColorPicker = ColorPicker as unknown as React.FC<
  React.ComponentProps<typeof ColorPicker> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>;

/** Curated palette — six rows of eight Tailwind-style swatches. The
 *  goal is "good defaults for 95% of picks" so most users never have to
 *  open the colour wheel. Order goes neutrals → warm → cool. */
const PRESET_SWATCHES: readonly string[] = [
  // Neutrals
  "#ffffff",
  "#f5f5f5",
  "#d4d4d4",
  "#a3a3a3",
  "#737373",
  "#404040",
  "#171717",
  "#000000",
  // Reds / oranges
  "#fecaca",
  "#fca5a5",
  "#ef4444",
  "#dc2626",
  "#fed7aa",
  "#fb923c",
  "#f97316",
  "#c2410c",
  // Yellows / greens
  "#fde68a",
  "#facc15",
  "#bef264",
  "#84cc16",
  "#86efac",
  "#22c55e",
  "#15803d",
  "#064e3b",
  // Teals / blues
  "#5eead4",
  "#14b8a6",
  "#7dd3fc",
  "#0ea5e9",
  "#93c5fd",
  "#3b82f6",
  "#1d4ed8",
  "#1e3a8a",
  // Indigo / purple / pink
  "#a5b4fc",
  "#6366f1",
  "#c4b5fd",
  "#8b5cf6",
  "#f0abfc",
  "#d946ef",
  "#fda4af",
  "#ec4899",
];

function Swatch({
  hex,
  active,
  onClick,
}: {
  hex: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Pick ${hex}`}
      aria-pressed={active}
      className={cn(
        "relative h-7 w-7 rounded-md border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary ring-2 ring-primary/40"
          : "border-foreground/15",
      )}
      style={{ backgroundColor: hex }}
    />
  );
}

/** Color picker that leads with a curated swatch grid. Most users land
 *  on a chosen color in one tap; the "Custom" footer expands the full
 *  saturation + hue wheel for the long tail. */
export function ColorPresetPicker({
  value,
  onChange,
  children,
}: {
  /** Current hex (`#rrggbb`) or `undefined` for the default. */
  value: string | undefined;
  onChange: (hex: string) => void;
  /** The trigger element rendered inside `<PopoverTrigger asChild>`. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [showWheel, setShowWheel] = useState(false);

  const normalised = value?.toLowerCase();

  function pick(hex: string) {
    onChange(hex);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-3">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-8 gap-1.5">
            {PRESET_SWATCHES.map((hex) => (
              <Swatch
                key={hex}
                hex={hex}
                active={normalised === hex.toLowerCase()}
                onClick={() => pick(hex)}
              />
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {value ? value.toUpperCase() : "Default"}
            </span>
            <ControlledColorPicker
              value={
                value && /^#[0-9a-f]{6}$/i.test(value)
                  ? (value as `#${string}`)
                  : "#888888"
              }
              onValueChange={(v: ColorPickerValue) => onChange(v.hex)}
              hideContrastRatio
              open={showWheel}
              onOpenChange={setShowWheel}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-[10px] uppercase tracking-widest"
              >
                <Pipette size={12} />
                Custom
              </Button>
            </ControlledColorPicker>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
