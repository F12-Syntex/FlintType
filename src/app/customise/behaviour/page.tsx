"use client";

import { useAudioPrefs } from "@/lib/audio-prefs";
import {
  type BehaviourPrefs,
  type Confidence,
  useBehaviourPrefs,
} from "@/lib/behaviour-prefs";
import { SelectChips, SliderRow, ToggleChips } from "../_components/controls";
import { SettingsPageHeader } from "../_components/page-header";
import { SettingsRow } from "../_components/row";
import { SettingsSection } from "../_components/settings-section";
import {
  BlindSample,
  ConfidenceSample,
  ExtrasSample,
  KeypressClickSample,
  MinWordSample,
  SecondarySample,
  StopOnErrorSample,
  StrictSpaceSample,
} from "./_components/chip-previews";
import {
  InputHandlingPreview,
  WordListPreview,
} from "./_components/section-previews";
import { SpectateSection } from "./_components/spectate-section";

const CONFIDENCE_OPTIONS: readonly {
  id: Confidence;
  label: string;
  preview: React.ReactNode;
}[] = [
  { id: "off", label: "Off", preview: <ConfidenceSample mode="off" /> },
  { id: "word", label: "Word", preview: <ConfidenceSample mode="word" /> },
  { id: "all", label: "All", preview: <ConfidenceSample mode="all" /> },
];

const MIN_WORD_OPTIONS: readonly {
  id: number;
  label: string;
  preview: React.ReactNode;
}[] = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
  id: n,
  label: String(n),
  preview: <MinWordSample len={n} />,
}));

function ToggleRow({
  label,
  desc,
  value,
  onChange,
  offPreview,
  onPreview,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  offPreview?: React.ReactNode;
  onPreview?: React.ReactNode;
}) {
  return (
    <SettingsRow
      label={
        <span className="flex flex-col gap-0.5">
          <span>{label}</span>
          {desc ? (
            <span className="text-xs font-normal text-muted-foreground">
              {desc}
            </span>
          ) : null}
        </span>
      }
      control={
        <ToggleChips
          value={value}
          onChange={onChange}
          offPreview={offPreview}
          onPreview={onPreview}
        />
      }
    />
  );
}

