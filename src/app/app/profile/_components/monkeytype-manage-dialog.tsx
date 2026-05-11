"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import type { MonkeytypeStatsSlice } from "@/types/monkeytype";

/** Manage-connection dialog — shown after the first successful
 *  import. Surfaces the connection state (last sync, what was
 *  imported), and three actions:
 *    - Resync now: pulls fresh data using the stored key
 *    - Re-paste key: closes manage, opens the paste dialog (used
 *      when swapping accounts or recovering from a revoked key)
 *    - Disconnect: wipes the encrypted key + slice (with confirm)
 *
 *  Local test rows imported from MT stay around — disconnecting
 *  only stops auto-sync and removes the key from the prefs blob. */
export function MonkeyTypeManageDialog({
  open,
  onOpenChange,
  slice,
  onSliceUpdate,
  onSliceCleared,
  onRepaste,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  slice: MonkeytypeStatsSlice;
  /** Called after a successful resync so the parent's prefs cache
   *  picks up the fresh slice without a follow-up GET. */
  onSliceUpdate: (next: MonkeytypeStatsSlice) => void;
  /** Called after disconnect so the parent's prefs cache drops the
   *  slice and the profile flips back to "not connected". */
  onSliceCleared: () => void;
  /** Called when the user picks "Re-paste key". The parent should
   *  close this dialog and open the paste dialog. */
  onRepaste: () => void;
}) {
  const backend = useBackend();
  const [busy, setBusy] = useState<"resync" | "disconnect" | null>(null);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "ok"; pbsImported: number; completedTests?: number }
    | { kind: "err"; message: string }
  >({ kind: "idle" });
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  async function handleResync() {
    setBusy("resync");
    setStatus({ kind: "idle" });
    try {
      const out = await backend.monkeytype.import({});
      onSliceUpdate(out.slice);
      setStatus({
        kind: "ok",
        pbsImported: out.pbsImported,
        completedTests: out.stats.completedTests,
      });
    } catch (err) {
      const message =
        err instanceof BackendError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Resync failed.";
      setStatus({ kind: "err", message });
    } finally {
      setBusy(null);
    }
  }

  async function handleDisconnect() {
    setBusy("disconnect");
    setStatus({ kind: "idle" });
    try {
      await backend.monkeytype.disconnect();
      onSliceCleared();
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof BackendError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Disconnect failed.";
      setStatus({ kind: "err", message });
    } finally {
      setBusy(null);
      setConfirmDisconnect(false);
    }
  }

  const lastSynced = formatRelative(slice.importedAt);
  const pbCells =
    Object.keys(slice.pbs.time).length +
    Object.keys(slice.pbs.words).length;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          // Reset local state on close so the next open is clean.
          setStatus({ kind: "idle" });
          setConfirmDisconnect(false);
        }
        onOpenChange(next);
      }}
      title="MonkeyType connection"
      // hideFooter — the dialog renders its own action row (Resync /
      // Re-paste / Disconnect / Close) inline so all four primary
      // actions sit on the same baseline instead of being split
      // between body + footer.
      hideFooter
      onConfirm={() => void handleResync()}
    >
      <div className="flex flex-col gap-5">
        {/* Status block */}
        <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
          <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground self-center">
            Status
          </dt>
          <dd className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-primary"
            />
            <span className="text-foreground">Connected</span>
          </dd>

          <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground self-center">
            Last synced
          </dt>
          <dd className="text-foreground tabular-nums">{lastSynced}</dd>

          <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground self-center">
            Imported
          </dt>
          <dd className="text-foreground tabular-nums">
            {pbCells} PB cell{pbCells === 1 ? "" : "s"}
            {slice.completedTests != null ? (
              <>
                {" "}· {slice.completedTests.toLocaleString()} lifetime tests
              </>
            ) : null}
          </dd>
        </dl>

        {status.kind === "ok" ? (
          <p
            className="text-sm text-foreground"
            role="status"
          >
            Synced.{" "}
            <span className="text-muted-foreground">
              {status.pbsImported} PB cell
              {status.pbsImported === 1 ? "" : "s"} refreshed
              {status.completedTests != null ? (
                <>
                  {" "}· lifetime{" "}
                  <span className="text-foreground tabular-nums">
                    {status.completedTests.toLocaleString()}
                  </span>
                </>
              ) : null}
              .
            </span>
          </p>
        ) : null}
        {status.kind === "err" ? (
          <p className="text-sm text-primary" role="alert">
            {status.message}
          </p>
        ) : null}

        {/* Action row — all four affordances on the same baseline.
         *  Resync is the primary; Re-paste + Disconnect are
         *  outline; Close is ghost. Disconnect uses an inline
         *  two-step confirm via the same row (Confirm disconnect
         *  appears in place of Disconnect once the user clicks). */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button
            variant="default"
            size="sm"
            disabled={busy != null}
            onClick={() => void handleResync()}
          >
            {busy === "resync" ? "Resyncing…" : "Resync now"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy != null}
            onClick={onRepaste}
          >
            Re-paste key
          </Button>
          {confirmDisconnect ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                disabled={busy != null}
                onClick={() => void handleDisconnect()}
              >
                {busy === "disconnect"
                  ? "Disconnecting…"
                  : "Confirm disconnect"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy != null}
                onClick={() => setConfirmDisconnect(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={busy != null}
              onClick={() => setConfirmDisconnect(true)}
              className={cn("border-destructive/40 text-destructive")}
            >
              Disconnect
            </Button>
          )}
          <span className="ml-auto" />
          <Button
            variant="ghost"
            size="sm"
            disabled={busy != null}
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
        {confirmDisconnect ? (
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Disconnect removes your encrypted Ape Key and the imported
            stats slice. Local tests already in your history stay.
            Auto-sync stops firing on profile loads.
          </p>
        ) : null}
      </div>
    </ConfirmDialog>
  );
}

function formatRelative(ms: number): string {
  if (!ms) return "—";
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86_400)}d ago`;
}
