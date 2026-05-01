"use client";

import { useState } from "react";
import { OptionSwitch } from "@/components/ui/option-switch";
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

/** Label-on-top wrapper used for each control group. The pill row
 *  itself is `<SegmentedControl>` from `@/components/ui` — same
 *  primitive used by Settings, so the two surfaces stay visually
 *  consistent. */
function Field({
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
      {children}
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
      <Field label="mode">
        <OptionSwitch
          name="mode"
          size="small"
          value={state.mode}
          onValueChange={(v) => dispatch({ type: "SET_MODE", mode: v as Mode })}
        >
          {MODES.map((m) => (
            <OptionSwitch.Control key={m} label={m.toLowerCase()} value={m} />
          ))}
        </OptionSwitch>
      </Field>

      <Field label="length">
        <OptionSwitch
          name="length"
          size="small"
          value={String(state.length)}
          onValueChange={(v) =>
            dispatch({ type: "SET_LENGTH", length: Number(v) as Length })
          }
        >
          {LENGTHS.map((l) => (
            <OptionSwitch.Control key={l} label={String(l)} value={String(l)} />
          ))}
        </OptionSwitch>
      </Field>

      <Field label="language">
        <OptionSwitch
          name="language"
          size="small"
          value={state.lang}
          onValueChange={(v) => dispatch({ type: "SET_LANG", lang: v as Lang })}
        >
          {LANGS.map((l) => (
            <OptionSwitch.Control
              key={l}
              label={l.toLowerCase().replace("en-common", "common")}
              value={l}
            />
          ))}
        </OptionSwitch>
      </Field>

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
    <div className="border-b border-ft-line-soft bg-card md:hidden">
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
