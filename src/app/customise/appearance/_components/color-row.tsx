"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ColorPresetPicker } from "@/components/ui/color-preset-picker";

/** Canonical settings-page color row. UI law §12 declares colour
 *  pickers as Card-style rows (label + desc + swatch picker) — every
 *  appearance colour control routes through this component so they
 *  read identically across themes, mode, live stats, etc.
 *
 *  Mobile: tight key/value row — label on the left, swatch button on
 *  the right.
 *  Desktop (sm:+): the Card layout with title, description, and the
 *  full hex+chevron picker button. */
export function ColorRow({
  label,
  desc,
  /** CSS color value (or var) for the live preview swatch. Falls back
   *  to the picked hex when no override is set yet. */
  swatchColor,
  /** The user's saved hex (`#rrggbb`) or undefined for "default". */
  value,
  onChange,
  onClear,
}: {
  label: string;
  desc: string;
  swatchColor: string;
  value: string | undefined;
  onChange: (hex: string) => void;
  onClear?: () => void;
}) {
  const customised = value !== undefined && value !== "";

  return (
    <>
      {/* Mobile only — compact key/value row. */}
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-border bg-muted px-3 py-2 sm:hidden">
        <span className="truncate text-sm font-medium text-foreground">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {customised && onClear ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 px-2 text-xs"
            >
              Reset
            </Button>
          ) : null}
          <ColorPresetPicker value={value} onChange={onChange}>
            <button
              type="button"
              aria-label={`Pick ${label}`}
              className="inline-block h-7 w-7 shrink-0 rounded-sm border border-border shadow-inner ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ backgroundColor: swatchColor }}
            />
          </ColorPresetPicker>
        </div>
      </div>

      {/* Desktop only — Card layout per ui-law §12. */}
      <Card className="hidden rounded-md border-border bg-muted shadow-sm ring-border min-h-16 sm:block">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{label}</CardTitle>
          <CardDescription>{desc}</CardDescription>
          <CardAction>
            <div className="flex items-center gap-3">
              <ColorPresetPicker value={value} onChange={onChange}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  aria-label={`Pick ${label}`}
                >
                  <span
                    className="inline-block h-5 w-5 rounded-sm border border-border shadow-inner"
                    style={{ backgroundColor: swatchColor }}
                  />
                  {value ?? "Default"}
                  <ChevronDown size={14} />
                </Button>
              </ColorPresetPicker>
              {customised && onClear ? (
                <Button variant="ghost" size="sm" onClick={onClear}>
                  Reset
                </Button>
              ) : null}
            </div>
          </CardAction>
        </CardHeader>
      </Card>
    </>
  );
}
