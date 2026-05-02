"use client";

import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { InputCapture } from "./input-capture";
import { Keyboard } from "./keyboard";
import { ModeBar } from "./mode-bar";
import { Passage } from "./passage";
import { PracticeProvider } from "./practice-state";
import { Readouts } from "./readouts";
import { RestHint } from "./rest-hint";

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
export function TypingSurface({
  showModeBar = true,
  showKeyboard = true,
  showRestHint = true,
  showReadouts = true,
  belowHint,
}: TypingSurfaceProps = {}) {
  const { prefs } = useBehaviourPrefs();
  // Behaviour-prefs gates: a `false` setting wins over the prop default.
  const renderKeyboard = showKeyboard && prefs.liveKeyboard;
  return (
    <PracticeProvider>
      <InputCapture>
        {showModeBar ? <ModeBar /> : null}
        {/* Edge-to-edge readouts strip on mobile (rendered inside this
            wrapper but using its own padding); the desktop readouts pick
            up the column padding below. */}
        {showReadouts ? (
          <div className="md:hidden">
            <Readouts />
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pt-4 pb-3 sm:gap-6 sm:px-12 sm:py-8 lg:px-20">
          {/* Desktop readouts — sit just above the passage so the user
              glances up and sees ELAPSED on the left, WPM on the right
              while typing. */}
          {showReadouts ? (
            <div className="hidden md:block">
              <Readouts />
            </div>
          ) : null}
          {/* Passage gets the leftover vertical space. Inner content is
              static; the caret slides between character positions. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Passage />
          </div>
          {/* RestHint is mobile-only. On desktop the readouts strip already
              shows progress + final stats; the keycap hints (tab/esc) are
              power-user knowledge and just crowded the keyboard preview. */}
          {showRestHint ? (
            <div className="md:hidden">
              <RestHint />
            </div>
          ) : null}
          {belowHint}
          {renderKeyboard ? (
            <div className="mt-auto hidden md:block">
              <Keyboard />
            </div>
          ) : null}
        </div>
      </InputCapture>
    </PracticeProvider>
  );
}
