"use client";

import {
  DEFAULT_APPEARANCE,
  type LiveStatStyle,
  type StatStripSurface,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import {
  LabelWithDesc,
  SelectChips,
  SliderRow,
} from "../controls";
import { SettingsRow } from "../row";
import { LiveStyleSample, StatSurfaceSample } from "./chip-previews";
import { ColorRow } from "./color-row";

const SURFACE_OPTIONS: readonly {
  id: StatStripSurface;
  label: string;
  preview: React.ReactNode;
}[] = [
  { id: "plain", label: "Plain", preview: <StatSurfaceSample mode="plain" /> },
  { id: "card", label: "Card", preview: <StatSurfaceSample mode="card" /> },
  { id: "none", label: "Hidden", preview: <StatSurfaceSample mode="none" /> },
];

const STYLE_OPTIONS: readonly {
  id: LiveStatStyle;
  label: string;
  preview: React.ReactNode;
}[] = [
  { id: "off", label: "Off", preview: <LiveStyleSample style="off" /> },
  { id: "text", label: "Text", preview: <LiveStyleSample style="text" /> },
  { id: "mini", label: "Mini", preview: <LiveStyleSample style="mini" /> },
  { id: "flash", label: "Flash", preview: <LiveStyleSample style="flash" /> },
];

function StyleRow({
  title,
  desc,
  value,
  onChange,
}: {
  title: string;
  desc?: string;
  value: LiveStatStyle;
  onChange: (next: LiveStatStyle) => void;
}) {
  return (
    <SettingsRow
      label={<LabelWithDesc title={title} desc={desc} />}
      control={
        <SelectChips value={value} options={STYLE_OPTIONS} onChange={onChange} />
      }
    />
  );
}

export function LiveStatsRows() {
  const { prefs, update } = useAppearancePrefs();
  const anyShown =
    prefs.liveProgressStyle !== "off" ||
    prefs.liveSpeedStyle !== "off" ||
    prefs.liveAccuracyStyle !== "off" ||
    prefs.liveBurstStyle !== "off";

  return (
    <>
      <StyleRow
        title="Timer"
        desc="Time or words left; Flash shows it briefly every 15 seconds."
        value={prefs.liveProgressStyle}
        onChange={(v) => update("liveProgressStyle", v)}
      />
      <StyleRow
        title="Speed"
        value={prefs.liveSpeedStyle}
        onChange={(v) => update("liveSpeedStyle", v)}
      />
      <StyleRow
        title="Accuracy"
        value={prefs.liveAccuracyStyle}
        onChange={(v) => update("liveAccuracyStyle", v)}
      />
      <StyleRow
        title="Burst"
        desc="Your speed on the last word."
        value={prefs.liveBurstStyle}
        onChange={(v) => update("liveBurstStyle", v)}
      />

      {anyShown ? (
        <>
          <SettingsRow
            label={
              <LabelWithDesc
                title="Background"
                desc="Let the numbers float, or sit them on a card."
              />
            }
            control={
              <SelectChips
                value={prefs.statStripSurface}
                options={SURFACE_OPTIONS}
                onChange={(v) => update("statStripSurface", v)}
              />
            }
          />

          <ColorRow
            label="Colour"
            desc="Colour of the live numbers."
            swatchColor={prefs.liveStatsColor || "var(--primary)"}
            value={
              prefs.liveStatsColor &&
              prefs.liveStatsColor !== DEFAULT_APPEARANCE.liveStatsColor
                ? prefs.liveStatsColor
                : undefined
            }
            onChange={(hex) => update("liveStatsColor", hex)}
            onClear={() =>
              update("liveStatsColor", DEFAULT_APPEARANCE.liveStatsColor)
            }
          />

          <SettingsRow
            label={
              <LabelWithDesc
                title="Opacity"
                desc="Fade the live numbers so they stay out of the way."
              />
            }
            control={
              <SliderRow
                value={prefs.liveStatsOpacity}
                min={0.1}
                max={1}
                step={0.05}
                ariaLabel="Live stats opacity"
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => update("liveStatsOpacity", v)}
              />
            }
          />
        </>
      ) : null}
    </>
  );
}
