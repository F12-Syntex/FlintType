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

function HeroPreview() {
  // Three real surfaces — square, pill, button — using the live --radius.
  // Updates instantly when the user picks a preset.
  return (
    <div className="flex items-center justify-center gap-3 rounded-md border border-border bg-card px-5 py-6">
      <div
        aria-hidden
        className="h-12 w-12 border-2 border-primary bg-background"
        style={{ borderRadius: "var(--radius)" }}
      />
      <div
        aria-hidden
        className="h-12 w-20 border border-border bg-muted"
        style={{ borderRadius: "var(--radius)" }}
      />
      <span
        aria-hidden
        className="inline-flex h-12 items-center bg-primary px-5 text-sm font-semibold text-primary-foreground"
        style={{ borderRadius: "var(--radius)" }}
      >
        Save
      </span>
    </div>
  );
}

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
      <HeroPreview />
      <SettingsRow
        label="Preset"
        control={
          <ChipGroup>
            {RADIUS_PRESETS.map((p) => (
              <Chip
                key={p.id}
                label={p.label}
                active={matched?.id === p.id}
                onClick={() => onChange(p.rem)}
              />
            ))}
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
