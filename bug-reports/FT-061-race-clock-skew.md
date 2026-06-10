# FT-061 — Race countdown/elapsed readout mixes local Date.now() with server timestamps, breaking documented clock-skew immunity

> **Severity:** LOW  •  **Area:** `race`  •  **Confidence:** 1/1 verifier votes  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

deriveTimings computes the countdown digit as `left = 3000 - (state.nowMs - state.countdownStartedAt)` and its comment (race-online.tsx:556-558) states it uses the SERVER-supplied wall clock (nowMs) precisely 'so two clients with skewed device clocks still see the same digit.' But the caller overrides that during countdown/racing: `deriveTimings(snapshot.phase === 'countdown' || 'racing' ? { ...state, nowMs: Date.now...

## Affected code

- `src/app/race/_components/race-online.tsx:271-284,553-561`

## Evidence

deriveTimings computes the countdown digit as `left = 3000 - (state.nowMs - state.countdownStartedAt)` and its comment (race-online.tsx:556-558) states it uses the SERVER-supplied wall clock (nowMs) precisely 'so two clients with skewed device clocks still see the same digit.' But the caller overrides that during countdown/racing: `deriveTimings(snapshot.phase === 'countdown' || 'racing' ? { ...state, nowMs: Date.now() } : state)` (race-online.tsx:274-279), substituting the LOCAL clock while countdownStartedAt remains the server's clock value (snapshotToRaceState sets nowMs: snapshot.serverNowMs, but it's replaced here). So the subtraction mixes local-now with server-then: any device clock skew makes the 3-2-1 countdown wrong (starts at the wrong number, skips digits, or sits frozen then jumps). No clock-offset (serverNowMs - localNow) is computed anywhere to correct it. The actual gun is server-gated and input stays locked until phase=racing, so it's cosmetic — but it's the highest-tension moment and the code's own stated skew-immunity is broken for any client whose clock differs from the server.

## Steps to reproduce

Set the OS clock a few seconds off from the server, enter a race; the on-screen countdown digit no longer matches the real 3s window (the gun fires at a different count than shown).

## Root cause & verification

Adversarially verified by **1 of 1** independent reviewers.

Confirmed by direct code reading. Server sets countdownStartedAt = Date.now() on its own clock (src/server/race/room.ts:476) and the client keeps it verbatim while mapping nowMs: snapshot.serverNowMs (race-online.tsx:481,484). But the derived memo overrides nowMs with local Date.now() during countdown/racing (race-online.tsx:274-279), so deriveTimings (line 559) computes 3000 - (localNow - serverThen) — mixed clocks. The comment at 556-558 explicitly claims server-clock skew immunity, which the caller defeats; no serverNowMs-vs-Date.now() offset is computed anywhere in src/app/race (grep verified). The same mixed-clock bug class was already fixed once for WPM (lines 359-372 comment documents skew zeroing WPM), proving the failure mode is real in practice. elapsedSeconds (562-565) shares the defect. CountdownPanel renders the raw digit (passage.tsx:167), so a skewed clock shows wrong/frozen/extra digits. However: the gun is server-timed, input gating is server-phase-driven, and all scored stats use same-clock subtraction — impact is strictly cosmetic and only for clients with multi-second clock skew (rare on NTP-synced devices). Real bug, but medium overstates it; corrected to low. The suggested fix (capture offset = serverNowMs - Date.now() per snapshot, use Date.now() + offset) is correct.

## Proposed fix

Capture an offset = snapshot.serverNowMs - Date.now() when each snapshot arrives and use Date.now() + offset in place of the raw Date.now() override, so the countdown/elapsed math stays on the server clock as the comment intends.

## Suggested labels

`severity:low` `area:race` `multiplayer`

---

_Found by: review:race. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-061-race-clock-skew.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-061-race-clock-skew.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
