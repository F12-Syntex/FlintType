"use client";

import type { PopoverContentProps } from "@radix-ui/react-popover";
import {
  type HexColor,
  hexToHsva,
  type HslaColor,
  hslaToHsva,
  type HsvaColor,
  hsvaToHex,
  hsvaToHsla,
  hsvaToHslString,
  hsvaToRgba,
  type RgbaColor,
  rgbaToHsva,
} from "@uiw/color-convert";
import Hue from "@uiw/react-color-hue";
import Saturation from "@uiw/react-color-saturation";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function getColorAsHsva(
  color: `#${string}` | HsvaColor | HslaColor | RgbaColor,
): HsvaColor {
  if (typeof color === "string") return hexToHsva(color);
  if ("h" in color && "s" in color && "v" in color) return color;
  if ("r" in color) return rgbaToHsva(color);
  return hslaToHsva(color);
}

export type ColorPickerValue = {
  hex: string;
  hsl: HslaColor;
  rgb: RgbaColor;
};

export type ColorPickerProps = {
  value?: `#${string}` | HsvaColor | HslaColor | RgbaColor;
  type?: "hsl" | "rgb" | "hex";
  swatches?: HexColor[];
  hideContrastRatio?: boolean;
  hideDefaultSwatches?: boolean;
  className?: string;
  onValueChange?: (value: ColorPickerValue) => void;
} & PopoverContentProps;

export function ColorPicker({
  value,
  children,
  type = "hex",
  swatches = [],
  hideContrastRatio,
  hideDefaultSwatches,
  onValueChange,
  className,
  ...props
}: ColorPickerProps) {
  const [colorType, setColorType] = React.useState(type);
  const [colorHsv, setColorHsv] = React.useState<HsvaColor>(
    value ? getColorAsHsva(value) : { h: 0, s: 0, v: 0, a: 1 },
  );

  const handleValueChange = (color: HsvaColor) => {
    onValueChange?.({
      hex: hsvaToHex(color),
      hsl: hsvaToHsla(color),
      rgb: hsvaToRgba(color),
    });
    setColorHsv(color);
  };

  return (
    <Popover {...props}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className={cn("w-[350px] p-0", className)}
        {...props}
        style={
          {
            "--selected-color": hsvaToHslString(colorHsv),
          } as React.CSSProperties
        }
      >
        <div className="space-y-2 p-4">
          <Saturation
            hsva={colorHsv}
            onChange={handleValueChange}
            style={{
              width: "100%",
              height: "auto",
              aspectRatio: "4/2",
              borderRadius: "0.3rem",
            }}
            className="border border-border"
          />
          <Hue
            hue={colorHsv.h}
            onChange={(newHue) => handleValueChange({ ...colorHsv, ...newHue })}
            className="[&>div:first-child]:overflow-hidden [&>div:first-child]:!rounded"
            style={{
              width: "100%",
              height: "0.9rem",
              borderRadius: "0.3rem",
            }}
          />

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="shrink-0 justify-between uppercase"
                >
                  {colorType}
                  <ChevronDownIcon
                    className="-me-1 ms-2 opacity-60"
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuCheckboxItem
                  checked={colorType === "hex"}
                  onCheckedChange={() => setColorType("hex")}
                >
                  HEX
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={colorType === "hsl"}
                  onCheckedChange={() => setColorType("hsl")}
                >
                  HSL
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={colorType === "rgb"}
                  onCheckedChange={() => setColorType("rgb")}
                >
                  RGB
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex grow">
              {colorType === "hex" && (
                <Input
                  className="flex"
                  value={hsvaToHex(colorHsv)}
                  onChange={(e) => {
                    try {
                      handleValueChange(hexToHsva(e.target.value));
                    } catch {
                      /* ignore mid-typing invalid hex */
                    }
                  }}
                />
              )}
              {colorType === "hsl" && (
                <Input
                  className="flex"
                  readOnly
                  value={hsvaToHslString(colorHsv)}
                />
              )}
              {colorType === "rgb" && (
                <Input
                  className="flex"
                  readOnly
                  value={(() => {
                    const r = hsvaToRgba(colorHsv);
                    return `rgba(${r.r}, ${r.g}, ${r.b}, ${r.a.toFixed(2)})`;
                  })()}
                />
              )}
            </div>
          </div>
          {!hideDefaultSwatches && (
            <>
              <Separator />
              <div className="flex flex-wrap justify-start gap-2">
                {[
                  "#F8371A",
                  "#F97C1B",
                  "#FAC81C",
                  "#3FD0B6",
                  "#2CADF6",
                  "#6462FC",
                  ...swatches,
                ]
                  .sort((a, b) => hexToHsva(a).h - hexToHsva(b).h)
                  .map((color) => (
                    <button
                      type="button"
                      key={`${color}-swatch`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleValueChange(hexToHsva(color))}
                      aria-label={`Set color to ${color}`}
                      className="size-5 cursor-pointer rounded ring-2 ring-transparent ring-offset-1 ring-offset-background transition-all duration-100 hover:ring-foreground/40"
                    />
                  ))}
              </div>
            </>
          )}
          {!hideContrastRatio && (
            <>
              <Separator />
              <ContrastRatio color={colorHsv} />
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ContrastRatio({ color }: { color: HsvaColor }) {
  const [ratio, setRatio] = React.useState(0);

  React.useEffect(() => {
    const rgb = hsvaToRgba(color);
    const toSRGB = (c: number) => {
      const channel = c / 255;
      return channel <= 0.03928
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    };
    const luminance =
      0.2126 * toSRGB(rgb.r) +
      0.7152 * toSRGB(rgb.g) +
      0.0722 * toSRGB(rgb.b);
    setRatio(Number(((luminance + 0.05) / 0.05).toFixed(2)));
  }, [color]);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded bg-[var(--selected-color)]">
          <span className="font-medium text-foreground">A</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Contrast</span>
          <span className="text-sm tabular-nums">{ratio}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Badge variant={ratio > 4.5 ? "default" : "outline"} className="gap-1">
          {ratio > 4.5 ? <CheckIcon size={12} /> : <XIcon size={12} />} AA
        </Badge>
        <Badge variant={ratio > 7 ? "default" : "outline"} className="gap-1">
          {ratio > 7 ? <CheckIcon size={12} /> : <XIcon size={12} />} AAA
        </Badge>
      </div>
    </div>
  );
}
