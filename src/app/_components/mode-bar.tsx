"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Info, Lock, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { OptionSwitch } from "@/components/ui/option-switch";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { QUOTE_GROUPS } from "@/lib/quotes";
import { cn } from "@/lib/utils";
import { wordlistLabel } from "@/lib/wordlists/use-wordlist";
import { HandLayoutEditor } from "./keyboard/hands";
import { type Mode, usePractice } from "./practice-state";
import { WordlistPicker } from "./wordlist-picker";

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

// ─── Full pill UI shared by mobile (expanded) and desktop ───────────
// Vertical stack on mobile, horizontal flow on md+.

function ModeControls() {
  const { state, setMode, setLength, wordlist, setWordlist } = usePractice();
  const presets = LENGTH_PRESETS[state.mode];
  const lengthLabel = LENGTH_FIELD_LABEL[state.mode];
  const [wordlistOpen, setWordlistOpen] = useState(false);
  // Wordlist chip only makes sense for word-pool modes — QUOTE pulls
  // from the curated quote pool, not the wordlist catalog.
  const showWordlist = state.mode === "WORDS" || state.mode === "TIME";
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

      {showWordlist ? (
        <Field label="wordlist">
          {/* Visual parity with <OptionSwitch size="small">: same
              outer shell (bg-muted + p-1 + border + h-8 + rounded-md)
              and an inner pill that matches the active chip class.
              The dropdown caret is omitted to stay consistent with
              the other mode-bar controls — the underlying interaction
              (click to open a picker) is shared with the language /
              theme buttons elsewhere in the app. */}
          <div className="inline-flex h-8 items-center rounded-md border border-border bg-muted p-1">
            <button
              type="button"
              onClick={() => setWordlistOpen(true)}
              className={cn(
                "flex h-full items-center justify-center rounded-sm px-2.5",
                "text-xs font-medium font-sans duration-150",
                "bg-primary text-primary-foreground",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              )}
            >
              <span className="max-w-[180px] truncate">
                {wordlistLabel(wordlist)}
              </span>
            </button>
          </div>
          <WordlistPicker
            open={wordlistOpen}
            onOpenChange={setWordlistOpen}
            value={wordlist}
            onPick={(id) => {
              setWordlist(id);
              setWordlistOpen(false);
            }}
          />
        </Field>
      ) : null}
    </div>
  );
}

/** Desktop-only Adapt control. Two-way pill toggles between
 *  `practice` (vanilla word list) and `adapt` (algorithm-biased
 *  word list). The Info icon next to the pill opens the same
 *  portal-backed modal as before, hosting the explainer copy and
 *  the live hand-layout editor — that's the "change the layout"
 *  affordance, decoupled from the on/off decision.
 *
 *  We deliberately use a portal-backed modal rather than a Radix
 *  Popover for the editor because:
 *   - Popover positions content with a CSS transform, which becomes
 *     the containing block for any descendant `position: fixed`
 *     element (the drag avatar) — leading to the avatar being
 *     placed wildly off-cursor.
 *   - The hand-layout editor's drag/click interactions need to coexist
 *     with the keyboard underneath without the popover treating any
 *     of them as outside-clicks and self-dismissing.
 *  Hidden on mobile per spec — adaptive practice is a desktop-leaning
 *  feature; the small-viewport flow doesn't expose it at all. */
