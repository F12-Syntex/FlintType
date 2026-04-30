"use client";

import { cn } from "@/lib/utils";
import {
  type Lang,
  type Length,
  type Mode,
  usePractice,
} from "./practice-state";

const MODES: readonly Mode[] = ["WORDS", "TIME", "QUOTE", "CODE"];
const LENGTHS: readonly Length[] = [25, 50, 100, 200];
const LANGS: readonly Lang[] = ["EN", "EN-COMMON", "PROGRAMMING"];

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.2em] text-ft-dim">
      {children}
    </span>
  );
}

function Pill<T extends string | number>({
  value,
  active,
  onClick,
}: {
  value: T;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={(e) => {
        onClick();
        e.currentTarget.blur();
      }}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs uppercase tracking-[0.1em] transition-colors outline-none",
        "focus-visible:ring-1 focus-visible:ring-ft-ember",
        active
          ? "bg-ft-ember/10 font-semibold text-ft-ember"
          : "text-ft-dim hover:text-ft-ink",
      )}
    >
      {value}
    </button>
  );
}

function Group<T extends string | number>({
  label,
  ariaLabel,
  items,
  active,
  onSelect,
}: {
  label: string;
  ariaLabel: string;
  items: readonly T[];
  active: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <GroupLabel>{label}</GroupLabel>
      <div role="radiogroup" aria-label={ariaLabel} className="flex gap-0.5">
        {items.map((it) => (
          <Pill
            key={String(it)}
            value={it}
            active={it === active}
            onClick={() => onSelect(it)}
          />
        ))}
      </div>
    </div>
  );
}

function Toggle({
  on,
  onToggle,
  ariaLabel,
}: {
  on: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={(e) => {
        onToggle();
        e.currentTarget.blur();
      }}
      className={cn(
        "inline-flex h-4 w-7 items-center rounded-full border p-0.5 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ft-ember",
        on ? "border-ft-ember bg-ft-ember" : "border-ft-line-soft hover:border-ft-dim",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2.5 rounded-full transition-transform",
          on ? "translate-x-3 bg-white" : "translate-x-0 bg-ft-dim",
        )}
      />
    </button>
  );
}

export function ModeBar() {
  const { state, dispatch } = usePractice();

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-6 gap-y-2 border-b border-ft-line-soft px-5 py-3.5 sm:px-7">
      <Group
        label="mode"
        ariaLabel="Test mode"
        items={MODES}
        active={state.mode}
        onSelect={(mode) => dispatch({ type: "SET_MODE", mode })}
      />
      <Group
        label="length"
        ariaLabel="Word count"
        items={LENGTHS}
        active={state.length}
        onSelect={(length) => dispatch({ type: "SET_LENGTH", length })}
      />
      <Group
        label="lang"
        ariaLabel="Language"
        items={LANGS}
        active={state.lang}
        onSelect={(lang) => dispatch({ type: "SET_LANG", lang })}
      />
      <div className="flex items-center gap-2">
        <GroupLabel>adapt</GroupLabel>
        <Toggle
          on={state.adapt}
          onToggle={() => dispatch({ type: "TOGGLE_ADAPT" })}
          ariaLabel="Adaptive drilling"
        />
      </div>
    </div>
  );
}
