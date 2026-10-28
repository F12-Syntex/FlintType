"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import { wordlistLabel } from "@/lib/wordlists/use-wordlist";
import { LengthPicker } from "./length-picker";
import {
  AdaptControl,
  CUSTOM_ALLOWED,
  LENGTH_LABEL,
  LENGTH_PRESETS,
  lengthSummary,
  MODES,
  useAdaptState,
  usesWordlist,
  WordlistControl,
} from "./mode-bar-controls";
import { SEGMENT_TRACK } from "./mode-segment";
import { usePractice } from "./practice-state";

/** Hairline between groups inside the desktop capsule. */
function Divider() {
  return <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />;
}

/** Desktop (lg+): one centred capsule holding every test setting,
 *  groups separated by hairlines. No eyebrow labels; each group carries
 *  an aria-label instead. */
function DesktopBar() {
  const { state, setMode, setLength } = usePractice();
  return (
    <div className="hidden shrink-0 justify-center pt-4 pb-1 lg:flex [@media(min-height:900px)]:pt-6">
      <div
        role="group"
        aria-label="Test settings"
        className="inline-flex max-w-full items-center gap-0.5 rounded-pill border border-border bg-card/80 p-1 shadow-card"
      >
        <SegmentedControl
          framed={false}
          ariaLabel="Mode"
          value={state.mode}
          onValueChange={(m) => setMode(m)}
          options={MODES}
          className="flex-nowrap"
        />
        <Divider />
        <LengthPicker
          presets={LENGTH_PRESETS[state.mode]}
          value={state.length}
          onChange={setLength}
          allowCustom={CUSTOM_ALLOWED[state.mode]}
          ariaLabel={LENGTH_LABEL[state.mode]}
        />
        {usesWordlist(state.mode) ? (
          <>
            <Divider />
            <WordlistControl />
          </>
        ) : null}
        <Divider />
        <AdaptControl />
      </div>
    </div>
  );
}

/** One stacked group in the expanded compact bar. The small caption is
 *  the only label on the practice surface: in a stack the groups need a
 *  name, in the single desktop row the values speak for themselves. */
function StackGroup({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="px-1 text-xs font-medium text-muted-foreground">
        {caption}
      </span>
      {children}
    </div>
  );
}

/** Below lg: a single h-11 summary pill ("Words · 25 · English") that
 *  expands in place into the stacked controls. Adaptive appears in the
 *  stack only from md, where it's available. */
function CompactBar() {
  const { state, setMode, setLength, wordlist } = usePractice();
  const { adaptOn } = useAdaptState();
  const [open, setOpen] = useState(false);
  const modeLabel = MODES.find((m) => m.value === state.mode)?.label ?? "";
  const parts = [
    modeLabel,
    lengthSummary(state.mode, state.length),
    usesWordlist(state.mode) ? wordlistLabel(wordlist) : null,
  ].filter(Boolean) as string[];
  return (
    <div className="shrink-0 pt-2 lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mode-bar-controls"
        aria-label={`Test settings: ${parts.join(", ")}`}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-pill border border-border bg-card/80 px-4 text-sm shadow-card outline-none transition-colors duration-200 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <span className="flex min-w-0 items-center gap-2">
          {parts.map((p, i) => (
            <span key={i} className="flex min-w-0 items-center gap-2">
              {i > 0 ? (
                <span aria-hidden className="text-muted-foreground/50">
                  ·
                </span>
              ) : null}
              <span
                className={cn(
                  "truncate",
                  i === 0 ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {p}
              </span>
            </span>
          ))}
          {adaptOn ? (
            <span className="hidden shrink-0 items-center gap-2 md:flex">
              <span aria-hidden className="text-muted-foreground/50">
                ·
              </span>
              <span className="font-medium text-primary">Adaptive</span>
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div
          id="mode-bar-controls"
          className="mt-2 flex flex-col gap-4 rounded-2xl border border-border bg-card p-3 shadow-card"
        >
          <StackGroup caption="Mode">
            <SegmentedControl
              ariaLabel="Mode"
              value={state.mode}
              onValueChange={(m) => setMode(m)}
              options={MODES}
              className="flex w-full flex-nowrap [&>button]:flex-1 [&>button]:px-2"
            />
          </StackGroup>
          <StackGroup caption={LENGTH_LABEL[state.mode]}>
            <LengthPicker
              presets={LENGTH_PRESETS[state.mode]}
              value={state.length}
              onChange={setLength}
              allowCustom={CUSTOM_ALLOWED[state.mode]}
              ariaLabel={LENGTH_LABEL[state.mode]}
              framed
              fill
            />
          </StackGroup>
          {usesWordlist(state.mode) ? (
            <StackGroup caption="Wordlist">
              <div className={cn(SEGMENT_TRACK, "flex w-full")}>
                <WordlistControl fill />
              </div>
            </StackGroup>
          ) : null}
          <div className="hidden md:block">
            <StackGroup caption="Adaptive practice">
              <AdaptControl fill />
            </StackGroup>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Practice test settings: mode, length, wordlist and adaptive. One
 *  calm capsule on desktop, a collapsible summary pill below lg. */
export function ModeBar() {
  return (
    <>
      <CompactBar />
      <DesktopBar />
    </>
  );
}
