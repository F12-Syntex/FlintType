# FT-054 — Hand-rolled modal dialogs (ConfirmDialog, MobileSheet) declare aria-modal but have no focus trap / initial focus / focus restore

> **Severity:** LOW  •  **Area:** `ui`  •  **Confidence:** single-pass (unverified low)  •  **Status:** open
>
> _Discovered by the deep multi-agent bug scan (run `wf_a630179b-84b`, 2026-06-10). Find-and-report — no code changed._

## Summary

Both ConfirmDialog (confirm-dialog.tsx:113-119) and MobileSheet (mobile-sheet.tsx:106-110) portal a `role="dialog" aria-modal="true"` surface with Escape + backdrop close, but unlike the Radix-based Dialog used elsewhere they never move focus into the dialog, never trap Tab, and never restore focus on close.

## Affected code

- `src/components/ui/confirm-dialog.tsx:113-119`

## Evidence

Both ConfirmDialog (confirm-dialog.tsx:113-119) and MobileSheet (mobile-sheet.tsx:106-110) portal a `role="dialog" aria-modal="true"` surface with Escape + backdrop close, but unlike the Radix-based Dialog used elsewhere they never move focus into the dialog, never trap Tab, and never restore focus on close. A keyboard user pressing Tab after opening 'Block @user?' or a mobile sheet keeps traversing the visually obscured page behind the modal, contradicting the aria-modal announcement to screen readers.

## Steps to reproduce

Open a profile, choose Unfollow from the FollowButton menu, press Tab repeatedly — focus walks the background page behind the confirm dialog.

## Proposed fix

Focus the panel (or first focusable) on open, trap Tab within the panel, and restore focus to the trigger on close — or rebuild both on the existing Radix Dialog primitive which does all three.

## Suggested labels

`severity:low` `area:ui` `accessibility` `ui`

---

_Found by: review:ui-misc. Generated from scan run `wf_a630179b-84b`._

> **Report file:** [`bug-reports/FT-054-modal-no-focustrap.md`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/FT-054-modal-no-focustrap.md)  -  **Evidence index:** [`bug-reports/images/`](https://github.com/F12-Syntex/flinttype/blob/bug-reports-deep-scan/bug-reports/images/README.md)
