"use client";

import { hexToHsva, type HsvaColor, hsvaToHex } from "@uiw/color-convert";
import Hue from "@uiw/react-color-hue";
import Saturation from "@uiw/react-color-saturation";
import { ArrowLeft, Pipette } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/lib/use-is-mobile";
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
  mobile = false,
}: {
  hex: string;
  active: boolean;
  onClick: () => void;
  /** On mobile the swatch grid lives inside a fixed-height bottom sheet
   *  with much more horizontal real estate, so each cell can grow into
   *  a comfortable touch target. */
  mobile?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Pick ${hex}`}
      aria-pressed={active}
      className={cn(
        "relative aspect-square w-full rounded-full border transition-[transform,box-shadow] duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        mobile ? "min-h-10" : "h-7 w-7",
        active
          ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-popover"
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
  embedded = false,
}: {
  value: string | undefined;
  onChange: (hex: string) => void;
  onBack: () => void;
  /** When true, the back-arrow + "Custom" eyebrow header is suppressed
   *  because the surrounding chrome (e.g. <MobileSheet>) already shows
   *  it in its own header bar. */
  embedded?: boolean;
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
      {embedded ? null : (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            aria-label="Back to presets"
          >
            <ArrowLeft size={14} />
          </Button>
          <span className="text-sm font-medium text-foreground">
            Custom colour
          </span>
        </div>
      )}
      <Saturation
        hsva={hsv}
        onChange={update}
        style={{
          width: "100%",
          height: "auto",
          aspectRatio: "4/2",
          borderRadius: "var(--radius-lg)",
        }}
        className="overflow-hidden border border-border"
      />
      <Hue
        hue={hsv.h}
        onChange={(h) => update({ ...hsv, ...h })}
        className="[&>div:first-child]:overflow-hidden [&>div:first-child]:!rounded-full"
        style={{ width: "100%", height: "0.9rem", borderRadius: "9999px" }}
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
        aria-label="Hex colour"
        className="h-9 font-mono text-xs"
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
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"presets" | "custom">("presets");

  const normalised = value?.toLowerCase();

  function pick(hex: string) {
    onChange(hex);
    setOpen(false);
  }

  // Reset view back to presets each time the picker closes so the
  // next open-fresh-from-trigger is always the swatch grid.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setView("presets");
  }

  const presetGrid = (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-8 gap-2">
        {PRESET_SWATCHES.map((hex) => (
          <Swatch
            key={hex}
            hex={hex}
            active={normalised === hex.toLowerCase()}
            onClick={() => pick(hex)}
            mobile={isMobile}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {value ? (
            <>
              <span
                aria-hidden
                className="size-3.5 rounded-full border border-foreground/15"
                style={{ backgroundColor: value }}
              />
              <span className="font-mono text-foreground">{value.toUpperCase()}</span>
            </>
          ) : (
            "Default colour"
          )}
        </span>
        <Button variant="outline" size="sm" onClick={() => setView("custom")}>
          <Pipette size={14} />
          Custom
        </Button>
      </div>
    </div>
  );

  const wheel = (
    <CustomWheel
      value={value}
      onChange={onChange}
      onBack={() => setView("presets")}
      embedded={isMobile}
    />
  );

  if (isMobile) {
    return (
      <>
        <span onClick={() => setOpen(true)} className="contents">
          {children}
        </span>
        <MobileSheet
          open={open}
          onOpenChange={handleOpenChange}
          title={view === "custom" ? "Custom colour" : "Pick a colour"}
          leading={
            view === "custom" ? (
              <button
                type="button"
                aria-label="Back to presets"
                onClick={() => setView("presets")}
                className="inline-flex size-9 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ArrowLeft size={18} />
              </button>
            ) : undefined
          }
        >
          <div className="px-4 py-4">
            {view === "presets" ? presetGrid : wheel}
          </div>
        </MobileSheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-3">
        {view === "presets" ? presetGrid : wheel}
      </PopoverContent>
    </Popover>
  );
}
