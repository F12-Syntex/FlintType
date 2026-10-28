"use client";

import { useUser } from "@clerk/nextjs";
import { ChevronDown, Info, Lock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QUOTE_GROUPS } from "@/lib/quotes";
import { cn } from "@/lib/utils";
import { wordlistLabel } from "@/lib/wordlists/use-wordlist";
import { AdaptModal } from "./adapt-modal";
import type { LengthPreset } from "./length-picker";
import { blurAfterPointerClick, SEGMENT_TRACK, segmentClass } from "./mode-segment";
import { type Mode, usePractice } from "./practice-state";
import { WordlistPicker } from "./wordlist-picker";

// Shared pieces of the practice mode bar (desktop capsule and the
// compact stacked bar both render these).

export const MODES: readonly { value: Mode; label: string }[] = [
  { value: "WORDS", label: "Words" },
  { value: "TIME", label: "Time" },
  { value: "QUOTE", label: "Quote" },
  { value: "BURST", label: "Burst" },
];

/** Plain-English names for the quote length brackets. The data layer
 *  calls the 600+ char bucket "thicc"; the UI never shows the slang
 *  (races say "Extra long" too, see race/lobby-config.ts). */
const QUOTE_LENGTH_NAMES = ["Short", "Medium", "Long", "Extra long"] as const;
const quoteLengthName = (id: number) => QUOTE_LENGTH_NAMES[id] ?? "";

/** Length presets per mode. WORDS counts words, TIME seconds, QUOTE
 *  picks a length bracket, BURST how many items to clear. */
export const LENGTH_PRESETS: Record<Mode, ReadonlyArray<LengthPreset>> = {
  WORDS: [10, 25, 50, 100, 200].map((n) => ({ value: n, label: String(n) })),
  TIME: [15, 30, 60, 120].map((n) => ({ value: n, label: String(n) })),
  QUOTE: QUOTE_GROUPS.map((g) => ({ value: g.id, label: quoteLengthName(g.id) })),
  BURST: [10, 20, 40, 80].map((n) => ({ value: n, label: String(n) })),
};

/** Modes with a free-form custom length next to the presets. */
export const CUSTOM_ALLOWED: Record<Mode, boolean> = {
  WORDS: true,
  TIME: false,
  QUOTE: false,
  BURST: true,
};

export const LENGTH_LABEL: Record<Mode, string> = {
  WORDS: "Words",
  TIME: "Seconds",
  QUOTE: "Length",
  BURST: "Items",
};

/** WORDS / TIME / BURST draw from the wordlist catalog; QUOTE uses the
 *  curated quote pool, so the wordlist control hides there. */
export const usesWordlist = (mode: Mode) => mode !== "QUOTE";

export function lengthSummary(mode: Mode, length: number): string {
  if (mode === "QUOTE") return quoteLengthName(length);
  if (mode === "TIME") return `${length}s`;
  if (mode === "BURST") return `${length} items`;
  return String(length);
}

/** Adaptive practice is account-gated. Treat the viewer as anonymous
 *  while Clerk is still loading so the toggle never flips between
 *  "locked" and "off" on first paint (matches practice-state's guard). */
export function useAdaptState() {
  const { state, toggleAdapt } = usePractice();
  const { isSignedIn, isLoaded } = useUser();
  const requiresSignIn = !isLoaded || isSignedIn !== true;
  return {
    requiresSignIn,
    adaptOn: state.adapt && !requiresSignIn,
    toggleAdapt,
  };
}

/** The wordlist trigger: a plain pill showing the current list with a
 *  chevron, opening the searchable catalog dialog. */
export function WordlistControl({
  fill = false,
  onPicked,
}: {
  fill?: boolean;
  /** Called after a wordlist is chosen (the compact bar folds away). */
  onPicked?: () => void;
}) {
  const { wordlist, setWordlist } = usePractice();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Wordlist: ${wordlistLabel(wordlist)}. Change wordlist`}
        className={segmentClass(false, cn("min-w-0", fill && "h-10 w-full justify-between px-3"))}
      >
        <span className="max-w-[12rem] truncate">{wordlistLabel(wordlist)}</span>
        <ChevronDown aria-hidden className="size-3.5 shrink-0 opacity-70" />
      </button>
      <WordlistPicker
        open={open}
        onOpenChange={setOpen}
        value={wordlist}
        onPick={(id) => {
          setWordlist(id);
          setOpen(false);
          onPicked?.();
        }}
      />
    </>
  );
}

/** "Adaptive" on/off toggle + the details button. Locked viewers can
 *  press the toggle; it opens the explainer with the sign-in action
 *  while the stored preference stays off. */
export function AdaptControl({ fill = false }: { fill?: boolean }) {
  const { requiresSignIn, adaptOn, toggleAdapt } = useAdaptState();
  const [open, setOpen] = useState(false);
  const toggle = (
    <button
      type="button"
      aria-pressed={adaptOn}
      onClick={(e) => {
        if (requiresSignIn) {
          setOpen(true);
          return;
        }
        toggleAdapt();
        blurAfterPointerClick(e);
      }}
      className={segmentClass(adaptOn, cn(fill && "h-10 flex-1"))}
    >
      {requiresSignIn ? (
        <Lock aria-hidden className="size-3 shrink-0 opacity-70" />
      ) : null}
      Adaptive
    </button>
  );
  return (
    <div className={cn("flex items-center gap-1", fill && "w-full")}>
      {fill ? (
        <div className={cn(SEGMENT_TRACK, "flex flex-1")}>{toggle}</div>
      ) : (
        toggle
      )}
      <Button
        variant="ghost"
        size={fill ? "icon-lg" : "icon-sm"}
        onClick={() => setOpen(true)}
        aria-label="How adaptive practice works, and your hand layout"
        className="text-muted-foreground"
      >
        <Info aria-hidden />
      </Button>
      <AdaptModal
        open={open}
        onClose={() => setOpen(false)}
        adaptOn={adaptOn}
        requiresSignIn={requiresSignIn}
      />
    </div>
  );
}
