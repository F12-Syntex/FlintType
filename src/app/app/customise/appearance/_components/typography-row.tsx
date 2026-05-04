"use client";

import { Button } from "@/components/ui/button";
import { useThemeOverrides } from "@/lib/theme-customization";
import { Chip, ChipGroup } from "../../_components/chip";
import { SettingsRow } from "../../_components/row";
import { FontRow } from "./font-row";

const SIZE_PRESETS: ReadonlyArray<{ label: string; scale: number }> = [
  { label: "S", scale: 0.875 },
  { label: "M", scale: 1.0 },
  { label: "L", scale: 1.125 },
  { label: "XL", scale: 1.25 },
];

// Spacing between words on the passage. The default (0.25em) matches
// what the passage shipped with — every other preset is relative to that.
const WORD_SPACING_PRESETS: ReadonlyArray<{ label: string; em: number }> = [
  { label: "Tight", em: 0.05 },
  { label: "Snug", em: 0.15 },
  { label: "Normal", em: 0.25 },
  { label: "Loose", em: 0.45 },
  { label: "Airy", em: 0.7 },
];

function HeroPreview({
  fontStack,
  scale,
  wordSpacingEm,
}: {
  fontStack: string | undefined;
  scale: number;
  wordSpacingEm: number;
}) {
  return (
    <div
      className="rounded-md border border-border bg-card px-5 py-6"
      style={{
        fontFamily: fontStack ?? "var(--font-sans)",
        fontSize: `${scale}rem`,
        wordSpacing: `${wordSpacingEm}em`,
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
  const activeScale =
    SIZE_PRESETS.find((p) => Math.abs(p.scale - scale) < 0.01)?.label ?? null;
  const wordSpacing = overrides["--ft-word-spacing"]
    ? Number.parseFloat(overrides["--ft-word-spacing"])
    : 0.25;
  const activeWordSpacing =
    WORD_SPACING_PRESETS.find((p) => Math.abs(p.em - wordSpacing) < 0.01)
      ?.label ?? null;
  const customised =
    family !== undefined ||
    overrides["--ft-font-scale"] !== undefined ||
    overrides["--ft-word-spacing"] !== undefined;

  return (
    <div className="flex flex-col gap-3">
      <HeroPreview
        fontStack={family}
        scale={scale}
        wordSpacingEm={wordSpacing}
      />

      <FontRow
        value={family}
        onChange={(opt) => {
          if (opt.id === "default") clearVar("--ft-font-family");
          else setVar("--ft-font-family", opt.stack);
        }}
        onClear={() => clearVar("--ft-font-family")}
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

      <SettingsRow
        label="Word spacing"
        control={
          <ChipGroup>
            {WORD_SPACING_PRESETS.map((p) => (
              <Chip
                key={p.label}
                label={p.label}
                active={activeWordSpacing === p.label}
                onClick={() => setVar("--ft-word-spacing", `${p.em}em`)}
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
              clearVar("--ft-word-spacing");
            }}
          >
            Reset to default
          </Button>
        </div>
      ) : null}
    </div>
  );
}
