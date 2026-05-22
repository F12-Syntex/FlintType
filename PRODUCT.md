# Product

## Register

brand

## Users

People who take typing speed tests: the Monkeytype / 10fastfingers / keybr crowd, developers, mechanical-keyboard enthusiasts, and anyone who wants to measure and improve their typing. For the surfaces in this register (the landing page and the cover/social image specifically), the primary viewer is a **stranger on GitHub or social media who has never seen flinttype before** and decides in two seconds whether it looks worth a click. They are visually literate, skeptical of generic SaaS marketing, and they recognise the typing-test category instantly.

## Product Purpose

flinttype is an open-source typing speed test (live at flinttype.com). It sits in the same space as Monkeytype but takes a deliberately different aesthetic and architectural bias: editorial-mechanical rather than playful-minimal. It ships solo practice (Words / Time / Quote / Burst), an adaptive engine that statistically models each user's weak bigrams/trigrams/words and biases the next passage toward them, real-time multiplayer races, drills, friends/duels/live-spectate, deep customisation (47 appearance fields, 24 themes), and analytics. Success for a brand surface is: a viewer immediately understands "this is a fast, deeply customisable, beautifully made typing test" and feels it is more crafted than the category default.

## Brand Personality

Editorial, mechanical, confident, understated. Paper-and-ink with a single coral spark. The product reads like a well-set printed page that happens to be a tool: JetBrains Mono everywhere, hairline rules, tabular numerics, generous whitespace, no decoration that doesn't carry meaning. It is quietly self-assured, never loud or salesy. The voice is terse and precise. It shows rather than tells.

## Anti-references

- **Generic SaaS landing pages** — gradient-blob heroes, the big-number/hero-metric template, pastel illustration packs, "Get started free" purple gradients.
- **Neon-on-black "developer tool" cliché** — glowing terminal-green or cyan on pure black, the second-order reflex for anything code-adjacent.
- **Glassmorphism / drop-shadow soup** — frosted cards, heavy elevation, soft pillowy radii.
- **A literal Monkeytype clone** — flinttype is in that space but must not read as a reskin; its identity is editorial-print, not minimal-playful.
- **Em dashes, exclamation marks, marketing superlatives** — no "blazingly fast", no "the ONLY typing test you'll ever need".

## Design Principles

1. **One spark.** A single coral/ember accent flags the eye (the next key, the active CTA, one number). Everything else is paper and ink. If two coral elements compete, one drops to ink.
2. **The mono is the design.** JetBrains Mono only, across every weight. No proportional sans, no serif, no second face. Type hierarchy and tracking do the work decoration would.
3. **Mechanical, not pillowy.** Hairline borders, small radius, tabular numerics, line-art SVG. Crisp over soft. No box-shadows on product surfaces.
4. **Show the product typing.** A typing-test cover should feel like the actual test (a real passage, a real caret, real readouts), not an abstract marketing illustration. The product is the hero.
5. **Editorial restraint.** Whitespace, alignment, and a strict grid carry the page. Add nothing that isn't earning its place.

## Accessibility & Inclusion

WCAG AA contrast minimum (the paper/ink palette clears it comfortably; coral-on-paper and ink-on-paper both pass). Semantic HTML and one `<h1>` per page. `prefers-reduced-motion` collapses any motion to a static frame (this is a documented project law). Never rely on colour alone to convey state. Touch targets ≥ 44px on interactive elements.
