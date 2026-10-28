"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import {
  needsProtectCheck,
  type ProtectableResource,
  ProtectCheckError,
  runProtectCheck,
} from "./protect-check";

/** Runs Clerk Protect's human check for a custom auth form.
 *
 *  `pass(resource)` resolves at once when Clerk asked for nothing, and
 *  otherwise mounts the challenge into `<ProtectSlot>` (which the form
 *  renders above its submit button) and resolves once Clerk accepts the
 *  proof. It throws `ProtectCheckError` on failure. Leaving the step or
 *  unmounting aborts a check that's still running. */
export function useProtectCheck() {
  const boxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [visible, setVisible] = useState(false);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const pass = useCallback(async (resource: unknown) => {
    const target = resource as ProtectableResource;
    if (!needsProtectCheck(target)) return;
    const box = boxRef.current;
    if (!box) {
      throw new ProtectCheckError("unavailable", "No place to show the human check");
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await runProtectCheck(target, {
        container: box,
        signal: controller.signal,
        setWidgetVisible: setVisible,
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setVisible(false);
    }
  }, []);

  return { pass, cancel, visible, boxRef };
}

/** Where the human check appears. Collapsed (but still mounted, so an
 *  invisible check can run) until Clerk asks to show its widget; then a
 *  one-line prompt above it. The widget is a fixed 300px wide, so on a
 *  phone the slot may spill into the card's side padding. */
export function ProtectSlot({
  boxRef,
  visible,
}: {
  boxRef: RefObject<HTMLDivElement | null>;
  visible: boolean;
}) {
  return (
    <div
      className={
        visible
          ? "-mx-4 flex flex-col items-center gap-3 sm:mx-0"
          : // Out of the flow (no empty gap in the form), still rendered.
            "pointer-events-none absolute inset-x-0 h-0 overflow-hidden"
      }
    >
      {visible ? (
        <p role="status" className="text-center text-sm text-muted-foreground">
          One quick check: tick the box to show you&apos;re human.
        </p>
      ) : null}
      <div ref={boxRef} className="flex justify-center" />
    </div>
  );
}
