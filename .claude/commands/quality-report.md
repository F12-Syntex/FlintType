---
description: Objective, unbiased quality audit of the project — not flattery, not over-criticism
allowed-tools: Bash, Read, Grep, Glob
---

You are auditing this project from a **fresh perspective**. The user has not seen your previous context for this session; treat the repo as if you arrived cold.

Your job is a strictly objective quality report. Not flattery, not over-criticism. Every claim is backed by a specific file or command output. No padding, no hedging.

## What to collect

Run all of these in parallel where possible; capture their output.

1. `yarn test` — note pass/fail counts and any skipped/failing suites.
2. `npx tsc --noEmit` — note any errors.
3. `yarn lint` — note errors + warnings, separately.
4. `git log --oneline -n 15` — snapshot recent velocity.
5. `git status --short` — note anything uncommitted.
6. File-size scan for anything >200 lines in `src/`:
   `find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -name "*.test.*" | xargs wc -l | sort -rn | head -20`
7. Coverage-gap scan — look for modules without co-located tests:
   - List every `src/server/**/*.ts` that is not `*.test.ts` / `*.d.ts` / a type-only file.
   - For each, check if a sibling `*.test.ts` exists.
   - Flag modules with logic and no test (R12 violation).
8. Type inline check — grep `src/server/routes/**/*.ts` for `defineRoute<{` or `defineRoute\\(` without generics (R1 / R2 violations).
9. UI Law palette check — grep `src/**/*.tsx` for color classes not listed in `docs/ui-law.md` §2 (e.g. non-`zinc` neutrals, arbitrary hex). Flag each.
10. SEO check — every `src/app/**/page.tsx` must export `metadata` or `generateMetadata`. Flag pages that don't.
11. Env check — every `process.env.*` read outside `src/server/env.ts` and `src/lib/seo.ts`. Flag for consolidation.

## What to report

Structure the output **exactly like this**, Markdown:

```
● QA review for <repo> @ v<version> — tests <passed>/<total>, tsc <clean|N errors>, yarn lint <N errors>/<N warnings>.

Works well

- <short factual observation, tied to a specific file or rule>
- <...>

Issues worth fixing

<Grouped by category: "UI Law violations", "Test gaps (R8 / R12)", "SEO gaps", "Type safety", etc.>

- <file:line> — <what's wrong>. <why it's a violation, citing the rule>.

Minor

- <file:line> — <nit>. <fix in one sentence>.

Verdict

<One paragraph. Name the strongest and weakest parts. Suggest one or two concrete next priorities. No hype.>
```

## Tone rules

- Never write "mostly fine" or "overall good" — either it meets the rule or it doesn't.
- Don't flatter ("excellent architecture", "clean code"). Praise = factual observation tied to evidence.
- Don't inflate severity to sound thorough. A missing dark-mode pair isn't a crisis.
- Every bullet must be actionable — file path, line number, what to change.
- Skip categories that have nothing to report. Don't write "Nothing to report here" sections.
- Keep it tight. A typical report is 40–80 lines of markdown total.
- No emojis. No em-dashes inside bullet fragments are fine, just don't decorate.

## Read the rules before auditing

Before scanning, re-read these so your audit is grounded in the project's own standards:
- `docs/backend-rules.md` (R1–R12, coverage matrix, antipatterns)
- `docs/ui-law.md` (meta-rule, §§2–5 classes, §6.3 three-state feedback)
- `docs/organization.md` (length thresholds, decision table)
- `docs/seo.md` (S1–S9)

An audit that doesn't reference these rules is not an audit — it's opinion.

## Deliver

Print the report as your final message. Do not fix issues in this run. Do not commit. The user reviews the report and decides what to act on.
