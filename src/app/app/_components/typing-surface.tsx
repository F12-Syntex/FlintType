"use client";

import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { InputCapture } from "./input-capture";
import { Keyboard } from "./keyboard";
import type { LayoutId } from "./keyboard/layouts";
import { LAYOUTS } from "./keyboard/layouts";
import { ModeBar } from "./mode-bar";
import { Passage } from "./passage";
import { PracticeProvider, usePractice } from "./practice-state";
import { Readouts } from "./readouts";
import { RestHint } from "./rest-hint";
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
};

/** Self-contained typing test. Wraps everything in <PracticeProvider> so
 *  it owns its own state — drop it anywhere inside <AppChrome> and it
 *  works. Reuse-friendly: drills, focused practice, and embedded mock
 *  surfaces all hang off this.
 *
 *  Mobile vertical budget (no scroll, see <AppChrome compact>):
 *  TopBar — collapsed ModeBar strip — compact Readouts strip — flex-1
 *  Passage (internal scroll-into-view only) — RestHint footer row.
 */
export function TypingSurface(props: TypingSurfaceProps = {}) {
  return (
    <PracticeProvider>
      <InputCapture>
        <TypingSurfaceBody {...props} />
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
  const { prefs } = useBehaviourPrefs();
  const { prefs: appearance } = useAppearancePrefs();
  const { state } = usePractice();
  const done = state.phase === "done";
  // Both the behaviour toggle *and* appearance.keymap=off hide the
  // keyboard. Anything else picks the appearance mode.
  const keymapOff = appearance.keymap === "off";
  const renderKeyboard =
    showKeyboard && prefs.liveKeyboard && !keymapOff && !done;
  const layout = (appearance.keymapLayout as LayoutId) in LAYOUTS
    ? (appearance.keymapLayout as LayoutId)
    : "qwerty";
  const nextChar =
    state.words[state.cursorWord]?.[state.cursorChar] ?? " ";
  const nextKey =
    appearance.keymap === "next"
      ? nextExpectedKeyCode(layout, nextChar)
      : undefined;
  return (
    <>
      {showModeBar ? <ModeBar /> : null}
      {showReadouts && !done ? (
        <div className="md:hidden">
          <Readouts />
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pt-4 pb-3 sm:gap-6 sm:px-12 sm:py-8 lg:px-20">
        {showReadouts && !done ? (
          <div className="hidden md:block">
            <Readouts />
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {done ? <TestSummary /> : <Passage />}
        </div>
        {showRestHint && !done ? (
          <div className="md:hidden">
            <RestHint />
          </div>
        ) : null}
        {!done ? belowHint : null}
        {renderKeyboard ? (
          <div className="mt-auto hidden md:block">
            <Keyboard
              layout={layout}
              mode={appearance.keymap}
              legend={appearance.keymapLegend}
              topRow={appearance.keymapTopRow}
              scale={appearance.keymapSize}
              nextKey={nextKey}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
