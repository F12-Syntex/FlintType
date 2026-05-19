"use client";

import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { useKeyClickSound } from "@/lib/use-key-click-sound";
import { usePractice } from "./practice-state";

const INTERACTIVE_SELECTOR =
  "button, a, input, select, textarea, [role='radio'], [role='switch']";

/** Captures all typing for the practice surface via a hidden input.
 *
 *  Why an input element rather than just `window` keydown:
 *  mobile virtual keyboards almost never fire useful `keydown` for
 *  printable characters — they fire `input` / `beforeinput` events on
 *  the focused control instead. A focused (but visually hidden) input
 *  is the only reliable way to receive typed text on iOS / Android.
 *
 *  Children render inside a tap-to-focus wrapper so the user can press
 *  the passage to bring the OS keyboard back if they tap away. There's
 *  no separate "tap to type" overlay — the rest hint already carries
 *  that affordance and a floating overlay would just stack on top of
 *  the visible RestHint controls.
 */
export function InputCapture({ children }: { children: ReactNode }) {
  const { state, dispatch, restart } = usePractice();
  const { prefs } = useBehaviourPrefs();
  const playClick = useKeyClickSound();
  const inputRef = useRef<HTMLInputElement>(null);

  const phaseRef = useRef(state.phase);
  phaseRef.current = state.phase;
  const cursorCharRef = useRef(state.cursorChar);
  cursorCharRef.current = state.cursorChar;
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  // BURST mode lets TYPE_CHAR / BACKSPACE flow through the normal
  // practice reducer so Passage renders the same typing UX as WORDS.
  // SPACE is intercepted: <BurstPractice /> owns a window-level
  // listener that runs the threshold + reps check before deciding
  // whether to advance the cursor (dispatch SPACE) or reset the
  // current word (dispatch BURST_RESET). Suppressing SPACE here
  // stops it from bypassing that check.
  const modeRef = useRef(state.mode);
  modeRef.current = state.mode;
  // When a Backspace fired through onKeyDown, a paired beforeinput event
  // (deleteContentBackward / deleteWordBackward / deleteSoftLineBackward)
  // is also dispatched by the OS for the same physical key on most
  // platforms — which without dedup deletes a character/word twice per
  // press. Stamp the time at the keydown dispatch site; the beforeinput
  // path skips if a sibling fired in the last ~80ms.
  const lastBackspaceAtRef = useRef(0);

  const focus = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // Refocus on every fresh run. Depending on `state.words` rather than
  // `state.phase` so a rest→rest restart (clicking "new passage" while
  // already in rest phase) still pulls focus off the button and back to
  // the input. Programmatic .focus() does not reopen the OS keyboard on
  // iOS — for mobile this only matters between gestures.
  useEffect(() => {
    if (state.phase === "rest") focus();
  }, [state.words, state.phase, focus]);

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        inputMode="text"
        enterKeyHint="next"
        aria-label="Typing input"
        tabIndex={-1}
        // iOS reliably opens the keyboard only when the focused element is
        // in-flow and has non-zero size. `pointer-events-none` lets taps pass
        // through to the wrapper below.
        className="pointer-events-none fixed bottom-0 left-0 size-px opacity-0"
        // Keep the value empty so deleteContentBackward keeps firing.
        value=""
        onChange={() => {
          /* handled in onBeforeInput */
        }}
        onBeforeInput={(e) => {
          e.preventDefault();
          // Suppress typing while a modal (the adapt editor, confirm
          // dialogs, mobile sheets) is open — they own the screen.
          if (
            document.querySelector('[role="dialog"][aria-modal="true"]')
          )
            return;
          const ne = e.nativeEvent as InputEvent;
          const t = ne.inputType;
          if (
            t === "deleteContentBackward" ||
            t === "deleteWordBackward" ||
            t === "deleteSoftLineBackward"
          ) {
            // If keydown already dispatched for this physical press, the
            // OS-paired beforeinput event is a duplicate — drop it.
            if (Date.now() - lastBackspaceAtRef.current < 80) return;
            const p = prefsRef.current;
            if (p.confidence === "all") return;
            if (p.confidence === "word" && cursorCharRef.current === 0) return;
            // deleteWordBackward (Ctrl+Backspace on most platforms,
            // Option+Backspace on macOS) and deleteSoftLineBackward
            // (Cmd+Backspace on macOS) wipe a whole word; only the
            // plain "deleteContentBackward" should fall through to a
            // single-char BACKSPACE.
            dispatch({
              type: t === "deleteContentBackward" ? "BACKSPACE" : "BACKSPACE_WORD",
            });
            playClick();
            return;
          }
          if (t === "insertText" || t === "insertCompositionText") {
            const data = ne.data ?? "";
            const now = Date.now();
            const p = prefsRef.current;
            const stopOnError = p.stopOnError;
            const allowExtras = p.allowExtras;
            const strictSpace = p.strictSpace;
            const isBurst = modeRef.current === "BURST";
            for (const ch of data) {
              if (ch === " " || ch === "\n") {
                // SPACE: in WORDS / TIME / QUOTE this advances the cursor.
                // BURST has a controller that runs the threshold + reps
                // check before deciding what to do — suppress here so it
                // owns the call.
                if (isBurst) {
                  playClick();
                  continue;
                }
                if (phaseRef.current !== "rest") {
                  dispatch({ type: "SPACE", now, strictSpace });
                }
              } else {
                dispatch({
                  type: "TYPE_CHAR",
                  char: ch,
                  now,
                  stopOnError,
                  allowExtras,
                });
              }
              playClick();
            }
          }
        }}
        onKeyDown={(e) => {
          // Only Backspace is allowed to carry a modifier — Ctrl /
          // Alt(Win) / ⌥(Mac) / ⌘(Mac) + Backspace = "delete word".
          // Every other modified shortcut (Ctrl+R, Cmd+T, …) falls
          // through to the browser unchanged.
          const wordWise =
            e.key === "Backspace" && (e.ctrlKey || e.altKey || e.metaKey);
          if (!wordWise && (e.ctrlKey || e.metaKey || e.altKey)) return;
          // Tab-as-restart was retired — it kept breaking under the
          // dialog-modal gate and the focus-trap edge cases. The
          // command palette (Cmd+K → "Restart test") owns restart
          // now, with Esc as the in-test fast path. Letting Tab
          // through to its native focus-shift here also stops it
          // from being a silent no-op when the user expects standard
          // browser tab traversal.
          // Suppress typing while a modal is open. preventDefault stops
          // Backspace / letters from doing anything page-level; the
          // modal's own window listener still receives the bubbled
          // event for Escape close.
          if (
            document.querySelector('[role="dialog"][aria-modal="true"]')
          ) {
            e.preventDefault();
            return;
          }
          const p = prefsRef.current;
          if (e.key === "Escape") {
            e.preventDefault();
            restart();
            return;
          }
          if (phaseRef.current === "done") return;

          if (e.key === "Backspace") {
            e.preventDefault();
            if (p.confidence === "all") return;
            if (p.confidence === "word" && cursorCharRef.current === 0) return;
            lastBackspaceAtRef.current = Date.now();
            dispatch({ type: wordWise ? "BACKSPACE_WORD" : "BACKSPACE" });
            playClick();
            return;
          }
          if (e.key === " ") {
            e.preventDefault();
            if (phaseRef.current === "rest") return;
            // BURST owns SPACE via its own controller — playClick still
            // fires so the audio toggle works the same on every key.
            if (modeRef.current === "BURST") {
              playClick();
              return;
            }
            dispatch({
              type: "SPACE",
              now: Date.now(),
              strictSpace: p.strictSpace,
            });
            playClick();
            return;
          }
          if (e.key.length === 1) {
            e.preventDefault();
            dispatch({
              type: "TYPE_CHAR",
              char: e.key,
              now: Date.now(),
              stopOnError: p.stopOnError,
              allowExtras: p.allowExtras,
            });
            playClick();
          }
        }}
      />

      {/* Tap-to-focus wrapper. onMouseDown (desktop) and onTouchStart
          (mobile) so the focus call lands *during* the user gesture — iOS
          only opens the OS keyboard when .focus() runs inside a touch
          handler. Skip refocus when the gesture targets an interactive
          control so the pill / restart button click isn't disrupted. */}
      <div
        className="flex min-h-0 flex-1 flex-col"
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest(INTERACTIVE_SELECTOR)) return;
          focus();
        }}
        onTouchStart={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest(INTERACTIVE_SELECTOR)) return;
          focus();
        }}
      >
        {children}
      </div>
    </>
  );
}
