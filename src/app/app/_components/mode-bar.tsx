"use client";

import { Tag } from "@/components/ft";
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

function Option<T extends string | number>({
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
        "px-1 py-1 text-[11px] tracking-[0.1em] uppercase transition-colors outline-none",
        "focus-visible:text-ft-ink",
        active
          ? "border-b border-ft-ember pb-0.5 font-semibold text-ft-ink"
          : "text-ft-dim hover:text-ft-ink",
      )}
    >
      {value}
    </button>
  );
}

function Group<T extends string | number>({
  label,
  items,
  active,
  onSelect,
  ariaLabel,
}: {
  label: string;
  items: readonly T[];
  active: T;
  onSelect: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Tag>{label}</Tag>
      <div role="radiogroup" aria-label={ariaLabel} className="flex gap-3">
        {items.map((it) => (
          <Option
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

function Switch({
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
        "inline-flex h-3.5 w-7 items-center border p-px transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ft-ember",
        on ? "border-ft-ember bg-ft-ember" : "border-ft-dim hover:border-ft-ink",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2.5 transition-transform",
          on ? "translate-x-3 bg-white" : "translate-x-0 bg-ft-dim",
        )}
      />
    </button>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-ft-line-soft text-xs">
      ·
    </span>
  );
}

export function ModeBar() {
  const { state, dispatch } = usePractice();

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-b border-ft-line-soft px-5 py-5 sm:px-7">
      <Group
        label="MODE"
        ariaLabel="Test mode"
        items={MODES}
        active={state.mode}
        onSelect={(mode) => dispatch({ type: "SET_MODE", mode })}
      />
      <Dot />
      <Group
        label="LENGTH"
        ariaLabel="Word count"
        items={LENGTHS}
        active={state.length}
        onSelect={(length) => dispatch({ type: "SET_LENGTH", length })}
      />
      <Dot />
      <Group
        label="LANG"
        ariaLabel="Language"
        items={LANGS}
        active={state.lang}
        onSelect={(lang) => dispatch({ type: "SET_LANG", lang })}
      />
      <Dot />
      <div className="flex items-center gap-3">
        <Tag>ADAPT</Tag>
        <Switch
          on={state.adapt}
          onToggle={() => dispatch({ type: "TOGGLE_ADAPT" })}
          ariaLabel="Adaptive drilling"
        />
      </div>
    </div>
  );
}
