"use client";

import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { AutoHideApplier } from "./autohide-applier";
import { BurstLogProvider } from "./burst-log";
import { BurstProvider } from "./burst-practice";
import {
  BurstMobileReadouts,
  BurstReadouts,
  BurstWordView,
} from "./burst-view";
import { InputCapture } from "./input-capture";
import { Keyboard } from "./keyboard";
import type { LayoutId } from "./keyboard/layouts";
import { LAYOUTS } from "./keyboard/layouts";
import { ModeBar } from "./mode-bar";
import { Passage } from "./passage";
import { PracticeProvider, usePractice } from "./practice-state";
import { Readouts } from "./readouts";
import { ReportActivity } from "./report-activity";
import { RestHint } from "./rest-hint";
import { SpectateIndicator } from "@/components/spectate-indicator";
import { TestSummary } from "./test-summary";

export type TypingSurfaceProps = {
  /** Show the mode/length/lang/adapt config dock above the typing area. */
  showModeBar?: boolean;
  /** Show the live virtual keyboard preview (desktop only). */
  showKeyboard?: boolean;
  /** Show the rest/running/done hint line under the passage. */
  showRestHint?: boolean;
  /** Show the live readout strip (WPM / ACC / ERR / WORD / ELAPSED). */
  showReadouts?: boolean;
  /** Render extra content below the rest hint (e.g. a run-trace sparkline). */
  belowHint?: React.ReactNode;
  /** Drill mode — when present, the practice provider pins the
   *  passage to this word list, restart re-uses the same words,
   *  and the live-practice flows (mode-bar, slice mirroring,
   *  adaptive prefetch) all short-circuit. Pair with
   *  `showModeBar={false}` so the user can't switch modes mid-drill. */
  lockedWords?: readonly string[];
};

/** Self-contained typing test. Wraps everything in <PracticeProvider> so
 *  it owns its own state — drop it anywhere inside <AppChrome> and it
 *  works. Reuse-friendly: drills, focused practice, and embedded mock
 *  surfaces all hang off this.
 *
 *  Mobile vertical budget (no scroll, see <AppChrome compact>):
 *  TopBar — collapsed ModeBar strip — flex-1 Passage (internal
 *  scroll-into-view only) — RestHint footer row (live readouts on the
 *  left, cancel/restart on the right; both ghost-styled, no chrome).
 */
export function TypingSurface(props: TypingSurfaceProps = {}) {
  const { lockedWords, ...body } = props;
  return (
    <PracticeProvider lockedWords={lockedWords}>
      <AutoHideApplier />
      <ReportActivity status="practicing" />
      <InputCapture>
        <TypingSurfaceBody {...body} />
      </InputCapture>
    </PracticeProvider>
  );
}

/** Translate the next character the user is expected to type into a
 *  KeyboardEvent.code. Handles the lower-case alpha + digit cases that
 *  cover ~95% of test glyphs; everything else (punctuation, shifted
 *  symbols) falls back to undefined and the keymap simply won't
 *  highlight a "next" key. */
function nextExpectedKeyCode(
  layout: LayoutId,
  ch: string | undefined,
): string | undefined {
  if (!ch) return undefined;
  const c = ch.toLowerCase();
  if (c === " ") return "Space";
  // Walk the keyboard layout's letter rows and find a key whose label
  // matches. This stays correct under Dvorak / Colemak too.
  for (const row of LAYOUTS[layout].rows) {
    for (const k of row) {
      if (k.label === c) return k.code;
      if (k.shiftLabel === c) return k.code;
    }
  }
  return undefined;
}

