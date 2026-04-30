import { Kbd } from "@/components/ft";
import { buildPageMetadata } from "@/server/seo";
import { KeyboardLegend } from "./_components/keyboard-legend";
import { LiveKeyboard } from "./_components/live-keyboard";
import { LiveTrace } from "./_components/live-trace";
import { ModeBar } from "./_components/mode-bar";
import { Passage } from "./_components/passage";
import { Readouts } from "./_components/readouts";
import { RestHint } from "./_components/rest-hint";

export const metadata = buildPageMetadata({
  title: "Practice",
  description: "flinttype typing practice — distraction-free passage with peripheral live signal.",
  path: "/app",
  noIndex: true,
});

const PASSAGE =
  "the difference between a good typist and a great one is not speed but recovery the great ones do not avoid mistakes they simply spend less time on them than you do".split(
    " ",
  );

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const sp = await searchParams;
  const active = sp.state === "active";
  const cursorWord = 24;
  const cursorChar = 3;

  return (
    <div className="flex flex-col">
      <ModeBar />

      <div className="relative flex flex-col gap-6 px-5 pt-8 pb-24 sm:px-20">
        <Readouts active={active} cursorWord={cursorWord} />

        <Passage
          words={PASSAGE}
          active={active}
          cursorWord={cursorWord}
          cursorChar={cursorChar}
        />

        {active ? <LiveTrace /> : <RestHint />}

        {active ? <LiveKeyboard /> : <KeyboardLegend />}

        <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2 text-[10px] uppercase tracking-[0.18em] text-ft-dim">
          <span>
            <Kbd>tab</Kbd> restart
          </span>
          <span>
            <Kbd>esc</Kbd> menu
          </span>
          <span>
            <Kbd>⌘</Kbd>+<Kbd>K</Kbd> command
          </span>
          <span className="text-ft-dim-2">session #1042</span>
        </div>
      </div>
    </div>
  );
}
