"use client";

import type { ReactNode } from "react";
import { useAudioPrefs } from "@/lib/audio-prefs";
import {
  type BehaviourPrefs,
  type Confidence,
  useBehaviourPrefs,
} from "@/lib/behaviour-prefs";
import {
  LabelWithDesc,
  SelectChips,
  SliderRow,
} from "../_components/controls";
import { getGroup, sectionTitle } from "../_components/groups";
import { SettingsPageHeader } from "../_components/page-header";
import { SettingsRow, SwitchRow } from "../_components/row";
import { ConfidenceSample } from "../_components/rows/behaviour-chip-previews";
import {
  InputHandlingPreview,
  WordListPreview,
} from "../_components/rows/behaviour-previews";
import { SettingsSection } from "../_components/settings-section";

const CONFIDENCE_OPTIONS: readonly {
  id: Confidence;
  label: string;
  preview: ReactNode;
}[] = [
  { id: "off", label: "Off", preview: <ConfidenceSample mode="off" /> },
  { id: "word", label: "Word", preview: <ConfidenceSample mode="word" /> },
  { id: "all", label: "All", preview: <ConfidenceSample mode="all" /> },
];

const MIN_WORD_OPTIONS: readonly { id: number; label: string }[] = [
  1, 2, 3, 4, 5, 6, 7, 8,
].map((n) => ({ id: n, label: String(n) }));

/** Burst target starts here when the user first switches to Custom. */
const DEFAULT_CUSTOM_BURST = 60;

export default function BehaviourPage() {
  const group = getGroup("behaviour");
  const { prefs, update, reset, customizedCount } = useBehaviourPrefs();
  const {
    prefs: audio,
    update: updateAudio,
    reset: resetAudio,
    customizedCount: audioCustomized,
  } = useAudioPrefs();

  const set = <K extends keyof BehaviourPrefs>(
    key: K,
    value: BehaviourPrefs[K],
  ) => update(key, value);

  const burstCustom = prefs.burstThreshold > 0;

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <SettingsPageHeader
        group={group}
        customizedCount={customizedCount + audioCustomized}
        onReset={() => {
          reset();
          resetAudio();
        }}
      />

      <SettingsSection
        id="input-handling"
        title={sectionTitle(group, "input-handling")}
        description="What counts as a mistake, and when the caret moves on."
        preview={<InputHandlingPreview />}
      >
        <SwitchRow
          title="Stop on error"
          desc="Don't move on until a wrong letter is fixed."
          checked={prefs.stopOnError}
          onChange={(v) => set("stopOnError", v)}
        />
        <SettingsRow
          label={
            <LabelWithDesc
              title="Confidence mode"
              desc="Word stops you going back to earlier words; All turns backspace off."
            />
          }
          control={
            <SelectChips
              value={prefs.confidence}
              options={CONFIDENCE_OPTIONS}
              onChange={(v) => set("confidence", v)}
            />
          }
        />
        <SwitchRow
          title="Allow extra letters"
          desc="Let you type past the end of a word; extra letters count as mistakes."
          checked={prefs.allowExtras}
          onChange={(v) => set("allowExtras", v)}
        />
        <SwitchRow
          title="Strict space"
          desc="Space only moves on once the word is typed correctly."
          checked={prefs.strictSpace}
          onChange={(v) => set("strictSpace", v)}
        />
        <SwitchRow
          title="Blind mode"
          desc="Hide what you typed and your speed until the end."
          checked={prefs.blindMode}
          onChange={(v) => set("blindMode", v)}
        />
      </SettingsSection>

      <SettingsSection
        id="word-list"
        title={sectionTitle(group, "word-list")}
        description="Which words end up in the text."
        preview={<WordListPreview prefs={prefs} />}
      >
        <SettingsRow
          label={
            <LabelWithDesc
              title="Shortest word"
              desc="Leave out words with fewer letters than this."
            />
          }
          control={
            <SelectChips
              ariaLabel="Shortest word length"
              value={prefs.minWordLength}
              options={MIN_WORD_OPTIONS}
              onChange={(v) => set("minWordLength", v)}
            />
          }
        />
        <SwitchRow
          title="Numbers and punctuation"
          desc="Mix numbers and punctuation into word tests."
          checked={prefs.showSecondary}
          onChange={(v) => set("showSecondary", v)}
        />
      </SettingsSection>

      <SettingsSection
        id="burst"
        title={sectionTitle(group, "burst")}
        description="The speed each word has to beat in burst practice."
      >
        <SettingsRow
          label={
            <LabelWithDesc
              title="Target speed"
              desc={
                burstCustom
                  ? "A fixed target that stays put until you change it."
                  : "Follows your recent average, so it moves with you."
              }
            />
          }
          control={
            <SelectChips
              ariaLabel="Burst target"
              value={burstCustom ? "custom" : "auto"}
              options={[
                { id: "auto", label: "Auto" },
                { id: "custom", label: "Custom" },
              ]}
              onChange={(v) =>
                set("burstThreshold", v === "auto" ? 0 : DEFAULT_CUSTOM_BURST)
              }
            />
          }
        />
        {burstCustom ? (
          <SettingsRow
            label="Words per minute"
            control={
              <SliderRow
                value={prefs.burstThreshold}
                min={10}
                max={200}
                step={5}
                ariaLabel="Burst target speed"
                format={(v) => `${v} wpm`}
                onChange={(v) => set("burstThreshold", v)}
              />
            }
          />
        ) : null}
      </SettingsSection>

      <SettingsSection
        id="audio"
        title={sectionTitle(group, "audio")}
        description="A soft click on every key."
      >
        <SwitchRow
          title="Key clicks"
          desc="Play a short click on every keystroke."
          checked={audio.keypressClickEnabled}
          onChange={(v) => updateAudio("keypressClickEnabled", v)}
        />
        {audio.keypressClickEnabled ? (
          <SettingsRow
            label="Volume"
            control={
              <SliderRow
                value={audio.keypressClickVolume}
                min={0}
                max={100}
                step={5}
                ariaLabel="Click volume"
                format={(v) => `${v}%`}
                onChange={(v) => updateAudio("keypressClickVolume", v)}
              />
            }
          />
        ) : null}
      </SettingsSection>

      <SettingsSection
        id="adaptive"
        title={sectionTitle(group, "adaptive")}
        description="Training and race runs always teach practice what to focus on."
      >
        <SwitchRow
          title="Ignore casual runs"
          desc="Casual tests still save results and personal bests, but don't change which weak spots practice targets."
          checked={prefs.excludeCasualFromAdapt}
          onChange={(v) => set("excludeCasualFromAdapt", v)}
        />
      </SettingsSection>
    </div>
  );
}
