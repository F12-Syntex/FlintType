import Link from "next/link";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { EditorialPage, EditorialSection } from "../_components/editorial-page";

export const metadata = buildPageMetadata({
  title: "FAQ — common questions about flinttype",
  description:
    "Answers to common questions about flinttype: how the adaptive engine works, whether sign-in is required, how net WPM is calculated, supported keyboard layouts, and what data we store.",
  path: "/faq",
});

const QUESTIONS: readonly { q: string; a: React.ReactNode }[] = [
  {
    q: "Is flinttype free?",
    a: (
      <>
        Yes — completely. The site is open source under the MIT
        license, there are no ads on any surface, and every feature
        works without a paid tier. Signing in unlocks history and
        adaptive drills, but the practice and race surfaces work
        anonymously.
      </>
    ),
  },
  {
    q: "Do I need an account?",
    a: (
      <>
        No. Anyone can hit{" "}
        <InlineLink href="/">the practice page</InlineLink>,{" "}
        <InlineLink href="/race">race against bots</InlineLink>, or
        share a challenge link without signing in. Sign-in (via Clerk)
        persists your typing history, personal-best tracker, adaptive
        model, and preferences across devices.
      </>
    ),
  },
  {
    q: "How is WPM calculated?",
    a: (
      <>
        Raw WPM uses the standard formula: characters typed divided
        by 5 (one "word"), divided by minutes elapsed. Net WPM —
        what the leaderboard ranks on — multiplies raw WPM by your
        accuracy as a percentage. A 100 WPM run at 90% accuracy
        comes out to 90 net WPM. Penalising on errors rewards clean,
        confident typing over reckless speed.
      </>
    ),
  },
  {
    q: "What does the adaptive engine actually do?",
    a: (
      <>
        Every keystroke is timestamped against the character you
        were aiming for. From that stream the engine maintains per-
        bigram, per-trigram, and per-word means and variances using
        Welford's algorithm. On every fresh practice run, the
        word-picker biases toward words containing your slowest
        pairs — not random ones, not the most common ones, but the
        ones holding your overall speed back. The current weakness
        ranking is visible on{" "}
        <InlineLink href="/insights">your insights page</InlineLink>{" "}
        once you're signed in.
      </>
    ),
  },
  {
    q: "Which keyboard layouts are supported?",
    a: (
      <>
        QWERTY, Dvorak, and Colemak. Pick yours in{" "}
        <InlineLink href="/customise/appearance#keyboard">
          customise → keyboard
        </InlineLink>{" "}
        so the adaptive engine categorises your bigrams under the
        real same-finger / hand-alternation map for your layout. The
        on-screen keyboard widget also re-renders to match.
      </>
    ),
  },
  {
    q: "What do you store about me?",
    a: (
      <>
        For signed-in users: a mirror of your Clerk identity (id,
        display name, email-localpart), per-test rows (start / end
        timestamps, WPM, accuracy, error count, mode, word count),
        and the aggregated weakness model. Per-keystroke timings are
        used to update the model and then discarded — we don't keep
        the raw keystream. Full details are on{" "}
        <InlineLink href="/privacy">the privacy page</InlineLink>.
      </>
    ),
  },
  {
    q: "Can I import my MonkeyType history?",
    a: (
      <>
        Yes — MonkeyType import lives in the customise → manage
        menu. It pulls your completed-test history through their
        export and converts it into our row schema. We don't ingest
        per-keystroke timings (MonkeyType doesn't export them);
        adaptive drills will start fresh and rebuild your weakness
        model from new runs.
      </>
    ),
  },
  {
    q: "Why does my leaderboard slot say 'Guest'?",
    a: (
      <>
        The leaderboard surfaces a public handle (
        <code className="text-foreground/85">@username</code>) when
        we can resolve one. If your account doesn't have a username
        or display name set, or if the account behind a row has been
        deleted, the slot shows "Guest". Set a username in your
        Clerk profile to fix this — it'll appear on the next
        completed run.
      </>
    ),
  },
  {
    q: "How do races work?",
    a: (
      <>
        Press <em>Find race</em> on{" "}
        <InlineLink href="/race">the race page</InlineLink>. We look
        for live opponents for up to five seconds; if no real
        players join, deterministic bots fill the empty seats so
        you're never blocked on someone else being online. Press{" "}
        <em>Create lobby</em> for a private challenge room — you'll
        get a short friendly URL (e.g.{" "}
        <code className="text-foreground/85">quick-otter-42</code>)
        to share.
      </>
    ),
  },
  {
    q: "How do I report a bug or suggest a feature?",
    a: (
      <>
        Open an issue on the GitHub repo. Bugs with a screenshot
        and a reproduction (mode, browser, what you typed, what you
        expected) get triaged fastest. Feature ideas are read and
        considered even when they don't immediately ship.
      </>
    ),
  },
];

function InlineLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-foreground/85 underline decoration-foreground/30 underline-offset-2 transition-colors hover:text-primary"
    >
      {children}
    </Link>
  );
}

export default function FaqPage() {
  return (
    <AppChrome>
      <EditorialPage
        eyebrow="Help"
        title="FAQ."
        subtitle="Short answers to the questions that come up most. Anything missing? Open an issue on GitHub."
      >
        {QUESTIONS.map((item, i) => (
          <EditorialSection key={i}>
            <h2 className="text-[16px] font-semibold tracking-tight text-foreground sm:text-[17px]">
              {item.q}
            </h2>
            <p className="text-[14px] leading-relaxed text-foreground/85">
              {item.a}
            </p>
          </EditorialSection>
        ))}
      </EditorialPage>
    </AppChrome>
  );
}
