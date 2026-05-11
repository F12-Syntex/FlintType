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
  LiveSignalPreview,
  RestartPreview,
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
        description="Tune how the test reacts while you type — restart shortcuts, live signal, error handling, and word-list shape. Every change applies on the next keystroke."
      />

      <SettingsSection
        id="restart"
        eyebrow="Flow"
        title="Restart"
        description="The shortcut that takes you back to a fresh passage without a mouse trip."
        preview={<RestartPreview prefs={prefs} />}
      >
        <ToggleRow
          label="Quick restart"
          desc="Press Tab to restart instantly without losing focus"
          value={prefs.quickRestart}
          onChange={(v) => set("quickRestart", v)}
        />
      </SettingsSection>

      <SettingsSection
        id="live-signal"
        eyebrow="Heads-up"
        title="Live signal"
        description="What the test surfaces while you type. The preview is the real Readouts strip — every toggle below gates its own pip in real time, exactly as on the test screen."
        preview={<LiveSignalPreview />}
      >
        <ToggleRow
          label="Live WPM"
          desc="Show WPM ticker during run"
          value={prefs.liveWpm}
          onChange={(v) => set("liveWpm", v)}
        />
        <ToggleRow
          label="Live accuracy"
          desc="Show accuracy % during run"
          value={prefs.liveAccuracy}
          onChange={(v) => set("liveAccuracy", v)}
        />
        <ToggleRow
          label="Live keyboard"
          desc="Show the keyboard widget under the passage"
          value={prefs.liveKeyboard}
          onChange={(v) => set("liveKeyboard", v)}
        />
        <ToggleRow
          label="Blind mode"
          desc="Hide all live signal — type without seeing what you typed"
          value={prefs.blindMode}
          onChange={(v) => set("blindMode", v)}
        />
      </SettingsSection>

      <SettingsSection
        id="input-handling"
        eyebrow="Discipline"
        title="Input handling"
        description="What happens when a keystroke is wrong. The preview is the real practice surface with a deliberate past-error word so the error colour token paints; live keystroke behaviour (stop-on-error, confidence) shows up at the test screen itself."
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
    </section>
  );
}
