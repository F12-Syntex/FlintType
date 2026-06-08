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
import {
  BgFillSample,
  DividerSample,
  MonochromeSample,
  PaddingSample,
} from "./chip-previews";

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
 *  has chrome; Stripped is the maximum aggressive minimisation. The
 *  bundles live at module scope so `applySurfacePreset` and
 *  `detectSurfacePreset` (used to drive the active-chip state) read
 *  from the same source — drift between the two would mean a chip
 *  never lights up even when a preset is fully applied. */
type SurfacePreset = "editorial" | "minimal" | "stripped";

const SURFACE_PRESETS = {
  editorial: {
    cardSurfaces: "solid",
    dividers: "hairline",
    pagePadding: "comfortable",
    backgroundFill: "paper",
    borders: "soft",
    topbarStyle: "elevated",
    footerStyle: "visible",
    autoHide: "off",
    monochromeChrome: false,
  },
  minimal: {
    cardSurfaces: "subtle",
    dividers: "hidden",
    pagePadding: "comfortable",
    backgroundFill: "paper",
    borders: "soft",
    topbarStyle: "flat",
    footerStyle: "compact",
    autoHide: "dim",
    monochromeChrome: false,
  },
  stripped: {
    cardSurfaces: "transparent",
    dividers: "hidden",
    pagePadding: "tight",
    backgroundFill: "bare",
    borders: "hidden",
    topbarStyle: "text-only",
    footerStyle: "hidden",
    autoHide: "fade",
    monochromeChrome: true,
  },
} as const;

function applySurfacePreset(
  preset: SurfacePreset,
  update: ReturnType<typeof useAppearancePrefs>["update"],
) {
  for (const [k, v] of Object.entries(SURFACE_PRESETS[preset])) {
    update(k as Parameters<typeof update>[0], v as never);
  }
}

/** Return the preset id whose every key matches the current prefs, or
 *  null when the state is mixed (the user has nudged one row off a
 *  preset). */
function detectSurfacePreset(
  prefs: ReturnType<typeof useAppearancePrefs>["prefs"],
): SurfacePreset | null {
  for (const id of Object.keys(SURFACE_PRESETS) as SurfacePreset[]) {
    const bundle = SURFACE_PRESETS[id];
    const matches = (Object.entries(bundle) as [string, unknown][]).every(
      ([k, v]) => (prefs as Record<string, unknown>)[k] === v,
    );
    if (matches) return id;
  }
  return null;
}

export function SurfacePresetRow() {
  const { prefs, update } = useAppearancePrefs();
  const active = detectSurfacePreset(prefs);
  return (
    <SettingsRow
      label="Preset"
      control={
        <ChipGroup>
          <Chip
            label="Editorial"
            active={active === "editorial"}
            onClick={() => applySurfacePreset("editorial", update)}
          />
          <Chip
            label="Minimal"
            active={active === "minimal"}
            onClick={() => applySurfacePreset("minimal", update)}
          />
          <Chip
            label="Stripped"
            active={active === "stripped"}
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
              preview={<DividerSample mode={p.id} />}
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
              preview={<PaddingSample mode={p.id} />}
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
              preview={<BgFillSample mode={p.id} />}
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
            preview={<MonochromeSample on={false} />}
          />
          <Chip
            label="On"
            active={prefs.monochromeChrome}
            onClick={() => update("monochromeChrome", true)}
            preview={<MonochromeSample on={true} />}
          />
        </ChipGroup>
      }
    />
  );
}
