"use client";

import {
  type MouseEvent,
  type RefObject,
  type TouchEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const INTERACTIVE = "button, a, input, select, textarea, [role='radio'], [role='switch']";
const TEXT_FIELDS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function modalOpen(): boolean {
  return document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
}

/** Key capture for the burst runner, on a physical keyboard and on a
 *  phone's soft keyboard.
 *
 *  - Desktop: a window `keydown` listener, so typing works wherever
 *    focus is (except another text field or an open dialog).
 *  - Phones: soft keyboards only open for a focused text control and
 *    mostly report keys through input events, not `keydown`. The
 *    surface renders a visually hidden input (`inputRef`). Tapping the
 *    word area focuses it (`tapToFocus`), and its native `beforeinput`
 *    events (plain text, deletes) plus a value diff for IME composition
 *    feed the same `onChar` / `onBackspace` handlers.
 *
 *  `enabled` is false once the drill is finished: keys stop being
 *  captured and the input blurs so the soft keyboard gets out of the way
 *  of the clear screen. */
export function useBurstTyping({
  enabled,
  onChar,
  onBackspace,
}: {
  enabled: boolean;
  onChar: (char: string) => void;
  onBackspace: (wordWise: boolean) => void;
}): {
  inputRef: RefObject<HTMLInputElement | null>;
  focus: () => void;
  focused: boolean;
  tapToFocus: {
    onMouseDown: (e: MouseEvent) => void;
    onTouchStart: (e: TouchEvent) => void;
  };
} {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const handlers = useRef({ enabled, onChar, onBackspace });
  useLayoutEffect(() => {
    handlers.current = { enabled, onChar, onBackspace };
  });
  // The last key handled through `keydown`. Some soft keyboards report
  // a key both ways; the paired input event is dropped as a duplicate.
  const lastKey = useRef({ key: "", at: 0 });
  const [focused, setFocused] = useState(false);

  const focus = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const h = handlers.current;
      if (!h.enabled) return;
      // Only Backspace may carry a modifier (Ctrl / Alt / ⌘ + Backspace
      // = delete word); other shortcuts (Ctrl+R, ⌘T…) reach the browser.
      const wordWise = e.key === "Backspace" && (e.ctrlKey || e.altKey || e.metaKey);
      if (!wordWise && (e.ctrlKey || e.metaKey || e.altKey)) return;
      if (modalOpen()) return;
      const active = document.activeElement;
      if (active && active !== inputRef.current && TEXT_FIELDS.has(active.tagName)) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        lastKey.current = { key: "Backspace", at: Date.now() };
        h.onBackspace(wordWise);
      } else if (e.key.length === 1) {
        e.preventDefault();
        lastKey.current = { key: e.key, at: Date.now() };
        h.onChar(e.key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const recent = (key: string) =>
      lastKey.current.key === key && Date.now() - lastKey.current.at < 80;
    // Text the IME has put in the input during a composition.
    let composed = "";
    const syncComposition = () => {
      const h = handlers.current;
      const next = el.value;
      let same = 0;
      while (same < composed.length && same < next.length && composed[same] === next[same]) same++;
      if (h.enabled) {
        for (let i = same; i < composed.length; i++) h.onBackspace(false);
        for (const ch of next.slice(same)) h.onChar(ch);
      }
      composed = next;
    };
    const onBeforeInput = (e: InputEvent) => {
      // Composition text can't be cancelled; it's diffed on `input`.
      if (e.isComposing || e.inputType === "insertCompositionText") return;
      if (e.cancelable) e.preventDefault();
      const h = handlers.current;
      if (!h.enabled || modalOpen()) return;
      if (e.inputType.startsWith("delete")) {
        if (recent("Backspace")) return;
        h.onBackspace(e.inputType !== "deleteContentBackward");
      } else if (e.inputType === "insertText" || e.inputType === "insertReplacementText") {
        for (const ch of e.data ?? "") {
          if (!recent(ch)) h.onChar(ch === "\n" ? " " : ch);
        }
      }
    };
    const onInput = (e: Event) => {
      if ((e as InputEvent).isComposing) syncComposition();
    };
    const onCompositionEnd = () => {
      syncComposition();
      el.value = "";
      composed = "";
    };
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    el.addEventListener("beforeinput", onBeforeInput);
    el.addEventListener("input", onInput);
    el.addEventListener("compositionend", onCompositionEnd);
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);
    return () => {
      el.removeEventListener("beforeinput", onBeforeInput);
      el.removeEventListener("input", onInput);
      el.removeEventListener("compositionend", onCompositionEnd);
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
    };
  }, []);

  // Focus on mount and on every restart; blur on finish.
  useEffect(() => {
    if (enabled) focus();
    else inputRef.current?.blur();
  }, [enabled, focus]);

  // Focus inside the gesture itself: iOS only opens the soft keyboard
  // when .focus() runs in a touch handler. Taps on real controls are
  // left alone. preventDefault on mousedown stops the browser moving
  // focus back off the input once the handler returns.
  const tapToFocus = {
    onMouseDown: (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
      e.preventDefault();
      focus();
    },
    onTouchStart: (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
      focus();
    },
  };

  return { inputRef, focus, focused, tapToFocus };
}
