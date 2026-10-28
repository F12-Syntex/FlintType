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

const LAST_UPDATED = "28 October 2026";

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
            personal-best tracker, adaptive-drill model, and preferences
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
            Every completed test stores a row with: start / end
            timestamps, mode (Casual, Adapt or race), word count,
            WPM, accuracy, error count, reset count, and a boolean for
            whether the run was completed. Per-keystroke timings are
            processed transiently: they update your weakness model
            (bigram / trigram / word means and variances) and are then
            discarded. We don't keep the raw keystream.
          </p>
          <p>
            The aggregated weakness model is yours and is what makes
            adaptive drills work. We don't sell, syndicate, or share
            it with anyone.
          </p>
          <p>
            When you&apos;re signed in, friends who follow you back can
            watch your practice live while you type. It&apos;s on by
            default; turn it off, or hide from particular friends, in{" "}
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
