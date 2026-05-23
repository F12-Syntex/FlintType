import Link from "next/link";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";

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
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-4">
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            About flinttype
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            A typing test that learns where you're slow.
          </h1>
          <p className="max-w-prose text-[15px] leading-relaxed text-foreground/85">
            Flinttype is a free, open-source WPM typing test. It measures
            your typing speed and accuracy the same way MonkeyType and
            10fastfingers do, then takes one extra step: it watches the
            specific letter pairs, words, and bursts that slow you down
            and builds adaptive drills aimed at exactly those weaknesses.
          </p>
        </header>

        <Section title="The adaptive engine">
          <p>
            Every keystroke you type is timestamped against the character
            you were aiming for. From that stream we extract three
            per-symbol stats: how fast you hit each bigram (letter pair),
            each trigram (three-letter sequence), and each individual
            word. Mean and variance update online with Welford's algorithm
            so the model converges quickly and doesn't blow up memory.
          </p>
          <p>
            On every fresh practice run, the algorithm picks words that
            stress your slowest pairs — not random ones, not the most
            common ones, but the ones holding your overall speed back.
            Over time the same bigrams you missed early start firing as
            fast as your fastest. You can see the per-bigram heatmap and
            the current weakness ranking on{" "}
            <Link
              href="/insights"
              className="text-foreground underline decoration-foreground/30 underline-offset-2"
            >
              your insights page
            </Link>{" "}
            once you're signed in.
          </p>
        </Section>

        <Section title="Races and challenges">
          <p>
            <Link
              href="/race"
              className="text-foreground underline decoration-foreground/30 underline-offset-2"
            >
              The race surface
            </Link>{" "}
            puts you against deterministic bots out of the box — three
            difficulty tiers across four passage modes — but a real
            multiplayer race is one click away. Press{" "}
            <em>Find race</em> and we drop you into a public lobby, looking
            for real players for up to five seconds; if none show, bots
            fill the empty seats so your run isn't blocked on someone else
            being online.
          </p>
          <p>
            <em>Create lobby</em> spins up a private race lobby and
            gives you a short friendly URL (e.g.{" "}
            <code className="text-foreground/85">quick-otter-42</code>) to
            share with a friend. Anyone who clicks the link drops into
            your lobby; you press start when you're ready.
          </p>
        </Section>

        <Section title="What's free and what isn't">
          <p>
            Everything is free. The site is open source, the practice
            surface and races run without an account, and there are no
            ads on any page. Signing in with Clerk unlocks per-user
            history, the personal-best tracker, and adaptive-drill
            persistence — the model needs a home between sessions for
            those to mean anything.
          </p>
        </Section>

        <Section title="Keyboard layouts and accessibility">
          <p>
            QWERTY, Dvorak, and Colemak are all supported — pick yours
            from the customise page so the adaptive engine categorises
            your bigrams under your real same-finger / hand-alternation
            map. The whole UI ships in JetBrains Mono with tabular
            numerics on every stat, mobile-first responsive layouts down
            to 375 px, and `prefers-reduced-motion` honoured everywhere.
          </p>
        </Section>

        <Section title="How to start">
          <p>
            Open <Link
              href="/"
              className="text-foreground underline decoration-foreground/30 underline-offset-2"
            >the home page</Link>{" "}
            and start typing — that's it. The test ends on the last word.
            From there you can pick a different mode, head into{" "}
            <Link
              href="/drills"
              className="text-foreground underline decoration-foreground/30 underline-offset-2"
            >
              drills
            </Link>
            , or jump into a race. Sign in to persist your history; the
            rest works without one.
          </p>
        </Section>

        <footer className="border-t border-border pt-6 text-[12px] text-muted-foreground">
          Flinttype is open source under the MIT license. Issues and
          contributions are welcome on{" "}
          <a
            href="https://github.com/anthropics/claude-code/issues"
            className="text-foreground/80 underline decoration-foreground/30 underline-offset-2"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          .
        </footer>
      </article>
    </AppChrome>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-[14px] leading-relaxed text-foreground/85">
        {children}
      </div>
    </section>
  );
}
