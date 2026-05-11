"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useThemeOverrides } from "@/lib/theme-customization";
import { Chip, ChipGroup } from "../../_components/chip";
import { SettingsRow } from "../../_components/row";
import { FontRow } from "./font-row";

// Practice-passage font size, expressed in pixels at the desktop
// breakpoint (lg). 40px == scale 1 (the default the passage shipped
// with at lg viewports). 20–80px is the honest band: under 20 the
// passage stops being typing-test legible, over 80 a single word eats
// the panel. The default (40) clears the override entirely so the
// user's choice doesn't persist as a redundant write.
const FONT_SIZE_PX_MIN = 20;
const FONT_SIZE_PX_MAX = 80;
const FONT_SIZE_PX_DEFAULT = 40;

// Spacing between words on the passage. The default (0.25em) matches
// what the passage shipped with — every other preset is relative to that.
const WORD_SPACING_PRESETS: ReadonlyArray<{ label: string; em: number }> = [
  { label: "Tight", em: 0.05 },
  { label: "Snug", em: 0.15 },
  { label: "Normal", em: 0.25 },
  { label: "Loose", em: 0.45 },
  { label: "Airy", em: 0.7 },
];

/** Number-input control for the practice-passage font size in pixels.
 *  Stores `--ft-font-scale` as `px / FONT_SIZE_PX_DEFAULT`; the passage
 *  multiplies this against its breakpoint base sizes, so the displayed
 *  px value is honest at the lg breakpoint and proportionally smaller
 *  on narrower viewports — same shape every theme has shipped with. */
function FontSizeInput({
  scale,
  onChange,
}: {
  scale: number;
  onChange: (multiplier: number) => void;
}) {
  const px = Math.round(scale * FONT_SIZE_PX_DEFAULT);
  return (
    <div className="relative">
      <Input
        type="number"
        inputMode="numeric"
        min={FONT_SIZE_PX_MIN}
        max={FONT_SIZE_PX_MAX}
        step={1}
        value={String(px)}
        aria-label="Font size (px)"
        onChange={(e) => {
          const raw = e.currentTarget.value;
          if (raw === "") return;
          const n = Number.parseInt(raw, 10);
          if (!Number.isFinite(n)) return;
          const clamped = Math.min(
            FONT_SIZE_PX_MAX,
            Math.max(FONT_SIZE_PX_MIN, n),
          );
          // Two-decimal multiplier — 32px becomes 0.80, never 0.7999…
          const snapped =
            Math.round((clamped / FONT_SIZE_PX_DEFAULT) * 100) / 100;
          onChange(snapped);
        }}
        className="h-8 w-20 pr-8 text-right tabular-nums"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground"
      >
        px
      </span>
    </div>
  );
}

export function TypographyRows() {
  const { overrides, setVar, clearVar } = useThemeOverrides();
  const family = overrides["--ft-font-family"];
  const scale = overrides["--ft-font-scale"]
    ? Number.parseFloat(overrides["--ft-font-scale"])
    : 1;
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
          <FontSizeInput
            scale={scale}
            onChange={(v) => {
              // 100% is the default — clear the override so it doesn't
              // persist as a redundant write to the prefs blob.
              if (Math.abs(v - 1) < 0.001) clearVar("--ft-font-scale");
              else setVar("--ft-font-scale", String(v));
            }}
          />
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
