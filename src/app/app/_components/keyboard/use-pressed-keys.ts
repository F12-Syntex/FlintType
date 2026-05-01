import { useEffect, useState } from "react";

export type PressedKeysState = {
  pressed: ReadonlySet<string>;
  shift: boolean;
  caps: boolean;
};

/** Subscribes to the global keydown/keyup stream and tracks which physical
 *  keys are currently down, plus the latched modifier state (Shift held,
 *  CapsLock active). Resets on window blur to avoid stuck-key states. */
export function usePressedKeys(): PressedKeysState {
  const [pressed, setPressed] = useState<ReadonlySet<string>>(() => new Set());
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);

  useEffect(() => {
    const press = (code: string, on: boolean) =>
      setPressed((prev) => {
        const next = new Set(prev);
        if (on) next.add(code);
        else next.delete(code);
        return next;
      });
    const onDown = (e: KeyboardEvent) => {
      press(e.code, true);
      if (e.key === "Shift") setShift(true);
      if (typeof e.getModifierState === "function") {
        setCaps(e.getModifierState("CapsLock"));
      }
    };
    const onUp = (e: KeyboardEvent) => {
      press(e.code, false);
      if (e.key === "Shift") setShift(false);
    };
    const onBlur = () => setPressed(new Set());
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return { pressed, shift, caps };
}
