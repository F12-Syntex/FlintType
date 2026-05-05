"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { OptionSwitch } from "@/components/ui/option-switch";
import { QUOTE_GROUPS } from "@/lib/quotes";
import { cn } from "@/lib/utils";
import { HandLayoutEditor } from "./keyboard/hands";
import { type Mode, usePractice } from "./practice-state";

const MODES: readonly Mode[] = ["WORDS", "TIME", "QUOTE"];

type Preset = { value: number; label: string };

/** Length picker presets per mode. WORDS counts words, TIME counts
 *  seconds, QUOTE picks a length bracket from monkeytype's groups. */
const LENGTH_PRESETS: Record<Mode, ReadonlyArray<Preset>> = {
  WORDS: [10, 25, 50, 100, 200].map((n) => ({ value: n, label: String(n) })),
  TIME: [15, 30, 60, 120].map((n) => ({ value: n, label: String(n) })),
  QUOTE: QUOTE_GROUPS.map((g) => ({ value: g.id, label: g.label })),
};

/** Modes that expose a free-form custom length input next to the preset
 *  pills. WORDS supports any positive count; TIME any positive seconds.
 *  QUOTE doesn't (group brackets are discrete). */
const CUSTOM_ALLOWED: Record<Mode, boolean> = {
  WORDS: true,
  TIME: false,
  QUOTE: false,
};

const CUSTOM_LIMITS = { min: 1, max: 1000 };

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

// ─── LengthPicker ──────────────────────────────────────────────────

/** Pill-row of preset chips that visually matches `<OptionSwitch>` plus
 *  an optional `custom` chip that swaps for an inline number input on
 *  click. We re-implement the look here instead of nesting OptionSwitch
 *  because OptionSwitch wraps each child in a radio label and doesn't
 *  let an item morph into an input on demand. */
function LengthPicker({
  presets,
  value,
  onChange,
  allowCustom,
}: {
  presets: ReadonlyArray<Preset>;
  value: number;
  onChange: (next: number) => void;
  allowCustom: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const isPreset = presets.some((p) => p.value === value);
  const customSelected = allowCustom && !isPreset;

  const apply = () => {
    const n = Number.parseInt(draft, 10);
    if (Number.isFinite(n)) {
      const clamped = Math.max(
        CUSTOM_LIMITS.min,
        Math.min(CUSTOM_LIMITS.max, n),
      );
      onChange(clamped);
    }
    setEditing(false);
    setDraft("");
  };

  const cancel = () => {
    setEditing(false);
    setDraft("");
  };

  const chipClass = (active: boolean) =>
    cn(
      "flex h-full items-center justify-center rounded-sm px-2.5 text-xs font-medium transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-muted p-1">
      {presets.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => {
            cancel();
            onChange(p.value);
          }}
          className={chipClass(value === p.value && !editing)}
        >
          {p.label}
        </button>
      ))}
      {allowCustom ? (
        editing ? (
          <input
            type="number"
            min={CUSTOM_LIMITS.min}
            max={CUSTOM_LIMITS.max}
            placeholder={String(value)}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={apply}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            className="h-full w-14 rounded-sm bg-background px-2 text-xs text-foreground tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Custom length"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(customSelected ? String(value) : "");
              setEditing(true);
            }}
            className={chipClass(customSelected)}
            aria-label="Custom length"
          >
            {customSelected ? String(value) : "custom"}
          </button>
        )
      ) : null}
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
  const { state, setMode, setLength } = usePractice();
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
        <LengthPicker
          presets={presets}
          value={state.length}
          onChange={setLength}
          allowCustom={CUSTOM_ALLOWED[state.mode]}
        />
      </Field>
    </div>
  );
}

/** Desktop-only Adapt control — a chip showing the current on/off state
 *  that opens a modal containing the live keyboard visualisation and
 *  the user's hand layout editor. We deliberately use a portal-backed
 *  modal rather than a Radix Popover here because:
 *   - Popover positions content with a CSS transform, which becomes
 *     the containing block for any descendant `position: fixed`
 *     element (the drag avatar) — leading to the avatar being
 *     placed wildly off-cursor.
 *   - The hand-layout editor's drag/click interactions need to coexist
 *     with the keyboard underneath without the popover treating any
 *     of them as outside-clicks and self-dismissing.
 *  Hidden on mobile per spec — adaptive drilling is a desktop-leaning
 *  feature; the small-viewport flow doesn't expose it at all. */
function AdaptControl() {
  const { state, toggleAdapt } = usePractice();
  const [open, setOpen] = useState(false);
  return (
    <Field label="adapt">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-8 items-center gap-2 rounded-md border border-border bg-muted px-3 text-xs font-medium transition-colors hover:bg-muted/70",
          state.adapt ? "text-foreground" : "text-muted-foreground",
        )}
        aria-label={`Adaptive drilling: ${state.adapt ? "on" : "off"} — open editor`}
      >
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            state.adapt ? "bg-primary" : "bg-muted-foreground/40",
          )}
        />
        {state.adapt ? "on" : "off"}
      </button>
      <AdaptModal
        open={open}
        onClose={() => setOpen(false)}
        adaptOn={state.adapt}
        onToggleAdapt={toggleAdapt}
      />
    </Field>
  );
}

/** Centred modal hosting the hand-layout editor. Backdrop click and
 *  ESC close; clicks inside the panel never close (which is the whole
 *  point of dropping the popover here). Portalled to document.body
 *  so descendant `position: fixed` elements are anchored to the
 *  viewport, not to a transformed ancestor. */
function AdaptModal({
  open,
  onClose,
  adaptOn,
  onToggleAdapt,
}: {
  open: boolean;
  onClose: () => void;
  adaptOn: boolean;
  onToggleAdapt: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Body scroll lock + ESC dismissal while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Adaptive drilling"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/45 backdrop-blur-sm"
      />
      <div
        className="relative flex w-[min(48rem,calc(100vw-2rem))] max-h-[90dvh] flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              adaptive drilling
            </span>
            <span className="text-sm text-foreground">
              Focus future passages on your weakest keys.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Toggle on={adaptOn} onToggle={onToggleAdapt} ariaLabel="Adaptive drilling" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-md border border-border bg-background p-3">
            <HandLayoutEditor mode="static" />
          </div>
        </div>
      </div>
    </div>,
    document.body,
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
    <div className="border-b border-border bg-background md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mode-bar-controls"
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <span className="font-semibold text-foreground">{state.mode}</span>
          <span aria-hidden className="text-muted-foreground/60">·</span>
          <span className="font-semibold text-foreground">{lengthSummary}</span>
        </span>
        <ChevronIcon open={open} />
      </button>
      {open ? (
        <div id="mode-bar-controls" className="px-4 pt-1 pb-3">
          <ModeControls />
        </div>
      ) : null}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0 transition-transform duration-150"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// ─── Desktop: original horizontal dock ─────────────────────────────

function DesktopBar() {
  return (
    <div className="hidden shrink-0 items-end justify-center gap-x-8 gap-y-4 px-7 py-4 md:flex md:flex-wrap">
      <ModeControls />
      <AdaptControl />
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
