import { GITHUB_URL } from "@/lib/version";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import {
  EditorialLink,
  EditorialPage,
  EditorialSection,
} from "../_components/editorial-page";

export const metadata = buildPageMetadata({
  title: "About flinttype — free typing test built around your weaknesses",
  description:
    "Flinttype is a free open-source WPM typing test that diagnoses the bigrams, trigrams, and words slowing you down — then drills you out of them. Read about the project, the adaptive engine, and how to get started.",
  path: "/about",
});

/** /about — slim editorial page that gives crawlers + curious users
 *  real prose to read. Doubles as long-tail SEO surface (keyword-rich
 *  paragraphs that don't fit on the action-first homepage). */
export default function AboutPage() {
  return (
    <AppChrome>
      <EditorialPage
        eyebrow="About"
        title="A typing test that learns where you're slow"
        subtitle="Free and open source. It measures your speed, finds the letters holding you back and builds practice around them."
        footer={
          <>
            Flinttype is open source under the MIT license. Issues and
            contributions are welcome on{" "}
            <EditorialLink href={GITHUB_URL}>GitHub</EditorialLink>.
          </>
        }
      >
        <EditorialSection>
          <p>
            Flinttype measures your typing speed and accuracy the same way
            MonkeyType and 10fastfingers do, then takes one extra step: it
            watches the specific letter pairs, words and bursts that slow
            you down and builds practice aimed at exactly those weaknesses.
          </p>
        </EditorialSection>

        <EditorialSection title="The adaptive engine">
          <p>
            Every keystroke you type is timestamped against the character
            you were aiming for. From that stream we keep three running
            stats: how fast you hit each letter pair (bigram), each
            three-letter sequence (trigram) and each whole word. Averages
            update as you type, so the model settles quickly without
            storing your raw keystrokes.
          </p>
          <p>
            Every new practice run leans toward words that stress your
            slowest pairs: not random ones, not the most common ones, but
            the ones holding your overall speed back. Over time the pairs
            you missed early start landing as fast as your fastest. Once
            you&apos;re signed in, the per-pair heatmap and your current
            weak spots live on{" "}
            <EditorialLink href="/insights">your insights page</EditorialLink>.
          </p>
        </EditorialSection>

        <EditorialSection title="Races and private lobbies">
          <p>
            <EditorialLink href="/race">Races</EditorialLink> work out of
            the box. Press{" "}
            <strong className="font-semibold text-foreground">Find race</strong>{" "}
            and we drop you into a public lobby, looking for real players for up to five seconds; if
            nobody shows, bots fill the empty seats so you&apos;re never
            waiting on someone else being online.
          </p>
          <p>
            <strong className="font-semibold text-foreground">Create lobby</strong>{" "}
            opens a private race with a short, friendly link (like{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
              quick-otter-42
            </code>
            ) to share with a friend. Anyone with the link joins your
            lobby, and you start when you&apos;re ready.
          </p>
        </EditorialSection>

        <EditorialSection title="What's free">
          <p>
            Everything. The site is open source, practice and races work
            without an account, and there are no ads anywhere. Signing in
            adds your test history, personal bests and a weakness model
            that remembers you between sessions.
          </p>
        </EditorialSection>

        <EditorialSection title="Layouts, fonts and accessibility">
          <p>
            QWERTY, Dvorak and Colemak are all supported. Pick yours in{" "}
            <EditorialLink href="/customise/keyboard#keymap">
              keyboard settings
            </EditorialLink>{" "}
            so the adaptive engine reads your same-finger and hand-switch
            pairs against your real layout.
          </p>
          <p>
            The text you type can be set in a mono, sans or serif font in{" "}
            <EditorialLink href="/customise/typing#typography">
              typing settings
            </EditorialLink>
            . Every stat uses fixed-width figures so numbers don&apos;t
            jump, every page works down to a small phone screen, and
            reduced-motion preferences are honoured everywhere.
          </p>
        </EditorialSection>

        <EditorialSection title="How to start">
          <p>
            Open <EditorialLink href="/">the practice page</EditorialLink>{" "}
            and start typing. That&apos;s it: the test ends on the last
            word. From there you can try another mode, head into{" "}
            <EditorialLink href="/drills">drills</EditorialLink> or jump
            into a race. Sign in to keep your history; everything else
            works without an account.
          </p>
        </EditorialSection>
      </EditorialPage>
    </AppChrome>
  );
}