function TypingSurfaceBody({
  showModeBar = true,
  showKeyboard = true,
  showRestHint = true,
  showReadouts = true,
  belowHint,
}: TypingSurfaceProps) {
  const { prefs: appearance } = useAppearancePrefs();
  const { state } = usePractice();
  const done = state.phase === "done";
  // appearance.keymap is the single source of truth for whether the
  // keyboard widget renders during a test — `off` hides it. The
  // behaviour pref that used to mirror this was redundant.
  const keymapOff = appearance.keymap === "off";
  const renderKeyboard = showKeyboard && !keymapOff && !done;
  const layout = (appearance.keymapLayout as LayoutId) in LAYOUTS
    ? (appearance.keymapLayout as LayoutId)
    : "qwerty";
  const nextChar =
    state.words[state.cursorWord]?.[state.cursorChar] ?? " ";
  const nextKey =
    appearance.keymap === "next"
      ? nextExpectedKeyCode(layout, nextChar)
      : undefined;
  const isBurst = state.mode === "BURST" && !done;
  const body = (
    <>
      {!done ? <SpectateIndicator /> : null}
      {/* Not clipped once done: the result scroller spans the page width. */}
      <div className={`flex min-h-0 flex-1 flex-col${done ? "" : " overflow-hidden"}`}>
        {done ? (
          <TestSummary />
        ) : isBurst ? (
          // BURST shows the current item as a single centred word —
          // the drills-page burst feel — but paints through the same
          // --ft-passage-* tokens + caret settings so typography /
          // colour customisation flows through 1:1 with WORDS. Stats
          // (last / reps / goal / items) ride in its `above` slot,
          // directly over the word, like the passage readouts; the
          // BurstProvider wrap shares those values between the two.
          <BurstWordView
            above={showReadouts ? <BurstReadouts /> : undefined}
          />
        ) : (
          <Passage
            above={
              showReadouts ? (
                // hidden md:block — desktop only; mobile readouts live
                // in the RestHint footer. pb gives the gap to the text
                // and is reserved by the passage's line-fit calc.
                <div className="hidden pb-3 sm:pb-4 md:block">
                  <Readouts />
                </div>
              ) : undefined
            }
          />
        )}
      </div>
      {showRestHint && !done ? (
        <div className="md:hidden">
          {isBurst ? (
            <div className="py-2">
              <BurstMobileReadouts />
            </div>
          ) : (
            <RestHint showReadouts={showReadouts} />
          )}
        </div>
      ) : null}
      {!done ? belowHint : null}
    </>
  );
  return (
    // One centred column (max-w-5xl) shared by the mode bar, readouts,
    // passage, keyboard and results, so no edge moves between phases.
    // No horizontal padding: <AppChrome> owns the page gutter.
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
      {showModeBar ? <ModeBar /> : null}
      {/* Vertical padding is keyed to viewport height — on short
       *  viewports (1080p with 150% Windows display scaling is the
       *  common case) the chrome ate every pixel the passage wanted.
       *  pt-3 sm:pt-4 holds the floor; [@media(min-height:900px)]
       *  restores the roomier spacing only when there's actually
       *  room. Same trick for the gap. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 pt-3 pb-2 sm:gap-4 sm:pt-4 [@media(min-height:900px)]:sm:gap-6 [@media(min-height:900px)]:sm:pt-8 [@media(min-height:900px)]:sm:pb-4">
        {/* The try log sits outside BurstProvider (which unmounts once
         *  the run is done) so the results screen can read it. */}
        <BurstLogProvider>
          {isBurst ? <BurstProvider>{body}</BurstProvider> : body}
        </BurstLogProvider>
        {renderKeyboard ? (
          // Auto-hide the keyboard widget at short viewports — its
          // intrinsic height (6 rows × ~h-10 + gaps ≈ 260 px) was
          // eating every pixel the passage wanted on 1080p with
          // 150% display scaling (≈720 CSS px tall). Below 750 px
          // tall there isn't honest room for both, so we drop the
          // keyboard and let the passage breathe.
          //
          // Users who want the keyboard *always* visible can lower
          // their `keymapSize` (Customise → Keymap) so it composes
          // smaller, but the auto-hide rule is the right default
          // when the viewport genuinely can't host both.
          <div className="mt-auto hidden md:block [@media(max-height:750px)]:md:hidden">
            <Keyboard
              layout={layout}
              mode={appearance.keymap}
              legend={appearance.keymapLegend}
              topRow={appearance.keymapTopRow}
              scale={appearance.keymapSize}
              nextKey={nextKey}
              settingsOverride={{ compact: appearance.keymapCompact }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
