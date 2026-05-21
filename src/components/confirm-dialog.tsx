"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** A small, reusable confirmation step for an action that shouldn't fire
 *  on a single stray click (unfollow, block, delete). Built on the
 *  existing shadcn `Dialog` so it shares the app's overlay + motion;
 *  `hideClose` + an explicit Cancel keep the only exits deliberate.
 *  Loading disables both buttons and relabels the confirm action. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  loadingLabel,
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  loadingLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="top-1/2 max-w-sm -translate-y-1/2 p-5">
        <div className="flex flex-col gap-1.5">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {description}
          </DialogDescription>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            size="sm"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? (loadingLabel ?? `${confirmLabel}…`) : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
