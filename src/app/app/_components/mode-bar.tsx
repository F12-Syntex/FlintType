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
// Solid white card on the warm paper page so each group reads as a
// distinct unit. Subtle inner shadow / line-soft border carries the
// edge.

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
        className="inline-flex items-center gap-0.5 rounded-md border border-ft-line-soft bg-white p-0.5 shadow-[0_1px_0_0_hsl(38_20%_82%)]"
      >
        {children}
      </div>
    </div>
  );
}

// ─── Option pill ───────────────────────────────────────────────────
// Active: ember filled (the brand accent — same colour the rest of the
// app uses to signal "this is the live thing"). White text reads cleanly.
// Inactive: dim text on the white card.
// Hover: line-soft wash + ink colour — visible affordance over white.

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
          ? "bg-ft-ember text-white shadow-sm"
          : "text-ft-dim-2 hover:bg-ft-line-soft hover:text-ft-ink",
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
// Off-state contrast tuned so the track sits visibly *inside* the
// white segment card:
//   off track:  ft-paper-2  (warm cream, darker than the white card)
//   off knob:   ft-dim-2    (mid grey, clearly readable on the cream)
//   off border: ft-dim/40   (defined boundary, not hairline-soft)
//   on track:   ft-ember
//   on knob:    white

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
          : "border-ft-dim/40 bg-ft-paper-2 hover:border-ft-dim-2",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-4 rounded-full shadow-sm transition-transform",
          on ? "translate-x-5 bg-white" : "translate-x-0 bg-ft-dim-2",
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

        {/* ADAPT — single switch, no card. A bordered container around one
            control reads like wasted chrome. Inline label + switch keeps
            the control on the same baseline as the segments while
            visually deferring to them. */}
        <label className="flex cursor-pointer items-center gap-2.5 self-end pb-[7px]">
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-ft-dim">
            adapt
          </span>
          <Toggle
            on={state.adapt}
            onToggle={() => dispatch({ type: "TOGGLE_ADAPT" })}
            ariaLabel="Adaptive drilling"
          />
        </label>
      </div>
    </div>
  );
}
