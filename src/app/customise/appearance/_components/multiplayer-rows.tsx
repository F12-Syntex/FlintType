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

const INK = "color-mix(in oklch, var(--foreground) 22%, transparent)";

/** Player colours — distinct hues per lane (on) vs uniform ink (off). */
function PlayerColorsSample({ on }: { on: boolean }) {
  const a = on ? "var(--primary)" : "color-mix(in oklch, var(--foreground) 35%, transparent)";
  const b = on
    ? "color-mix(in oklch, var(--primary) 45%, var(--foreground))"
    : "color-mix(in oklch, var(--foreground) 35%, transparent)";
  return (
    <span aria-hidden className="flex flex-col gap-0.5">
      <span className="block h-1 w-6 rounded-full" style={{ backgroundColor: a }} />
      <span className="block h-1 w-4 rounded-full" style={{ backgroundColor: b }} />
    </span>
  );
}

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

/** Race feed — a short chronological log (on) vs none (off). */
function RaceFeedSample({ on }: { on: boolean }) {
  if (!on)
    return <span aria-hidden className="block h-4 w-6 rounded-[3px] border border-dashed border-foreground/25" />;
  return (
    <span aria-hidden className="flex h-4 w-6 flex-col justify-center gap-0.5">
      {[6, 5, 4].map((w, i) => (
        <span key={i} className="block h-0.5 rounded-full" style={{ width: `${w * 3}px`, backgroundColor: INK }} />
      ))}
    </span>
  );
}

/** Opponent WPM — a lane bar with its live number (on) vs the bare lane
 *  (off). */
function OpponentWpmSample({ on }: { on: boolean }) {
  return (
    <span aria-hidden className="flex items-center gap-1">
      <span className="block h-1 w-4 rounded-full" style={{ backgroundColor: INK }} />
      {on ? (
        <span className="font-mono text-[10px] leading-none tabular-nums text-foreground">42</span>
      ) : null}
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
  { id: "text", label: "Text colour", preview: <OpponentMarkerSample mode="text" /> },
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
            offPreview={<PlayerColorsSample on={false} />}
            onPreview={<PlayerColorsSample on={true} />}
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
            offPreview={<RaceFeedSample on={false} />}
            onPreview={<RaceFeedSample on={true} />}
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
            offPreview={<OpponentWpmSample on={false} />}
            onPreview={<OpponentWpmSample on={true} />}
          />
        }
      />

    </div>
  );
}
