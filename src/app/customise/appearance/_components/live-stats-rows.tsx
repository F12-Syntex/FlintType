"use client";

import {
  type AppearancePrefs,
  type LiveStatStyle,
  type StatStripSurface,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import {
  LabelWithDesc,
  SelectChips,
  SliderRow,
} from "../../_components/controls";
import { SettingsRow } from "../../_components/row";
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
  field,
  value,
  onChange,
}: {
  title: string;
  desc: string;
  field: keyof AppearancePrefs;
  value: LiveStatStyle;
  onChange: (next: LiveStatStyle) => void;
}) {
  return (
    <SettingsRow
      key={String(field)}
      label={<LabelWithDesc title={title} desc={desc} />}
      control={
        <SelectChips
          value={value}
          options={STYLE_OPTIONS}
          onChange={onChange}
        />
      }
    />
  );
}

export function LiveStatsRows() {
  const { prefs, update } = useAppearancePrefs();

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        label={
          <LabelWithDesc
            title="Stats surface"
            desc="Plain leaves the numbers floating on the page bg (Monkeytype-style); Card wraps the strip in a bordered panel; Hidden removes it entirely."
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
      <StyleRow
        title="Live progress style"
        desc="Timer / word count style during a test. Flash briefly shows the timer every 15 seconds in timed modes."
        field="liveProgressStyle"
        value={prefs.liveProgressStyle}
        onChange={(v) => update("liveProgressStyle", v)}
      />
      <StyleRow
        title="Live speed style"
        desc="Style of the live speed shown during the test."
        field="liveSpeedStyle"
        value={prefs.liveSpeedStyle}
        onChange={(v) => update("liveSpeedStyle", v)}
      />
      <StyleRow
        title="Live accuracy style"
        desc="Style of the live accuracy shown during the test."
        field="liveAccuracyStyle"
        value={prefs.liveAccuracyStyle}
        onChange={(v) => update("liveAccuracyStyle", v)}
      />
      <StyleRow
        title="Live burst style"
        desc="Style of the live burst speed shown during the test."
        field="liveBurstStyle"
        value={prefs.liveBurstStyle}
        onChange={(v) => update("liveBurstStyle", v)}
      />

      <ColorRow
        label="Live stats color"
        desc="Color of the progress, live speed, accuracy and burst text."
        swatchColor={prefs.liveStatsColor || "var(--primary)"}
        value={prefs.liveStatsColor || undefined}
        onChange={(hex) => update("liveStatsColor", hex)}
        onClear={() => update("liveStatsColor", "")}
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Live stats opacity"
            desc="Opacity of the progress, speed, burst and accuracy text."
          />
        }
        control={
          <SliderRow
            value={prefs.liveStatsOpacity}
            min={0.1}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => update("liveStatsOpacity", v)}
          />
        }
      />
    </div>
  );
}
