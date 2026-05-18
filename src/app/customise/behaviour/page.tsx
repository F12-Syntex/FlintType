"use client";

import {
  type BehaviourPrefs,
  type Confidence,
  useBehaviourPrefs,
} from "@/lib/behaviour-prefs";
import { Chip, ChipGroup } from "../_components/chip";
import { SettingsPageHeader } from "../_components/page-header";
import { SettingsRow } from "../_components/row";
import { SettingsSection } from "../_components/settings-section";
import {
  InputHandlingPreview,
  WordListPreview,
} from "./_components/section-previews";

function ToggleChips({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <ChipGroup>
      <Chip label="Off" active={!value} onClick={() => onChange(false)} />
      <Chip label="On" active={value} onClick={() => onChange(true)} />
    </ChipGroup>
  );
}

function SelectChips<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <ChipGroup>
      {options.map((o) => (
        <Chip
          key={o.id}
          label={o.label}
          active={value === o.id}
          onClick={() => onChange(o.id)}
        />
      ))}
    </ChipGroup>
  );
}

const CONFIDENCE_OPTIONS: readonly { id: Confidence; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "word", label: "Word" },
  { id: "all", label: "All" },
];

const MIN_WORD_OPTIONS: readonly { id: number; label: string }[] = [
  { id: 1, label: "1" },
  { id: 2, label: "2" },
  { id: 3, label: "3" },
  { id: 4, label: "4" },
  { id: 5, label: "5" },
  { id: 6, label: "6" },
  { id: 7, label: "7" },
  { id: 8, label: "8" },
];

function ToggleRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (next: boolean) => void;
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
      control={<ToggleChips value={value} onChange={onChange} />}
    />
  );
}

export default function BehaviourPage() {
  const { prefs, update, reset, customizedCount } = useBehaviourPrefs();

  const set = <K extends keyof BehaviourPrefs>(
    key: K,
    value: BehaviourPrefs[K],
  ) => update(key, value);

  return (
    <section className="text-foreground">
      <SettingsPageHeader
        eyebrow="Customise · Behaviour"
        title="Make it act the way you think"
        customizedCount={customizedCount}
        onResetAll={reset}
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
        />
        <ToggleRow
          label="Strict space"
          desc="Refuse to advance to the next word until the current word is fully typed correctly"
          value={prefs.strictSpace}
          onChange={(v) => set("strictSpace", v)}
        />
        <ToggleRow
          label="Blind mode"
          desc="Hide all live signal — type without seeing what you typed or how fast you're going"
          value={prefs.blindMode}
          onChange={(v) => set("blindMode", v)}
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
    </section>
  );
}
