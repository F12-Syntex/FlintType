import { useEffect, useState } from "react";

export type PressedKeysState = {
  pressed: ReadonlySet<string>;
  shift: boolean;
  caps: boolean;
};

/** How long a press visual must be held, in ms, even if the user releases
 *  the key sooner. A real touch-typist's keypress is 50–100 ms and the
 *  CSS colour transition needs ~150 ms to peak — without a generous floor
 *  the highlight starts fading before it ever reaches full brightness, so
 *  the flash looks invisible. 180 ms = ~11 frames at 60 Hz, comfortably
 *  perceivable, still feels snappy at typing speed. */
const MIN_VISIBLE_MS = 180;

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

    // Belt-and-braces: attach to both window and document, both capture
    // phase. Whichever one the host environment delivers events through,
    // the hook catches them. Browsers dedupe identical (target, type,
    // listener, capture) tuples, so we won't double-fire.
    window.addEventListener("keydown", onDown, { capture: true });
    window.addEventListener("keyup", onUp, { capture: true });
    document.addEventListener("keydown", onDown, { capture: true });
    document.addEventListener("keyup", onUp, { capture: true });
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onDown, { capture: true });
      window.removeEventListener("keyup", onUp, { capture: true });
      document.removeEventListener("keydown", onDown, { capture: true });
      document.removeEventListener("keyup", onUp, { capture: true });
      window.removeEventListener("blur", onBlur);
      removeTimers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return { pressed, shift, caps };
}
