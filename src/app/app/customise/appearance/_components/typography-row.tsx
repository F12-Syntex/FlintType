"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useThemeOverrides } from "@/lib/theme-customization";
import { Chip, ChipGroup } from "../../_components/chip";
import { SettingsRow } from "../../_components/row";
import { FontRow } from "./font-row";

// Range for the practice-passage font size, expressed as a percentage
// of the default. 50–200% is the honest band: under 50% the passage
// stops being typing-test legible, over 200% a single word eats the
// whole panel. The default (100%) clears the override entirely so the
// user's choice doesn't persist as a redundant write.
const FONT_SIZE_PCT_MIN = 50;
const FONT_SIZE_PCT_MAX = 200;

// Spacing between words on the passage. The default (0.25em) matches
// what the passage shipped with — every other preset is relative to that.
const WORD_SPACING_PRESETS: ReadonlyArray<{ label: string; em: number }> = [
  { label: "Tight", em: 0.05 },
  { label: "Snug", em: 0.15 },
  { label: "Normal", em: 0.25 },
  { label: "Loose", em: 0.45 },
  { label: "Airy", em: 0.7 },
];

/** Hero preview that mirrors the practice passage exactly. The text
 *  size, family, and word spacing all read from the same CSS vars
 *  the passage uses (`--ft-font-scale`, `--ft-font-family`,
 *  `--ft-word-spacing`), so what the user sees here is what they'll
 *  type against. The viewport-width breakpoints match the passage's
 *  (sm: / lg:) so a desktop preview reflects desktop sizing. */
function HeroPreview() {
  return (
    <div className="rounded-md border border-border bg-card px-5 py-6">
      <p
        className="font-normal tracking-[0.04em] text-[calc(var(--ft-font-scale,1)*1.5rem)] leading-[2.2] text-foreground sm:text-[calc(var(--ft-font-scale,1)*1.875rem)] sm:leading-[2.3] lg:text-[calc(var(--ft-font-scale,1)*2.25rem)] lg:leading-[2.4]"
        style={{
          fontFamily: "var(--ft-font-family, inherit)",
          wordSpacing: "var(--ft-word-spacing, 0.25em)",
        }}
      >
        the quick brown fox jumps over the lazy dog
      </p>
    </div>
  );
}

/** Number-input control for the font-size percentage. Stores the
 *  multiplier (1.0 = 100%) but takes input in human percent. Snaps
 *  the wire value to two decimals so float-arithmetic noise like
 *  `1.0500000000000003` never lands in the prefs blob. */
function FontSizeInput({
  scale,
  onChange,
}: {
  scale: number;
  onChange: (multiplier: number) => void;
}) {
  const pct = Math.round(scale * 100);
  return (
    <div className="relative">
      <Input
        type="number"
        inputMode="numeric"
        min={FONT_SIZE_PCT_MIN}
        max={FONT_SIZE_PCT_MAX}
        step={1}
        value={String(pct)}
        aria-label="Font size percentage"
        onChange={(e) => {
          const raw = e.currentTarget.value;
          if (raw === "") return;
          const n = Number.parseInt(raw, 10);
          if (!Number.isFinite(n)) return;
          const clamped = Math.min(
            FONT_SIZE_PCT_MAX,
            Math.max(FONT_SIZE_PCT_MIN, n),
          );
          // Two-decimal multiplier — 105% becomes 1.05, never 1.0500000…
          const snapped = Math.round((clamped / 100) * 100) / 100;
          onChange(snapped);
        }}
        className="h-8 w-20 pr-7 text-right tabular-nums"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground"
      >
        %
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
      <HeroPreview />

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
