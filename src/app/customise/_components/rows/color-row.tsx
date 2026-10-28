"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorPresetPicker } from "@/components/ui/color-preset-picker";
import { LabelWithDesc } from "../controls";
import { SettingsRow } from "../row";

/** The one colour-picker row (ui-law §12.2). Rendered through
 *  `<SettingsRow inline>` so its label lines up with every other row:
 *  label + one line on the left; the swatch trigger (with the hex from
 *  `sm` up) and an inline Reset while overridden on the right. */
export function ColorRow({
  label,
  desc,
  /** CSS colour (or var) painted in the swatch — the live value. */
  swatchColor,
  /** The user's saved hex (`#rrggbb`), or undefined for "default". */
  value,
  onChange,
  onClear,
}: {
  label: string;
  desc?: string;
  swatchColor: string;
  value: string | undefined;
  onChange: (hex: string) => void;
  onClear?: () => void;
}) {
  const customised = value !== undefined && value !== "";

  return (
    <SettingsRow
      inline
      label={<LabelWithDesc title={label} desc={desc} />}
      control={
        <div className="flex items-center gap-1.5">
          {customised && onClear ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={onClear}
              className="h-9 text-muted-foreground sm:h-7"
              aria-label={`Reset ${label}`}
            >
              Reset
            </Button>
          ) : null}
          <ColorPresetPicker value={value} onChange={onChange}>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 px-2 sm:h-8 sm:pr-2.5"
              aria-label={`${label}: ${value ?? "default"}. Change`}
            >
              <span
                aria-hidden
                className="inline-block size-5 rounded-full border border-border shadow-inner"
                style={{ backgroundColor: swatchColor }}
              />
              <span
                className={
                  value
                    ? "hidden font-mono text-xs tabular-nums sm:inline"
                    : "hidden text-xs text-muted-foreground sm:inline"
                }
              >
                {value ? value.toUpperCase() : "Default"}
              </span>
              <ChevronDown size={14} aria-hidden />
            </Button>
          </ColorPresetPicker>
        </div>
      }
    />
  );
}
