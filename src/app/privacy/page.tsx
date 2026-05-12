import Link from "next/link";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { EditorialPage, EditorialSection } from "../_components/editorial-page";

export const metadata = buildPageMetadata({
  title: "Privacy — what flinttype collects and why",
  description:
    "How flinttype handles your typing data, account information, and preferences. Plain-language privacy policy covering Clerk auth, Neon storage, and the third parties we rely on.",
  path: "/privacy",
});

const LAST_UPDATED = "12 May 2026";

export default function PrivacyPage() {
  return (
    <AppChrome>
      <EditorialPage
        eyebrow="Legal"
        title="Privacy."
        subtitle="Plain-language summary of what flinttype collects, why, and what's done with it. Last updated 12 May 2026."
        footer={
          <>
            Questions? Open an issue on{" "}
            <a
              href="https://github.com/anthropics/claude-code/issues"
              rel="noopener noreferrer"
              target="_blank"
              className="text-foreground/80 underline decoration-foreground/30 underline-offset-2"
            >
              GitHub
            </a>
            .
          </>
        }
      >
        <EditorialSection title="Short version">
          <p>
            Anyone can use flinttype without an account. The practice
            surface, drills, and races against bots all run without
            ever introducing yourself. Your typing stays in the
            browser unless you sign in.
          </p>
          <p>
            Signing in (via Clerk) lets us store your typing history,
            personal-best tracker, adaptive-drill model, and preferences
            on our database so they survive between sessions. That
            information is yours — request an export or deletion any
            time.
          </p>
        </EditorialSection>

        <EditorialSection title="Account data (signed-in users)">
          <p>
            Account creation goes through Clerk. We receive only what
            you give Clerk: an email address, optional username and
            display name, and the OAuth identifier from your social
            provider if you used one. Passwords never reach our
            servers — Clerk handles authentication entirely.
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
            timestamps, mode (casual / training / race), word count,
            WPM, accuracy, error count, reset count, and a boolean for
            whether the run was completed. Per-keystroke timings are
            processed transiently — they update your weakness model
            (bigram / trigram / word means and variances) and are then
            discarded. We don't keep the raw keystream.
          </p>
          <p>
            The aggregated weakness model is yours and is what makes
            adaptive drills work. We don't sell, syndicate, or share
            it with anyone.
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

        <EditorialSection title="Third parties we rely on">
          <p>Service infrastructure, listed honestly:</p>
          <ul className="ml-4 flex list-disc flex-col gap-2 marker:text-muted-foreground/60">
            <li>
              <span className="text-foreground">Clerk</span> — auth,
              session management, optional MonkeyType import handshake.
            </li>
            <li>
              <span className="text-foreground">Vercel</span> — hosting
              and CDN. Server logs include request paths and IP
              addresses; we don't aggregate or export them.
            </li>
            <li>
              <span className="text-foreground">Neon</span> — managed
              Postgres for the typing-history database.
            </li>
          </ul>
        </EditorialSection>

        <EditorialSection title="Your rights">
          <p>
            Export your data, delete your account, or correct what we
            have on you — open an issue on GitHub or email the address
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
            <Link
              href="/changelog"
              className="text-foreground/85 underline decoration-foreground/30 underline-offset-2"
            >
              the changelog
            </Link>{" "}
            with a one-line summary. The "last updated" date above
            tracks the most recent revision: {LAST_UPDATED}.
          </p>
        </EditorialSection>
      </EditorialPage>
    </AppChrome>
  );
}
