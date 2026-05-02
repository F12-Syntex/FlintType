"use client";

import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "../../_components/chip";
import { SettingsRow } from "../../_components/row";

const RADIUS_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  rem: number;
}> = [
  { id: "sharp", label: "Sharp", rem: 0 },
  { id: "subtle", label: "Subtle", rem: 0.125 },
  { id: "small", label: "Small", rem: 0.25 },
  { id: "medium", label: "Medium", rem: 0.5 },
  { id: "large", label: "Large", rem: 0.75 },
  { id: "pillowy", label: "Pillowy", rem: 1.25 },
];

export function RadiusRow({
  value,
  onChange,
  onClear,
}: {
  value: string | undefined;
  onChange: (rem: number) => void;
  onClear: () => void;
}) {
  const numeric = value ? Number.parseFloat(value) : 0.5;
  const matched = RADIUS_PRESETS.find(
    (p) => Math.abs(p.rem - numeric) < 0.01,
  );

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        label="Preset"
        control={
          <ChipGroup>
            {RADIUS_PRESETS.map((p) => {
              const isActive = matched?.id === p.id;
              return (
                <Chip
                  key={p.id}
                  label={p.label}
                  active={isActive}
                  onClick={() => onChange(p.rem)}
                  preview={
                    // Top-left corner only — exaggerates the curvature
                    // so even Subtle vs Small reads at a glance.
                    <span
                      aria-hidden
                      className="block h-5 w-5 border-l-[3px] border-t-[3px]"
                      style={{
                        borderTopLeftRadius: `${p.rem}rem`,
                        borderColor: isActive
                          ? "var(--primary)"
                          : "currentColor",
                      }}
                    />
                  }
                />
              );
            })}
          </ChipGroup>
        }
      />
      {value !== undefined ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClear}>
            Reset to default
          </Button>
        </div>
      ) : null}
    </div>
  );
}
