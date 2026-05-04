"use client";

import { hexToHsva, type HsvaColor, hsvaToHex } from "@uiw/color-convert";
import Hue from "@uiw/react-color-hue";
import Saturation from "@uiw/react-color-saturation";
import { ArrowLeft, Pipette } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Curated palette — five rows of eight Tailwind-style swatches. The
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

/** Custom-wheel view shown inside the same popover after the user
 *  taps Custom. Inlined Saturation + Hue + hex input — no nested
 *  popover, with a back arrow that returns to the swatch grid. */
function CustomWheel({
  value,
  onChange,
  onBack,
}: {
  value: string | undefined;
  onChange: (hex: string) => void;
  onBack: () => void;
}) {
  const initial: HsvaColor =
    value && /^#[0-9a-f]{6}$/i.test(value)
      ? hexToHsva(value)
      : { h: 0, s: 0, v: 0, a: 1 };
  const [hsv, setHsv] = useState<HsvaColor>(initial);
  const [hexDraft, setHexDraft] = useState(hsvaToHex(initial));

  function update(next: HsvaColor) {
    setHsv(next);
    const hex = hsvaToHex(next);
    setHexDraft(hex);
    onChange(hex);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onBack}
          aria-label="Back to presets"
        >
          <ArrowLeft size={14} />
        </Button>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Custom
        </span>
      </div>
      <Saturation
        hsva={hsv}
        onChange={update}
        style={{
          width: "100%",
          height: "auto",
          aspectRatio: "4/2",
          borderRadius: "0.3rem",
        }}
        className="border border-border"
      />
      <Hue
        hue={hsv.h}
        onChange={(h) => update({ ...hsv, ...h })}
        className="[&>div:first-child]:overflow-hidden [&>div:first-child]:!rounded"
        style={{ width: "100%", height: "0.9rem", borderRadius: "0.3rem" }}
      />
      <Input
        value={hexDraft}
        onChange={(e) => {
          setHexDraft(e.target.value);
          try {
            const next = hexToHsva(e.target.value);
            setHsv(next);
            onChange(e.target.value);
          } catch {
            /* ignore mid-typing invalid hex */
          }
        }}
        className="h-8 font-mono text-xs"
      />
    </div>
  );
}

/** Color picker that leads with a curated swatch grid. Most users land
 *  on a chosen color in one tap; the "Custom" button swaps the popover
 *  content in-place to a colour wheel with a back arrow — no second
 *  nested popover. */
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
  const [view, setView] = useState<"presets" | "custom">("presets");

  const normalised = value?.toLowerCase();

  function pick(hex: string) {
    onChange(hex);
    setOpen(false);
  }

  // Reset view back to presets each time the popover closes so the
  // next open-fresh-from-trigger is always the swatch grid.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setView("presets");
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-3">
        {view === "presets" ? (
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
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-[10px] uppercase tracking-widest"
                onClick={() => setView("custom")}
              >
                <Pipette size={12} />
                Custom
              </Button>
            </div>
          </div>
        ) : (
          <CustomWheel
            value={value}
            onChange={onChange}
            onBack={() => setView("presets")}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
