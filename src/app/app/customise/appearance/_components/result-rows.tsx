"use client";

import {
  type AppearancePrefs,
  type TypingSpeedUnit,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import {
  LabelWithDesc,
  SelectChips,
  ToggleChips,
} from "../../_components/controls";
import { SettingsRow } from "../../_components/row";

const SPEED_UNITS: readonly { id: TypingSpeedUnit; label: string }[] = [
  { id: "wpm", label: "WPM" },
  { id: "cpm", label: "CPM" },
  { id: "wps", label: "WPS" },
  { id: "cps", label: "CPS" },
  { id: "wph", label: "WPH" },
];

const SECTION_TOGGLES: readonly {
  key: keyof AppearancePrefs;
  title: string;
  desc: string;
}[] = [
  {
    key: "resultShowExtras",
    title: "Run shape stats",
    desc: "Longest streak, words finished, pause count, longest pause.",
  },
  {
    key: "resultShowPerLetter",
    title: "Slowest letters",
    desc: "Top eight unique characters by average keystroke latency.",
  },
  {
    key: "resultShowBursts",
    title: "WPM distribution",
    desc: "Histogram of how many seconds you spent in each WPM band.",
  },
  {
    key: "resultShowHandBalance",
    title: "Hand balance",
    desc: "Left vs right hand load split across the run's keystrokes.",
  },
  {
    key: "resultShowHeatmap",
    title: "Passage heatmap",
    desc: "The run's passage tinted per-letter by keystroke latency.",
  },
];

export function ResultRows() {
  const { prefs, update } = useAppearancePrefs();

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        label={
          <LabelWithDesc
            title="Always show decimal places"
            desc="Show decimals on the result page without needing to hover."
          />
        }
        control={
          <ToggleChips
            value={prefs.alwaysShowDecimal}
            onChange={(v) => update("alwaysShowDecimal", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Typing speed unit"
            desc="Display typing speed in the chosen unit."
          />
        }
        control={
          <SelectChips
            value={prefs.typingSpeedUnit}
            options={SPEED_UNITS}
            onChange={(v) => update("typingSpeedUnit", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Start graphs at zero"
            desc="Force the graph axis to start at zero. Off may exaggerate value changes."
          />
        }
        control={
          <ToggleChips
            value={prefs.startGraphsAtZero}
            onChange={(v) => update("startGraphsAtZero", v)}
          />
        }
      />

      {SECTION_TOGGLES.map((s) => (
        <SettingsRow
          key={s.key}
          label={<LabelWithDesc title={s.title} desc={s.desc} />}
          control={
            <ToggleChips
              value={prefs[s.key] as boolean}
              onChange={(v) => update(s.key, v as never)}
            />
          }
        />
      ))}
    </div>
  );
}