export default function BehaviourPage() {
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

  // The page's customised count includes audio, so Reset all must clear
  // audio too — otherwise the stat stays non-zero after a reset (FT-009).
  const resetAll = () => {
    reset();
    resetAudio();
  };

  return (
    <section className="text-foreground">
      <SettingsPageHeader
        eyebrow="Customise · Behaviour"
        title="Make it act the way you think"
        customizedCount={customizedCount + audioCustomized}
        onResetAll={resetAll}
        description="Tune how the test reacts while you type — restart shortcuts, error handling, and word-list shape. Live-signal styling moved to Appearance > Live stats; this page is purely about input behaviour."
      />

      <SettingsSection
        id="input-handling"
        eyebrow="Discipline"
        title="Input handling"
        description="How the test reacts to every keystroke — what counts as an error, when the cursor advances, and whether you can see what you typed. Live-stat styling lives in Appearance > Live stats now."
        preview={<InputHandlingPreview />}
      >
        <ToggleRow
          label="Stop on error"
          desc="Won't advance until the typo is corrected"
          value={prefs.stopOnError}
          onChange={(v) => set("stopOnError", v)}
          offPreview={<StopOnErrorSample on={false} />}
          onPreview={<StopOnErrorSample on={true} />}
        />
        <SettingsRow
          label={
            <span className="flex flex-col gap-0.5">
              <span>Confidence mode</span>
              <span className="text-xs font-normal text-muted-foreground">
                Disable backspace — go faster, accept what you get
              </span>
            </span>
          }
          control={
            <SelectChips
              value={prefs.confidence}
              options={CONFIDENCE_OPTIONS}
              onChange={(v) => set("confidence", v)}
            />
          }
        />
        <ToggleRow
          label="Allow extras"
          desc="Record characters typed past the word's length as extras (off silently ignores them)"
          value={prefs.allowExtras}
          onChange={(v) => set("allowExtras", v)}
          offPreview={<ExtrasSample on={false} />}
          onPreview={<ExtrasSample on={true} />}
        />
        <ToggleRow
          label="Strict space"
          desc="Refuse to advance to the next word until the current word is fully typed correctly"
          value={prefs.strictSpace}
          onChange={(v) => set("strictSpace", v)}
          offPreview={<StrictSpaceSample on={false} />}
          onPreview={<StrictSpaceSample on={true} />}
        />
        <ToggleRow
          label="Blind mode"
          desc="Hide all live signal — type without seeing what you typed or how fast you're going"
          value={prefs.blindMode}
          onChange={(v) => set("blindMode", v)}
          offPreview={<BlindSample on={false} />}
          onPreview={<BlindSample on={true} />}
        />
      </SettingsSection>

      <SettingsSection
        id="word-list"
        eyebrow="Source"
        title="Word list"
        description="Which words land in the passage. Filter short noise out, or sprinkle numbers and punctuation in to practice the symbols you actually use."
        preview={<WordListPreview prefs={prefs} />}
      >
        <SettingsRow
          label={
            <span className="flex flex-col gap-0.5">
              <span>Minimum word length</span>
              <span className="text-xs font-normal text-muted-foreground">
                Filter short words out of the word lists
              </span>
            </span>
          }
          control={
            <SelectChips
              value={prefs.minWordLength}
              options={MIN_WORD_OPTIONS}
              onChange={(v) => set("minWordLength", v)}
            />
          }
        />
        <ToggleRow
          label="Show secondary"
          desc="Sprinkle numbers and punctuation into word mode"
          value={prefs.showSecondary}
          onChange={(v) => set("showSecondary", v)}
          offPreview={<SecondarySample on={false} />}
          onPreview={<SecondarySample on={true} />}
        />
      </SettingsSection>

      <SettingsSection
        id="burst"
        eyebrow="Burst"
        title="Burst mode threshold"
        description="The WPM floor each word has to clear in BURST mode. Auto uses your rolling average so the bar moves with you; a custom number freezes it at that pace until you change it."
      >
        <SettingsRow
          label={
            <span className="flex flex-col gap-0.5">
              <span>Threshold WPM</span>
              <span className="text-xs font-normal text-muted-foreground">
                0 (auto) = your rolling average across recent runs
              </span>
            </span>
          }
          control={
            <SliderRow
              value={prefs.burstThreshold}
              min={0}
              max={200}
              step={5}
              format={(v) => (v === 0 ? "auto" : `${v} wpm`)}
              onChange={(v) => set("burstThreshold", v)}
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        id="audio"
        eyebrow="Sound"
        title="Audio"
        description="Per-keystroke click feedback. Synthesized live (no asset payload); plays through the page's audio context on every printable key + space + backspace."
      >
        <ToggleRow
          label="Keypress click"
          desc="Fires a short click on each keystroke"
          value={audio.keypressClickEnabled}
          onChange={(v) => updateAudio("keypressClickEnabled", v)}
          offPreview={<KeypressClickSample on={false} />}
          onPreview={<KeypressClickSample on={true} />}
        />
        <SettingsRow
          label={
            <span className="flex flex-col gap-0.5">
              <span>Click volume</span>
              <span className="text-xs font-normal text-muted-foreground">
                0 mutes; 100 is the loudest the synthesis will run
              </span>
            </span>
          }
          control={
            <SliderRow
              value={audio.keypressClickVolume}
              min={0}
              max={100}
              step={5}
              format={(v) => `${v}%`}
              onChange={(v) => updateAudio("keypressClickVolume", v)}
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        id="adaptive"
        eyebrow="Algorithm"
        title="Adaptive"
        description="How casual runs feed the adaptive engine. Training and race runs always contribute — they're the algorithm's primary signal."
      >
        <ToggleRow
          label="Exclude casual runs from adapt"
          desc="When on, casual-mode keystrokes don't update the bigram / trigram / word weakness models. Test results + PBs still record either way."
          value={prefs.excludeCasualFromAdapt}
          onChange={(v) => set("excludeCasualFromAdapt", v)}
        />
      </SettingsSection>

      <SpectateSection />
    </section>
  );
}
