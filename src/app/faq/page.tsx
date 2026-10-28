import { GITHUB_URL } from "@/lib/version";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import {
  EditorialLink,
  EditorialPage,
  EditorialSection,
  sectionId,
} from "../_components/editorial-page";

export const metadata = buildPageMetadata({
  title: "FAQ — common questions about flinttype",
  description:
    "Answers to common questions about flinttype: how the adaptive engine works, whether sign-in is required, how net WPM is calculated, supported keyboard layouts, and what data we store.",
  path: "/faq",
});

/** Each question carries a short `label` for the jump list; the
 *  question itself is the section's h2 and its anchor. */
const QUESTIONS: readonly { q: string; label: string; a: React.ReactNode }[] = [
  {
    q: "Is flinttype free?",
    label: "Is it free?",
    a: (
      <>
        Yes, completely. The site is open source under the MIT license,
        there are no ads anywhere, and there is no paid tier. Signing in
        adds history and adaptive drills, but practice and races work
        without an account.
      </>
    ),
  },
  {
    q: "Do I need an account?",
    label: "Account",
    a: (
      <>
        No. Anyone can use{" "}
        <EditorialLink href="/">the practice page</EditorialLink>,{" "}
        <EditorialLink href="/race">race</EditorialLink> or share a lobby
        link without signing in. Signing in keeps your typing history,
        personal bests, adaptive model and settings across devices.
      </>
    ),
  },
  {
    q: "How is WPM calculated?",
    label: "WPM",
    a: (
      <>
        Raw WPM uses the standard formula: characters typed divided by 5
        (one &ldquo;word&rdquo;), divided by minutes elapsed. Net WPM,
        which the leaderboard ranks on, multiplies raw WPM by your
        accuracy. A 100 WPM run at 90% accuracy comes out at 90 net WPM,
        which rewards clean, confident typing over reckless speed.
      </>
    ),
  },
  {
    q: "What does the adaptive engine actually do?",
    label: "Adaptive engine",
    a: (
      <>
        Every keystroke is timed against the character you were aiming
        for. From that, the engine keeps a running average for every
        letter pair, three-letter sequence and word you type. Each new
        practice run leans toward words containing your slowest pairs,
        the ones holding your overall speed back. Your current weak spots
        are on <EditorialLink href="/insights">your insights page</EditorialLink>{" "}
        once you&apos;re signed in.
      </>
    ),
  },
  {
    q: "Which keyboard layouts are supported?",
    label: "Layouts",
    a: (
      <>
        QWERTY, Dvorak and Colemak. Pick yours in{" "}
        <EditorialLink href="/customise/keyboard#keymap">
          keyboard settings
        </EditorialLink>{" "}
        so the adaptive engine reads your same-finger and hand-switch
        pairs against your real layout. The on-screen keyboard changes to
        match.
      </>
    ),
  },
  {
    q: "What do you store about me?",
    label: "Your data",
    a: (
      <>
        For signed-in users: a copy of your account basics (id, display
        name, the part of your email before the @), one row per test
        (start and end time, WPM, accuracy, errors, mode, word count) and
        your weakness model. Per-keystroke timings update the model and
        are then thrown away; we don&apos;t keep your raw keystrokes. Full
        details are on <EditorialLink href="/privacy">the privacy page</EditorialLink>.
      </>
    ),
  },
  {
    q: "Can I import my MonkeyType history?",
    label: "MonkeyType import",
    a: (
      <>
        Yes. Open <EditorialLink href="/customise">Settings</EditorialLink>{" "}
        and choose Import / export. Your completed tests come across from
        MonkeyType&apos;s export. MonkeyType doesn&apos;t export
        per-keystroke timings, so adaptive practice starts fresh and
        rebuilds your weakness model from new runs.
      </>
    ),
  },
  {
    q: "Why does my leaderboard row say “Guest”?",
    label: "Guest names",
    a: (
      <>
        The leaderboard shows a public{" "}
        <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
          @username
        </code>{" "}
        when it can find one. If your account has no username or display
        name, or the account was deleted, the row shows
        &ldquo;Guest&rdquo;. Set a username on your profile and it appears
        from your next finished test.
      </>
    ),
  },
  {
    q: "How do races work?",
    label: "Races",
    a: (
      <>
        Press <strong className="font-semibold text-foreground">Find race</strong> on{" "}
        <EditorialLink href="/race">the race page</EditorialLink>. We look
        for live opponents for up to five seconds; if nobody joins, bots
        fill the empty seats so you&apos;re never stuck waiting. Press{" "}
        <strong className="font-semibold text-foreground">Create lobby</strong> for a private race with a short link (like{" "}
        <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
          quick-otter-42
        </code>
        ) to share.
      </>
    ),
  },
  {
    q: "How do I report a bug or suggest a feature?",
    label: "Bugs and ideas",
    a: (
      <>
        Open an issue on{" "}
        <EditorialLink href={`${GITHUB_URL}/issues`}>GitHub</EditorialLink>.
        Bugs with a screenshot and the steps to reproduce them (mode,
        browser, what you typed, what you expected) get fixed fastest.
        Feature ideas are all read, even when they don&apos;t ship right
        away.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <AppChrome>
      <EditorialPage
        eyebrow="Help"
        title="FAQ"
        subtitle={
          <>
            Short answers to the questions that come up most. Anything
            missing? Open an issue on{" "}
            <EditorialLink href={`${GITHUB_URL}/issues`}>GitHub</EditorialLink>.
          </>
        }
        toc={QUESTIONS.map((item) => ({
          id: sectionId(item.q),
          label: item.label,
        }))}
      >
        {QUESTIONS.map((item) => (
          <EditorialSection key={item.q} title={item.q}>
            <p>{item.a}</p>
          </EditorialSection>
        ))}
      </EditorialPage>
    </AppChrome>
  );
}
