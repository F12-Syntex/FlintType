"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type BehaviourPrefs,
  type Confidence,
  type Difficulty,
  useBehaviourPrefs,
} from "@/lib/behaviour-prefs";
import { Chip, ChipGroup } from "../_components/chip";
import { SettingsRow } from "../_components/row";

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

const DIFFICULTY_OPTIONS: readonly { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "normal", label: "Normal" },
  { id: "expert", label: "Expert" },
  { id: "master", label: "Master" },
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

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span aria-hidden className="inline-block h-px w-5 bg-primary" />
      <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </h3>
    </div>
  );
}

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

  // Tiny typed wrapper so the row callbacks stay terse below.
  const set = <K extends keyof BehaviourPrefs>(
    key: K,
    value: BehaviourPrefs[K],
  ) => update(key, value);

  return (
    <section className="text-foreground">
      <header className="mb-6 border-b border-border pb-4">
        <div className="mb-2 flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Section
          </span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight">Behaviour</h2>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="px-2 text-[0.65rem]">
              10 options
            </Badge>
            {customizedCount > 0 ? (
              <Badge className="px-2 text-[0.65rem]">
                {customizedCount} customized
              </Badge>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={customizedCount === 0}
            >
              Reset all
            </Button>
          </div>
        </div>
      </header>

      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
        Tune how the test reacts while you type — restart shortcuts, live
        signal, error handling, and word-list shape. Every change applies
        to the next keystroke and persists across reloads.
      </p>

      <SectionHeader label="Restart" />
      <div className="mb-8 flex flex-col gap-3">
        <ToggleRow
          label="Quick restart"
          desc="Press Tab to restart instantly without losing focus"
          value={prefs.quickRestart}
          onChange={(v) => set("quickRestart", v)}
        />
      </div>

      <SectionHeader label="Live signal" />
      <div className="mb-8 flex flex-col gap-3">
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
      </div>

      <SectionHeader label="Input handling" />
      <div className="mb-8 flex flex-col gap-3">
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
      </div>

      <SectionHeader label="Word list" />
      <div className="mb-8 flex flex-col gap-3">
        <SettingsRow
          label={
            <span className="flex flex-col gap-0.5">
              <span>Difficulty</span>
              <span className="text-xs font-normal text-muted-foreground">
                Skews the word list toward shorter or longer words
              </span>
            </span>
          }
          control={
            <SelectChips
              value={prefs.difficulty}
              options={DIFFICULTY_OPTIONS}
              onChange={(v) => set("difficulty", v)}
            />
          }
        />
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
      </div>
    </section>
  );
}
