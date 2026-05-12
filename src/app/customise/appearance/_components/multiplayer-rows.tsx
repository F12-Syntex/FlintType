"use client";

import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { LabelWithDesc, ToggleChips } from "../../_components/controls";
import { SettingsRow } from "../../_components/row";

/** Multiplayer row stack. Settings here only affect surfaces with
 *  more than one racer (today: /race). Defaults keep the section
 *  quiet so the single-accent baseline holds — flip each row on
 *  if you want richer live-race visuals. */
export function MultiplayerRows() {
  const { prefs, update } = useAppearancePrefs();

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        label={
          <LabelWithDesc
            title="Show player colours"
            desc="Paint a coloured underline beneath each opponent's current word in the race passage so you can spot where everyone is at a glance."
          />
        }
        control={
          <ToggleChips
            value={prefs.multiplayerPlayerColors}
            onChange={(v) => update("multiplayerPlayerColors", v)}
          />
        }
      />
    </div>
  );
}
