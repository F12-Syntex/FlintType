import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "./_components/app-chrome";
import { LiveKeyboard } from "./_components/live-keyboard";
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

        <div className="flex flex-1 flex-col gap-6 px-5 py-6 sm:px-12 sm:py-8 lg:px-20">
          <Readouts />
          <Passage />
          <RestHint />
          <div className="mt-auto">
            <LiveKeyboard />
          </div>
        </div>
      </PracticeProvider>
    </AppChrome>
  );
}