function AdaptControl() {
  const { state, toggleAdapt } = usePractice();
  // Adaptive practice is account-gated — see practice-state.tsx for the
  // matching effective-state guard. Treat the viewer as anonymous while
  // Clerk is still loading so the pill never momentarily flips between
  // "locked" and "off" on first paint.
  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const requiresSignIn = !userLoaded || isSignedIn !== true;
  const [open, setOpen] = useState(false);
  const adaptOn = state.adapt && !requiresSignIn;
  const value: "practice" | "adapt" = adaptOn ? "adapt" : "practice";
  return (
    <Field label="adapt">
      <div className="flex items-center gap-1.5">
        <OptionSwitch
          name="adapt"
          size="small"
          value={value}
          onValueChange={(v) => {
            // Locked viewers can flip the chip *into* adapt — we
            // pop the modal so they see the sign-in CTA, but the
            // store stays off until they actually authenticate.
            if (v === "adapt" && requiresSignIn) {
              setOpen(true);
              return;
            }
            if (v === "adapt" && !state.adapt) toggleAdapt();
            if (v === "practice" && state.adapt) toggleAdapt();
          }}
        >
          <OptionSwitch.Control label="practice" value="practice" />
          <OptionSwitch.Control
            value="adapt"
            label={
              <span className="inline-flex items-center gap-1">
                adapt
                {requiresSignIn ? (
                  <Lock size={10} aria-hidden className="opacity-70" />
                ) : null}
              </span>
            }
          />
        </OptionSwitch>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Adaptive practice details and hand layout"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Info size={13} aria-hidden />
        </button>
      </div>
      <AdaptModal
        open={open}
        onClose={() => setOpen(false)}
        adaptOn={adaptOn}
        requiresSignIn={requiresSignIn}
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
  requiresSignIn,
}: {
  open: boolean;
  onClose: () => void;
  /** Whether the user currently has adapt selected. Surfaces a calm
   *  status line in the header so the modal communicates state
   *  alongside the explainer — the actual flip happens via the
   *  pill toggle in the mode-bar, not in here. */
  adaptOn: boolean;
  /** When true the viewer is anonymous and adaptive practice is locked.
   *  The header replaces the status line with a sign-in CTA and the
   *  body shows a single explainer line above the algorithm copy. */
  requiresSignIn: boolean;
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
      aria-label="Adaptive practice"
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
              adaptive practice
            </span>
            <span className="text-sm text-foreground">
              Practice biases toward what's actually slowing you down.
            </span>
          </div>
          <div className="flex items-center gap-3">
            {requiresSignIn ? (
              <Link
                href="/sign-in"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/[0.06] px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/[0.12]"
              >
                <Lock size={12} aria-hidden /> Sign in to enable
              </Link>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em]",
                  adaptOn
                    ? "border-primary/40 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    adaptOn ? "bg-primary" : "bg-muted-foreground/40",
                  )}
                />
                {adaptOn ? "adapt on" : "practice mode"}
              </span>
            )}
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
          {requiresSignIn ? (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/[0.04] px-3 py-2.5 text-xs leading-relaxed text-foreground">
              <Lock size={14} aria-hidden className="mt-0.5 shrink-0 text-primary" />
              <span>
                Adaptive practice keeps a private model of your timings on
                our server, so it needs an account.{" "}
                <Link
                  href="/sign-in"
                  className="text-primary underline underline-offset-2 hover:no-underline"
                >
                  Sign in
                </Link>{" "}
                or{" "}
                <Link
                  href="/sign-up"
                  className="text-primary underline underline-offset-2 hover:no-underline"
                >
                  create an account
                </Link>{" "}
                to enable it.
              </span>
            </div>
          ) : null}
          <div className="mb-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Every keystroke timing feeds three models:{" "}
              <span className="text-foreground">bigrams</span> and{" "}
              <span className="text-foreground">trigrams</span> for the pairs
              and triplets you actually type, plus{" "}
              <span className="text-foreground">motor features</span> from the
              hand layout below — same-finger transitions, cross-hand jumps,
              row-jumps.
            </p>
            <p>
              Each pattern's running mean is compared against your own
              baseline. Where you've fallen behind scores as weakness,
              weighted by sample confidence.
            </p>
            <p>
              Future passages sample from a{" "}
              <span className="text-foreground">challenge band</span> just
              above your current speed — never so far that you stall — with a
              recency penalty so words don't repeat, and a fatigue dampener
              when recent sessions show you slowing.
            </p>
            <p className="text-xs">
              Adaptive practice runs on desktop only — phones always behave
              as if it's off.
            </p>
          </div>
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

/** Compact inline rendering — mode · length · adapt · quote group,
 *  middot-separated text on the page bg. Read-only summary; the user
 *  edits these from /customise. Honours `modeBarStyle: "inline"`. */
function InlineBar() {
  const { state } = usePractice();
  const parts: string[] = [state.mode.toLowerCase(), String(state.length)];
  if (state.mode === "QUOTE" && state.quoteSource) {
    parts.push(state.quoteSource);
  }
  if (state.adapt) parts.push("adapt");
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 ? (
            <span aria-hidden className="inline-block size-0.5 rounded-full bg-muted-foreground/60" />
          ) : null}
          {p}
        </span>
      ))}
    </div>
  );
}

export function ModeBar() {
  const { prefs } = useAppearancePrefs();
  if (prefs.modeBarStyle === "hidden") return null;
  if (prefs.modeBarStyle === "inline") return <InlineBar />;
  return (
    <>
      <MobileBar />
      <DesktopBar />
    </>
  );
}
