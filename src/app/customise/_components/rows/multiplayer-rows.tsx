"use client";

import {
  type MultiplayerOpponentMarker,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { LabelWithDesc, SelectChips } from "../controls";
import { SettingsRow, SwitchRow } from "../row";

/** Opponent marker inside the passage — plain (off), a soft band behind
 *  covered words (tint), or the upcoming letters painted in their colour
 *  (text). */
function OpponentMarkerSample({ mode }: { mode: MultiplayerOpponentMarker }) {
  if (mode === "text")
    return (
      <span aria-hidden className="block font-mono text-[11px] leading-none" style={{ color: "var(--primary)" }}>
        abc
      </span>
    );
  if (mode === "tint")
    return (
      <span
        aria-hidden
        className="inline-block rounded-[2px] px-1 font-mono text-[11px] leading-none text-foreground"
        style={{ backgroundColor: "color-mix(in oklch, var(--primary) 22%, transparent)" }}
      >
        abc
      </span>
    );
  return (
    <span aria-hidden className="block font-mono text-[11px] leading-none text-muted-foreground">
      abc
    </span>
  );
}

const OPPONENT_MARKER_OPTIONS: readonly {
  id: MultiplayerOpponentMarker;
  label: string;
  preview: React.ReactNode;
}[] = [
  { id: "off", label: "Off", preview: <OpponentMarkerSample mode="off" /> },
  { id: "tint", label: "Highlight", preview: <OpponentMarkerSample mode="tint" /> },
  { id: "text", label: "Colour", preview: <OpponentMarkerSample mode="text" /> },
];

/** Race settings. They only affect screens with more than one racer.
 *  The in-text opponent marker needs player colours, so it only shows
 *  while those are on. */
export function MultiplayerRows() {
  const { prefs, update } = useAppearancePrefs();

  return (
    <>
      <SwitchRow
        title="Player colours"
        desc="Give each racer their own colour so you can tell them apart."
        checked={prefs.multiplayerPlayerColors}
        onChange={(v) => update("multiplayerPlayerColors", v)}
      />

      {prefs.multiplayerPlayerColors ? (
        <SettingsRow
          label={
            <LabelWithDesc
              title="Opponents in the text"
              desc="Show where other racers are inside the text you type."
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
      ) : null}

      <SwitchRow
        title="Race feed"
        desc="A running log of joins, lead changes and finishes."
        checked={prefs.multiplayerRaceFeed}
        onChange={(v) => update("multiplayerRaceFeed", v)}
      />
      <SwitchRow
        title="Opponent speed"
        desc="Show each racer's live speed next to their lane."
        checked={prefs.multiplayerShowOpponentWpm}
        onChange={(v) => update("multiplayerShowOpponentWpm", v)}
      />
    </>
  );
}
