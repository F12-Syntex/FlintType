"use client";

import { Chip, ChipGroup } from "../chip";
import { LabelWithDesc } from "../controls";
import { SettingsRow } from "../row";
import {
  activeRadiusPreset,
  RADIUS_PRESETS,
  radiusWrite,
  shownRadiusRem,
} from "./radius-presets";

/** Corner radius of cards and panels across the app (`--radius`).
 *  Measured against the active palette (radius-presets.ts): with no
 *  override the page shows the palette's own radius, and a pick clears
 *  the override only when the palette already gives that radius. */
export function RadiusRow({
  override,
  paletteRem,
  baselineOverride,
  onSet,
  onClear,
}: {
  /** The stored `--radius` override, if any. */
  override: string | undefined;
  /** The radius the active palette paints with no override. */
  paletteRem: number;
  /** The `--radius` the active palette's own presets write, if any. */
  baselineOverride: string | undefined;
  onSet: (value: string) => void;
  onClear: () => void;
}) {
  const matched = activeRadiusPreset(shownRadiusRem(override, paletteRem));

  function pick(rem: number) {
    const write = radiusWrite(rem, { paletteRem, baselineOverride });
    if (write.kind === "clear") onClear();
    else onSet(write.value);
  }

  return (
    <SettingsRow
      label={
        <LabelWithDesc
          title="Corners"
          desc="How round cards and panels are."
        />
      }
      control={
        <ChipGroup>
          {RADIUS_PRESETS.map((p) => {
            const isActive = matched === p.id;
            return (
              <Chip
                key={p.id}
                label={p.label}
                active={isActive}
                onClick={() => pick(p.rem)}
                preview={
                  // Top-left corner only — exaggerates the curvature so
                  // even Subtle vs Soft reads at a glance.
                  <span
                    aria-hidden
                    className="block h-5 w-5 border-t-[3px] border-l-[3px]"
                    style={{
                      borderTopLeftRadius: `${p.rem}rem`,
                      borderColor: isActive ? "var(--primary)" : "currentColor",
                    }}
                  />
                }
              />
            );
          })}
        </ChipGroup>
      }
    />
  );
}
