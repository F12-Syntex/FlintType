"use client";

import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";

export type NativeTextHandlers = {
  /** False while typing should be swallowed (modal open, race locked).
   *  The events are still cancelled so nothing lands in the input. */
  accepts: () => boolean;
  onText: (text: string) => void;
  onDelete: (wordWise: boolean) => void;
};

/** Soft-keyboard text for a hidden typing input.
 *
 *  Phone keyboards rarely send a usable `keydown` (Gboard reports 229 /
 *  "Unidentified"), so text has to come from input events. React's
 *  `onBeforeInput` can't be used for this: it is backed by `textInput`
 *  and has no `inputType`, so deletes and plain inserts can't be told
 *  apart. This attaches the native listeners instead:
 *
 *  - `beforeinput` for plain text (`insertText`, `insertReplacementText`)
 *    and deletes, cancelled so the input stays empty;
 *  - a value diff on `input` / `compositionend` for IME composition,
 *    which can't be cancelled, so each composed letter is typed once and
 *    a shrinking composition becomes backspaces.
 *
 *  `lastKeyRef` holds the last key the `keydown` path already handled:
 *  some keyboards report a key both ways, and the paired input event is
 *  dropped as a duplicate. The input must be uncontrolled: React would
 *  otherwise reset the value mid-composition. */
export function useNativeTextInput(
  inputRef: RefObject<HTMLInputElement | null>,
  lastKeyRef: RefObject<{ key: string; at: number }>,
  handlers: NativeTextHandlers,
): void {
  const latest = useRef(handlers);
  useLayoutEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const recent = (key: string) =>
      lastKeyRef.current.key === key && Date.now() - lastKeyRef.current.at < 80;
    // Text the IME has put in the input during a composition.
    let composed = "";
    const syncComposition = () => {
      const h = latest.current;
      const next = el.value;
      let same = 0;
      while (
        same < composed.length &&
        same < next.length &&
        composed[same] === next[same]
      )
        same++;
      if (h.accepts()) {
        for (let i = same; i < composed.length; i++) h.onDelete(false);
        const added = next.slice(same);
        if (added) h.onText(added);
      }
      composed = next;
    };
    const onBeforeInput = (e: InputEvent) => {
      // Composition text can't be cancelled; it's diffed on `input`.
      if (e.isComposing || e.inputType === "insertCompositionText") return;
      if (e.cancelable) e.preventDefault();
      const h = latest.current;
      if (!h.accepts()) return;
      if (e.inputType.startsWith("delete")) {
        if (recent("Backspace")) return;
        h.onDelete(e.inputType !== "deleteContentBackward");
      } else if (
        e.inputType === "insertText" ||
        e.inputType === "insertReplacementText"
      ) {
        let text = "";
        for (const ch of e.data ?? "") if (!recent(ch)) text += ch;
        if (text) h.onText(text);
      }
    };
    const onInput = (e: Event) => {
      if ((e as InputEvent).isComposing) syncComposition();
      // A non-cancellable insert outside a composition (rare) still
      // leaves text behind; clear it so deletes keep firing.
      else if (el.value) el.value = "";
    };
    const onCompositionEnd = () => {
      syncComposition();
      el.value = "";
      composed = "";
    };
    el.addEventListener("beforeinput", onBeforeInput);
    el.addEventListener("input", onInput);
    el.addEventListener("compositionend", onCompositionEnd);
    return () => {
      el.removeEventListener("beforeinput", onBeforeInput);
      el.removeEventListener("input", onInput);
      el.removeEventListener("compositionend", onCompositionEnd);
    };
  }, [inputRef, lastKeyRef]);
}
