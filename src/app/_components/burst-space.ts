"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/** How `<InputCapture>` hands BURST a Space that came from input
 *  events instead of `keydown`.
 *
 *  Phone keyboards such as Gboard send keydown as 229 / "Unidentified"
 *  and deliver the space only as an input event, so a keydown listener
 *  alone could never commit a word from a phone. `<InputCapture>` (which
 *  sits above the surface) provides this register function;
 *  `<BurstProvider>` registers its handler through `useBurstSpace` while
 *  it's mounted. Registering returns the matching unregister. */
export type RegisterBurstSpace = (onSpace: () => void) => () => void;

export const BurstSpaceContext = createContext<RegisterBurstSpace | null>(null);

/** The provider side, for `<InputCapture>`: `register` goes into
 *  `BurstSpaceContext`, `fire` passes a soft-keyboard Space to whatever
 *  handler is registered (a no-op outside BURST). */
export function useBurstSpaceSlot(): {
  register: RegisterBurstSpace;
  fire: () => void;
} {
  const handlerRef = useRef<(() => void) | null>(null);
  const register = useCallback<RegisterBurstSpace>((onSpace) => {
    handlerRef.current = onSpace;
    return () => {
      if (handlerRef.current === onSpace) handlerRef.current = null;
    };
  }, []);
  const fire = useCallback(() => handlerRef.current?.(), []);
  return { register, fire };
}

/** Route every Space meant for BURST to `onSpace`, the threshold +
 *  reps gate (`<BurstProvider>`'s `handleSpace`):
 *
 *  - keydown " " anywhere on the page (a physical keyboard), unless a
 *    modal is open or a textarea / select has focus;
 *  - a Space typed on a soft keyboard, handed over by `<InputCapture>`.
 *    It can share one input event with the word's last letters (a
 *    composition commit, swipe typing), so the gate runs in an effect
 *    after the render that holds those letters, once per request. Pass
 *    a gate built from that render's state. */
export function useBurstSpace(onSpace: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "TEXTAREA" || active.tagName === "SELECT")
      ) {
        return;
      }
      e.preventDefault();
      onSpace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSpace]);

  const register = useContext(BurstSpaceContext);
  const [requests, setRequests] = useState(0);
  const handledRef = useRef(0);
  const request = useCallback(() => setRequests((n) => n + 1), []);
  useLayoutEffect(() => register?.(request), [register, request]);
  useEffect(() => {
    if (requests === handledRef.current) return;
    handledRef.current = requests;
    onSpace();
  }, [requests, onSpace]);
}
