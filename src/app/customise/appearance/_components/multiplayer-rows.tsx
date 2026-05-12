"use client";

import { useAppearancePrefs } from "@/lib/appearance-prefs";
import {
  LabelWithDesc,
  SliderRow,
  ToggleChips,
} from "../../_components/controls";
import { SettingsRow } from "../../_components/row";

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
            title="Show opponent strip"
            desc="A horizontal strip below the passage with colour-coded markers showing each opponent's current position. Independent of the player-colours toggle."
          />
        }
        control={
          <ToggleChips
            value={prefs.multiplayerOpponentStrip}
            onChange={(v) => update("multiplayerOpponentStrip", v)}
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

      <SettingsRow
        label={
          <LabelWithDesc
            title="Countdown length"
            desc="Seconds between Find race and GO. Drop to 1 if you want a snap start; bump to 5 for a longer ready phase."
          />
        }
        control={
          <SliderRow
            value={prefs.multiplayerCountdownSeconds}
            min={1}
            max={5}
            step={1}
            format={(v) => `${v}s`}
            onChange={(v) => update("multiplayerCountdownSeconds", v)}
          />
        }
      />
    </div>
  );
}
