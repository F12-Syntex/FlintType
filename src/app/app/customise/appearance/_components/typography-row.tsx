"use client";

import { Button } from "@/components/ui/button";
import { useThemeOverrides } from "@/lib/theme-customization";
import { Chip, ChipGroup } from "../../_components/chip";
import { SettingsRow } from "../../_components/row";

const FONT_OPTIONS: ReadonlyArray<{
  id: string;
  label: string;
  stack: string;
}> = [
  { id: "default", label: "Sans", stack: "var(--font-sans)" },
  { id: "mono", label: "Mono", stack: "var(--font-mono)" },
  { id: "serif", label: "Serif", stack: "var(--font-serif)" },
  {
    id: "system",
    label: "System",
    stack:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
  },
  {
    id: "georgia",
    label: "Georgia",
    stack: "Georgia, 'Times New Roman', serif",
  },
];

const SIZE_PRESETS: ReadonlyArray<{ label: string; scale: number }> = [
  { label: "S", scale: 0.875 },
  { label: "M", scale: 1.0 },
  { label: "L", scale: 1.125 },
  { label: "XL", scale: 1.25 },
];

function HeroPreview({
  fontStack,
  scale,
}: {
  fontStack: string | undefined;
  scale: number;
}) {
  return (
    <div
      className="rounded-md border border-border bg-card px-5 py-6"
      style={{
        fontFamily: fontStack ?? "var(--font-sans)",
        fontSize: `${scale}rem`,
      }}
    >
      <p className="text-3xl font-bold tracking-tight text-foreground">
        The quick brown fox
      </p>
      <p className="mt-2 text-base text-muted-foreground">
        jumps over the lazy dog · 0123456789 — &amp;@#%
      </p>
    </div>
  );
}

export function TypographyRows() {
  const { overrides, setVar, clearVar } = useThemeOverrides();
  const family = overrides["--ft-font-family"];
  const scale = overrides["--ft-font-scale"]
    ? Number.parseFloat(overrides["--ft-font-scale"])
    : 1;
  const activeFamily =
    FONT_OPTIONS.find((o) => o.stack === family)?.id ?? "default";
  const activeScale =
    SIZE_PRESETS.find((p) => Math.abs(p.scale - scale) < 0.01)?.label ?? null;
  const customised = family !== undefined || overrides["--ft-font-scale"] !== undefined;

  return (
    <div className="flex flex-col gap-3">
      <HeroPreview fontStack={family} scale={scale} />

      <SettingsRow
        label="Family"
        control={
          <ChipGroup>
            {FONT_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                label={
                  // Render each chip's label in its own face so the user
                  // sees what they're picking inline.
                  <span style={{ fontFamily: opt.stack }}>{opt.label}</span>
                }
                active={activeFamily === opt.id}
                onClick={() =>
                  opt.id === "default"
                    ? clearVar("--ft-font-family")
                    : setVar("--ft-font-family", opt.stack)
                }
              />
            ))}
          </ChipGroup>
        }
      />

      <SettingsRow
        label="Size"
        control={
          <ChipGroup>
            {SIZE_PRESETS.map((p) => (
              <Chip
                key={p.label}
                label={p.label}
                active={activeScale === p.label}
                onClick={() => setVar("--ft-font-scale", String(p.scale))}
              />
            ))}
          </ChipGroup>
        }
      />

      {customised ? (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearVar("--ft-font-family");
              clearVar("--ft-font-scale");
            }}
          >
            Reset to default
          </Button>
        </div>
      ) : null}
    </div>
  );
}
