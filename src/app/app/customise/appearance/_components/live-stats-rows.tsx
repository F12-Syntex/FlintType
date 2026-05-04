"use client";

import {
  type AppearancePrefs,
  type LiveStatStyle,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { ColorPresetPicker } from "@/components/ui/color-preset-picker";
import {
  LabelWithDesc,
  SelectChips,
  SliderRow,
} from "../../_components/controls";
import { SettingsRow } from "../../_components/row";

const STYLE_OPTIONS: readonly { id: LiveStatStyle; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "text", label: "Text" },
  { id: "mini", label: "Mini" },
  { id: "flash", label: "Flash" },
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

      <SettingsRow
        label={
          <LabelWithDesc
            title="Live stats color"
            desc="Color of the progress, live speed, accuracy and burst text."
          />
        }
        control={
          <ColorPresetPicker
            value={prefs.liveStatsColor || undefined}
            onChange={(hex) => update("liveStatsColor", hex)}
          >
            <button
              type="button"
              aria-label="Pick live stats color"
              className="inline-block h-7 w-7 shrink-0 rounded-sm border border-border shadow-inner ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{
                backgroundColor: prefs.liveStatsColor || "var(--primary)",
              }}
            />
          </ColorPresetPicker>
        }
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
