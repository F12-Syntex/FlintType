"use client";

import { SpectatePill } from "@/components/spectate-indicator";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import { Chip, ChipGroup } from "../../_components/chip";
import { SettingsRow } from "../../_components/row";
import { SettingsSection } from "../../_components/settings-section";

/** Module-level stable default — useRemotePrefs captures it once. */
const SPECTATE_DEFAULT = { enabled: false };

/** The bespoke live preview (ui-law §12.5): the exact "Friends can
 *  watch" chip the practice screen shows, flipped by the toggle below
 *  it, so the user sees the indicator they're enabling. */
function SpectatePreview({ enabled }: { enabled: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8">
      <SpectatePill enabled={enabled} />
      <p className="max-w-xs text-center text-[11px] leading-relaxed text-muted-foreground">
        {enabled
          ? "Mutual friends can open your live run from the Friends page and watch your words appear in real time."
          : "Your runs stay private. Turn this on to let mutual friends watch."}
      </p>
    </div>
  );
}

/** "Live spectating" consent section on the Behaviour page. The toggle
 *  writes the `spectate` pref slice the practice broadcaster and the
 *  server gate both read. Off by default; only mutual friends can ever
 *  watch, and only while a run is active. */
export function SpectateSection() {
  const { value, update } = useRemotePrefs<{ enabled: boolean }>(
    "spectate",
    SPECTATE_DEFAULT,
  );
  const enabled = value.enabled;
  return (
    <SettingsSection
      id="spectate"
      eyebrow="Social"
      title="Live spectating"
      description="Let mutual friends watch you practise live. They see your passage, caret, and live WPM in near real time — only while you're typing, and only people you're friends with. Off by default."
      preview={<SpectatePreview enabled={enabled} />}
    >
      <SettingsRow
        label={
          <span className="flex flex-col gap-0.5">
            <span>Let friends watch you practise</span>
            <span className="text-xs font-normal text-muted-foreground">
              Streams your live run to mutual friends from any practice or
              drill. Stops the moment you leave.
            </span>
          </span>
        }
        control={
          <ChipGroup>
            <Chip
              label="Off"
              active={!enabled}
              onClick={() => update({ enabled: false })}
            />
            <Chip
              label="On"
              active={enabled}
              onClick={() => update({ enabled: true })}
            />
          </ChipGroup>
        }
      />
    </SettingsSection>
  );
}
