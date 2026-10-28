"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { PaletteSwitchDialogState } from "@/lib/themes/use-palette-switch";

/** The warning a palette switch shows when it would discard colour,
 *  corner, font or keyboard changes. Driven entirely by
 *  `usePaletteSwitch` (src/lib/themes/use-palette-switch.ts): spread its
 *  `dialog` onto this. Shared by Settings → Theme, the palette gallery
 *  and the command palette, so the copy is the same everywhere. */
export function PaletteSwitchDialog({
  pending,
  exportFirst,
  setExportFirst,
  skipNextTime,
  setSkipNextTime,
  cancel,
  confirm,
  firstControlRef,
}: PaletteSwitchDialogState) {
  return (
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(next) => {
        if (!next) cancel();
      }}
      title={pending ? `Switch to ${pending.name}?` : "Switch palette?"}
      confirmLabel={exportFirst ? "Export & switch" : "Switch anyway"}
      cancelLabel="Cancel"
      confirmVariant="destructive"
      onConfirm={confirm}
    >
      <div className="flex flex-col gap-4 text-sm leading-relaxed">
        <p>
          Switching palettes resets your <strong>colours, corners, font and
          keyboard look</strong>. Everything else stays as it is.
        </p>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/40 p-3 hover:bg-muted/60">
          <input
            type="checkbox"
            // Lands focus inside the dialog, so a keyboard user can Tab
            // on to the buttons.
            ref={firstControlRef}
            autoFocus
            checked={exportFirst}
            onChange={(e) => setExportFirst(e.currentTarget.checked)}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span className="flex flex-col gap-1">
            <span className="font-medium text-foreground">
              Export my settings to a JSON file first
            </span>
            <span className="text-xs text-muted-foreground">
              Lands in your Downloads folder. Import it again any time
              from Import / export on a settings page.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 px-1">
          <input
            type="checkbox"
            checked={skipNextTime}
            onChange={(e) => setSkipNextTime(e.currentTarget.checked)}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span className="flex flex-col gap-1">
            <span className="font-medium text-foreground">
              Don&apos;t show this dialog again
            </span>
            <span className="text-xs text-muted-foreground">
              Saved in this browser only. Future palette picks apply
              straight away. Clear browser storage to reset.
            </span>
          </span>
        </label>
      </div>
    </ConfirmDialog>
  );
}
