"use client";

import {
  type ControlShape,
  type DepthMode,
  type UiFont,
  type UiScale,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { LabelWithDesc, SelectChips } from "../controls";
import { SettingsRow, SwitchRow } from "../row";

/** Settings → Interface → Style (ui-law §21): the shape, depth and type
 *  of the whole app. Each pref mirrors onto an `<html data-ft-…>`
 *  attribute (AppearanceApplier), so a pick repaints every page at
 *  once — including this one.
 *
 *  The chip samples hard-code their own radius / shadow / font instead
 *  of reading the live tokens: they show what each option *would* look
 *  like, so they mustn't change with the current choice. */

const INK = "color-mix(in oklch, var(--foreground) 30%, transparent)";
const RING = "color-mix(in oklch, var(--foreground) 16%, transparent)";
// Foreground-tinted so the lift still reads on a dark page, where a
// black shadow would vanish.
const SHADOW = "color-mix(in oklch, var(--foreground) 28%, transparent)";

/* ─── Chip samples ───────────────────────────────────────────────── */

const SHAPE_RADIUS: Record<ControlShape, string> = {
  pill: "9999px",
  rounded: "4px",
  square: "0px",
};

function ShapeSample({ shape }: { shape: ControlShape }) {
  return (
    <span
      aria-hidden
      className="block h-3 w-7"
      style={{
        borderRadius: SHAPE_RADIUS[shape],
        boxShadow: `inset 0 0 0 1.5px ${INK}`,
      }}
    />
  );
}

const DEPTH_SHADOW: Record<DepthMode, string> = {
  flat: `inset 0 0 0 1px ${RING}`,
  soft: `inset 0 0 0 1px ${RING}, 0 2px 4px -1px ${SHADOW}`,
  lifted: `inset 0 0 0 1px ${RING}, 0 4px 8px -1px ${SHADOW}`,
};

function DepthSample({ mode }: { mode: DepthMode }) {
  return (
    <span
      aria-hidden
      className="block h-3.5 w-6 rounded-[3px]"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: DEPTH_SHADOW[mode],
        transform: mode === "lifted" ? "translateY(-1px)" : undefined,
      }}
    />
  );
}

const FONT_STACK: Record<UiFont, string> = {
  sans: '"Plus Jakarta Sans", ui-sans-serif, sans-serif',
  mono: "var(--font-mono)",
  system:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

function FontSample({ font }: { font: UiFont }) {
  return (
    <span
      aria-hidden
      className="block text-[15px] leading-none font-semibold text-foreground"
      style={{ fontFamily: FONT_STACK[font] }}
    >
      Aa
    </span>
  );
}

const SCALE_PX: Record<UiScale, number> = {
  compact: 12,
  default: 14,
  large: 16,
};

function ScaleSample({ scale }: { scale: UiScale }) {
  return (
    <span
      aria-hidden
      className="flex h-4 items-end leading-none font-semibold text-foreground"
      style={{ fontSize: SCALE_PX[scale] }}
    >
      Aa
    </span>
  );
}

/* ─── Options ────────────────────────────────────────────────────── */

const SHAPES: readonly { id: ControlShape; label: string }[] = [
  { id: "pill", label: "Pill" },
  { id: "rounded", label: "Rounded" },
  { id: "square", label: "Square" },
];

const DEPTHS: readonly { id: DepthMode; label: string }[] = [
  { id: "flat", label: "Flat" },
  { id: "soft", label: "Soft" },
  { id: "lifted", label: "Lifted" },
];

const FONTS: readonly { id: UiFont; label: string }[] = [
  { id: "sans", label: "Sans" },
  { id: "mono", label: "Mono" },
  { id: "system", label: "System" },
];

const SCALES: readonly { id: UiScale; label: string }[] = [
  { id: "compact", label: "Compact" },
  { id: "default", label: "Default" },
  { id: "large", label: "Large" },
];

/* ─── Rows ───────────────────────────────────────────────────────── */

export function ControlShapeRow() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <SettingsRow
      label={
        <LabelWithDesc
          title="Button shape"
          desc="The shape of buttons, chips and inputs."
        />
      }
      control={
        <SelectChips
          ariaLabel="Button shape"
          value={prefs.controlShape}
          onChange={(v) => update("controlShape", v)}
          options={SHAPES.map((o) => ({
            ...o,
            preview: <ShapeSample shape={o.id} />,
          }))}
        />
      }
    />
  );
}

export function DepthRow() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <SettingsRow
      label={
        <LabelWithDesc
          title="Depth"
          desc="How far cards and menus lift off the page."
        />
      }
      control={
        <SelectChips
          ariaLabel="Depth"
          value={prefs.depth}
          onChange={(v) => update("depth", v)}
          options={DEPTHS.map((o) => ({
            ...o,
            preview: <DepthSample mode={o.id} />,
          }))}
        />
      }
    />
  );
}

export function ButtonGlowRow() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <SwitchRow
      title="Button glow"
      desc="A soft glow under the main button on each screen."
      checked={prefs.buttonGlow}
      onChange={(v) => update("buttonGlow", v)}
    />
  );
}

export function PageAuraRow() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <SwitchRow
      title="Page glow"
      desc="A faint wash of your accent colour at the top of every page."
      checked={prefs.pageAura}
      onChange={(v) => update("pageAura", v)}
    />
  );
}

export function UiFontRow() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <SettingsRow
      label={
        <LabelWithDesc
          title="App font"
          desc="The font for menus and pages, not the text you type."
        />
      }
      control={
        <SelectChips
          ariaLabel="App font"
          value={prefs.uiFont}
          onChange={(v) => update("uiFont", v)}
          options={FONTS.map((o) => ({
            ...o,
            preview: <FontSample font={o.id} />,
          }))}
        />
      }
    />
  );
}

export function UiScaleRow() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <SettingsRow
      label={
        <LabelWithDesc
          title="App size"
          desc="Make everything a little smaller or larger."
        />
      }
      control={
        <SelectChips
          ariaLabel="App size"
          value={prefs.uiScale}
          onChange={(v) => update("uiScale", v)}
          options={SCALES.map((o) => ({
            ...o,
            preview: <ScaleSample scale={o.id} />,
          }))}
        />
      }
    />
  );
}
