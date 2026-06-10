# FT-072 — TIME-mode end-of-buffer refill ignores the user's wordlist / min-length / word-shape prefs

> **Severity:** LOW  •  **Area:** `practice`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

In the SPACE handler, when the cursor reaches the end of the TIME buffer the reducer appends `generateWords(TIME_BUFFER, Date.now())` with NO cfg argument (practice-reducer.ts:516-518), so the refill falls back to DEFAULT_BEHAVIOUR + the embedded English-200 pool — dropping the user's custom wordlist (cfg.wordPool), minWordLength, and showSecondary decoration.

## Affected code

- `src/app/_components/practice-reducer.ts:517`

## Evidence

In the SPACE handler, when the cursor reaches the end of the TIME buffer the reducer appends `generateWords(TIME_BUFFER, Date.now())` with NO cfg argument (practice-reducer.ts:516-518), so the refill falls back to DEFAULT_BEHAVIOUR + the embedded English-200 pool — dropping the user's custom wordlist (cfg.wordPool), minWordLength, and showSecondary decoration. The provider's refill effect (practice-state.tsx:490-502) normally tops up 120 words ahead with the correct cfg, so this path is near-unreachable today, but it is the safety-net path: if it ever fires (refill effect starved, locked re-renders, future regression) a custom-wordlist TIME run silently switches to default English words mid-run.

## Steps to reproduce

Latent; reachable only if the provider refill fails to fire before the cursor consumes the buffer.

## Proposed fix

Either pass the cfg through the SPACE action (e.g. carry a `refillCfg` on the action like TYPE_CHAR carries stopOnError) or drop the in-reducer refill and rely solely on APPEND_WORDS, finishing defensively if the buffer is truly empty.

## Corroborating reports

Independently surfaced by 2 finder(s); this report merges them.

- **lane:practice+behaviour** — TIME-mode end-of-buffer refill ignores the user's word config (min length, secondary, custom wordlist) (`src/app/_components/practice-reducer.ts:517`)

## Suggested labels

`severity:low` `area:practice`

---

_Found by: lane:practice+behaviour, review:practice-core. Generated from scan run `wf_a630179b-84b`._
