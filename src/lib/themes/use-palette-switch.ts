"use client";

import { type RefObject, useCallback, useRef, useState } from "react";
import { buildFlinttypeExport, downloadJson } from "../import-export";
import { DEFAULT_KEYBOARD, type KeyboardSettings } from "../keyboard-settings";
import { readSlice } from "../prefs-store";
import type { ThemeOverrides } from "../theme-customization";
import { EMPTY_OVERRIDES } from "./overrides";
import {
  type PaletteSwitchDecision,
  paletteSwitchDecision,
  switchDiscardsChanges,
} from "./palette-baseline";
import { usePalette } from "./use-palette";
import { usePaletteBaseline } from "./use-palette-baseline";

/** localStorage key for the "skip the warning dialog" preference.
 *  Browser-persistent on purpose: the opt-out should follow the user
 *  between sessions but never sync to the server (a per-device UX
 *  nudge, not part of their settings profile). */
const SKIP_DIALOG_STORAGE_KEY = "ft-theme-skip-confirm";

/** Read at pick time (not in render): it only changes behaviour. */
function readSkipDialog(): boolean {
  try {
    return window.localStorage.getItem(SKIP_DIALOG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSkipDialog() {
  try {
    window.localStorage.setItem(SKIP_DIALOG_STORAGE_KEY, "1");
  } catch {
    // Storage blocked: the dialog just shows again next time.
  }
}

/** A pick waiting on the warning. `id` null is the Default palette. */
export type PendingPaletteSwitch = { id: string | null; name: string };

/** What <PaletteSwitchDialog> (src/components/palette-switch-dialog.tsx)
 *  renders from. Spread the hook's `dialog` onto it. */
export type PaletteSwitchDialogState = {
  pending: PendingPaletteSwitch | null;
  exportFirst: boolean;
  setExportFirst: (next: boolean) => void;
  skipNextTime: boolean;
  setSkipNextTime: (next: boolean) => void;
  /** Close without switching. */
  cancel: () => void;
  /** Switch, exporting the settings first when asked. */
  confirm: () => void;
  /** The dialog's first control, for `focusDialog`. */
  firstControlRef: RefObject<HTMLInputElement | null>;
};

/** The one way to switch palette, shared by Settings → Theme, the
 *  palette gallery and the command palette. A switch rewrites the
 *  colour / corner / font overrides and the keyboard look, so when any
 *  of those differ from what the current palette set, it asks first
 *  (with an "export first" option). Nothing to lose, or the browser's
 *  "don't ask again" flag set, applies at once.
 *
 *  Render `<PaletteSwitchDialog {...dialog} />` wherever the hook is
 *  used. `requestPick` returns what it did, so a caller that sits in
 *  another overlay (the command palette, a menu) can step aside while
 *  the dialog is up and call `focusDialog` once that overlay has
 *  finished closing (its focus trap would otherwise pull focus back
 *  out of the dialog). */
export function usePaletteSwitch(): {
  requestPick: (id: string | null, name: string) => PaletteSwitchDecision;
  dialog: PaletteSwitchDialogState;
  focusDialog: () => void;
} {
  const { activeId, apply, reset } = usePalette();
  const { baseline } = usePaletteBaseline();
  const [pending, setPending] = useState<PendingPaletteSwitch | null>(null);
  const [exportFirst, setExportFirst] = useState(true);
  const [skipNextTime, setSkipNextTime] = useState(false);
  const firstControlRef = useRef<HTMLInputElement>(null);
  const focusDialog = useCallback(() => firstControlRef.current?.focus(), []);

  const switchTo = useCallback(
    (id: string | null) => {
      if (id === null) reset();
      else apply(id);
    },
    [apply, reset],
  );

  const requestPick = useCallback(
    (id: string | null, name: string): PaletteSwitchDecision => {
      // Read the slices at pick time: the decision is the only reader,
      // so the (globally mounted) command palette needn't re-render on
      // every colour or keyboard change.
      const overrides = readSlice<ThemeOverrides>("theme", EMPTY_OVERRIDES);
      const keyboard = readSlice<KeyboardSettings>("keyboard", DEFAULT_KEYBOARD);
      const decision = paletteSwitchDecision({
        targetId: id,
        activeId,
        discardsChanges: switchDiscardsChanges(overrides, keyboard, baseline),
        skipConfirm: readSkipDialog(),
      });
      if (decision === "apply") switchTo(id);
      if (decision === "confirm") {
        setSkipNextTime(false);
        setPending({ id, name });
      }
      return decision;
    },
    [activeId, baseline, switchTo],
  );

  const cancel = useCallback(() => setPending(null), []);

  const confirm = useCallback(() => {
    const pick = pending;
    setPending(null);
    if (!pick) return;
    // Persist "don't show again" before applying so a re-render after
    // the apply can't race the write.
    if (skipNextTime) writeSkipDialog();
    if (!exportFirst) {
      switchTo(pick.id);
      return;
    }
    void buildFlinttypeExport().then((data) => {
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`flinttype-settings-${stamp}.json`, data);
      switchTo(pick.id);
    });
  }, [pending, skipNextTime, exportFirst, switchTo]);

  return {
    requestPick,
    focusDialog,
    dialog: {
      pending,
      exportFirst,
      setExportFirst,
      skipNextTime,
      setSkipNextTime,
      cancel,
      confirm,
      firstControlRef,
    },
  };
}
