import { absoluteUrl, buildPageMetadata } from "@/server/seo";
import { AppChrome } from "./_components/app-chrome";
import { TypingSurface } from "./_components/typing-surface";

// SEO note: this page is an interactive typing surface — no body
// copy for crawlers to chew on. Heavy lifting falls on the title,
// description, an sr-only semantic block below the app, and the
// JSON-LD SoftwareApplication schema inlined in the document head.
export const metadata = buildPageMetadata({
  title:
    "flinttype — free online typing test, WPM speed test & adaptive trainer",
  description:
    "Test your typing speed and accuracy with flinttype, a free open-source WPM typing test. Adaptive drills target the bigrams, trigrams, and words slowing you down — race friends, track your personal best, and improve faster.",
  path: "/",
});

const APP_LD_JSON = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "flinttype",
  alternateName: "Flinttype typing test",
  description:
    "Free online typing test and WPM speed test. Diagnoses the bigrams, trigrams, and words slowing you down with adaptive drills, then races you against bots or friends to lock in the gains.",
  applicationCategory: "GameApplication",
  applicationSubCategory: "Typing test",
  operatingSystem: "Web",
  url: absoluteUrl("/"),
  inLanguage: "en",
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "WPM (words-per-minute) speed test",
    "Per-keystroke accuracy + error tracking",
    "Adaptive drills targeting individual weak bigrams, trigrams and words",
    "Multiplayer races against bots and friends",
    "Personal-best tracking across modes",
    "Free and open source",
  ],
} as const;

export default function PracticePage() {
  return (
    <AppChrome compact>
      {/* JSON-LD inlined as a server-rendered script so crawlers see
       *  the structured-data block in the initial response, no JS
       *  required. The `@type: SoftwareApplication` mapping is what
       *  gets us the rich-result rating panel + sidebar in Google. */}
      <script
        type="application/ld+json"
        // dangerouslySetInnerHTML is the documented React pattern for
        // injecting raw JSON into <script>; safe here because the
        // payload is a constant we author. JSON.stringify guarantees
        // valid JSON so there's no XSS surface.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_LD_JSON) }}
      />
      <TypingSurface />
      {/* Crawler-only semantic block. `sr-only` keeps it visually
       *  hidden (no UI shift, no design compromise) while leaving the
       *  copy in the DOM where Googlebot reads it. The headline is
       *  the single <h1> on the page; the surrounding paragraphs
       *  carry our target keywords in natural prose. */}
      <section aria-label="About flinttype" className="sr-only">
        <h1>flinttype — free online typing speed test</h1>
        <p>
          Flinttype is a free, open-source typing test that measures your
          typing speed in words per minute (WPM) and your accuracy on
          every keystroke. The site runs in any modern browser and works
          on desktop and mobile — no install, no account required to
          start.
        </p>
        <h2>What makes flinttype different</h2>
        <p>
          Most typing tests give you the same random English text every
          run. Flinttype watches the bigrams, trigrams, and words that
          slow you down or trip you up, then builds adaptive drills
          aimed at exactly those weaknesses. Over time your weakest
          letter pairs become your strongest — measurable, not vibes.
        </p>
        <h2>Features</h2>
        <ul>
          <li>Live WPM and accuracy readouts while you type</li>
          <li>Customisable theme, caret style, typography, and layout</li>
          <li>
            Adaptive drills targeting your slowest letter pairs and
            words
          </li>
          <li>
            Multiplayer races against bots or friends, with shareable
            challenge links
          </li>
          <li>Personal-best tracking across word counts and modes</li>
          <li>Import your MonkeyType lifetime stats</li>
          <li>Keyboard layouts: QWERTY, Dvorak, Colemak</li>
        </ul>
        <h2>How to start</h2>
        <p>
          Start typing — the test begins on your first keystroke and
          ends when you reach the last word. Pick a different mode or
          word count from the bar at the top of the page, or jump into
          multiplayer <a href="/race">races</a> right away — no account
          needed. <a href="/drills">Drills</a> and{" "}
          <a href="/insights">insights</a> need a free account, which also
          keeps your typing history across sessions.
        </p>
      </section>
    </AppChrome>
  );
}
