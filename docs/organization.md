# File organization

Applies to the entire repo — backend, frontend, types, utilities, everything.

## The rule in one sentence

> Keep files **short and single-purpose**. If a file passes ~200 lines or starts serving two distinct concerns, split it *before* adding more code.

## Length thresholds

| Lines       | Meaning                                | Action                                                                                    |
|-------------|----------------------------------------|-------------------------------------------------------------------------------------------|
| `< 150`     | Healthy                                | Keep adding code that fits the file's purpose.                                            |
| `150–200`   | Getting dense                          | Pause and ask: does new code *really* belong here, or is a sibling file the right home?   |
| `200–300`   | Split before adding more               | Move unrelated concerns out, or extract a group of related symbols, then add your code.   |
| `> 300`     | Split now, even if everything is tightly related | Readability and review cost both degrade fast past 300. No file in this repo should stay > 300 without explicit justification in a code comment. |

Function / component / handler body > **30 lines** → consider extracting into its own file (already codified as backend R11 for routes; the same principle applies to components and helpers).

## Before adding any new code

Ask these in order. Stop at the first "yes".

1. **Does an existing file exactly match this code's purpose?** → append there.
2. **Would appending double the file's size, cross the 200-line line, or mix concerns?** → new file instead.
3. **Is the new code a different concern than what's in the candidate file?** → new file.
4. **Does a sibling file with the right category already exist?** → new file of that category (don't overload an unrelated one that happens to be nearby).

If all four pointed away from the existing file, create a new one.

## Where new files go — decision table

| You're adding…                                      | Put it in…                                                                                 |
|-----------------------------------------------------|--------------------------------------------------------------------------------------------|
| Types / Zod schemas for a domain                    | `src/types/<domain>.ts`  *(backend R1)*                                                     |
| A new backend namespace                             | `src/server/routes/<ns>/index.ts`                                                          |
| A new method in an existing namespace               | top-level `const` in the namespace's `index.ts`  *(backend R11)*                           |
| A method whose handler body > 30 lines              | `src/server/routes/<ns>/<method>.ts`, imported into `index.ts`                             |
| A new middleware                                    | `src/server/middleware/<purpose>.ts`  (one concern per file; group tightly related middleware in the same file) |
| A new domain's server-side data access              | `src/server/db/<domain>.ts`  (promote from `src/server/db.ts` when the first module is added) |
| A shared React component                            | `src/components/<name>.tsx`                                                                |
| A route-scoped component                            | `src/app/<route>/_components/<name>.tsx`                                                   |
| A cross-cutting client or isomorphic helper         | `src/lib/<purpose>.ts`                                                                     |
| A cross-domain type (used by > 1 domain)            | `src/types/<name>.ts` at the top level, not nested in a domain file                         |
| A test for any of the above                         | co-located `*.test.ts` / `index.test.ts` next to the subject                                |
| A new documented convention                         | amend the relevant doc (`docs/backend-rules.md`, `docs/ui-law.md`, or this file)            |

## When to extract a symbol into its own file

Even if the containing file is short, pull a symbol out when any of these are true:

- It's > 30 lines on its own.
- It needs its own tests.
- It's imported from ≥ 3 places.
- It has ≥ 2 private helpers that exist solely to support it.
- Removing it would cleanly isolate an independent concern.

## Anti-patterns — don't do these

- **No junk-drawer files.** `utils.ts`, `helpers.ts`, `misc.ts`, `common.ts` — forbidden. Every file's name declares a specific purpose.
- **No barrel re-exports.** The only barrel in the repo is `src/server/index.ts` (public API of the server module). Don't add `src/components/index.ts`, `src/types/index.ts`, etc.
- **No inline types that belong in `src/types/`.** Backend R1 is absolute; don't work around it with local type aliases.
- **No "temporary" files.** If it's worth writing, it's worth naming correctly now. Rename as you go.
- **No dumping unrelated utilities into a file just because it's already imported.** That's how files grow past 300 lines.
- **No splitting for split's sake.** Under 150 lines of tightly related code is fine in one file; fragmenting a tiny namespace into five files adds noise without benefit.

## Renaming and deleting

When you rename or relocate a symbol:
- Update every import in the same commit.
- Delete the old file; don't leave a shim `export { foo } from './new-location'`.
- If the rename is a meaningful concept change (e.g. `auth.ts` → `session.ts`), say so in the commit body.

This repo has no published API — rename-with-update is always the right move over compatibility shims.

## LLM checklist before adding a new file or adding ≥ 40 lines to an existing one

- [ ] Did I check the decision table above for where the code belongs?
- [ ] Is the target file under 200 lines, and will it stay that way after my change?
- [ ] Does my change fit the target file's single purpose, or am I mixing concerns?
- [ ] Did I avoid junk-drawer filenames and barrel re-exports?
- [ ] If I renamed or relocated, did I update all imports and delete the old file?
