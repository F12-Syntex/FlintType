"use client";

import {
  type AppearancePrefs,
  type BackgroundFillMode,
  DEFAULT_APPEARANCE,
  type CardSurfaceMode,
  type DividerMode,
  type PagePaddingMode,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { Chip, ChipGroup } from "../chip";
import { LabelWithDesc, SelectChips } from "../controls";
import { SettingsRow, SwitchRow } from "../row";
import { BgFillSample, DividerSample, PaddingSample } from "./chip-previews";

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

/** Surface presets bundle several rows in one click. Editorial frames
 *  everything; Minimal keeps a light frame; Stripped is the most
 *  minimal look. The
 *  bundles live at module scope so `applySurfacePreset` and
 *  `detectSurfacePreset` (used to drive the active-chip state) read
 *  from the same source — drift between the two would mean a chip
 *  never lights up even when a preset is fully applied. */
type SurfacePreset = "default" | "editorial" | "minimal" | "stripped";

/** The keys every preset sets. */
const PRESET_KEYS = [
  "cardSurfaces",
  "dividers",
  "pagePadding",
  "backgroundFill",
  "borders",
  "topbarStyle",
  "footerStyle",
  "autoHide",
  "monochromeChrome",
] as const;

const SURFACE_PRESETS = {
  // What a fresh account ships with, so "Default" lights up until the
  // user changes something.
  default: Object.fromEntries(
    PRESET_KEYS.map((k) => [k, DEFAULT_APPEARANCE[k]]),
  ) as Pick<AppearancePrefs, (typeof PRESET_KEYS)[number]>,
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

const PRESET_OPTIONS: readonly { id: SurfacePreset; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "editorial", label: "Editorial" },
  { id: "minimal", label: "Minimal" },
  { id: "stripped", label: "Stripped" },
];

/** One-click bundles. A "Custom" option appears (selected) only while
 *  the rows below match no preset; picking it does nothing. */
export function SurfacePresetRow() {
  const { prefs, update } = useAppearancePrefs();
  const detected = detectSurfacePreset(prefs);
  const active = detected ?? "custom";
  const options: readonly { id: SurfacePreset | "custom"; label: string }[] =
    detected ? PRESET_OPTIONS : [...PRESET_OPTIONS, { id: "custom", label: "Custom" }];
  return (
    <SettingsRow
      label={
        <LabelWithDesc
          title="Preset"
          desc="Editorial frames everything; Stripped leaves only the text."
        />
      }
      control={
        <SelectChips
          ariaLabel="Surface preset"
          value={active}
          options={options}
          onChange={(id) => {
            if (id !== "custom") applySurfacePreset(id, update);
          }}
        />
      }
    />
  );
}

export function CardSurfacesRow() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <SettingsRow
      label="Cards"
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
      label="Page colour"
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
    <SwitchRow
      title="Single accent"
      desc="Keep hover and highlight tints neutral so only the accent colour stands out."
      checked={prefs.monochromeChrome}
      onChange={(v) => update("monochromeChrome", v)}
    />
  );
}
