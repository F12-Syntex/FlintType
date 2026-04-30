"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
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
 *  the passage to bring the OS keyboard back if they tap away. A small
 *  "tap to type" overlay is shown while the input is unfocused so
 *  there's a visible affordance.
 */
export function InputCapture({ children }: { children: ReactNode }) {
  const { state, dispatch } = usePractice();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  // Always read the latest phase inside event handlers without re-binding.
  const phaseRef = useRef(state.phase);
  phaseRef.current = state.phase;

  const focus = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // Auto-focus on mount (desktop keyboards "just work"; iOS/Android still
  // require a user gesture to actually open the OS keyboard, so the tap-to-
  // focus wrapper handles that case).
  useEffect(() => {
    focus();
  }, [focus]);

  // Refocus when the run resets so the user can keep typing right after
  // hitting RESTART. Programmatic .focus() does not reopen the OS keyboard
  // on iOS, so on mobile this just keeps the desktop story tidy.
  useEffect(() => {
    if (state.phase === "rest") focus();
  }, [state.phase, focus]);

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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onBeforeInput={(e) => {
          e.preventDefault();
          const ne = e.nativeEvent as InputEvent;
          const t = ne.inputType;
          if (
            t === "deleteContentBackward" ||
            t === "deleteWordBackward" ||
            t === "deleteSoftLineBackward"
          ) {
            dispatch({ type: "BACKSPACE" });
            return;
          }
          if (t === "insertText" || t === "insertCompositionText") {
            const data = ne.data ?? "";
            const now = Date.now();
            for (const ch of data) {
              if (ch === " " || ch === "\n") {
                if (phaseRef.current !== "rest") {
                  dispatch({ type: "SPACE", now });
                }
              } else {
                dispatch({ type: "TYPE_CHAR", char: ch, now });
              }
            }
          }
        }}
        onKeyDown={(e) => {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          if (e.key === "Tab") {
            e.preventDefault();
            dispatch({ type: "RESTART" });
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            dispatch({ type: "RESTART" });
            return;
          }
          if (phaseRef.current === "done") return;

          // Backspace and printable characters: prefer the keydown path on
          // desktop (synchronous, deterministic). Mobile virtual keyboards
          // route the same intents through onBeforeInput above instead.
          if (e.key === "Backspace") {
            e.preventDefault();
            dispatch({ type: "BACKSPACE" });
            return;
          }
          if (e.key === " ") {
            e.preventDefault();
            if (phaseRef.current === "rest") return;
            dispatch({ type: "SPACE", now: Date.now() });
            return;
          }
          if (e.key.length === 1) {
            e.preventDefault();
            dispatch({ type: "TYPE_CHAR", char: e.key, now: Date.now() });
          }
        }}
      />

      {/* Tap-to-focus wrapper. onMouseDown (desktop) and onTouchStart
          (mobile) so the focus call lands *during* the user gesture — iOS
          only opens the OS keyboard when .focus() runs inside a touch
          handler. Skip refocus when the gesture targets an interactive
          control so the pill / restart button click isn't disrupted. */}
      <div
        className="flex flex-1 flex-col"
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

      {/* "Tap to type" affordance — only shown while the input is unfocused
          so the user always knows how to bring the OS keyboard back. Mobile
          only; on desktop the input is focused on mount and stays that way
          unless the user clicks somewhere obviously interactive. */}
      {!focused && state.phase !== "done" ? (
        <button
          type="button"
          onClick={focus}
          className={cn(
            "fixed inset-x-4 bottom-4 z-30 mx-auto max-w-xs",
            "rounded-md border border-ft-line-soft bg-white/95 px-4 py-3",
            "text-[11px] font-semibold uppercase tracking-[0.18em] text-ft-ink",
            "shadow-md backdrop-blur",
            "md:hidden",
          )}
          aria-label="Focus typing input"
        >
          tap to type
        </button>
      ) : null}
    </>
  );
}
