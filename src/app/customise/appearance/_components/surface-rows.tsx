"use client";

import {
  type BackgroundFillMode,
  type CardSurfaceMode,
  type DividerMode,
  type PagePaddingMode,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { Chip, ChipGroup } from "../../_components/chip";
import { SettingsRow } from "../../_components/row";

/** Card-surface preset chips. Each preview is a small square painted
 *  the way that mode would paint a card — solid fill, faint wash, or
 *  hairline-only outline on the page bg. Box-shadow over border so
 *  the global borders-hidden rule never blanks the swatch. */
function CardPreview({ mode }: { mode: CardSurfaceMode }) {
  const base = "block h-4 w-6 rounded-[3px]";
  if (mode === "solid")
    return (
      <span
        aria-hidden
        className={base}
        style={{ backgroundColor: "var(--card)" }}
      />
    );
  if (mode === "subtle")
    return (
      <span
        aria-hidden
        className={base}
        style={{
          backgroundColor: "color-mix(in oklch, var(--background) 70%, transparent)",
          boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--foreground) 12%, transparent)",
        }}
      />
    );
  return (
    <span
      aria-hidden
      className={base}
      style={{
        backgroundColor: "transparent",
        boxShadow: "inset 0 0 0 1px color-mix(in oklch, var(--foreground) 18%, transparent)",
      }}
    />
  );
}

const CARD_PRESETS: ReadonlyArray<{ id: CardSurfaceMode; label: string }> = [
  { id: "solid", label: "Solid" },
  { id: "subtle", label: "Subtle" },
  { id: "transparent", label: "Transparent" },
];

const DIVIDER_PRESETS: ReadonlyArray<{ id: DividerMode; label: string }> = [
  { id: "hairline", label: "Hairline" },
  { id: "dotted", label: "Dashed" },
  { id: "hidden", label: "Hidden" },
];

const PAD_PRESETS: ReadonlyArray<{ id: PagePaddingMode; label: string }> = [
  { id: "tight", label: "Tight" },
  { id: "comfortable", label: "Comfortable" },
  { id: "roomy", label: "Roomy" },
];

const BG_PRESETS: ReadonlyArray<{ id: BackgroundFillMode; label: string }> = [
  { id: "paper", label: "Themed" },
  { id: "bare", label: "Bare" },
];

/** Surface presets bundle several rows in one click. Editorial keeps
 *  the current defaults; Minimal lands Monkeytype-leaning but still
 *  has chrome; Stripped is the maximum aggressive minimisation. */
type SurfacePreset = "editorial" | "minimal" | "stripped";

function applySurfacePreset(
  preset: SurfacePreset,
  update: ReturnType<typeof useAppearancePrefs>["update"],
) {
  const bundles = {
    editorial: {
      cardSurfaces: "solid" as const,
      dividers: "hairline" as const,
      pagePadding: "comfortable" as const,
      backgroundFill: "paper" as const,
      borders: "soft" as const,
      topbarStyle: "elevated" as const,
      footerStyle: "visible" as const,
      autoHide: "off" as const,
      modeBarStyle: "chips" as const,
      monochromeChrome: false,
    },
    minimal: {
      cardSurfaces: "subtle" as const,
      dividers: "hidden" as const,
      pagePadding: "comfortable" as const,
      backgroundFill: "paper" as const,
      borders: "soft" as const,
      topbarStyle: "flat" as const,
      footerStyle: "compact" as const,
      autoHide: "dim" as const,
      modeBarStyle: "inline" as const,
      monochromeChrome: false,
    },
    stripped: {
      cardSurfaces: "transparent" as const,
      dividers: "hidden" as const,
      pagePadding: "tight" as const,
      backgroundFill: "bare" as const,
      borders: "hidden" as const,
      topbarStyle: "text-only" as const,
      footerStyle: "hidden" as const,
      autoHide: "fade" as const,
      modeBarStyle: "hidden" as const,
      monochromeChrome: true,
    },
  };
  const b = bundles[preset];
  for (const [k, v] of Object.entries(b)) {
    update(k as Parameters<typeof update>[0], v as never);
  }
}

export function SurfacePresetRow() {
  const { update } = useAppearancePrefs();
  return (
    <SettingsRow
      label="Preset"
      control={
        <ChipGroup>
          <Chip
            label="Editorial"
            active={false}
            onClick={() => applySurfacePreset("editorial", update)}
          />
          <Chip
            label="Minimal"
            active={false}
            onClick={() => applySurfacePreset("minimal", update)}
          />
          <Chip
            label="Stripped"
            active={false}
            onClick={() => applySurfacePreset("stripped", update)}
          />
        </ChipGroup>
      }
    />
  );
}

export function CardSurfacesRow() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <SettingsRow
      label="Card surfaces"
      control={
        <ChipGroup>
          {CARD_PRESETS.map((p) => (
            <Chip
              key={p.id}
              label={p.label}
              active={prefs.cardSurfaces === p.id}
              onClick={() => update("cardSurfaces", p.id)}
              preview={<CardPreview mode={p.id} />}
            />
          ))}
        </ChipGroup>
      }
    />
  );
}

export function DividersRow() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <SettingsRow
      label="Dividers"
      control={
        <ChipGroup>
          {DIVIDER_PRESETS.map((p) => (
            <Chip
              key={p.id}
              label={p.label}
              active={prefs.dividers === p.id}
              onClick={() => update("dividers", p.id)}
            />
          ))}
        </ChipGroup>
      }
    />
  );
}

export function PagePaddingRow() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <SettingsRow
      label="Page padding"
      control={
        <ChipGroup>
          {PAD_PRESETS.map((p) => (
            <Chip
              key={p.id}
              label={p.label}
              active={prefs.pagePadding === p.id}
              onClick={() => update("pagePadding", p.id)}
            />
          ))}
        </ChipGroup>
      }
    />
  );
}

export function BackgroundFillRow() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <SettingsRow
      label="Background fill"
      control={
        <ChipGroup>
          {BG_PRESETS.map((p) => (
            <Chip
              key={p.id}
              label={p.label}
              active={prefs.backgroundFill === p.id}
              onClick={() => update("backgroundFill", p.id)}
            />
          ))}
        </ChipGroup>
      }
    />
  );
}

export function MonochromeRow() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <SettingsRow
      label="Monochrome accent"
      control={
        <ChipGroup>
          <Chip
            label="Off"
            active={!prefs.monochromeChrome}
            onClick={() => update("monochromeChrome", false)}
          />
          <Chip
            label="On"
            active={prefs.monochromeChrome}
            onClick={() => update("monochromeChrome", true)}
          />
        </ChipGroup>
      }
    />
  );
}
