"use client";

import {
  type MultiplayerOpponentMarker,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import {
  LabelWithDesc,
  SelectChips,
  ToggleChips,
} from "../../_components/controls";
import { SettingsRow } from "../../_components/row";

const OPPONENT_MARKER_OPTIONS: readonly {
  id: MultiplayerOpponentMarker;
  label: string;
}[] = [
  { id: "off", label: "Off" },
  { id: "tint", label: "Highlight" },
  { id: "text", label: "Text colour" },
];

/** Multiplayer row stack. Settings here only affect surfaces with
 *  more than one racer (today: /race). Defaults keep the section
 *  quiet so the single-accent baseline holds — flip each row on if
 *  you want a richer live-race surface. */
export function MultiplayerRows() {
  const { prefs, update } = useAppearancePrefs();

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        label={
          <LabelWithDesc
            title="Show player colours"
            desc="Paint each racer's lane bar + name dot in a distinct colour pulled from the --chart-* palette so opponents are visually distinct."
          />
        }
        control={
          <ToggleChips
            value={prefs.multiplayerPlayerColors}
            onChange={(v) => update("multiplayerPlayerColors", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="In-passage opponent marker"
            desc="How an opponent's leading edge shows up inside the passage. Text colour paints the upcoming letters in their colour (a tide of colour bleeds back as they catch up); Highlight paints a soft band behind covered words; Off hides the marker entirely. Requires player colours."
          />
        }
        control={
          <SelectChips
            value={prefs.multiplayerOpponentMarker}
            options={OPPONENT_MARKER_OPTIONS}
            onChange={(v) => update("multiplayerOpponentMarker", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Show race feed"
            desc="Live chronological log of joins, leader changes, milestones, and finishes in the side panel. Off keeps the panel minimal."
          />
        }
        control={
          <ToggleChips
            value={prefs.multiplayerRaceFeed}
            onChange={(v) => update("multiplayerRaceFeed", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Show opponent WPM"
            desc="Render each opponent's live WPM number to the right of their lane bar. Off keeps the lanes purely visual."
          />
        }
        control={
          <ToggleChips
            value={prefs.multiplayerShowOpponentWpm}
            onChange={(v) => update("multiplayerShowOpponentWpm", v)}
          />
        }
      />

    </div>
  );
}
