"use client";

import { useState } from "react";
import { OptionSwitch } from "@/components/ui/option-switch";
import { QUOTE_GROUPS } from "@/lib/quotes";
import { cn } from "@/lib/utils";
import { type Mode, usePractice } from "./practice-state";

const MODES: readonly Mode[] = ["WORDS", "TIME", "QUOTE"];

type Preset = { value: number; label: string };

/** Length picker presets per mode. WORDS counts words, TIME counts
 *  seconds, QUOTE picks a length bracket from monkeytype's groups. */
const LENGTH_PRESETS: Record<Mode, ReadonlyArray<Preset>> = {
  WORDS: [25, 50, 100, 200].map((n) => ({ value: n, label: String(n) })),
  TIME: [15, 30, 60, 120].map((n) => ({ value: n, label: String(n) })),
  QUOTE: QUOTE_GROUPS.map((g) => ({ value: g.id, label: g.label })),
};

const LENGTH_FIELD_LABEL: Record<Mode, string> = {
  WORDS: "length",
  TIME: "duration",
  QUOTE: "length",
};

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
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
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
        "focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        on
          ? "border-primary bg-primary"
          : "border-muted-foreground/40 bg-muted hover:border-muted-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-4 rounded-full shadow-sm transition-transform",
          on
            ? "translate-x-5 bg-primary-foreground"
            : "translate-x-0 bg-muted-foreground",
        )}
      />
    </button>
  );
}

// ─── Full pill UI shared by mobile (expanded) and desktop ───────────
// Vertical stack on mobile, horizontal flow on md+.

function ModeControls() {
  const { state, setMode, setLength, toggleAdapt } = usePractice();
  const presets = LENGTH_PRESETS[state.mode];
  const lengthLabel = LENGTH_FIELD_LABEL[state.mode];
  return (
    <div className="flex flex-col items-stretch gap-3 md:flex-row md:flex-wrap md:items-end md:justify-center md:gap-x-8 md:gap-y-4">
      <Field label="mode">
        <OptionSwitch
          name="mode"
          size="small"
          value={state.mode}
          onValueChange={(v) => setMode(v as Mode)}
        >
          {MODES.map((m) => (
            <OptionSwitch.Control key={m} label={m.toLowerCase()} value={m} />
          ))}
        </OptionSwitch>
      </Field>

      <Field label={lengthLabel}>
        <OptionSwitch
          name="length"
          size="small"
          value={String(state.length)}
          onValueChange={(v) => setLength(Number(v))}
        >
          {presets.map((p) => (
            <OptionSwitch.Control
              key={p.value}
              label={p.label}
              value={String(p.value)}
            />
          ))}
        </OptionSwitch>
      </Field>

      <label className="flex cursor-pointer items-center gap-2.5 md:self-end md:pb-[7px]">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          adapt
        </span>
        <Toggle
          on={state.adapt}
          onToggle={toggleAdapt}
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
  // Mobile summary line — show the mode-appropriate length label so the
  // user can read state without expanding the controls.
  const lengthSummary =
    state.mode === "QUOTE"
      ? (QUOTE_GROUPS[state.length as 0 | 1 | 2 | 3]?.label ?? "")
      : state.mode === "TIME"
        ? `${state.length}s`
        : String(state.length);
  return (
    <div className="border-b border-border bg-card md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mode-bar-controls"
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          <span className="font-semibold text-foreground">{state.mode}</span>
          <span aria-hidden className="text-muted-foreground/60">·</span>
          <span className="font-semibold text-foreground">{lengthSummary}</span>
          {state.adapt ? (
            <>
              <span aria-hidden className="text-muted-foreground/60">·</span>
              <span className="font-semibold text-primary">adapt</span>
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
