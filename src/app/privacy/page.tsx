import { GITHUB_URL } from "@/lib/version";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import {
  EditorialLink,
  EditorialList,
  EditorialPage,
  EditorialSection,
  sectionId,
} from "../_components/editorial-page";

export const metadata = buildPageMetadata({
  title: "Privacy — what flinttype collects and why",
  description:
    "What flinttype collects and why: account details, typing history, preferences, races and every third party we use, in a plain-language privacy policy.",
  path: "/privacy",
});

const LAST_UPDATED = "29 October 2026";

const SECTIONS = [
  "Short version",
  "Account data",
  "Typing data",
  "Preferences and theme",
  "Cookies",
  "Third parties",
  "Your rights",
  "Children",
  "Changes",
] as const;

export default function PrivacyPage() {
  return (
    <AppChrome>
      <EditorialPage
        eyebrow="Legal"
        title="Privacy policy"
        subtitle={`What flinttype collects, why, and what happens to it, in plain language. Last updated ${LAST_UPDATED}.`}
        toc={SECTIONS.map((title) => ({ id: sectionId(title), label: title }))}
        footer={
          <>
            Questions? Open an issue on{" "}
            <EditorialLink href={`${GITHUB_URL}/issues`}>GitHub</EditorialLink>.
          </>
        }
      >
        <EditorialSection title="Short version">
          <p>
            Anyone can use flinttype without an account. The practice
            surface, drills, and races all run without ever
            introducing yourself. Your typing stays in the browser
            unless you sign in or join a race (see{" "}
            <EditorialLink href="#third-parties">third parties</EditorialLink>).
          </p>
          <p>
            Signing in (via Clerk) lets us store your typing history,
            personal-best tracker, adaptive-drill model, a short
            analysis of each test, and preferences
            on our database so they survive between sessions. That
            information is yours: request an export or deletion any
            time.
          </p>
        </EditorialSection>

        <EditorialSection title="Account data">
          <p className="text-sm text-muted-foreground">For signed-in users.</p>
          <p>
            Account creation goes through Clerk. We receive only what
            you give Clerk: an email address, optional username and
            display name, and the OAuth identifier from your social
            provider if you used one. Passwords never reach our
            servers; Clerk handles authentication entirely.
          </p>
          <p>
            We mirror the minimum identity fields (Clerk user id,
            display name, email-localpart) into our database so we can
            attach your typing history to a stable handle. Email
            addresses are not surfaced publicly.
          </p>
        </EditorialSection>

        <EditorialSection title="Typing data">
          <p>
            Every completed test stores a row with its start and end
            times, the kind of test and its length, your speed and
            accuracy, how many mistakes you made, and how many times
            you restarted before finishing.
          </p>
          <p>
            While you&apos;re signed in, each test also keeps a short
            summary of how its time was spent: typing, fixing mistakes,
            pausing before words, hesitating inside words, and breaks.
            It also holds a few timing averages, such as your usual time
            per key and per kind of key move, and the timing of up to 16
            letter pairs. It records whether your keyboard behaved like
            QWERTY, never which keys you pressed. The summary
            doesn&apos;t include the text you typed or the order of your
            keys. Per-keystroke timings are used once, to build this
            summary and to update your practice model, and are then
            discarded.
          </p>
          <p>
            Your practice model and these summaries are private. Only
            you can see them, on your Insights page, your result screens
            and the technical view. Your public profile shows your test
            results, never your weak letter pairs, words or timing
            figures. We don&apos;t sell, syndicate or share any of it.
          </p>
          <p>
            When you&apos;re signed in, friends who follow you back can
            watch your practice live while you type. While you share
            live, the test you&apos;re on, including its keystrokes, is
            sent to them and kept until your next live test replaces it.
            It&apos;s on by default; turn it off, or hide from
            particular friends, in{" "}
            <EditorialLink href="/customise/social">
              Multiplayer &amp; social settings
            </EditorialLink>
            .
          </p>
        </EditorialSection>

        <EditorialSection title="Preferences and theme">
          <p>
            Theme, caret style, font, keyboard layout, and similar
            customisation live in two places: a copy in your browser's
            localStorage (so the page paints with your choices on the
            next visit, no flash) and a copy in our database when you're
            signed in (so the same choices follow you to a new browser).
          </p>
        </EditorialSection>

        <EditorialSection title="Cookies">
          <p>
            We use Clerk's session cookie to keep you signed in. No
            advertising cookies, no analytics scripts that load before
            consent, no third-party trackers.
          </p>
        </EditorialSection>

        <EditorialSection title="Third parties">
          <p>The services flinttype runs on:</p>
          <EditorialList>
            <li>
              <span className="font-medium text-foreground">Clerk</span>:
              sign-in, sessions and your account details.
            </li>
            <li>
              <span className="font-medium text-foreground">Discord</span>:
              only if you choose Continue with Discord. Discord shares
              your account id, username and email with Clerk to sign you
              in.
            </li>
            <li>
              <span className="font-medium text-foreground">Vercel</span>: hosting
              and CDN. Server logs include request paths and IP
              addresses; we don't aggregate or export them.
            </li>
            <li>
              <span className="font-medium text-foreground">Neon</span>: managed
              Postgres for the typing-history database.
            </li>
            <li>
              <span className="font-medium text-foreground">Railway</span>: the
              live race server. While you race, your progress (how far
              you&apos;ve typed and your speed) and your IP address pass
              through it, signed in or not. Race rooms live in memory
              and are gone once the race ends.
            </li>
            <li>
              <span className="font-medium text-foreground">OpenRouter</span>:
              only when you use Design with AI. The words you type there
              and a snapshot of your current appearance settings go to
              OpenRouter, which passes them to an AI model to suggest a
              look.
            </li>
            <li>
              <span className="font-medium text-foreground">MonkeyType</span>:
              only if you import from it. We keep your Ape Key
              encrypted so your profile can pull in new results, and use
              it only to read your MonkeyType results.
            </li>
          </EditorialList>
        </EditorialSection>

        <EditorialSection title="Your rights">
          <p>
            Export your data, delete your account, or correct what we
            have on you: open an issue on GitHub or email the address
            in the repo. We'll act within a reasonable window.
            Account deletion removes your test rows, preferences,
            adaptive model, and the Clerk-mirror identity row.
          </p>
        </EditorialSection>

        <EditorialSection title="Children">
          <p>
            Flinttype isn't directed at children under 13. If you
            believe a child has signed up, contact us and we'll remove
            the account.
          </p>
        </EditorialSection>

        <EditorialSection title="Changes">
          <p>
            Material changes to this policy will appear on{" "}
            <EditorialLink href="/changelog">the changelog</EditorialLink>{" "}
            with a one-line summary. The "last updated" date above
            tracks the most recent revision: {LAST_UPDATED}.
          </p>
        </EditorialSection>
      </EditorialPage>
    </AppChrome>
  );
}
