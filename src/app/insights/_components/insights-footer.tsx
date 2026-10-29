"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BackendError, useBackend } from "@/lib/backend";
import {
  BROWSE_DRILLS,
  DELETE_ANALYSIS,
  DELETE_BODY,
  DELETE_CONFIRM,
  DELETE_TITLE,
  deletedLine,
  deleteFailedLine,
  DELETING,
  TECHNICAL_VIEW,
} from "./labels-copy";

const LINK = "inline-flex min-h-11 items-center text-sm sm:min-h-0";

/** The page's last row (spec-40 §3.8): the technical view, the drills,
 *  and deleting the stored analysis behind a confirm dialog. Spaced, no
 *  glyphs; 44px rows on phones. */
export function InsightsFooter({ onDeleted }: { onDeleted: () => void }) {
  const backend = useBackend();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<number | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const r = await backend.insights.clear();
      setDeleted(r.deleted);
      setOpen(false);
      onDeleted();
    } catch (err) {
      setError(deleteFailedLine(err instanceof BackendError ? err.code : null));
    } finally {
      setBusy(false);
    }
  }

  return (
    <footer className="flex flex-col gap-2 border-t border-border pt-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-0 text-sm sm:gap-y-2">
        <Link
          href="/biogram"
          className={`${LINK} text-foreground underline decoration-border underline-offset-4 hover:decoration-primary`}
        >
          {TECHNICAL_VIEW}
        </Link>
        <Link href="/drills" className={`${LINK} text-foreground hover:underline hover:underline-offset-4`}>
          {BROWSE_DRILLS}
        </Link>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setError(null);
            setDeleted(null);
            setOpen(true);
          }}
          className="-ml-3 h-11 px-3 text-destructive hover:text-destructive sm:h-9"
        >
          {DELETE_ANALYSIS}
        </Button>
      </div>
      {deleted !== null ? (
        <p className="text-sm text-muted-foreground" role="status">
          {deletedLine(deleted)}
        </p>
      ) : null}
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) setOpen(next);
        }}
        title={DELETE_TITLE}
        confirmLabel={busy ? DELETING : DELETE_CONFIRM}
        confirmVariant="destructive"
        confirmDisabled={busy}
        keepOpen
        onConfirm={confirm}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-muted-foreground">{DELETE_BODY}</p>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </ConfirmDialog>
    </footer>
  );
}
