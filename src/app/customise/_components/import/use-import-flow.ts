"use client";

import { useAuth } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { flushPrefs, prefsOwner } from "@/lib/prefs-store";
import { applyItems, undoImport, type ModeAccess } from "@/lib/settings-import/apply";
import { loadCurrentSettings } from "@/lib/settings-import/slices";
import { shownColours } from "@/lib/settings-import/theme-labels";
import { canUndo, createUndoPoint, type UndoPoint } from "@/lib/settings-import/undo-point";
import type { ImportSource } from "@/types/settings-import";
import { dwellLeft, timingFor } from "./flow-timing";
import { flowReducer, initialFlow } from "./import-stage";
import { runCheck, type CheckDeps, type ImportInput } from "./run-check";
import { runImport } from "./run-import";

/** Runs the import: each check step does its real work and turns done
 *  only after it (held for a short minimum so it can be read, none under
 *  reduced motion); then each switched-on group is written in turn, with
 *  an undo point (`runImport`). A newer run, or Cancel, discards an older
 *  one. A sign-in or sign-out (another tab, say) moves the prefs store to
 *  someone else: a review matched against the old store is checked
 *  again, an import stops, and Undo goes (`canUndo`). */

const CANCELLED = Symbol("cancelled");
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** Each colour setting as it shows on screen now (the review's swatches). */
function readShownColours(): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  return shownColours((name) => style.getPropertyValue(name));
}

const reducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function useImportFlow(initialSource: ImportSource) {
  const [state, dispatch] = useReducer(flowReducer, initialSource, initialFlow);
  const [announcement, setAnnouncement] = useState("");
  const runRef = useRef(0);
  const inputRef = useRef<ImportInput | null>(null);
  const undoRef = useRef<UndoPoint | null>(null);
  /** Whose store the review was matched against (`prefsOwner`). */
  const matchedOwnerRef = useRef<string | null | undefined>(undefined);
  /** An Undo still settling the store's save record. */
  const undoingRef = useRef<Promise<void>>(Promise.resolve());
  const stateRef = useRef(state);
  const { theme, setTheme } = useTheme();
  const themeRef = useRef(theme);
  const { userId } = useAuth();
  useEffect(() => {
    stateRef.current = state;
    themeRef.current = theme;
  }, [state, theme]);

  const mode: ModeAccess = useMemo(
    () => ({ get: () => themeRef.current ?? null, set: (m) => setTheme(m) }),
    [setTheme],
  );

  /** Do `work`, then wait out the rest of `minMs`; throw if superseded. */
  const step = useCallback(async <T,>(run: number, minMs: number, work: () => T | Promise<T>) => {
    const started = performance.now();
    let result: T;
    try {
      result = await work();
    } catch (err) {
      throw runRef.current === run ? err : CANCELLED;
    }
    const left = dwellLeft(minMs, performance.now() - started);
    if (left > 0) await sleep(left);
    if (runRef.current !== run) throw CANCELLED;
    return result;
  }, []);

  const check = useCallback(
    async (input: ImportInput, sourceOverride?: ImportSource, rechecked = false) => {
      const run = ++runRef.current;
      inputRef.current = input;
      matchedOwnerRef.current = undefined;
      const source = sourceOverride ?? stateRef.current.source;
      const deps: CheckDeps = {
        step: (minMs, work) => step(run, minMs, work),
        dispatch,
        announce: setAnnouncement,
        load: () => loadCurrentSettings(() => themeRef.current ?? null, readShownColours),
        owner: prefsOwner,
        cancelled: CANCELLED,
      };
      try {
        const matched = await runCheck(input, source, timingFor(reducedMotion()), deps, rechecked);
        if (!matched) return;
        matchedOwnerRef.current = matched.owner;
        dispatch({ type: "review", plan: matched.plan });
      } catch (err) {
        if (err !== CANCELLED) throw err;
      }
    },
    [step],
  );

  /** True once the store has a different owner from the one the review
   *  was matched against; the review is then checked again. */
  const reviewOutdated = useCallback(() => {
    if (stateRef.current.stage.kind !== "review" || !inputRef.current) return false;
    if (prefsOwner() === matchedOwnerRef.current) return false;
    void check(inputRef.current, stateRef.current.source, true);
    return true;
  }, [check]);

  // After `<PrefsOwnerSync>` has passed a new user to the store (its effect
  // runs after this one), check whose store it is now. While importing,
  // the import loop does this itself.
  useEffect(() => {
    const t = setTimeout(() => {
      if (reviewOutdated()) return;
      if (stateRef.current.stage.kind === "done" && undoRef.current && !canUndo(undoRef.current)) {
        undoRef.current = null;
        dispatch({ type: "undo-lost" });
      }
    }, 0);
    return () => clearTimeout(t);
  }, [userId, reviewOutdated]);

  const importNow = useCallback(async () => {
    const stage = stateRef.current.stage;
    if (stage.kind !== "review" || reviewOutdated()) return;
    const groups = stage.plan.groups.filter((g) => stage.enabled.includes(g.id) && g.items.length > 0);
    if (groups.length === 0) return;
    const run = ++runRef.current;
    const timing = timingFor(reducedMotion());
    dispatch({ type: "apply", groups: groups.map((g) => g.id), labels: groups.map((g) => g.name) });
    // An earlier Undo finishes first, so it can't touch this import's record.
    await undoingRef.current;
    if (runRef.current !== run) return;
    // Signed in or out meanwhile: the review was about someone else's settings.
    if (prefsOwner() !== matchedOwnerRef.current) {
      if (inputRef.current) void check(inputRef.current, stateRef.current.source, true);
      return;
    }
    const undo = createUndoPoint();
    undoRef.current = undo;
    const end = await runImport(groups, { pauseMs: timing.applyStepMs(groups.length), settleMs: timing.settleMs }, {
      apply: (items) => applyItems(items, undo, mode),
      undoAll: () => {
        undoingRef.current = undoImport(undo, mode) ?? Promise.resolve();
      },
      stillOwner: () => canUndo(undo),
      kept: () => undo.owner === null,
      save: flushPrefs,
      sleep,
      dispatch,
    });
    if (end !== "done") undoRef.current = null;
  }, [check, mode, reviewOutdated]);

  const undo = useCallback(() => {
    if (!undoRef.current) return;
    // The values are back at once; the promise only settles the record.
    const settling = undoImport(undoRef.current, mode);
    undoRef.current = null;
    if (!settling) return dispatch({ type: "undo-lost" });
    undoingRef.current = settling;
    dispatch({ type: "undone" });
  }, [mode]);

  /** Start over at Choose (on open). Drops any older run and undo point. */
  const reset = useCallback((source: ImportSource) => {
    ++runRef.current;
    undoRef.current = null;
    inputRef.current = null;
    matchedOwnerRef.current = undefined;
    setAnnouncement("");
    dispatch({ type: "reset", source });
  }, []);

  const cancel = useCallback(() => {
    ++runRef.current;
  }, []);

  /** Check the same contents again, as the same app's settings. */
  const retry = useCallback(() => {
    if (inputRef.current) void check(inputRef.current, stateRef.current.source);
  }, [check]);

  /** Check the same contents again as the other app's settings. */
  const importInstead = useCallback(
    (source: ImportSource) => {
      if (inputRef.current) void check(inputRef.current, source);
    },
    [check],
  );

  return {
    state,
    announcement,
    setText: (text: string) => dispatch({ type: "text", text }),
    toggle: (group: string) => dispatch({ type: "toggle", group }),
    backToChoose: () => dispatch({ type: "choose" }),
    check,
    importNow,
    undo,
    reset,
    cancel,
    importInstead,
    retry,
  };
}
