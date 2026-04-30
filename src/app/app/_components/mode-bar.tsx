"use client";

import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";
import {
  type Lang,
  type Length,
  type Mode,
  usePractice,
} from "./practice-state";

function ChipGroup<T extends string | number>({
  label,
  items,
  active,
  onSelect,
  ariaLabel,
}: {
  label: string;
  items: readonly T[];
  active: T;
  onSelect: (item: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Tag>{label}</Tag>
      <div role="radiogroup" aria-label={ariaLabel} className="flex gap-0.5">
        {items.map((it) => {
          const selected = it === active;
          return (
            <button
              key={String(it)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={(e) => {
                onSelect(it);
                e.currentTarget.blur();
              }}
              className={cn(
                "px-2 py-1 text-[11px] tracking-[0.1em] transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ft-ember",
                selected
                  ? "border border-ft-ink bg-ft-ink text-ft-paper"
                  : "border border-transparent text-ft-dim-2 hover:border-ft-line-soft hover:bg-ft-paper hover:text-ft-ink",
              )}
            >
              {it}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({
  on,
  onChange,
  ariaLabel,
}: {
  on: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={(e) => {
        onChange();
        e.currentTarget.blur();
      }}
      className={cn(
        "inline-flex h-3.5 w-7 items-center border p-px transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ft-ember",
        on ? "border-ft-ember bg-ft-ember" : "border-ft-dim",
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

const MODES: readonly Mode[] = ["WORDS", "TIME", "QUOTE", "CODE"];
const LENGTHS: readonly Length[] = [25, 50, 100, 200];
const LANGS: readonly Lang[] = ["EN", "EN-COMMON", "PROGRAMMING"];

export function ModeBar() {
  const { state, dispatch } = usePractice();

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-b border-ft-line-soft bg-ft-paper-2/45 px-5 py-4 sm:px-7">
      <ChipGroup
        label="MODE"
        ariaLabel="Test mode"
        items={MODES}
        active={state.mode}
        onSelect={(mode) => dispatch({ type: "SET_MODE", mode })}
      />
      <span aria-hidden className="hidden h-5 w-px bg-ft-line-soft md:inline" />
      <ChipGroup
        label="LENGTH"
        ariaLabel="Word count"
        items={LENGTHS}
        active={state.length}
        onSelect={(length) => dispatch({ type: "SET_LENGTH", length })}
      />
      <span aria-hidden className="hidden h-5 w-px bg-ft-line-soft md:inline" />
      <ChipGroup
        label="LANG"
        ariaLabel="Language"
        items={LANGS}
        active={state.lang}
        onSelect={(lang) => dispatch({ type: "SET_LANG", lang })}
      />
      <span aria-hidden className="hidden h-5 w-px bg-ft-line-soft md:inline" />
      <div className="flex items-center gap-2.5">
        <Tag>ADAPT</Tag>
        <Toggle
          on={state.adapt}
          onChange={() => dispatch({ type: "TOGGLE_ADAPT" })}
          ariaLabel="Adaptive drilling"
        />
        {state.adapt ? (
          <span className="text-[11px] tracking-wide text-ft-dim-2">
            · targeting{" "}
            <span className="font-semibold text-ft-ember">th, ou, sp</span>
          </span>
        ) : (
          <span className="text-[11px] tracking-wide text-ft-dim">· off</span>
        )}
      </div>
    </div>
  );
}
