"use client";

import {
  type TaperMode,
  type TaperStrength,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { taperStyle } from "@/lib/taper";
import { cn } from "@/lib/utils";
import { LabelWithDesc, SelectChips } from "../../_components/controls";
import { SettingsRow } from "../../_components/row";

/** Per-mode chip preview — a tiny three-word strip painted with the
 *  chosen taper applied at the current strength. The middle word is
 *  the "active" one (distance 0); the outer two are at distance 2 so
 *  the falloff is clearly visible without a long row of glyphs. */
function ModeChipPreview({
  mode,
  strength,
}: {
  mode: TaperMode;
  strength: TaperStrength;
}) {
  const left = taperStyle(2, mode, strength);
  const right = taperStyle(2, mode, strength);
  return (
    <span className="flex items-center gap-1 font-mono text-[11px] leading-none">
      <span className="text-muted-foreground" style={left}>
        the
      </span>
      <span className="text-foreground">word</span>
      <span className="text-muted-foreground" style={right}>
        for
      </span>
    </span>
  );
}

function StrengthChipPreview({
  mode,
  strength,
}: {
  mode: TaperMode;
  strength: TaperStrength;
}) {
  const s = taperStyle(2, mode, strength);
  return (
    <span className="block text-[11px] leading-none">
      <span className={cn("text-muted-foreground")} style={s}>
        word
      </span>
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

  // Per-chip mode preview uses the user's CURRENT strength so the
  // chip row reads as "here's what each variant would look like at
  // my chosen intensity". The strength row's chips use the user's
  // current mode for the same reason (defaults to "opacity" when
  // taper is off so the chip still renders a visible cue).
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
              preview:
                o.id === "off" ? (
                  <span className="block text-[11px] leading-none text-muted-foreground">
                    off
                  </span>
                ) : (
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
