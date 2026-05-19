"use client";

import type { CSSProperties } from "react";
import {
  type TaperMode,
  type TaperStrength,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { taperStyle } from "@/lib/taper";
import { LabelWithDesc, SelectChips } from "../../_components/controls";
import { SettingsRow } from "../../_components/row";

/** Visual cue inside each Render-mode chip. Three short words:
 *  the middle one is the "active" word (no taper), the outer two
 *  sit at distance 3 from the cursor so the falloff is loud enough
 *  to read at chip-sized text. Every word starts at
 *  `color: var(--foreground)` so the mute variant has a concrete
 *  currentColor to blend toward muted-foreground; without that
 *  baseline, mute's color-mix has nothing to do and the chip
 *  reads identical to "off".
 *
 *  For "off" the chip skips the taper entirely so it reads as a
 *  flat trio — exactly the look the rest of the passage will get. */
function ModeChipPreview({
  mode,
  strength,
}: {
  mode: TaperMode;
  strength: TaperStrength;
}) {
  const farStyle =
    mode === "off" ? undefined : taperStyle(3, mode, strength);
  const baseColor: CSSProperties = { color: "var(--foreground)" };
  const dim: CSSProperties = farStyle ? { ...baseColor, ...farStyle } : baseColor;
  return (
    <span className="inline-flex items-baseline gap-1 font-mono text-[12px] leading-none">
      <span style={dim}>one</span>
      <span style={{ ...baseColor, fontWeight: 600 }}>word</span>
      <span style={dim}>two</span>
    </span>
  );
}

/** Strength chip preview — show the user's chosen mode at each
 *  strength so they can compare falloff curves. Two words: the
 *  middle "active" one (flat) and a distance-3 word with the taper
 *  applied at the chip's own strength. Same colour baseline trick
 *  as the mode preview so mute renders honestly. */
function StrengthChipPreview({
  mode,
  strength,
}: {
  mode: TaperMode;
  strength: TaperStrength;
}) {
  const farStyle = taperStyle(3, mode, strength);
  const baseColor: CSSProperties = { color: "var(--foreground)" };
  return (
    <span className="inline-flex items-baseline gap-1 font-mono text-[12px] leading-none">
      <span style={{ ...baseColor, fontWeight: 600 }}>word</span>
      <span style={{ ...baseColor, ...farStyle }}>far</span>
    </span>
  );
}

const MODE_OPTIONS: readonly { id: TaperMode; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "opacity", label: "Opacity" },
  { id: "size", label: "Size" },
  { id: "blur", label: "Blur" },
  { id: "mute", label: "Color" },
];

const STRENGTH_OPTIONS: readonly { id: TaperStrength; label: string }[] = [
  { id: "soft", label: "Soft" },
  { id: "medium", label: "Medium" },
  { id: "strong", label: "Strong" },
];

export function TaperRows() {
  const { prefs, update } = useAppearancePrefs();

  // Strength chips render the user's CURRENT mode at each strength
  // so the chip row reads "here's what soft/medium/strong looks like
  // with my chosen variant". When taperMode is off the strength
  // setting has no live effect — pick opacity as the demo so the
  // chips still illustrate the falloff curve.
  const previewModeForStrengthRow: TaperMode =
    prefs.taperMode === "off" ? "opacity" : prefs.taperMode;

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        label={
          <LabelWithDesc
            title="Render mode"
            desc="Which property fades the surrounding words. Off disables the taper entirely; the other four trade subtlety for clarity — Opacity keeps layout perfectly stable, Size physically shrinks distant words (most focal), Blur softens them, Color blends them toward muted text."
          />
        }
        control={
          <SelectChips
            value={prefs.taperMode}
            options={MODE_OPTIONS.map((o) => ({
              ...o,
              preview: (
                <ModeChipPreview mode={o.id} strength={prefs.taperStrength} />
              ),
            }))}
            onChange={(v) => update("taperMode", v)}
          />
        }
      />
      <SettingsRow
        label={
          <LabelWithDesc
            title="Strength"
            desc="How far the taper falls off per word of distance. Soft barely registers; Strong clearly emphasises the active word."
          />
        }
        control={
          <SelectChips
            value={prefs.taperStrength}
            options={STRENGTH_OPTIONS.map((o) => ({
              ...o,
              preview: (
                <StrengthChipPreview
                  mode={previewModeForStrengthRow}
                  strength={o.id}
                />
              ),
            }))}
            onChange={(v) => update("taperStrength", v)}
          />
        }
      />
    </div>
  );
}
