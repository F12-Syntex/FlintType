"use client";

import { Chip, ChipGroup } from "../chip";
import { LabelWithDesc } from "../controls";
import { SettingsRow } from "../row";

/** The app's default card radius (`--radius` in globals.css). Picking it
 *  clears the override instead of writing a redundant value. */
const DEFAULT_RADIUS_REM = 1;

const RADIUS_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  rem: number;
}> = [
  { id: "sharp", label: "Sharp", rem: 0 },
  { id: "subtle", label: "Subtle", rem: 0.375 },
  { id: "soft", label: "Soft", rem: 0.625 },
  { id: "round", label: "Round", rem: DEFAULT_RADIUS_REM },
  { id: "pillowy", label: "Pillowy", rem: 1.5 },
];

/** Corner radius of cards and panels across the app (`--radius`). */
export function RadiusRow({
  value,
  onChange,
  onClear,
}: {
  value: string | undefined;
  onChange: (rem: number) => void;
  onClear: () => void;
}) {
  const numeric = value ? Number.parseFloat(value) : DEFAULT_RADIUS_REM;
  const matched = RADIUS_PRESETS.find((p) => Math.abs(p.rem - numeric) < 0.01);

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
            const isActive = matched?.id === p.id;
            return (
              <Chip
                key={p.id}
                label={p.label}
                active={isActive}
                onClick={() =>
                  p.rem === DEFAULT_RADIUS_REM ? onClear() : onChange(p.rem)
                }
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
