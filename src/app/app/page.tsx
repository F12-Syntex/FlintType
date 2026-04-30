import { Kbd } from "@/components/ft";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "./_components/app-chrome";
import { KeyboardLegend } from "./_components/keyboard-legend";
import { ModeBar } from "./_components/mode-bar";
import { Passage } from "./_components/passage";
import { PracticeProvider } from "./_components/practice-state";
import { Readouts } from "./_components/readouts";
import { RestHint } from "./_components/rest-hint";

export const metadata = buildPageMetadata({
  title: "Practice",
  description:
    "flinttype typing practice — distraction-free passage with peripheral live signal.",
  path: "/app",
  noIndex: true,
});

export default function PracticePage() {
  return (
    <AppChrome>
      <PracticeProvider>
        <ModeBar />

        <div className="relative flex flex-col gap-7 px-5 pt-8 pb-24 sm:px-20">
          <Readouts />

          <div className="border-b border-ft-line-soft pb-7">
            <Passage />
          </div>

          <RestHint />

          <div className="border-t border-ft-line-soft pt-1" />

          <KeyboardLegend />

          <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 border-t border-ft-line-soft pt-6 text-[10px] uppercase tracking-[0.18em] text-ft-dim">
            <span>
              <Kbd>tab</Kbd> restart
            </span>
            <span>
              <Kbd>esc</Kbd> cancel
            </span>
            <span>
              <Kbd>⌘</Kbd>+<Kbd>K</Kbd> command
            </span>
          </div>
        </div>
      </PracticeProvider>
    </AppChrome>
  );
}
