# FT-003 — Keyboard-only race lobby/results navigation is dead — Tab swallowed unconditionally

> **Severity:** HIGH  •  **Area:** `race`  •  **Confidence:** 3/3 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

PracticeProvider registers a window CAPTURE-phase Tab handler that always runs `e.preventDefault(); e.stopImmediatePropagation();` and then `if (raceMode) return;` (lines 1084-1091) — so on the race surface (PracticeProvider is mounted with raceMode=true in race-shell.tsx:291 whenever a room exists) every Tab press is killed in ALL phases: lobby, matchmaking, AND the finished results screen.

## Affected code

- `src/app/_components/practice-state.tsx:1080-1105`

## Evidence

PracticeProvider registers a window CAPTURE-phase Tab handler that always runs `e.preventDefault(); e.stopImmediatePropagation();` and then `if (raceMode) return;` (lines 1084-1091) — so on the race surface (PracticeProvider is mounted with raceMode=true in race-shell.tsx:291 whenever a room exists) every Tab press is killed in ALL phases: lobby, matchmaking, AND the finished results screen. This directly contradicts TabFocusGuard (src/app/race/_components/tab-focus-guard.tsx:16-19: 'the lobby, matchmaking, and the finished results screen — leaves Tab alone so keyboard-only users can reach the Ready, Start, Rematch, and Leave controls'), the race-shell.tsx:233-237 comment, and commit d7c3e1d ('keyboard-only lobby/results nav'). Verified live: on the finished race results screen and in a private lobby, pressing Tab leaves document.activeElement pinned to the hidden 'Typing input'; an instrumented document-level capture keydown listener never even saw the Tab event (proof of a window-capture stopPropagation upstream). Esc is also a no-op in the lobby (input-capture.tsx:186-190 routes Escape to the practice restart(), which in raceMode re-rolls locked words invisibly — the input-capture.tsx:193 comment 'Escape (above) still leaves the room' is false). Net effect: a keyboard-only user cannot reach Copy link / Start race / Ready / Rematch / Save image / Leave at all — the race surface is mouse-only.

## Steps to reproduce

1. http://localhost:3000/race → click 'Create lobby' (or finish a race via 'Find race').
2. Press Tab repeatedly.
3. Focus never leaves the hidden typing input; Start/Copy/Rematch/Leave are unreachable. Esc also does nothing in the lobby.

## Root cause & verification

Adversarially verified by **3 of 3** independent reviewers.

Verified by direct code reading. practice-state.tsx:1080-1105 runs preventDefault + stopImmediatePropagation on every plain Tab (capture phase, window) BEFORE the `if (raceMode) return;` check, and race-shell.tsx:291 mounts PracticeProvider with raceMode=true whenever a room exists (lobby through results). TabFocusGuard (tab-focus-guard.tsx) only swallows Tab during countdown/racing — it cannot restore Tab in lobby/results because the practice-state handler kills it unconditionally upstream. Git history proves the regression: bc7b2d7 (May 29) deliberately made Tab inert in races (preventDefault kept), then d7c3e1d (Jun 3) shipped 'keyboard-only lobby/results nav' by replacing only the race-shell blanket block with TabFocusGuard, never updating practice-state — so the shipped feature is dead code in effect. The Esc sub-claim also holds: input-capture.tsx:186-190 routes Escape to practice restart(), which with lockedWords just re-dispatches RESTART with the same words (practice-state.tsx:920-927); no Escape handler exists anywhere under src/app/race, so the line-193 comment 'Escape (above) still leaves the room' is false. The §16 Esc-opens-palette fallback also bails because the hidden typing input is focused. Net: race lobby/results controls are mouse-only, contradicting the documented and committed behaviour. Severity high is honest — it nullifies an explicitly shipped accessibility feature on a keyboard-centric product. Suggested fix (move the raceMode check before preventDefault, letting TabFocusGuard own the phase-aware swallow) is correct.

## Proposed fix

In the practice-state onTab handler, skip preventDefault/stopImmediatePropagation entirely while raceMode is true (let TabFocusGuard own the phase-aware swallow), i.e. move the `if (raceMode) return;` check BEFORE preventDefault. Also fix or implement the documented Esc-leaves-room behaviour in the lobby, or correct the stale comment in input-capture.tsx:193.

## Suggested labels

`severity:high` `area:race` `accessibility` `multiplayer`

---

_Found by: lane:pages+race-flow. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-003-race-keyboard-nav-dead.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-003-race-keyboard-nav-dead.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
