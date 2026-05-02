"use client";

import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { InputCapture } from "./input-capture";
import { Keyboard } from "./keyboard";
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

function TypingSurfaceBody({
  showModeBar = true,
  showKeyboard = true,
  showRestHint = true,
  showReadouts = true,
  belowHint,
}: TypingSurfaceProps) {
  const { prefs } = useBehaviourPrefs();
  const { state } = usePractice();
  const done = state.phase === "done";
  // Behaviour-prefs gates: a `false` setting wins over the prop default.
  const renderKeyboard = showKeyboard && prefs.liveKeyboard && !done;
  return (
    <>
      {showModeBar ? <ModeBar /> : null}
      {/* Live readouts disappear when the run finishes — the summary
          carries every stat and more, so the strip is just noise. */}
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
        <div
          className={
            done
              ? "flex min-h-0 flex-1 flex-col overflow-y-auto"
              : "flex min-h-0 flex-1 flex-col overflow-hidden"
          }
        >
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
            <Keyboard />
          </div>
        ) : null}
      </div>
    </>
  );
}
