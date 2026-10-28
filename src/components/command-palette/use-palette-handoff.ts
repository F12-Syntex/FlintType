"use client";

import { type Dispatch, type SetStateAction, useCallback, useRef } from "react";
import { usePaletteSwitch } from "@/lib/themes/use-palette-switch";

/** The command palette's Palette entry goes through the shared
 *  palette-switch guard. When a switch needs the warning, the command
 *  palette closes and hands keyboard focus to the dialog (rendered
 *  beside it, so it works on every route) instead of pulling focus back
 *  to whatever opened the palette. With nothing to lose, the switch
 *  applies at once and the palette stays open.
 *
 *  Spread `onCloseAutoFocus` onto the palette's DialogContent and
 *  render `<PaletteSwitchDialog {...dialog} />` next to it. */
export function usePaletteHandoff(
  setOpen: Dispatch<SetStateAction<boolean>>,
) {
  const { requestPick, dialog, focusDialog } = usePaletteSwitch();
  const handingOff = useRef(false);

  const pickPalette = useCallback(
    (id: string | null, name: string) => {
      if (requestPick(id, name) !== "confirm") return;
      handingOff.current = true;
      setOpen(false);
    },
    [requestPick, setOpen],
  );

  const onCloseAutoFocus = useCallback(
    (e: Event) => {
      if (!handingOff.current) return;
      handingOff.current = false;
      e.preventDefault();
      focusDialog();
    },
    [focusDialog],
  );

  return { pickPalette, onCloseAutoFocus, dialog };
}
