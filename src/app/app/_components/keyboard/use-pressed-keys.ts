import { useEffect, useState } from "react";

export type PressedKeysState = {
  pressed: ReadonlySet<string>;
  shift: boolean;
  caps: boolean;
};

/** How long a press visual must be held, in ms, even if the user releases
 *  the key sooner. A real touch-typist's keypress is ~50–100 ms; without a
 *  floor, the browser may release before React commits the next paint and
 *  the visual flash never appears. */
const MIN_VISIBLE_MS = 90;

/** Subscribes to the global keydown/keyup stream and tracks which physical
 *  keys are currently down, plus the latched modifier state (Shift held,
 *  CapsLock active). Resets on window blur to avoid stuck-key states.
 *
 *  Two reliability details:
 *  1. Listeners are attached in the **capture** phase so the hook sees the
 *     event before any inner React handler can `stopPropagation()` (the
 *     practice surface's `<InputCapture>` uses `preventDefault()` only,
 *     but capture-phase is the safe contract).
 *  2. A keyup defers its state-clear by `MIN_VISIBLE_MS - elapsed` so a
 *     quick tap still produces a visible flash. */
export function usePressedKeys(): PressedKeysState {
  const [pressed, setPressed] = useState<ReadonlySet<string>>(() => new Set());
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);

  useEffect(() => {
    const downAt = new Map<string, number>();
    const pendingTimers = new Map<string, number>();

    const add = (code: string) =>
      setPressed((prev) => {
        if (prev.has(code)) return prev;
        const next = new Set(prev);
        next.add(code);
        return next;
      });

    const remove = (code: string) =>
      setPressed((prev) => {
        if (!prev.has(code)) return prev;
        const next = new Set(prev);
        next.delete(code);
        return next;
      });

    const onDown = (e: KeyboardEvent) => {
      const t = pendingTimers.get(e.code);
      if (t !== undefined) {
        window.clearTimeout(t);
        pendingTimers.delete(e.code);
      }
      downAt.set(e.code, performance.now());
      add(e.code);
      if (e.key === "Shift") setShift(true);
      if (typeof e.getModifierState === "function") {
        setCaps(e.getModifierState("CapsLock"));
      }
    };

    const onUp = (e: KeyboardEvent) => {
      const elapsed = performance.now() - (downAt.get(e.code) ?? 0);
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      const code = e.code;
      const timer = window.setTimeout(() => {
        downAt.delete(code);
        pendingTimers.delete(code);
        remove(code);
      }, wait);
      pendingTimers.set(code, timer);
      if (e.key === "Shift") setShift(false);
    };

    const onBlur = () => {
      pendingTimers.forEach((t) => window.clearTimeout(t));
      pendingTimers.clear();
      downAt.clear();
      setPressed(new Set());
    };

    window.addEventListener("keydown", onDown, { capture: true });
    window.addEventListener("keyup", onUp, { capture: true });
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown, { capture: true });
      window.removeEventListener("keyup", onUp, { capture: true });
      window.removeEventListener("blur", onBlur);
      pendingTimers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return { pressed, shift, caps };
}
