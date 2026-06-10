# FT-043 — behaviour.quickRestart is a dead pref: no UI, no consumer, yet writable and inflates the customised count

> **Severity:** LOW  •  **Area:** `customise`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

BehaviourPrefs declares quickRestart (default false with a comment claiming 'users have to tab+enter… prevents accidental restarts'), but nothing reads it: the Tab→restart handler in practice-state.tsx:1066-1100 ('ONE handler, capture phase, no gates') fires unconditionally, and grep shows zero consumers of prefs.quickRestart in any component.

## Affected code

- `src/lib/behaviour-prefs.ts:10`

## Evidence

BehaviourPrefs declares quickRestart (default false with a comment claiming 'users have to tab+enter… prevents accidental restarts'), but nothing reads it: the Tab→restart handler in practice-state.tsx:1066-1100 ('ONE handler, capture phase, no gates') fires unconditionally, and grep shows zero consumers of prefs.quickRestart in any component. Meanwhile the pref is still writable via three paths: MonkeyType import (src/lib/import-export.ts:377-378 maps mt.quickRestart), the AI knob catalog (src/server/routes/appearance/options.ts:174 'Quick restart'), and the import preview lists it as a setting (import-export.ts:304-305). There is no row for it on /customise/behaviour, yet useBehaviourPrefs counts it in customizedCount (behaviour-prefs.ts:73-80), so a MonkeyType import that sets it inflates the page's 'N customised' stat with a setting the user can neither see nor change. The results screen also shows a 'tab restart' hint regardless of the pref, contradicting the default-false comment.

## Steps to reproduce

Code-path: grep quickRestart — definitions, sanitize, AI options, and import only; no consumer. On /, Tab always restarts even though DEFAULT_BEHAVIOUR.quickRestart=false.

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Every claim verified by code reading. (1) BehaviourPrefs declares quickRestart with default false and a comment promising Tab-gated restarts (behaviour-prefs.ts:37-41). (2) Repo-wide grep shows zero consumers of prefs.quickRestart — only the type/defaults, AI catalog (options.ts:174, sanitize.ts:93, prompt.ts:38), MonkeyType import mapping (import-export.ts:377-378, asserted by its test), and a dead stub in customise/_components/data.ts. (3) The Tab handler in practice-state.tsx:1080-1105 is explicitly 'ONE handler, capture phase, no gates' and restarts unconditionally (race-inert and BURST-word-reset are the only branches), contradicting the default-false comment. (4) The real /customise/behaviour page renders no quickRestart row; the data.ts 'Quick restart' entry only feeds the dynamic [section] stub page, which is shadowed by the static behaviour route and writes only local useState anyway. The command palette has no entry either. (5) customizedCount iterates all DEFAULT_BEHAVIOUR keys (behaviour-prefs.ts:73-80), so a MonkeyType import (quickRestart 'tab' → true) or AI knob write inflates the 'N customised' stat with a setting the user can neither see nor individually change. Severity correction: no typing behaviour breaks — Tab-always-restarts looks like a deliberate later design (comments at lines 994-996 + 1066 document the current intent). The user-visible harm is a phantom customised count and an inert import/AI knob, which is a consistency/dead-pref cleanup issue, so low rather than medium.

## Proposed fix

Either gate the Tab handler on prefs.quickRestart and add a Behaviour row for it, or delete the pref everywhere (type, defaults, import mapping, AI knob, sanitize) so it can't silently inflate the customised count.

## Suggested labels

`severity:low` `area:customise`

---

_Found by: lane:practice+behaviour. Generated from scan run `wf_a630179b-84b`._
