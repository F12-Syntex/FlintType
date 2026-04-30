import { InputCapture } from "./input-capture";
import { LiveKeyboard } from "./live-keyboard";
import { ModeBar } from "./mode-bar";
import { Passage } from "./passage";
import { PracticeProvider } from "./practice-state";
import { Readouts } from "./readouts";
import { RestHint } from "./rest-hint";

export type TypingSurfaceProps = {
  /** Show the mode/length/lang/adapt config dock above the typing area. */
  showModeBar?: boolean;
  /** Show the keyboard preview at the bottom. */
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
 *  surfaces all hang off this. */
export function TypingSurface({
  showModeBar = true,
  showKeyboard = true,
  showRestHint = true,
  showReadouts = true,
  belowHint,
}: TypingSurfaceProps = {}) {
  return (
    <PracticeProvider>
      <InputCapture>
        {showModeBar ? <ModeBar /> : null}
        <div className="flex flex-1 flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-12 sm:py-8 lg:px-20">
          {showReadouts ? <Readouts /> : null}
          <Passage />
          {showRestHint ? <RestHint /> : null}
          {belowHint}
          {showKeyboard ? (
            // Desktop-only — the OS virtual keyboard takes this space on mobile.
            <div className="mt-auto hidden md:block">
              <LiveKeyboard />
            </div>
          ) : null}
        </div>
      </InputCapture>
    </PracticeProvider>
  );
}
