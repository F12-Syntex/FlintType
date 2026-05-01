import { useEffect, useState } from "react";

export type PressedKeysState = {
  pressed: ReadonlySet<string>;
  shift: boolean;
  caps: boolean;
};

/** How long a press visual must be held, in ms, even if the user releases
 *  the key sooner. A real touch-typist's keypress is 50–100 ms; without a
 *  floor, the browser may release before React commits the next paint and
 *  the visual flash never appears. 120 ms is comfortable to perceive
 *  without trailing during fast typing. */
const MIN_VISIBLE_MS = 120;

/** Subscribes to the global keydown/keyup stream and tracks which physical
 *  keys are currently down, plus the latched modifier state (Shift held,
 *  CapsLock active). Resets on window blur to avoid stuck-key states.
 *
 *  Reliability details:
 *  - Listeners attached at the **document** level in **capture phase** so
 *    the hook sees events before any inner React handler can call
 *    stopPropagation.
 *  - keyup defers its state-clear by `MIN_VISIBLE_MS - elapsed` so quick
 *    taps still produce a visible flash.
 *  - A re-press during the deferred-removal window cancels the pending
 *    clear, so holding/repeating a key never strobes. */
export function usePressedKeys(): PressedKeysState {
  const [pressed, setPressed] = useState<ReadonlySet<string>>(() => new Set());
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);

  useEffect(() => {
    const downAt = new Map<string, number>();
    const removeTimers = new Map<string, number>();

    const cancelRemoval = (code: string) => {
      const t = removeTimers.get(code);
      if (t !== undefined) {
        window.clearTimeout(t);
        removeTimers.delete(code);
      }
    };

    const scheduleRemoval = (code: string, delay: number) => {
      cancelRemoval(code);
      const t = window.setTimeout(() => {
        removeTimers.delete(code);
        downAt.delete(code);
        setPressed((prev) => {
          if (!prev.has(code)) return prev;
          const next = new Set(prev);
          next.delete(code);
          return next;
        });
      }, delay);
      removeTimers.set(code, t);
    };

    const onDown = (e: KeyboardEvent) => {
      cancelRemoval(e.code);
      downAt.set(e.code, performance.now());
      setPressed((prev) => {
        if (prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.add(e.code);
        return next;
      });
      if (e.key === "Shift") setShift(true);
      if (typeof e.getModifierState === "function") {
        setCaps(e.getModifierState("CapsLock"));
      }
    };

    const onUp = (e: KeyboardEvent) => {
      const elapsed = performance.now() - (downAt.get(e.code) ?? 0);
      scheduleRemoval(e.code, Math.max(0, MIN_VISIBLE_MS - elapsed));
      if (e.key === "Shift") setShift(false);
    };

    const onBlur = () => {
      removeTimers.forEach((t) => window.clearTimeout(t));
      removeTimers.clear();
      downAt.clear();
      setPressed(new Set());
    };

    document.addEventListener("keydown", onDown, { capture: true });
    document.addEventListener("keyup", onUp, { capture: true });
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("keydown", onDown, { capture: true });
      document.removeEventListener("keyup", onUp, { capture: true });
      window.removeEventListener("blur", onBlur);
      removeTimers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return { pressed, shift, caps };
}
