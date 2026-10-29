"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { isRaceInputCurrentlyLocked } from "@/lib/race-input";
import { useKeyClickSound } from "@/lib/use-key-click-sound";
import { BurstSpaceContext, useBurstSpaceSlot } from "./burst-space";
import { usePractice } from "./practice-state";
import { useNativeTextInput } from "./use-native-text-input";

const INTERACTIVE_SELECTOR =
  "button, a, input, select, textarea, label, summary, [contenteditable='true'], [tabindex]:not([tabindex='-1']), [role='radio'], [role='switch'], [role='slider'], [role='tab'], [role='option'], [role='menuitem']";

function modalOpen(): boolean {
  return document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
}

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
  const cursorCharRef = useRef(state.cursorChar);
  const prefsRef = useRef(prefs);
  // BURST mode lets TYPE_CHAR / BACKSPACE flow through the normal
  // practice reducer so Passage renders the same typing UX as WORDS.
  // SPACE is intercepted: <BurstPractice /> owns a window-level
  // listener that runs the threshold + reps check before deciding
  // whether to advance the cursor (dispatch SPACE) or reset the
  // current word (dispatch BURST_RESET). Suppressing SPACE here
  // stops it from bypassing that check.
  const modeRef = useRef(state.mode);
  // Event handlers read the latest render through these refs.
  useLayoutEffect(() => {
    phaseRef.current = state.phase;
    cursorCharRef.current = state.cursorChar;
    prefsRef.current = prefs;
    modeRef.current = state.mode;
  });
  // When a Backspace fired through onKeyDown, a paired beforeinput event
  // (deleteContentBackward / deleteWordBackward / deleteSoftLineBackward)
  // is also dispatched by the OS for the same physical key on most
  // platforms — which without dedup deletes a character/word twice per
  // press. Stamp the time at the keydown dispatch site; the beforeinput
  // path skips if a sibling fired in the last ~80ms.
  const lastBackspaceAtRef = useRef(0);
  // The last printable key the keydown path handled, so a keyboard that
  // reports it again as an input event doesn't type it twice.
  const lastKeyRef = useRef({ key: "", at: 0 });
  // BURST's Space gate, registered by <BurstProvider> (burst-space.ts).
  const burstSpace = useBurstSpaceSlot();

  // Shared by the keydown path and the soft-keyboard input events
  // (`fromInputEvent`).
  const typeText = (text: string, fromInputEvent = false) => {
    const now = Date.now();
    const p = prefsRef.current;
    const isBurst = modeRef.current === "BURST";
    for (const ch of text) {
      if (ch === " " || ch === "\n") {
        // SPACE: in WORDS / TIME / QUOTE this advances the cursor.
        // BURST runs the threshold + reps check before deciding what to
        // do: a keydown Space reaches <BurstProvider>'s own window
        // listener, so it's suppressed here, and a soft-keyboard Space
        // (no usable keydown) is handed to the same gate.
        // No rest-phase guard: space as the first key starts the run
        // and skips word 0 (issue #17a); the reducer owns it.
        if (isBurst) {
          if (fromInputEvent) burstSpace.fire();
        } else {
          dispatch({
            type: "SPACE",
            now,
            strictSpace: p.strictSpace,
            backspaceLocked: p.confidence === "all",
          });
        }
      } else {
        dispatch({
          type: "TYPE_CHAR",
          char: ch,
          now,
          stopOnError: p.stopOnError,
          allowExtras: p.allowExtras,
        });
      }
      playClick();
    }
  };
  const deleteBackward = (wordWise: boolean) => {
    const p = prefsRef.current;
    if (p.confidence === "all") return;
    if (p.confidence === "word" && cursorCharRef.current === 0) return;
    // deleteWordBackward (Ctrl / Option + Backspace) and
    // deleteSoftLineBackward (Cmd + Backspace) wipe a whole word.
    dispatch({ type: wordWise ? "BACKSPACE_WORD" : "BACKSPACE" });
    playClick();
  };

  // Soft keyboards (and IME composition) type through input events.
  // Typing is swallowed on the result screen, while a modal owns the
  // screen (the adapt editor, confirm dialogs, sheets) and before a race
  // has started.
  useNativeTextInput(inputRef, lastKeyRef, {
    accepts: () =>
      phaseRef.current !== "done" && !modalOpen() && !isRaceInputCurrentlyLocked(),
    onText: (text) => typeText(text, true),
    onDelete: (wordWise) => {
      // If keydown already handled this physical press, the paired
      // input event is a duplicate.
      if (Date.now() - lastBackspaceAtRef.current < 80) return;
      deleteBackward(wordWise);
    },
  });

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
        onKeyDown={(e) => {
          // Only Backspace is allowed to carry a modifier — Ctrl /
          // Alt(Win) / ⌥(Mac) / ⌘(Mac) + Backspace = "delete word".
          // Every other modified shortcut (Ctrl+R, Cmd+T, …) falls
          // through to the browser unchanged.
          const wordWise =
            e.key === "Backspace" && (e.ctrlKey || e.altKey || e.metaKey);
          if (!wordWise && (e.ctrlKey || e.metaKey || e.altKey)) return;
          // Tab is never handled here: the provider's capture-phase
          // listener (practice-state.tsx) restarts on Tab while focus is
          // on this input or the page, and leaves Shift+Tab to native
          // focus traversal. Returning before the race lock keeps Tab
          // usable in the lobby and on results.
          if (e.key === "Tab") return;
          // Suppress typing while a modal is open. preventDefault stops
          // Backspace / letters from doing anything page-level; the
          // modal's own window listener still receives the bubbled
          // event for Escape close.
          if (modalOpen()) {
            e.preventDefault();
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            // In race phases where input is locked (lobby, countdown,
            // matching, results), Esc is a no-op — there is no room-leave
            // wired here. Use the Leave button or Tab to the controls.
            if (!isRaceInputCurrentlyLocked()) restart();
            return;
          }
          if (phaseRef.current === "done") return;
          // Race countdown / lobby / matching — block typing keys until
          // the race starts.
          if (isRaceInputCurrentlyLocked()) {
            e.preventDefault();
            return;
          }

          if (e.key === "Backspace") {
            e.preventDefault();
            lastBackspaceAtRef.current = Date.now();
            deleteBackward(wordWise);
            return;
          }
          if (e.key.length === 1) {
            e.preventDefault();
            lastKeyRef.current = { key: e.key, at: Date.now() };
            typeText(e.key);
          }
        }}
      />

      {/* Tap-to-focus wrapper. onMouseDown (desktop) and onTouchStart
          (mobile) so the focus call lands *during* the user gesture — iOS
          only opens the OS keyboard when .focus() runs inside a touch
          handler. Skip refocus when the gesture targets an interactive
          control so the pill / restart button click isn't disrupted.
          While typing, mousedown's default is cancelled too: otherwise
          the browser moves focus off the input right after the tap
          focused it, and the phone keyboard closes again. The result
          screen keeps the default so its text stays selectable.
          React events from portaled content (popovers, dialogs, sheets)
          bubble here too; those are left alone, or the refocus would
          dismiss a popover and block text selection inside a dialog. */}
      <div
        className="flex min-h-0 flex-1 flex-col"
        onMouseDown={(e) => {
          if (!e.currentTarget.contains(e.target as Node)) return;
          const target = e.target as HTMLElement;
          if (target.closest(INTERACTIVE_SELECTOR)) return;
          if (phaseRef.current !== "done") e.preventDefault();
          focus();
        }}
        onTouchStart={(e) => {
          if (!e.currentTarget.contains(e.target as Node)) return;
          const target = e.target as HTMLElement;
          if (target.closest(INTERACTIVE_SELECTOR)) return;
          focus();
        }}
      >
        <BurstSpaceContext.Provider value={burstSpace.register}>
          {children}
        </BurstSpaceContext.Provider>
      </div>
    </>
  );
}
