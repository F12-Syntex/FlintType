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

// ─── Segment shell ─────────────────────────────────────────────────
// One labelled config group. Label sits above the controls so the eye
// reads "what is this" → "what are my options" without crossing the
// values themselves. Subtle border groups the options as one unit.

function Segment({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-ft-dim">
        {label}
      </span>
      <div
        role="group"
        className="inline-flex items-center gap-0.5 rounded-md border border-ft-line-soft bg-white/40 p-0.5"
      >
        {children}
      </div>
    </div>
  );
}

// ─── Option pill ───────────────────────────────────────────────────
// Segmented-control style: active = ink filled (high-contrast, obviously
// selected), inactive = plain text, hover = paper-2 wash + ink colour
// so the affordance is clear before the click. cursor-pointer always.

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
        "cursor-pointer rounded px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] transition-all outline-none",
        "focus-visible:ring-1 focus-visible:ring-ft-ember focus-visible:ring-offset-1 focus-visible:ring-offset-ft-paper",
        active
          ? "bg-ft-ink text-ft-paper shadow-sm"
          : "text-ft-dim-2 hover:bg-ft-paper-2 hover:text-ft-ink",
      )}
    >
      {value}
    </button>
  );
}

function PillGroup<T extends string | number>({
  ariaLabel,
  items,
  active,
  onSelect,
}: {
  ariaLabel: string;
  items: readonly T[];
  active: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="contents">
      {items.map((it) => (
        <Pill
          key={String(it)}
          value={it}
          active={it === active}
          onClick={() => onSelect(it)}
        />
      ))}
    </div>
  );
}

// ─── Toggle ────────────────────────────────────────────────────────
// Real switch — rounded-full pill, knob slides, cursor-pointer, hover
// border darkens on the inactive state so it reads as actionable.

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
        "inline-flex h-6 w-11 cursor-pointer items-center rounded-full border p-0.5 transition-colors outline-none",
        "focus-visible:ring-1 focus-visible:ring-ft-ember focus-visible:ring-offset-1 focus-visible:ring-offset-ft-paper",
        on
          ? "border-ft-ember bg-ft-ember"
          : "border-ft-line-soft bg-white hover:border-ft-dim-2",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-4 rounded-full transition-transform",
          on ? "translate-x-5 bg-white" : "translate-x-0 bg-ft-dim",
        )}
      />
    </button>
  );
}

// ─── Vertical separator ────────────────────────────────────────────

function Sep() {
  return (
    <span aria-hidden className="hidden h-9 w-px bg-ft-line-soft md:inline" />
  );
}

// ─── The dock ──────────────────────────────────────────────────────

export function ModeBar() {
  const { state, dispatch } = usePractice();

  return (
    <div className="flex shrink-0 items-center justify-center border-b border-ft-line-soft px-5 py-4 sm:px-7">
      <div className="flex flex-wrap items-end justify-center gap-x-6 gap-y-4">
        <Segment label="mode">
          <PillGroup
            ariaLabel="Test mode"
            items={MODES}
            active={state.mode}
            onSelect={(mode) => dispatch({ type: "SET_MODE", mode })}
          />
        </Segment>

        <Sep />

        <Segment label="length">
          <PillGroup
            ariaLabel="Word count"
            items={LENGTHS}
            active={state.length}
            onSelect={(length) => dispatch({ type: "SET_LENGTH", length })}
          />
        </Segment>

        <Sep />

        <Segment label="language">
          <PillGroup
            ariaLabel="Language"
            items={LANGS}
            active={state.lang}
            onSelect={(lang) => dispatch({ type: "SET_LANG", lang })}
          />
        </Segment>

        <Sep />

        <Segment label="adapt">
          <div className="flex h-[34px] items-center px-1.5">
            <Toggle
              on={state.adapt}
              onToggle={() => dispatch({ type: "TOGGLE_ADAPT" })}
              ariaLabel="Adaptive drilling"
            />
          </div>
        </Segment>
      </div>
    </div>
  );
}
