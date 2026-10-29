"use client";

import {
  type ResultChrome,
  type TypingSpeedUnit,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { LabelWithDesc, SelectChips } from "../controls";
import { SettingsRow, SwitchRow } from "../row";
import { SpeedUnitSample } from "./chip-previews";

const SPEED_UNITS: readonly {
  id: TypingSpeedUnit;
  label: string;
  preview: React.ReactNode;
}[] = [
  { id: "wpm", label: "WPM", preview: <SpeedUnitSample unit="wpm" /> },
  { id: "cpm", label: "CPM", preview: <SpeedUnitSample unit="cpm" /> },
  { id: "wps", label: "WPS", preview: <SpeedUnitSample unit="wps" /> },
  { id: "cps", label: "CPS", preview: <SpeedUnitSample unit="cps" /> },
  { id: "wph", label: "WPH", preview: <SpeedUnitSample unit="wph" /> },
];

const SECTION_TOGGLES: readonly {
  key:
    | "resultShowAnalysis"
    | "resultShowExtras"
    | "resultShowPerLetter"
    | "resultShowHandBalance"
    | "resultShowHeatmap";
  title: string;
  desc: string;
}[] = [
  {
    key: "resultShowAnalysis",
    title: "Show analysis",
    desc: "What slowed you down, and where the test's time went.",
  },
  {
    key: "resultShowExtras",
    title: "Run details",
    desc: "Your longest clean streak, words typed correctly and longest pause.",
  },
  {
    key: "resultShowPerLetter",
    title: "Slowest letters",
    desc: "The letters that took you longest inside words.",
  },
  {
    key: "resultShowHandBalance",
    title: "Hand split",
    desc: "How many of the test's letters each hand types on QWERTY.",
  },
  {
    key: "resultShowHeatmap",
    title: "Text heatmap",
    desc: "The text you typed, tinted by how fast each letter was.",
  },
];

const RESULT_CHROME_OPTIONS: readonly { id: ResultChrome; label: string }[] = [
  { id: "framed", label: "Cards" },
  { id: "spare", label: "Plain" },
];

export function ResultRows() {
  const { prefs, update } = useAppearancePrefs();

  return (
    <>
      <SettingsRow
        label={
          <LabelWithDesc
            title="Speed unit"
            desc="Words or characters, per minute, second or hour."
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
            title="Layout"
            desc="Group the results into cards, or let them sit on the page."
          />
        }
        control={
          <SelectChips
            ariaLabel="Result layout"
            value={prefs.resultChrome}
            options={RESULT_CHROME_OPTIONS}
            onChange={(v) => update("resultChrome", v)}
          />
        }
      />

      <SwitchRow
        title="Always show decimals"
        desc="Show decimals without having to hover."
        checked={prefs.alwaysShowDecimal}
        onChange={(v) => update("alwaysShowDecimal", v)}
      />
      <SwitchRow
        title="Start graphs at zero"
        desc="Turning this off zooms in, which makes changes look bigger."
        checked={prefs.startGraphsAtZero}
        onChange={(v) => update("startGraphsAtZero", v)}
      />

      {SECTION_TOGGLES.map((t) => (
        <SwitchRow
          key={t.key}
          title={t.title}
          desc={t.desc}
          checked={prefs[t.key]}
          onChange={(v) => update(t.key, v)}
        />
      ))}
    </>
  );
}
