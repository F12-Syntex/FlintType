"use client";

import { useState } from "react";
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
        className="inline-flex flex-wrap items-center gap-0.5 rounded-md border border-ft-line-soft bg-white p-0.5 shadow-[0_1px_0_0_hsl(38_20%_82%)]"
      >
        {children}
      </div>
    </div>
  );
}

// ─── Option pill ───────────────────────────────────────────────────

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
        "cursor-pointer rounded px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] transition-all outline-none sm:px-2.5 sm:text-[11px]",
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

// ─── Full pill UI shared by mobile (expanded) and desktop ───────────
// Vertical stack on mobile, horizontal flow on md+.

function ModeControls() {
  const { state, dispatch } = usePractice();
  return (
    <div className="flex flex-col items-stretch gap-3 md:flex-row md:flex-wrap md:items-end md:justify-center md:gap-x-8 md:gap-y-4">
      <Segment label="mode">
        <PillGroup
          ariaLabel="Test mode"
          items={MODES}
          active={state.mode}
          onSelect={(mode) => dispatch({ type: "SET_MODE", mode })}
        />
      </Segment>

      <Segment label="length">
        <PillGroup
          ariaLabel="Word count"
          items={LENGTHS}
          active={state.length}
          onSelect={(length) => dispatch({ type: "SET_LENGTH", length })}
        />
      </Segment>

      <Segment label="language">
        <PillGroup
          ariaLabel="Language"
          items={LANGS}
          active={state.lang}
          onSelect={(lang) => dispatch({ type: "SET_LANG", lang })}
        />
      </Segment>

      <label className="flex cursor-pointer items-center gap-2.5 md:self-end md:pb-[7px]">
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
  );
}

// ─── Mobile: collapsed summary that expands inline ────────────────
// Closed: a single thin row showing the current selections so the user
// always sees state. Tap to expand the full pill UI; tap again or pick
// any option to leave it open until they collapse it themselves.

function MobileBar() {
  const { state } = usePractice();
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-ft-line-soft bg-white md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mode-bar-controls"
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-ft-dim transition-colors hover:text-ft-ink"
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          <span className="font-semibold text-ft-ink">{state.mode}</span>
          <span aria-hidden className="text-ft-dim/60">·</span>
          <span className="font-semibold text-ft-ink">{state.length}</span>
          <span aria-hidden className="text-ft-dim/60">·</span>
          <span className="font-semibold text-ft-ink">{state.lang}</span>
          {state.adapt ? (
            <>
              <span aria-hidden className="text-ft-dim/60">·</span>
              <span className="font-semibold text-ft-ember">adapt</span>
            </>
          ) : null}
        </span>
        <span aria-hidden className="text-[12px] leading-none">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <div id="mode-bar-controls" className="px-4 pt-1 pb-3">
          <ModeControls />
        </div>
      ) : null}
    </div>
  );
}

// ─── Desktop: original horizontal dock ─────────────────────────────

function DesktopBar() {
  return (
    <div className="hidden shrink-0 items-center justify-center px-7 py-4 md:flex">
      <ModeControls />
    </div>
  );
}

export function ModeBar() {
  return (
    <>
      <MobileBar />
      <DesktopBar />
    </>
  );
}
